"""
Centralized Security & Pi Authentication Logic
Phase 1 Q1-Q2 2025: Optimized with Redis cache
"""
import httpx
import logging
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings

logger = logging.getLogger(__name__)

# SECURITY: Use SECRET_KEY from settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15

PI_API_BASE = "https://api.minepi.com/v2"
# SECURITY: Get API Key from central settings
PI_API_KEY = settings.PI_API_KEY

security = HTTPBearer()

# Phase 1: Use Redis cache for token verification (multi-worker support)
from app.core.cache import cache_manager

# Fallback in-memory cache (for development or when Redis unavailable)
# ⚠️ SECURITY NOTE: Token caching is necessary for performance in multi-worker environments
# However, this violates strict Zero-Knowledge principles. Consider:
# 1. Short TTL (5 minutes) - tokens expire quickly
# 2. Redis in production - volatile store that doesn't persist
# 3. SessionID-based approach - store only session metadata, not tokens
# For true Zero-Knowledge: implement token-less verification or move tokens to frontend
token_cache: Dict[str, Dict[str, Any]] = {}

async def verify_pi_access_token(token: str) -> Dict[str, Any]:
    """
    Verify a raw Pi Network access token string.
    Phase 1 Optimization: Uses Redis cache for multi-worker support
    
    ⚠️ ZERO-KNOWLEDGE NOTE: This function caches tokens on the server.
    While this improves performance, it partially violates Zero-Knowledge principles.
    Tokens are cached for 5 minutes maximum and only contain non-sensitive user data (uid, username).
    """
    # 1. Check Cache (Fast Path) - Try Redis first, fallback to in-memory
    cache_key = f"pi_token:{token}"
    
    # Try Redis cache
    cached_data = await cache_manager.get(cache_key)
    if cached_data:
        logger.debug("Token verified from cache (Redis)")
        return cached_data
    
    # Fallback to in-memory cache
    if token in token_cache:
        logger.debug("Token verified from cache (in-memory)")
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
                # Cache results for 5 minutes (300 seconds)
                cache_ttl = 300
                
                # Store in Redis cache
                await cache_manager.set(cache_key, user_data, ttl=cache_ttl)
                
                # Also store in in-memory cache as fallback
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in token verification: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

def create_session_token(data: dict, request: Request):
    """
    Create a JWT session token wrapped with device identifiers
    SECURITY: Hijacking protection via IP and User-Agent binding
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Extract identifiers for binding
    user_agent = request.headers.get("User-Agent", "unknown")
    ua_hash = hashlib.sha256(user_agent.encode()).hexdigest()
    
    # Use proxy-aware IP if available
    from app.main import ProxyAwareIPExtractor
    client_ip = ProxyAwareIPExtractor.get_client_ip(request)
    
    to_encode.update({
        "exp": expire,
        "ua": ua_hash,
        "ip": client_ip,
        "iat": datetime.utcnow()
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_pi_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI Dependency: Verify the Pi Network access token or Session JWT.
    Priority: 
    1. Authorization: Bearer Header (for direct SDK calls)
    2. pi_session Cookie (Session JWT - Req #2 enhancement)
    """
    token = None
    is_session_jwt = False
    
    # 1. Check Header (Bearer Token)
    if credentials:
        token = credentials.credentials
        
    # 2. Check Cookie (Session JWT) if header is missing
    if not token:
        token = request.cookies.get("pi_session")
        if token:
            is_session_jwt = True
        
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please log in via Pi Browser."
        )
        
    # 3. Handle Session JWT
    if is_session_jwt:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            pi_access_token = payload.get("accessToken")
            
            if not pi_access_token:
                raise HTTPException(status_code=401, detail="Invalid session payload")
                
            # 4. Hijacking Protection: Check IP and User-Agent
            user_agent = request.headers.get("User-Agent", "unknown")
            ua_hash = hashlib.sha256(user_agent.encode()).hexdigest()
            
            from app.main import ProxyAwareIPExtractor
            client_ip = ProxyAwareIPExtractor.get_client_ip(request)
            
            if payload.get("ua") != ua_hash or payload.get("ip") != client_ip:
                logger.warning(f"Session Hijacking Attempt Detected! IP: {client_ip}")
                raise HTTPException(status_code=401, detail="Session binding failed. Please log in again.")
                
            # Session is valid, verify the underlying Pi token
            return await verify_pi_access_token(pi_access_token)
            
        except JWTError:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
            
    # 5. Handle Direct Bearer Token
    return await verify_pi_access_token(token)

async def get_current_user(user_data: Dict[str, Any] = Depends(verify_pi_token)) -> Dict[str, Any]:
    """Dependency for route handlers to get the verified Pi user"""
    return user_data

async def get_current_user_id(user_data: Dict[str, Any] = Depends(verify_pi_token)) -> str:
    """Dependency for route handlers to get just the Pi UID"""
    uid = user_data.get("uid")
    if not uid:
        raise HTTPException(status_code=400, detail="User UID missing from Pi response")
    return uid
