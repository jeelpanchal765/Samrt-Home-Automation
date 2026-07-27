import os
from datetime import datetime, timedelta, timezone

import jwt
from google.auth.transport import requests
from google.oauth2 import id_token

JWT_SECRET = os.environ.get("JWT_SECRET", "domi-dev-secret-change-me")
JWT_EXPIRE_DAYS = 7
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")


def verify_google_token(credential: str) -> dict | None:
    if not GOOGLE_CLIENT_ID:
        return None
    try:
        info = id_token.verify_oauth2_token(
            credential, requests.Request(), GOOGLE_CLIENT_ID
        )
        if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            return None
        return {
            "id": info["sub"],
            "email": info.get("email", ""),
            "name": info.get("name", "User"),
            "picture": info.get("picture", ""),
        }
    except ValueError:
        return None


def create_session_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture", ""),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_session_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
