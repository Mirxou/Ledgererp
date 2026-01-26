import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
import os
# Inject dummy API key to force real logic (not mock fallback)
os.environ["PI_API_KEY"] = "test_key_123"

from app.main import app

client = TestClient(app)

# Mock data
MOCK_PAYMENT_ID = "payment_12345"
MOCK_TXID = "tx_abc123"
MOCK_INVOICE_ID = "inv_test_001"

@pytest.mark.filterwarnings("ignore::pytest.PytestUnknownMarkWarning")
def test_approve_payment_success():
    """
    Test Step 2: /blockchain/approve
    Should call Pi API /approve and return 200
    """
    # Patch the module-level PI_API_KEY to force real logic
    with patch("app.main.PI_API_KEY", "test_key_forced"):
        # Mock the httpx.AsyncClient to simulate success from Pi Server
        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = mock_client.return_value
            mock_instance.__aenter__.return_value = mock_instance
            
            # Mock response from Pi Server
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"approved": True}
            
            # Make post awaitable
            mock_instance.post = AsyncMock(return_value=mock_response)

            # Call our backend
            response = client.post("/blockchain/approve", json={"payment_id": MOCK_PAYMENT_ID})
            
            # Verify
            assert response.status_code == 200
            assert response.json()["approved"] is True
        
def test_complete_payment_success():
    """
    Test Step 4: /blockchain/complete
    Should call Pi API /complete and return 200
    """
    # Patch the module-level PI_API_KEY to force real logic
    with patch("app.main.PI_API_KEY", "test_key_forced"):
        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = mock_client.return_value
            mock_instance.__aenter__.return_value = mock_instance
            
            # Mock response from Pi Server
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"completed": True, "payment": {"status": "COMPLETED"}}
            
            # Make post awaitable
            mock_instance.post = AsyncMock(return_value=mock_response)

            # Call our backend
            response = client.post("/blockchain/complete", json={"payment_id": MOCK_PAYMENT_ID, "txid": MOCK_TXID})
            
            # Verify
            assert response.status_code == 200
            assert response.json()["completed"] is True

def test_get_stellar_account_success():
    """
    Test Step 5: /api/pi/get-stellar-account
    Should return a synthesized account ID based on UID
    """
    # Force real logic just in case
    with patch("app.main.PI_API_KEY", "test_key_forced"):
        with patch("app.main.verify_pi_access_token", new_callable=AsyncMock) as mock_verify:
            # Mock successful user verification
            mock_verify.return_value = {"uid": "user_12345_test", "username": "testuser"}
            
            # Call endpoint
            response = client.post(
                "/api/pi/get-stellar-account", 
                headers={"Authorization": "Bearer valid_token"},
                json={"uid": "user_12345_test"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "accountId" in data
            assert data["accountId"].startswith("G")
            assert len(data["accountId"]) == 56
            assert data["secretKey"] is None # Security check

def test_approve_payment_missing_id():
    """
    Test validation errors
    """
    response = client.post("/blockchain/approve", json={})
    assert response.status_code == 400
    assert "payment_id required" in response.json()["message"]

def test_complete_payment_missing_fields():
    """
    Test validation errors
    """
    response = client.post("/blockchain/complete", json={"payment_id": MOCK_PAYMENT_ID})
    assert response.status_code == 400
    assert "payment_id and txid required" in response.json()["message"]
