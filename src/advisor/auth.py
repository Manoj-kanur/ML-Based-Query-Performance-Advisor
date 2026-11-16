"""
MongoDB User Authentication and Credential Store for Query Performance Advisor.
Handles password hashing via bcrypt and user persistence in MongoDB.
"""

from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import bcrypt
import pymongo


MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "query_advisor_db")

_mongo_client: Optional[pymongo.MongoClient] = None
_in_memory_users: Dict[str, Dict[str, Any]] = {}


def get_mongo_db():
    """Returns MongoDB database handle, or None if connection fails."""
    global _mongo_client
    if _mongo_client is None:
        try:
            _mongo_client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2500)
            # Test connection
            _mongo_client.admin.command("ping")
        except Exception as e:
            print(f"[Auth] MongoDB connection warning ({e}). Falling back to local memory store.")
            _mongo_client = None
    if _mongo_client:
        return _mongo_client[DB_NAME]
    return None


def hash_password(password: str) -> str:
    """Hashes a plain text password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def register_user(username: str, password: str) -> Dict[str, Any]:
    """
    Registers a new user in MongoDB.
    Raises ValueError if username already exists or invalid.
    """
    u_clean = username.strip().lower()
    if len(u_clean) < 3:
        raise ValueError("Username must be at least 3 characters long.")
    if len(password) < 4:
        raise ValueError("Password must be at least 4 characters long.")

    pw_hash = hash_password(password)
    user_doc = {
        "username": u_clean,
        "password_hash": pw_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": datetime.now(timezone.utc).isoformat(),
    }

    db = get_mongo_db()
    if db is not None:
        users_col = db["users"]
        # Ensure unique index on username
        try:
            users_col.create_index("username", unique=True)
        except Exception:
            pass

        existing = users_col.find_one({"username": u_clean})
        if existing:
            raise ValueError(f"Username '{u_clean}' is already registered.")

        users_col.insert_one(user_doc)
    else:
        # In-memory fallback
        if u_clean in _in_memory_users:
            raise ValueError(f"Username '{u_clean}' is already registered.")
        _in_memory_users[u_clean] = user_doc

    return {"username": u_clean, "created_at": user_doc["created_at"]}


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticates username and password against MongoDB.
    Returns user dict without password hash if successful, None otherwise.
    """
    u_clean = username.strip().lower()
    db = get_mongo_db()

    user_doc = None
    if db is not None:
        users_col = db["users"]
        user_doc = users_col.find_one({"username": u_clean})
        if user_doc and verify_password(password, user_doc["password_hash"]):
            users_col.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
            return {"username": user_doc["username"], "created_at": user_doc.get("created_at")}
    else:
        user_doc = _in_memory_users.get(u_clean)
        if user_doc and verify_password(password, user_doc["password_hash"]):
            return {"username": user_doc["username"], "created_at": user_doc.get("created_at")}

    return None

