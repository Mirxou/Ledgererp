"""
Telemetry Router - Anonymous Analytics (Stateless / Log-Based)
Req #27: Anonymous analytics service (No PII) for Ventures metrics
Req #39: Bug Reporting - Feedback Loop
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import logging
import json

from app.core.security import verify_pi_token

logger = logging.getLogger(__name__)

router = APIRouter()

class TelemetryEvent(BaseModel):
    """Anonymous telemetry event (no PII)"""
    event_type: str  # e.g., "invoice_created", "payment_received"
    timestamp: str
    metadata: Dict[str, Any]  # Anonymized metadata only

@router.post("/events")
async def submit_telemetry_event(
    event: TelemetryEvent,
    request: Request,
    user_data: Dict[str, Any] = Depends(verify_pi_token)
):
    """
    Req #27: Submit anonymous telemetry event
    Requires real Pi authentication.
    Implementation: Stateless logging (No Database).
    """
    try:
        # Validate no PII in metadata
        forbidden_keys = ['username', 'email', 'phone', 'address', 'name', 'uid', 'user_id', 'merchant_id']
        for key in forbidden_keys:
            if key.lower() in str(event.metadata).lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"PII detected in metadata. Key '{key}' is not allowed."
                )
        
        # Log event (Stateless)
        event_data = {
            "type": event.event_type,
            "ts": event.timestamp or datetime.now().isoformat(),
            "meta": event.metadata,
            "ip_hash": str(hash(request.client.host)) if request.client else None
        }
        
        logger.info(f"TELEMETRY_EVENT: {json.dumps(event_data)}")
        
        return {
            "status": "success",
            "message": "Event recorded"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording telemetry: {e}")
        raise HTTPException(status_code=500, detail="Failed to record event")

@router.get("/metrics")
async def get_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_data: Dict[str, Any] = Depends(verify_pi_token)
):
    """
    Req #27: Get aggregated metrics
    NOTE: In Stateless mode, this returns empty or real-time headers only.
    Real aggregation requires an external log processor.
    """
    return {
        "status": "success",
        "metrics": {
            "total_events": 0,
            "note": "Metrics aggregation requires external log processing in Stateless Mode."
        }
    }

@router.get("/health")
async def telemetry_health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mode": "stateless",
        "service": "telemetry"
    }

@router.post("/logs", operation_id="submit_bug_report")
async def submit_bug_logs(
    log_data: dict
):
    """
    Req #39: Bug Reporting - Receive sanitized error logs
    Accepts non-sensitive technical logs for debugging.
    """
    try:
        # Validate log data structure
        if not isinstance(log_data, dict):
            raise HTTPException(status_code=400, detail="Invalid log data format")
        
        description = log_data.get("description", "")
        
        # Log report (Stateless)
        logger.info(f"BUG_REPORT: {json.dumps(log_data)}")
        
        return {
            "status": "success",
            "message": "Bug report submitted successfully",
            "report_id": "log-only"
        }
    except Exception as e:
        logger.error(f"Error processing bug report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process bug report: {str(e)}")

