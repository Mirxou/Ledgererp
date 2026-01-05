"""
KYB Middleware - Role-Based Access Control
Req #28: KYB Role middleware (Owner vs Cashier)
"""
from fastapi import Request, HTTPException, Header
from typing import Optional, Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class Role(Enum):
    """User roles"""
    OWNER = "owner"  # Full permissions + keys
    CASHIER = "cashier"  # Invoice creation only (with PIN)

class KYBMiddleware(BaseHTTPMiddleware):
    """
    Req #28: KYB Role middleware
    Enforces role-based access control
    """
    
    def __init__(self, app, require_auth: bool = True):
        super().__init__(app)
        self.require_auth = require_auth
        # In production, store role mappings in database
        self.role_cache: dict[str, Role] = {}
    
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        public_paths = ["/", "/blockchain/status", "/.well-known/", "/static/"]
        if any(request.url.path.startswith(path) for path in public_paths):
            return await call_next(request)
        
        # Extract user ID from auth token (in production, decode JWT)
        authorization = request.headers.get("Authorization")
        user_id = self._extract_user_id(authorization)
        
        if not user_id and self.require_auth:
            return Response(
                content='{"error": "Authentication required"}',
                status_code=401,
                media_type="application/json"
            )
        
        # Get user role
        user_role = self._get_user_role(user_id)
        
        # Check permissions based on endpoint
        if not self._check_permission(request.url.path, request.method, user_role):
            return Response(
                content=f'{{"error": "Insufficient permissions. Required role: {self._get_required_role(request.url.path)}"}}',
                status_code=403,
                media_type="application/json"
            )
        
        # Add role to request state
        request.state.user_id = user_id
        request.state.user_role = user_role
        
        response = await call_next(request)
        return response
    
    def _extract_user_id(self, authorization: Optional[str]) -> Optional[str]:
        """Extract user ID from authorization header"""
        if not authorization:
            return None
        
        # In production, decode JWT token
        # For now, simple extraction
        if authorization.startswith("Bearer "):
            token = authorization[7:]
            # Mock extraction - in production, decode JWT
            return token.split(".")[0] if "." in token else None
        
        return None
    
    def _get_user_role(self, user_id: Optional[str]) -> Optional[Role]:
        """Get user role (Req #28)"""
        if not user_id:
            return None
        
        # Check cache first
        if user_id in self.role_cache:
            return self.role_cache[user_id]
        
        # In production, query database
        # For now, default to OWNER (first user is owner)
        # In real implementation, check database for role assignment
        role = Role.OWNER  # Default
        
        self.role_cache[user_id] = role
        return role
    
    def _check_permission(self, path: str, method: str, role: Optional[Role]) -> bool:
        """Check if user role has permission for endpoint"""
        if not role:
            return False
        
        # Req #28: Owner has full access
        if role == Role.OWNER:
            return True
        
        # Req #28: Cashier can only create invoices (with PIN)
        if role == Role.CASHIER:
            # Cashier can only POST to invoice creation endpoints
            cashier_allowed_paths = ["/invoices/create", "/invoices"]
            cashier_allowed_methods = ["POST", "GET"]
            
            if method in cashier_allowed_methods:
                return any(path.startswith(allowed) for allowed in cashier_allowed_paths)
            
            return False
        
        return False
    
    def _get_required_role(self, path: str) -> str:
        """Get required role for endpoint (for error messages)"""
        if "/vault" in path or "/reports" in path:
            return "OWNER"
        return "CASHIER or OWNER"

# Helper function to get current user role from request
def get_user_role(request: Request) -> Optional[Role]:
    """Get user role from request state"""
    return getattr(request.state, "user_role", None)

def require_role(required_role: Role):
    """Decorator to require specific role"""
    def decorator(func: Callable):
        async def wrapper(request: Request, *args, **kwargs):
            user_role = get_user_role(request)
            if user_role != required_role and user_role != Role.OWNER:
                raise HTTPException(
                    status_code=403,
                    detail=f"Requires {required_role.value} role"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

