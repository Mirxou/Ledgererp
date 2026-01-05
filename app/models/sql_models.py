from sqlalchemy import Column, String, Integer, DateTime, JSON
from app.core.database import Base
from datetime import datetime

class VaultEntry(Base):
    __tablename__ = "vault_entries"

    user_id = Column(String, primary_key=True, index=True)
    encrypted_blob = Column(String, nullable=False)
    recovery_hash = Column(String, nullable=False)
    version = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    uploaded_at = Column(String, default=lambda: datetime.now().isoformat())

class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    timestamp = Column(String)
    metadata_json = Column(JSON) # Renamed to avoid conflicts
    ip_hash = Column(String, nullable=True)
    received_at = Column(String, default=lambda: datetime.now().isoformat())

class BugReport(Base):
    __tablename__ = "bug_reports"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    steps = Column(String)
    user_agent = Column(String)
    platform = Column(String)
    url = Column(String)
    timestamp = Column(String)
    error_logs = Column(JSON)
    ip_address = Column(String, default="anonymized")
