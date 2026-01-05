"""
Telemetry Router - Anonymous Analytics
Req #27: Anonymous analytics service (No PII) for Ventures metrics
Req #39: Bug Reporting - Feedback Loop
"""
from fastapi import APIRouter, Request, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import logging
import json
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.sql_models import TelemetryEvent as TelemetryEventModel, BugReport

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
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Req #27: Submit anonymous telemetry event
    No PII (Personally Identifiable Information) allowed
    """
    try:
        # Validate no PII in metadata
        forbidden_keys = ['username', 'email', 'phone', 'address', 'name', 'uid', 'user_id']
        for key in forbidden_keys:
            if key.lower() in str(event.metadata).lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"PII detected in metadata. Key '{key}' is not allowed."
                )
        
        # Store anonymized event
        new_event = TelemetryEventModel(
            event_type=event.event_type,
            timestamp=event.timestamp or datetime.now().isoformat(),
            metadata_json=event.metadata,
            ip_hash=str(hash(request.client.host)) if request.client else None,
            received_at=datetime.now().isoformat()
        )
        
        db.add(new_event)
        db.commit()
        
        # Optional: Retention policy (keep last 10000) - can be done as background task or skipped for SQLite
        # For hackathon, unlimited is fine or simple check
        
        logger.info(f"Telemetry event received: {event.event_type}")
        
        return {
            "status": "success",
            "message": "Event recorded"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording telemetry: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to record event")

@router.get("/metrics")
async def get_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Req #27: Get aggregated metrics for Ventures pitch
    Returns anonymous statistics only
    """
    try:
        # Build query
        query = db.query(TelemetryEventModel)
        
        if start_date:
            query = query.filter(TelemetryEventModel.timestamp >= start_date)
        if end_date:
            query = query.filter(TelemetryEventModel.timestamp <= end_date)
            
        events = query.all()
        
        # Aggregate by event type
        event_counts: Dict[str, int] = {}
        for event in events:
            ev_type = event.event_type
            event_counts[ev_type] = event_counts.get(ev_type, 0) + 1
        
        # Calculate daily averages
        total_events = len(events)
        days = 1
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date)
                days = max(1, (end - start).days)
            except:
                pass
        
        daily_average = total_events / days if days > 0 else 0
        
        return {
            "status": "success",
            "metrics": {
                "total_events": total_events,
                "daily_average": round(daily_average, 2),
                "event_types": event_counts,
                "period": {
                    "start": start_date or "all",
                    "end": end_date or "all"
                }
            },
            "note": "All data is anonymized. No PII included."
        }
    
    except Exception as e:
        logger.error(f"Error generating metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate metrics")

@router.get("/health")
async def telemetry_health(db: Session = Depends(get_db)):
    """Health check endpoint"""
    count = db.query(TelemetryEventModel).count()
    return {
        "status": "healthy",
        "events_stored": count,
        "service": "telemetry"
    }

@router.post("/logs", operation_id="submit_bug_report")
async def submit_bug_logs(
    log_data: dict,
    db: Session = Depends(get_db)
):
    """
    Req #39: Bug Reporting - Receive sanitized error logs
    Accepts non-sensitive technical logs for debugging
    """
    try:
        # Validate log data structure
        if not isinstance(log_data, dict):
            raise HTTPException(status_code=400, detail="Invalid log data format")
        
        # Extract report data
        description = log_data.get("description", "")
        steps = log_data.get("steps", "")
        logs = log_data.get("logs", [])
        user_agent = log_data.get("userAgent", "")
        platform = log_data.get("platform", "")
        timestamp = log_data.get("timestamp", "")
        url = log_data.get("url", "")
        
        # Sanitize URL
        if url:
            url = url.split("?")[0]
        
        # Create log entry
        new_report = BugReport(
            description=description[:500],
            steps=steps[:1000],
            user_agent=user_agent[:200],
            platform=platform,
            url=url,
            timestamp=timestamp,
            error_logs=logs[:20], # Will be stored as JSON
            ip_address="anonymized"
        )
        
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        
        logger.info(f"Bug report received: {description[:50]}...")
        
        return {
            "status": "success",
            "message": "Bug report submitted successfully",
            "report_id": new_report.id
        }
    except Exception as e:
        logger.error(f"Error processing bug report: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process bug report: {str(e)}")

