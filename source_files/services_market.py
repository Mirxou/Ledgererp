"""
Market Service - Real-time Pi Price Data
Phase 1 Q1-Q2 2025: Optimized with Redis cache
"""
import httpx
import time
import logging
import asyncio
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Phase 1: Import cache manager for Redis support
from app.core.cache import cache_manager

class MarketService:
    """
    Service to fetch real-time market data for Pi Network (Pi)
    Phase 1: Uses Redis cache for distributed caching
    """
    
    def __init__(self, update_interval: int = 30): # 30 seconds cache (Req: <= 45s)
        self.update_interval = update_interval
        self.last_price: Optional[float] = None
        self.last_fetched: float = 0
        self.price_change_24h: float = 0
        # Bitget API v2 Ticker endpoint for PIUSDT (Spot)
        self.api_url = "https://api.bitget.com/api/v2/spot/market/tickers?symbol=PIUSDT"
        self._lock = asyncio.Lock()
        self.cache_key = "pi_market_price"

    async def get_pi_price(self) -> Dict[str, Any]:
        """
        Get the latest Pi price (USD) from Bitget
        Phase 1: Uses Redis cache for distributed caching
        Returns from cache if interval hasn't passed
        """
        async with self._lock:
            now = time.time()
            
            # Phase 1: Check Redis cache first
            cached_data = await cache_manager.get(self.cache_key)
            if cached_data:
                cache_timestamp = cached_data.get("timestamp", 0)
                if now - cache_timestamp < self.update_interval:
                    logger.debug("Pi price retrieved from Redis cache")
                    self.last_price = cached_data.get("price")
                    self.last_fetched = cache_timestamp
                    self.price_change_24h = cached_data.get("change_24h", 0)
                    return self._format_response()
            
            # Check in-memory cache
            if now - self.last_fetched < self.update_interval and self.last_price is not None:
                return self._format_response()

            try:
                logger.info("Fetching real-time Pi price from Bitget API...")
                async with httpx.AsyncClient(timeout=10.0) as client:
                    headers = {"User-Agent": "LedgerERP/1.0"}
                    response = await client.get(self.api_url, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    
                    if data.get("code") == "00000" and data.get("data"):
                        ticker = data["data"][0]
                        self.last_price = float(ticker.get("lastPr", 0))
                        
                        # Bitget returns open24h
                        open_24h = float(ticker.get("open24h", 0))
                        if open_24h > 0:
                            self.price_change_24h = ((self.last_price - open_24h) / open_24h) * 100
                        else:
                            self.price_change_24h = 0
                            
                        self.last_fetched = now
                        
                        # Phase 1: Store in Redis cache
                        cache_data = {
                            "price": self.last_price,
                            "change_24h": self.price_change_24h,
                            "timestamp": self.last_fetched
                        }
                        await cache_manager.set(self.cache_key, cache_data, ttl=self.update_interval)
                        
                        logger.info(f"✅ Pi Price Updated (Bitget): ${self.last_price}")
                        return self._format_response()
                    else:
                        raise ValueError(f"Bitget API Error: {data.get('msg')}")
            except Exception as e:
                logger.error(f"Error fetching Pi price from Bitget: {e}")
                # Fallback to last known price if available
                if self.last_price:
                    return self._format_response(is_stale=True)
                return {"error": "Price service unavailable", "price": 0}

    def _format_response(self, is_stale: bool = False) -> Dict[str, Any]:
        return {
            "price": self.last_price,
            "currency": "USD",
            "change_24h": round(self.price_change_24h, 2),
            "timestamp": self.last_fetched,
            "is_stale": is_stale,
            "source": "Bitget (PI/USDT)"
        }

    async def convert_usd_to_pi(self, usd_amount: float) -> Optional[float]:
        """
        Convert USD amount to Pi based on current market price
        """
        price_data = await self.get_pi_price()
        price = price_data.get("price")
        
        if price and price > 0:
            return usd_amount / price
        return None

# Singleton instance
market_service = MarketService()
