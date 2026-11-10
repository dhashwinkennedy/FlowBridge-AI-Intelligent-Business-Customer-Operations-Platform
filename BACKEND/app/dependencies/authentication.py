from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_token
from app.database.mongodb import database
bearer=HTTPBearer()
async def current_user(credentials: HTTPAuthorizationCredentials=Depends(bearer)):
    payload=decode_token(credentials.credentials)
    if database.db is None: raise HTTPException(503,"Database unavailable")
    user=await database.db.users.find_one({"user_id":payload["sub"],"company_id":payload["company_id"],"is_active":True},{"_id":0})
    if not user: raise HTTPException(401,"User no longer active")
    return user
def roles(*allowed):
    async def dependency(user=Depends(current_user)):
        if user["role"] not in allowed: raise HTTPException(403,"Insufficient permissions")
        return user
    return dependency
