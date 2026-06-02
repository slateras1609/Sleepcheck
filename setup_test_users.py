#!/usr/bin/env python3
"""
Setup test users directly in MongoDB for testing purposes
This bypasses the Emergent Auth requirement for automated testing
"""

from pymongo import MongoClient
from datetime import datetime, timezone, timedelta
import uuid

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

def setup_test_users():
    """Create test users and sessions directly in database"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing test data
    print("Clearing existing test data...")
    db.users.delete_many({"email": {"$regex": "^testuser"}})
    db.user_sessions.delete_many({})
    db.user_status.delete_many({})
    db.friends.delete_many({})
    db.friend_requests.delete_many({})
    
    # Create test users
    test_users = []
    session_tokens = []
    
    for i in range(1, 3):
        user_id = f"user_test{i}_{uuid.uuid4().hex[:8]}"
        username = f"testuser{i}"
        friend_code = f"TEST{i:04d}"
        session_token = f"test_token_{uuid.uuid4().hex}"
        
        user = {
            "user_id": user_id,
            "email": f"testuser{i}@example.com",
            "name": f"Test User {i}",
            "picture": f"https://example.com/avatar{i}.jpg",
            "username": username,
            "friend_code": friend_code,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Insert user
        db.users.insert_one(user)
        print(f"✅ Created user: {username} (ID: {user_id}, Friend Code: {friend_code})")
        
        # Create session
        session = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        db.user_sessions.insert_one(session)
        print(f"✅ Created session token: {session_token}")
        
        # Initialize user status
        status = {
            "user_id": user_id,
            "status": "awake",
            "last_update": datetime.now(timezone.utc)
        }
        db.user_status.insert_one(status)
        print(f"✅ Initialized status for {username}")
        
        test_users.append(user)
        session_tokens.append(session_token)
        print()
    
    # Save test data to file
    with open("/app/test_users_data.txt", "w") as f:
        f.write("SleepCheck Test Users\n")
        f.write("="*80 + "\n\n")
        for i, (user, token) in enumerate(zip(test_users, session_tokens), 1):
            f.write(f"User {i}:\n")
            f.write(f"  User ID: {user['user_id']}\n")
            f.write(f"  Email: {user['email']}\n")
            f.write(f"  Username: {user['username']}\n")
            f.write(f"  Friend Code: {user['friend_code']}\n")
            f.write(f"  Session Token: {token}\n")
            f.write("\n")
    
    print("="*80)
    print("Test users setup complete!")
    print(f"Test data saved to: /app/test_users_data.txt")
    print("="*80)
    
    client.close()
    return test_users, session_tokens

if __name__ == "__main__":
    setup_test_users()
