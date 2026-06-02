"""SleepCheck backend API tests - tests endpoints reachability and auth gating."""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://friend-sleep-watch.preview.emergentagent.com').rstrip('/')


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Auth endpoints ----
class TestAuth:
    def test_auth_session_missing_session_id(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/session", json={})
        assert r.status_code == 400, r.text
        assert "session_id" in r.text.lower()

    def test_auth_session_invalid_session_id(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/session", json={"session_id": "INVALID_SESSION_XYZ"})
        # Emergent auth service should reject -> 400 from our backend
        assert r.status_code in (400, 500), r.text

    def test_auth_me_no_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_auth_me_bad_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
        assert r.status_code == 401

    def test_auth_me_malformed_header(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Token abc"})
        assert r.status_code == 401

    def test_auth_logout_no_token(self, api_client):
        # Logout endpoint always returns 200 even without auth (idempotent)
        r = api_client.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200


# ---- Status endpoints ----
class TestStatus:
    def test_status_update_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/status/update", json={"status": "sleeping"})
        assert r.status_code == 401

    def test_status_update_invalid_token(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/status/update",
            json={"status": "sleeping"},
            headers={"Authorization": "Bearer bad"},
        )
        assert r.status_code == 401

    def test_status_friends_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/status/friends")
        assert r.status_code == 401


# ---- Friends endpoints ----
class TestFriends:
    def test_friends_search_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/friends/search", json={"username": "test"})
        assert r.status_code == 401

    def test_friends_request_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/friends/request", json={"friend_id": "x"})
        assert r.status_code == 401

    def test_friends_add_by_code_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/friends/add-by-code", json={"friend_code": "ABCD1234"})
        assert r.status_code == 401

    def test_friends_requests_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/friends/requests")
        assert r.status_code == 401

    def test_friends_list_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/friends/list")
        assert r.status_code == 401

    def test_friends_accept_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/friends/accept/some-id")
        assert r.status_code == 401

    def test_friends_reject_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/friends/reject/some-id")
        assert r.status_code == 401


# ---- Auth-gated functional tests using a seeded session ----
import asyncio
from datetime import datetime, timedelta, timezone


def _seed_session_token():
    """Insert a test user + session token directly into MongoDB and return (token, user_id)."""
    from motor.motor_asyncio import AsyncIOMotorClient
    import uuid

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")

    async def _do():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        user_id = f"user_TEST_{uuid.uuid4().hex[:8]}"
        token = f"TEST_TOKEN_{uuid.uuid4().hex}"
        username = f"testuser_{uuid.uuid4().hex[:6]}"
        friend_code = uuid.uuid4().hex[:8].upper()
        await db.users.insert_one({
            "user_id": user_id,
            "email": f"TEST_{user_id}@example.com",
            "name": "TEST User",
            "picture": None,
            "username": username,
            "friend_code": friend_code,
            "created_at": datetime.now(timezone.utc),
        })
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
            "created_at": datetime.now(timezone.utc),
        })
        client.close()
        return token, user_id, friend_code

    return asyncio.get_event_loop().run_until_complete(_do()) if not asyncio.get_event_loop().is_running() else asyncio.run(_do())


def _cleanup(user_id, token):
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")

    async def _do():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        await db.users.delete_many({"user_id": user_id})
        await db.user_sessions.delete_many({"session_token": token})
        await db.user_status.delete_many({"user_id": user_id})
        client.close()

    asyncio.run(_do())


@pytest.fixture(scope="class")
def seeded_user():
    token, user_id, fc = _seed_session_token()
    yield {"token": token, "user_id": user_id, "friend_code": fc}
    _cleanup(user_id, token)


class TestAuthenticatedFlows:
    def test_get_me_with_valid_token(self, api_client, seeded_user):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == seeded_user["user_id"]
        assert "email" in data and "username" in data and "friend_code" in data
        # Mongo _id should NOT be present
        assert "_id" not in data

    def test_update_status_sleeping(self, api_client, seeded_user):
        r = api_client.post(
            f"{BASE_URL}/api/status/update",
            json={"status": "sleeping"},
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "sleeping"

    def test_update_status_awake(self, api_client, seeded_user):
        r = api_client.post(
            f"{BASE_URL}/api/status/update",
            json={"status": "awake"},
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "awake"

    def test_update_status_invalid_value(self, api_client, seeded_user):
        r = api_client.post(
            f"{BASE_URL}/api/status/update",
            json={"status": "dancing"},
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 400

    def test_friends_status_empty(self, api_client, seeded_user):
        r = api_client.get(
            f"{BASE_URL}/api/status/friends",
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 200
        assert r.json() == []

    def test_friends_list_empty(self, api_client, seeded_user):
        r = api_client.get(
            f"{BASE_URL}/api/friends/list",
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 200
        assert r.json() == []

    def test_friends_requests_empty(self, api_client, seeded_user):
        r = api_client.get(
            f"{BASE_URL}/api/friends/requests",
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 200
        assert r.json() == []

    def test_friends_search(self, api_client, seeded_user):
        r = api_client.post(
            f"{BASE_URL}/api/friends/search",
            json={"username": "nonexistent_user_xyz_abc"},
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_friend_by_invalid_code(self, api_client, seeded_user):
        r = api_client.post(
            f"{BASE_URL}/api/friends/add-by-code",
            json={"friend_code": "NOSUCHCODE"},
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 404

    def test_add_friend_by_own_code(self, api_client, seeded_user):
        r = api_client.post(
            f"{BASE_URL}/api/friends/add-by-code",
            json={"friend_code": seeded_user["friend_code"]},
            headers={"Authorization": f"Bearer {seeded_user['token']}"},
        )
        assert r.status_code == 400  # cannot add self

    def test_logout_with_token(self, api_client, seeded_user):
        # Use a separate token for this test
        token2, uid2, _ = _seed_session_token()
        try:
            r = api_client.post(
                f"{BASE_URL}/api/auth/logout",
                headers={"Authorization": f"Bearer {token2}"},
            )
            assert r.status_code == 200
            # Token should no longer work
            r2 = api_client.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token2}"},
            )
            assert r2.status_code == 401
        finally:
            _cleanup(uid2, token2)
