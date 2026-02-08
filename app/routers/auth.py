from fastapi import APIRouter, Request, Response, HTTPException, Depends
from typing import Dict, Any
import logging
from app.core.security import verify_pi_access_token, create_session_token
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/login")
async def login(request: Request, response: Response):
    """
    Exchange Pi Access Token for a secure JWT session cookie.
    Req #2: Auth Logic Enhancement
    """
    try:
        data = await request.json()
        access_token = data.get("accessToken")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Missing accessToken")
            
        # 1. Verify token with Pi Network (or cache)
        user_data = await verify_pi_access_token(access_token)
        
        # 2. Create JWT Session (with IP/UA binding)
        session_token = create_session_token({
            "uid": user_data.get("uid"),
            "username": user_data.get("username"),
            "accessToken": access_token
        }, request)
        
        # 3. Set Secure HttpOnly Cookie
        is_secure = settings.ENVIRONMENT == "production"
        
        response.set_cookie(
            key="pi_session",
            value=session_token,
            httponly=True,
            secure=is_secure,
            samesite="strict",
            max_age=900, 
            path="/"
        )
        
        return {
            "status": "success",
            "user": {
                "username": user_data.get("username"),
                "uid": user_data.get("uid")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.post("/logout")
async def logout(response: Response):
    """Clear the session cookie"""
    response.delete_cookie("pi_session")
    return {"status": "success", "message": "Logged out"}

@router.get("/me")
async def get_me(user_data: Dict[str, Any] = Depends(verify_pi_token)):
    """Check current session (Uses Dependency with Hijacking protection)"""
    return {
        "status": "success",
        "user": {
            "username": user_data.get("username"),
            "uid": user_data.get("uid")
        }
    }
