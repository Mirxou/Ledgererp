
import pytest
from datetime import datetime, timedelta
import json
import hashlib
import os
from app.services.blockchain import BlockchainService, NodeMode

class MockStellarData:
    def __init__(self, data=None):
        self.data = data or {}
    async def get_account_data(self, account_id, key):
        return self.data.get(key)

@pytest.mark.anyio
async def test_subscription_verification_valid():
    """Test valid subscription on-chain"""
    service = BlockchainService()
    
    # Create valid license
    expiry = (datetime.now() + timedelta(days=30)).isoformat()
    license_data = {
        "tier": "pro",
        "expiry": expiry,
        "merchant_uid": "test_user_123"
    }
    
    # Sign it
    secret = os.getenv("LICENSE_SIGNING_SECRET", "super_secret_signing_key_change_me")
    payload_str = json.dumps(license_data, sort_keys=True)
    signature = hashlib.sha256(f"{payload_str}{secret}".encode()).hexdigest()
    license_data["signature"] = signature
    
    mock_data_service = MockStellarData({
        "pi_ledger_sub": json.dumps(license_data)
    })
    
    result = await service.verify_subscription_on_chain("G_ACCOUNT_ID", mock_data_service)
    
    assert result["is_pro"] is True
    assert result["tier"] == "pro"
    assert result["expiry"] == expiry

@pytest.mark.anyio
async def test_subscription_verification_expired():
    """Test expired subscription"""
    service = BlockchainService()
    
    # Create expired license
    expiry = (datetime.now() - timedelta(days=1)).isoformat()
    license_data = {
        "tier": "pro",
        "expiry": expiry,
        "merchant_uid": "test_user_123"
    }
    
    # Sign it
    secret = os.getenv("LICENSE_SIGNING_SECRET", "super_secret_signing_key_change_me")
    payload_str = json.dumps(license_data, sort_keys=True)
    signature = hashlib.sha256(f"{payload_str}{secret}".encode()).hexdigest()
    license_data["signature"] = signature
    
    mock_data_service = MockStellarData({
        "pi_ledger_sub": json.dumps(license_data)
    })
    
    result = await service.verify_subscription_on_chain("G_ACCOUNT_ID", mock_data_service)
    
    assert result["is_pro"] is False
    assert "expired" in result["reason"]

@pytest.mark.anyio
async def test_subscription_verification_invalid_signature():
    """Test tampered data (wrong signature)"""
    service = BlockchainService()
    
    # Create license
    expiry = (datetime.now() + timedelta(days=30)).isoformat()
    license_data = {
        "tier": "pro",
        "expiry": expiry,
        "merchant_uid": "test_user_123",
        "signature": "fake_signature_123"
    }
    
    mock_data_service = MockStellarData({
        "pi_ledger_sub": json.dumps(license_data)
    })
    
    result = await service.verify_subscription_on_chain("G_ACCOUNT_ID", mock_data_service)
    
    assert result["is_pro"] is False
    assert "Invalid signature" in result["reason"]

@pytest.mark.anyio
async def test_subscription_conversion_logic():
    """Test USD to Pi conversion accuracy"""
    from app.services.market import MarketService
    import time
    
    service = MarketService()
    service.last_price = 0.5  # $0.5 per Pi
    service.last_fetched = time.time()
    
    # $10 should be 20 Pi
    monthly_pi = await service.convert_usd_to_pi(10.0)
    assert monthly_pi == 20.0
    
    # $96 should be 192 Pi
    yearly_pi = await service.convert_usd_to_pi(96.0)
    assert yearly_pi == 192.0

