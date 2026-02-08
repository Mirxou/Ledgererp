import logging
import json
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Any, Dict, Optional
from app.core.config import settings

# SECURITY: Centralized Audit Logger
# This logger is separate from the standard server logger and focused on compliance.

class AuditLogger:
    def __init__(self, log_name: str = "audit"):
        self.logger = logging.getLogger(log_name)
        self.logger.setLevel(logging.INFO)
        
        # Ensure logs directory exists
        os.makedirs("logs", exist_ok=True)
        
        # Prevent duplicate handlers if singleton is re-initialized
        if not self.logger.handlers:
            log_file = "logs/audit.log"
            handler = RotatingFileHandler(
                log_file, 
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5
            )
            formatter = logging.Formatter('%(asctime)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            
        # Sensitive fields to redact automatically
        self.sensitive_fields = {
            "token", "accessToken", "access_token", "secret", "key", 
            "seed", "mnemonic", "private_key", "password", "pin"
        }

    def _redact(self, data: Any) -> Any:
        """Recursively redact sensitive fields from a dict or list"""
        if isinstance(data, dict):
            return {
                k: "[REDACTED]" if k.lower() in self.sensitive_fields else self._redact(v)
                for k, v in data.items()
            }
        elif isinstance(data, list):
            return [self._redact(item) for item in data]
        return data

    def log_event(
        self, 
        event_type: str, 
        user_uid: Optional[str] = None, 
        payment_id: Optional[str] = None, 
        status: str = "success", 
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Record a structured audit event.
        
        Args:
            event_type: Type of event (e.g., PAYMENT_APPROVAL, PAYMENT_COMPLETION)
            user_uid: The UID of the associated Pi user
            payment_id: The Pi Network payment ID
            status: Operation status (success, failure, pending)
            metadata: Additional context (amount, currency, error messages)
        """
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event_type,
            "user_uid": user_uid,
            "payment_id": payment_id,
            "status": status,
            "metadata": self._redact(metadata or {})
        }
        
        self.logger.info(json.dumps(audit_entry))
        
        # If it's a critical failure, also log to the main system logger
        if status == "failure":
            system_logger = logging.getLogger("app.main")
            system_logger.error(f"AUDIT_FAILURE: {event_type} - User: {user_uid} - Payment: {payment_id}")

# Singleton instance
audit_logger = AuditLogger()
