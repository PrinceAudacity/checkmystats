# backend/auth.py
from fastapi import Depends, HTTPException, Header
from database import get_supabase
from supabase import Client


async def get_current_user(
    authorization: str = Header(None),
    sb: Client = Depends(get_supabase),
) -> str:
    """Extract and verify Supabase JWT. Returns user_id string."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        response = sb.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(response.user.id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
