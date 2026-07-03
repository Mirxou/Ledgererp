from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
import httpx
import logging
import os
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.core.security import verify_pi_token
from app.services.blockchain import blockchain_service, PI_API_BASE, PI_API_KEY
from app.core.audit import audit_logger

logger = logging.getLogger(__name__)

router = APIRouter()

class InvoiceRegistration(BaseModel):
    invoice_id: str
    invoice_data: Dict[str, Any]

class PaymentIDPayload(BaseModel):
    payment_id: str

class PaymentCompletePayload(BaseModel):
    payment_id: str
    txid: str

@router.post("/register-invoice")
async def register_invoice(
    payload: InvoiceRegistration,
    user_data: dict = Depends(verify_pi_token)
):
    """
    Register invoice data for verification
    Called by frontend when invoice is created
    """
    try:
        blockchain_service.register_invoice(payload.invoice_id, payload.invoice_data)
        audit_logger.log_event(
            "INVOICE_REGISTERED",
            user_uid=user_data.get("uid"),
            metadata={"invoice_id": payload.invoice_id, "amount": payload.invoice_data.get("amount")}
        )
        return {"status": "success", "message": f"Invoice {payload.invoice_id} registered"}
    except Exception as e:
        logger.error(f"Error registering invoice: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/approve")
async def approve_payment(
    payload: PaymentIDPayload,
    user_data: dict = Depends(verify_pi_token)
):
    """
    CRITICAL: Approve payment for Pi.createPayment() flow
    Verifies the payment exists and matches the session user before approving.
    """
    payment_id = payload.payment_id
    uid = user_data.get("uid")

    try:
        # 1. Fetch payment details from Pi Network to verify intent
        payment_data = await blockchain_service.get_payment(payment_id)
        
        # 1b. SECURITY: Verify amount matches the original invoice
        # Get invoice_id from metadata
        invoice_id = payment_data.get("metadata", {}).get("invoice_id")
        if invoice_id:
            registered_invoice = blockchain_service.registered_invoices.get(invoice_id)
            if registered_invoice:
                registered_amount = registered_invoice.get("amount")
                pi_amount = payment_data.get("amount")
                if abs(float(registered_amount) - float(pi_amount)) > 0.001:
                    audit_logger.log_event("PAYMENT_TAMPER_DETECTED", user_uid=uid, payment_id=payment_id, status="failure", metadata={"registered": registered_amount, "pi": pi_amount})
                    raise HTTPException(status_code=400, detail=f"Amount mismatch: Expected {registered_amount}, got {pi_amount}")

        # 2. SECURITY: Verify that this payment belongs to the current user
        if payment_data.get("user_uid") != uid:
            audit_logger.log_event("PAYMENT_HIJACK_ATTEMPT", user_uid=uid, payment_id=payment_id, status="failure", metadata={"expected_uid": payment_data.get("user_uid")})
            raise HTTPException(status_code=403, detail="Unauthorized access to payment")

        # 2. Approve on Pi Network
        approve_data = await blockchain_service.approve_payment(payment_id)
        
        audit_logger.log_event("PAYMENT_APPROVED", user_uid=uid, payment_id=payment_id)
        return approve_data
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving payment: {e}")
        audit_logger.log_event("PAYMENT_APPROVAL_EXCEPTION", user_uid=uid, payment_id=payment_id, status="failure", metadata={"error": str(e)})
        # If it's a hibernation error, propagate it
        if "Hibernation Mode" in str(e):
             raise HTTPException(status_code=503, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete")
async def complete_payment(
    payload: PaymentCompletePayload,
    user_data: dict = Depends(verify_pi_token)
):
    """
    CRITICAL: Complete payment for Pi.createPayment() flow
    Performs on-chain verification before notifying Pi Network of completion.
    """
    payment_id = payload.payment_id
    txid = payload.txid
    uid = user_data.get("uid")
    
    try:
        # 1. Fetch payment details again to get metadata/memo
        pi_payment_data = await blockchain_service.get_payment(payment_id)
        
        # Extract data for verification
        tx_data = {
            "amount": pi_payment_data.get("amount"),
            "memo": pi_payment_data.get("memo"),
            "merchant_id": uid, 
            "transaction_hash": txid,
            "recipient": pi_payment_data.get("to_address"),
            "invoice_id": pi_payment_data.get("metadata", {}).get("invoice_id")
        }
        
        # 2. Strict Verification (Verification Triangle)
        verification_result = await blockchain_service.verify_transaction(tx_data)
        
        if not verification_result.get("verified"):
            audit_logger.log_event("PAYMENT_VERIFICATION_FAILED", user_uid=uid, payment_id=payment_id, status="failure", metadata=verification_result)
            return JSONResponse(status_code=400, content=verification_result)

        # 3. Complete at Pi Network level
        complete_data = await blockchain_service.complete_payment(payment_id, txid)
        
        audit_logger.log_event("PAYMENT_COMPLETED", user_uid=uid, payment_id=payment_id, metadata={"txid": txid})
        return complete_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing payment: {e}")
        audit_logger.log_event("PAYMENT_COMPLETION_EXCEPTION", user_uid=uid, payment_id=payment_id, status="failure", metadata={"error": str(e)})
        if "Hibernation Mode" in str(e):
             raise HTTPException(status_code=503, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))
