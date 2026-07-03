"""
Cache Module - Redis Integration for Performance Optimization
Phase 1 Q1-Q2 2025: Backend Performance Optimization
"""
import logging
import json
from typing import Optional, Any, Dict
from datetime import timedelta
import os

logger = logging.getLogger(__name__)

# Try to import Redis, fallback to in-memory cache if not available
try:
    import redis
    from redis.asyncio import Redis as AsyncRedis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available. Using in-memory cache. Install with: pip install redis")

class CacheManager:
    """
    Cache Manager with Redis support and in-memory fallback
    Supports both sync and async operations
    """
    
    def __init__(self):
        self.redis_client: Optional[AsyncRedis] = None
        self.in_memory_cache: Dict[str, tuple] = {}  # {key: (value, expiry_timestamp)}
        self.use_redis = False
        
        if REDIS_AVAILABLE:
            self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            redis_password = os.getenv("REDIS_PASSWORD")
            
            # Parse Redis URL
            if redis_url.startswith("redis://"):
                # Extract connection details
                self.redis_client = AsyncRedis.from_url(
                    redis_url,
                    password=redis_password,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                self.use_redis = True
                logger.info("Redis cache initialized successfully")
            else:
                logger.warning(f"Invalid REDIS_URL format: {redis_url}. Using in-memory cache.")
                self.use_redis = False
        except Exception as e:
            logger.warning(f"Failed to initialize Redis: {e}. Using in-memory cache.")
            self.use_redis = False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if self.use_redis and self.redis_client:
            try:
                value = await self.redis_client.get(key)
                if value:
                    try:
                        return json.loads(value)
                    except json.JSONDecodeError:
                        return value
                return None
            except Exception as e:
                logger.error(f"Redis get error: {e}")
                # Fallback to in-memory
                return self._get_in_memory(key)
        else:
            return self._get_in_memory(key)
    
    def _get_in_memory(self, key: str) -> Optional[Any]:
        """Get value from in-memory cache"""
        if key in self.in_memory_cache:
            value, expiry = self.in_memory_cache[key]
            import time
            if expiry is None or time.time() < expiry:
                return value
            else:
                # Expired
                del self.in_memory_cache[key]
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with optional TTL (seconds)"""
        if self.use_redis and self.redis_client:
            try:
                # Serialize value
                if isinstance(value, (dict, list)):
                    serialized = json.dumps(value)
                else:
                    serialized = str(value)
                
                if ttl:
                    await self.redis_client.setex(key, ttl, serialized)
                else:
                    await self.redis_client.set(key, serialized)
            except Exception as e:
                logger.error(f"Redis set error: {e}")
                # Fallback to in-memory
                self._set_in_memory(key, value, ttl)
        else:
            self._set_in_memory(key, value, ttl)
    
    def _set_in_memory(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in in-memory cache"""
        import time
        expiry = time.time() + ttl if ttl else None
        self.in_memory_cache[key] = (value, expiry)
        
        # Cleanup expired entries periodically (simple cleanup)
        if len(self.in_memory_cache) > 1000:
            self._cleanup_in_memory()
    
    def _cleanup_in_memory(self):
        """Remove expired entries from in-memory cache"""
        import time
        current_time = time.time()
        expired_keys = [
            key for key, (_, expiry) in self.in_memory_cache.items()
            if expiry and expiry < current_time
        ]
        for key in expired_keys:
            del self.in_memory_cache[key]
    
    async def delete(self, key: str):
        """Delete key from cache"""
        if self.use_redis and self.redis_client:
            try:
                await self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
                # Fallback to in-memory
                self._delete_in_memory(key)
        else:
            self._delete_in_memory(key)
    
    def _delete_in_memory(self, key: str):
        """Delete key from in-memory cache"""
        if key in self.in_memory_cache:
            del self.in_memory_cache[key]
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if self.use_redis and self.redis_client:
            try:
                return await self.redis_client.exists(key) > 0
            except Exception as e:
                logger.error(f"Redis exists error: {e}")
                return key in self.in_memory_cache
        else:
            return key in self.in_memory_cache
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.error(f"Error closing Redis connection: {e}")

    def cached(self, ttl: int = 300, key_prefix: str = "cache"):
        """
        Decorator for caching async function results
        """
        from functools import wraps
        
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key from function name and arguments
                cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
                
                # Try to get from cache
                cached_val = await self.get(cache_key)
                if cached_val is not None:
                    return cached_val
                
                # Execute function and store in cache
                result = await func(*args, **kwargs)
                await self.set(cache_key, result, ttl=ttl)
                return result
            return wrapper
        return decorator

# Global cache instance
cache_manager = CacheManager()
