from fastapi import FastAPI, APIRouter, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import socketio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI()

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Models ============
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    username: str
    friend_code: str
    created_at: datetime

class SessionData(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    username: str
    friend_code: str

class StatusUpdate(BaseModel):
    status: str  # "sleeping" or "awake"

class FriendSearchRequest(BaseModel):
    username: str

class FriendRequestCreate(BaseModel):
    friend_id: str

class FriendCodeAdd(BaseModel):
    friend_code: str

class FriendStatus(BaseModel):
    user_id: str
    username: str
    name: str
    picture: Optional[str] = None
    status: str
    last_update: datetime

class FriendRequest(BaseModel):
    request_id: str
    from_user_id: str
    from_username: str
    from_name: str
    from_picture: Optional[str] = None
    to_user_id: str
    status: str
    created_at: datetime

# ============ Database Initialization ============
async def init_db():
    """Create indexes"""
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("username", unique=True)
        await db.users.create_index("friend_code", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.user_status.create_index("user_id", unique=True)
        await db.friends.create_index([("user_id", 1), ("friend_id", 1)], unique=True)
        await db.friend_requests.create_index([("from_user_id", 1), ("to_user_id", 1)])
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("startup")
async def startup_event():
    await init_db()

# ============ Auth Helper ============
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user from session token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    session_token = authorization.replace("Bearer ", "")
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiration
    expires_at = session.get("expires_at")
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ============ Auth Routes ============
@api_router.post("/auth/session")
async def create_session(session_data: dict):
    """Exchange session_id for session_token and store in backend"""
    session_id = session_data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent API to get session data
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid session_id")
            
            data = response.json()
            session_token = data.get("session_token")
            email = data.get("email")
            name = data.get("name")
            picture = data.get("picture")
            
            # Check if user exists
            user = await db.users.find_one({"email": email}, {"_id": 0})
            
            if not user:
                # Create new user
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                # Generate unique username from name
                base_username = name.lower().replace(" ", "")
                username = base_username
                counter = 1
                while await db.users.find_one({"username": username}):
                    username = f"{base_username}{counter}"
                    counter += 1
                
                # Generate unique friend code
                friend_code = str(uuid.uuid4().hex[:8]).upper()
                while await db.users.find_one({"friend_code": friend_code}):
                    friend_code = str(uuid.uuid4().hex[:8]).upper()
                
                user = {
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "username": username,
                    "friend_code": friend_code,
                    "created_at": datetime.now(timezone.utc)
                }
                await db.users.insert_one(user)
                
                # Initialize user status
                await db.user_status.insert_one({
                    "user_id": user_id,
                    "status": "awake",
                    "last_update": datetime.now(timezone.utc)
                })
            
            # Create or update session
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            await db.user_sessions.update_one(
                {"session_token": session_token},
                {
                    "$set": {
                        "user_id": user["user_id"],
                        "session_token": session_token,
                        "expires_at": expires_at,
                        "created_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            
            return {
                "session_token": session_token,
                "user": {
                    "user_id": user["user_id"],
                    "email": user["email"],
                    "name": user["name"],
                    "picture": user["picture"],
                    "username": user["username"],
                    "friend_code": user["friend_code"]
                }
            }
            
    except httpx.RequestError as e:
        logger.error(f"Error calling Emergent API: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error")

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Get current user info"""
    user = await get_current_user(authorization)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user["picture"],
        "username": user["username"],
        "friend_code": user["friend_code"]
    }

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user"""
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
        await db.user_sessions.delete_one({"session_token": session_token})
    return {"message": "Logged out successfully"}

# ============ Status Routes ============
@api_router.post("/status/update")
async def update_status(
    status_data: StatusUpdate,
    authorization: Optional[str] = Header(None)
):
    """Update user sleep status"""
    user = await get_current_user(authorization)
    
    if status_data.status not in ["sleeping", "awake"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update status
    await db.user_status.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "status": status_data.status,
                "last_update": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Broadcast to friends
    await broadcast_status_update(user["user_id"], status_data.status)
    
    return {"status": status_data.status, "last_update": datetime.now(timezone.utc)}

@api_router.get("/status/friends")
async def get_friends_status(authorization: Optional[str] = Header(None)):
    """Get all friends' status"""
    user = await get_current_user(authorization)
    
    # Get accepted friends
    friends = await db.friends.find({
        "user_id": user["user_id"],
        "status": "accepted"
    }, {"_id": 0}).to_list(1000)
    
    friend_ids = [f["friend_id"] for f in friends]
    
    if not friend_ids:
        return []
    
    # Get friends info and status
    result = []
    for friend_id in friend_ids:
        friend_user = await db.users.find_one({"user_id": friend_id}, {"_id": 0})
        if not friend_user:
            continue
            
        friend_status = await db.user_status.find_one({"user_id": friend_id}, {"_id": 0})
        if not friend_status:
            friend_status = {"status": "awake", "last_update": datetime.now(timezone.utc)}
        
        result.append({
            "user_id": friend_user["user_id"],
            "username": friend_user["username"],
            "name": friend_user["name"],
            "picture": friend_user.get("picture"),
            "status": friend_status["status"],
            "last_update": friend_status["last_update"]
        })
    
    return result

# ============ Friends Routes ============
@api_router.post("/friends/search")
async def search_users(
    search_data: FriendSearchRequest,
    authorization: Optional[str] = Header(None)
):
    """Search users by username"""
    user = await get_current_user(authorization)
    
    # Search for users (case insensitive)
    users = await db.users.find({
        "username": {"$regex": f"^{search_data.username}", "$options": "i"},
        "user_id": {"$ne": user["user_id"]}  # Exclude self
    }, {"_id": 0}).to_list(20)
    
    return [
        {
            "user_id": u["user_id"],
            "username": u["username"],
            "name": u["name"],
            "picture": u.get("picture")
        }
        for u in users
    ]

@api_router.post("/friends/request")
async def send_friend_request(
    request_data: FriendRequestCreate,
    authorization: Optional[str] = Header(None)
):
    """Send friend request"""
    user = await get_current_user(authorization)
    
    if request_data.friend_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself as friend")
    
    # Check if friend exists
    friend = await db.users.find_one({"user_id": request_data.friend_id}, {"_id": 0})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends
    existing = await db.friends.find_one({
        "user_id": user["user_id"],
        "friend_id": request_data.friend_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already friends or request pending")
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one({
        "from_user_id": user["user_id"],
        "to_user_id": request_data.friend_id,
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(status_code=400, detail="Friend request already sent")
    
    # Create friend request
    request_id = str(uuid.uuid4())
    await db.friend_requests.insert_one({
        "request_id": request_id,
        "from_user_id": user["user_id"],
        "to_user_id": request_data.friend_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Friend request sent", "request_id": request_id}

@api_router.post("/friends/add-by-code")
async def add_friend_by_code(
    code_data: FriendCodeAdd,
    authorization: Optional[str] = Header(None)
):
    """Add friend by friend code"""
    user = await get_current_user(authorization)
    
    # Find user by friend code
    friend = await db.users.find_one(
        {"friend_code": code_data.friend_code.upper()},
        {"_id": 0}
    )
    
    if not friend:
        raise HTTPException(status_code=404, detail="Invalid friend code")
    
    if friend["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself as friend")
    
    # Check if already friends
    existing = await db.friends.find_one({
        "user_id": user["user_id"],
        "friend_id": friend["user_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already friends")
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one({
        "from_user_id": user["user_id"],
        "to_user_id": friend["user_id"],
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(status_code=400, detail="Friend request already sent")
    
    # Create friend request
    request_id = str(uuid.uuid4())
    await db.friend_requests.insert_one({
        "request_id": request_id,
        "from_user_id": user["user_id"],
        "to_user_id": friend["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Friend request sent", "request_id": request_id}

@api_router.get("/friends/requests")
async def get_friend_requests(authorization: Optional[str] = Header(None)):
    """Get pending friend requests"""
    user = await get_current_user(authorization)
    
    # Get requests sent to this user
    requests = await db.friend_requests.find({
        "to_user_id": user["user_id"],
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    result = []
    for req in requests:
        from_user = await db.users.find_one({"user_id": req["from_user_id"]}, {"_id": 0})
        if from_user:
            result.append({
                "request_id": req["request_id"],
                "from_user_id": req["from_user_id"],
                "from_username": from_user["username"],
                "from_name": from_user["name"],
                "from_picture": from_user.get("picture"),
                "created_at": req["created_at"]
            })
    
    return result

@api_router.post("/friends/accept/{request_id}")
async def accept_friend_request(
    request_id: str,
    authorization: Optional[str] = Header(None)
):
    """Accept friend request"""
    user = await get_current_user(authorization)
    
    # Find request
    request = await db.friend_requests.find_one({
        "request_id": request_id,
        "to_user_id": user["user_id"],
        "status": "pending"
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    # Update request status
    await db.friend_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": "accepted"}}
    )
    
    # Add both as friends
    await db.friends.insert_one({
        "user_id": user["user_id"],
        "friend_id": request["from_user_id"],
        "status": "accepted",
        "created_at": datetime.now(timezone.utc)
    })
    
    await db.friends.insert_one({
        "user_id": request["from_user_id"],
        "friend_id": user["user_id"],
        "status": "accepted",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Friend request accepted"}

@api_router.post("/friends/reject/{request_id}")
async def reject_friend_request(
    request_id: str,
    authorization: Optional[str] = Header(None)
):
    """Reject friend request"""
    user = await get_current_user(authorization)
    
    # Find request
    request = await db.friend_requests.find_one({
        "request_id": request_id,
        "to_user_id": user["user_id"],
        "status": "pending"
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    # Delete request
    await db.friend_requests.delete_one({"request_id": request_id})
    
    return {"message": "Friend request rejected"}

@api_router.get("/friends/list")
async def get_friends_list(authorization: Optional[str] = Header(None)):
    """Get list of accepted friends"""
    user = await get_current_user(authorization)
    
    friends = await db.friends.find({
        "user_id": user["user_id"],
        "status": "accepted"
    }, {"_id": 0}).to_list(1000)
    
    result = []
    for friend in friends:
        friend_user = await db.users.find_one({"user_id": friend["friend_id"]}, {"_id": 0})
        if friend_user:
            result.append({
                "user_id": friend_user["user_id"],
                "username": friend_user["username"],
                "name": friend_user["name"],
                "picture": friend_user.get("picture")
            })
    
    return result

# ============ WebSocket Support ============
connected_users = {}  # {user_id: sid}

async def broadcast_status_update(user_id: str, status: str):
    """Broadcast status update to all friends"""
    # Get user's friends
    friends = await db.friends.find({
        "user_id": user_id,
        "status": "accepted"
    }, {"_id": 0}).to_list(1000)
    
    # Get user info
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    if not user:
        return
    
    # Send update to each connected friend
    for friend in friends:
        friend_id = friend["friend_id"]
        if friend_id in connected_users:
            await sio.emit('status_update', {
                "user_id": user_id,
                "username": user["username"],
                "name": user["name"],
                "status": status,
                "last_update": datetime.now(timezone.utc).isoformat()
            }, room=connected_users[friend_id])

@sio.event
async def connect(sid, environ):
    """Handle WebSocket connection"""
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    """Handle WebSocket disconnection"""
    # Remove from connected users
    user_id = None
    for uid, socket_id in connected_users.items():
        if socket_id == sid:
            user_id = uid
            break
    
    if user_id:
        del connected_users[user_id]
    
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def authenticate(sid, data):
    """Authenticate WebSocket connection"""
    session_token = data.get('token')
    
    if not session_token:
        await sio.emit('error', {'message': 'No token provided'}, room=sid)
        return
    
    # Verify session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        await sio.emit('error', {'message': 'Invalid token'}, room=sid)
        return
    
    # Store connection
    connected_users[session["user_id"]] = sid
    await sio.emit('authenticated', {'user_id': session["user_id"]}, room=sid)
    logger.info(f"User {session['user_id']} authenticated on WebSocket")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
