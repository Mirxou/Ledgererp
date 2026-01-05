import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import hashlib

from app.main import app
from app.core.database import Base, get_db
from app.models.sql_models import VaultEntry, TelemetryEvent

# Use the same DB file as the app for this test to verify persistence
SQLALCHEMY_DATABASE_URL = "sqlite:///./piledger.db"

client = TestClient(app)

def test_vault_persistence():
    """
    Verify that vault data is stored in the SQLite database file
    """
    # 1. Upload Vault
    encrypted_blob = "enc_data_12345"
    recovery_password = "secure_password"
    recovery_hash = hashlib.sha256(recovery_password.encode()).hexdigest()
    
    payload = {
        "encrypted_blob": encrypted_blob,
        "recovery_hash": recovery_hash,
        "version": "1.0",
        "timestamp": "2023-01-01T12:00:00"
    }
    
    response = client.post("/sync/vault", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # 2. Verify Database File Exists
    assert os.path.exists("piledger.db")
    
    # 3. Direct DB Verification
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # User ID is hardcoded to "anonymous" in the current implementation
    vault_entry = session.query(VaultEntry).filter_by(user_id="anonymous").first()
    assert vault_entry is not None
    assert vault_entry.encrypted_blob == encrypted_blob
    
    session.close()
    
    # 4. Download Vault via API
    response = client.get(f"/sync/vault?recovery_password={recovery_password}")
    assert response.status_code == 200
    assert response.json()["encrypted_blob"] == encrypted_blob
    print("✅ Vault Persistence Verified")

def test_telemetry_persistence():
    """
    Verify telemetry events are stored in SQL
    """
    # 1. Submit Event
    event_payload = {
        "event_type": "test_event_persistence",
        "timestamp": "2023-01-01T12:00:00",
        "metadata": {"test": "true"}
    }
    
    response = client.post("/telemetry/events", json=event_payload)
    assert response.status_code == 200
    
    # 2. Direct DB Verification
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    event = session.query(TelemetryEvent).filter_by(event_type="test_event_persistence").first()
    assert event is not None
    assert event.metadata_json == {"test": "true"}
    
    session.close()
    print("✅ Telemetry Persistence Verified")

if __name__ == "__main__":
    # Run tests manually
    test_vault_persistence()
    test_telemetry_persistence()
