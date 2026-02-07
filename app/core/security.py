"""
Centralized Security & Pi Authentication Logic
"""
import httpx
import logging
import os
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

PI_API_BASE = "https://api.minepi.com/v2"
# SECURITY: Get API Key from environment variable
PI_API_KEY = os.getenv("PI_API_KEY")

security = HTTPBearer()

# In-memory cache for token verification (Speed Optimization)
# In production, use Redis for multi-worker support
token_cache: Dict[str, Dict[str, Any]] = {}

async def verify_pi_token(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Verify the Pi Network access token and return user data.
    Implements caching for performance (Req #2).
    """
    token = credentials.credentials
    
    # 1. Check Cache (Fast Path)
    if token in token_cache:
        # Check if cache is still valid (simplified)
        # In real app, check timestamps
        return token_cache[token]
    
    # 2. Verify with Pi Network (Slow Path)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PI_API_BASE}/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                user_data = response.json()
                # Cache results for 5 minutes (simplified)
                token_cache[token] = user_data
                return user_data
            elif response.status_code == 401:
                logger.warning("Invalid Pi Token provided")
                raise HTTPException(status_code=401, detail="Invalid token")
            else:
                logger.error(f"Pi API Error {response.status_code}: {response.text}")
                raise HTTPException(status_code=502, detail="Pi API unavailable")
                
    except httpx.RequestError as e:
        logger.error(f"Network error during Pi token verification: {e}")
        raise HTTPException(status_code=503, detail="Could not connect to Pi Network")
    except Exception as e:
        logger.error(f"Unexpected error in token verification: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def verify_pi_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Backward-compatible helper used by legacy routers.
    Returns verified Pi user payload or None if token is invalid/unreachable.
    """
    if not token:
        return None

    if token in token_cache:
        return token_cache[token]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PI_API_BASE}/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0
            )
            if response.status_code == 200:
                user_data = response.json()
                token_cache[token] = user_data
                return user_data
            return None
    except Exception as e:
        logger.warning(f"verify_pi_access_token fallback failed: {e}")
        return None

async def get_current_user(user_data: Dict[str, Any] = Depends(verify_pi_token)) -> Dict[str, Any]:
    """Dependency for route handlers to get the verified Pi user"""
    return user_data

async def get_current_user_id(user_data: Dict[str, Any] = Depends(verify_pi_token)) -> str:
    """Dependency for route handlers to get just the Pi UID"""
    uid = user_data.get("uid")
    if not uid:
        raise HTTPException(status_code=400, detail="User UID missing from Pi response")
    return uid
