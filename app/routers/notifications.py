"""
Notifications Router - Server-Sent Events (SSE) for Real-Time Updates
Sends payment confirmations to frontend when transactions are verified
"""
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Set
import asyncio
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# Store active SSE connections per merchant
# Format: {merchant_id: [queue1, queue2, ...]}
active_connections: Dict[str, Set[asyncio.Queue]] = {}

class NotificationManager:
    """Manages SSE connections and broadcasts notifications"""
    
    @staticmethod
    async def add_connection(merchant_id: str, queue: asyncio.Queue):
        """Add a new SSE connection for a merchant"""
        if merchant_id not in active_connections:
            active_connections[merchant_id] = set()
        active_connections[merchant_id].add(queue)
        logger.info(f"SSE connection added for merchant {merchant_id}")
    
    @staticmethod
    async def remove_connection(merchant_id: str, queue: asyncio.Queue):
        """Remove an SSE connection"""
        if merchant_id in active_connections:
            active_connections[merchant_id].discard(queue)
            if not active_connections[merchant_id]:
                del active_connections[merchant_id]
        logger.info(f"SSE connection removed for merchant {merchant_id}")
    
    @staticmethod
    async def broadcast_notification(merchant_id: str, notification: dict):
        """Broadcast notification to all connections for a merchant"""
        if merchant_id not in active_connections:
            return
        
        message = f"data: {json.dumps(notification)}\n\n"
        disconnected = []
        
        for queue in active_connections[merchant_id]:
            try:
                await queue.put(message)
            except Exception as e:
                logger.error(f"Error sending notification: {e}")
                disconnected.append(queue)
        
        # Remove disconnected queues
        for queue in disconnected:
            await NotificationManager.remove_connection(merchant_id, queue)

# Global notification manager instance
notification_manager = NotificationManager()

async def event_generator(request: Request, merchant_id: str):
    """Yield SSE messages with heartbeat and disconnection awareness."""
    queue = asyncio.Queue()
    try:
        await notification_manager.add_connection(merchant_id, queue)
        yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"

        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield message
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
            # Exit if client disconnected (for tests, supports mocked is_disconnected())
            try:
                if hasattr(request, "is_disconnected") and await request.is_disconnected():
                    break
            except Exception:
                # Ignore disconnect check errors
                pass
    finally:
        await notification_manager.remove_connection(merchant_id, queue)


@router.get("/stream")
async def stream_events(request: Request, merchant_id: str):
    """
    Server-Sent Events endpoint for real-time payment notifications
    Frontend connects to this endpoint to receive payment confirmations
    """
    return StreamingResponse(
        event_generator(request, merchant_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering for nginx
        }
    )

@router.post("/test-notification")
async def test_notification(merchant_id: str, invoice_id: str):
    """
    Test endpoint to send a notification (for development)
    """
    notification = {
        "type": "payment_confirmed",
        "invoice_id": invoice_id,
        "merchant_id": merchant_id,
        "status": "paid",
        "timestamp": datetime.now().isoformat(),
        "message": "Payment confirmed successfully"
    }
    
    await notification_manager.broadcast_notification(merchant_id, notification)
    return {"status": "notification_sent"}

# Export notification manager for use in blockchain service
__all__ = ['router', 'notification_manager', 'event_generator']

