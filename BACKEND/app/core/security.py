from datetime import datetime, timedelta, timezone
import bcrypt, jwt
from fastapi import HTTPException, status
from app.core.config import get_settings

def hash_password(password: str) -> str: return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
def verify_password(password: str, hashed: str) -> bool: return bcrypt.checkpw(password.encode(), hashed.encode())
def create_token(user: dict, refresh: bool = False) -> str:
    s=get_settings(); expires=timedelta(days=s.refresh_token_expire_days) if refresh else timedelta(minutes=s.access_token_expire_minutes)
    return jwt.encode({"sub":user["user_id"],"company_id":user["company_id"],"role":user["role"],"typ":"refresh" if refresh else "access","exp":datetime.now(timezone.utc)+expires},s.jwt_secret_key,algorithm=s.jwt_algorithm)
def decode_token(token: str, refresh: bool=False) -> dict:
    try:
        payload=jwt.decode(token,get_settings().jwt_secret_key,algorithms=[get_settings().jwt_algorithm])
        if (payload.get("typ")=="refresh") != refresh: raise ValueError()
        return payload
    except Exception: raise HTTPException(status.HTTP_401_UNAUTHORIZED,"Invalid or expired token")
