from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.api.v1.endpoints import invoices, products

router = APIRouter()

@router.get("/status")
async def get_api_status():
    """
    Check the health and version of the Pi Ledger Public API.
    """
    return {
        "status": "operational",
        "version": "1.0.0-beta",
        "phase": "2030 Vision - Phase 4"
    }

# Future endpoints for 3rd party developers
# @router.get("/invoices")
# @router.post("/webhooks")
