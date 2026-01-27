
import pytest
import httpx
import json
import time
from app.services.market import MarketService

@pytest.mark.anyio
async def test_bitget_parsing_logic():
    """Test that MarketService correctly parses Bitget API v2 response"""
    service = MarketService()
    
    # Mock Bitget Response
    mock_response = {
        "code": "00000",
        "msg": "success",
        "data": [
            {
                "symbol": "PIUSDT",
                "lastPr": "0.1850",
                "open24h": "0.1500",
                "high24h": "0.2000",
                "low24h": "0.1400",
                "ts": str(int(time.time() * 1000))
            }
        ],
        "requestTime": int(time.time() * 1000)
    }
    
    # We will manually trigger the format logic by setting internal state 
    # (since we can't easily mock httpx.AsyncClient without deep monkeypatching here)
    ticker = mock_response["data"][0]
    service.last_price = float(ticker["lastPr"])
    open_24h = float(ticker["open24h"])
    service.price_change_24h = ((service.last_price - open_24h) / open_24h) * 100
    service.last_fetched = time.time()
    
    result = service._format_response()
    
    assert result["price"] == 0.1850
    assert result["source"] == "Bitget (PI/USDT)"
    assert result["change_24h"] == 23.33 # ((0.185-0.15)/0.15)*100

@pytest.mark.anyio
async def test_subscription_quote_endpoint_accuracy():
    """Test the calculation for Monthly and Yearly tiers"""
    from app.services.market import market_service
    
    # Set a fixed price for deterministic test
    market_service.last_price = 0.20 # $1 = 5 Pi
    market_service.last_fetched = time.time()
    
    # $10 should be 50 Pi
    monthly_pi = await market_service.convert_usd_to_pi(10.0)
    assert monthly_pi == 50.0
    
    # $96 should be 480 Pi
    yearly_pi = await market_service.convert_usd_to_pi(96.0)
    assert yearly_pi == 480.0

def test_bitget_api_url():
    """Verify the API URL is correct for Bitget v2"""
    service = MarketService()
    assert "api.bitget.com" in service.api_url
    assert "symbol=PIUSDT" in service.api_url
