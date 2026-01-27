"""
Blockchain Router - Pure On-Chain Storage Proxy
Implements "Stateless" Architecture by deriving keys deterministically.
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import hashlib
import logging
import base64

from app.core.security import verify_pi_access_token, verify_pi_token
from app.services.blockchain import StellarAccountData
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Stellar Service
stellar_data = StellarAccountData()

# MASTER KEY for deterministic derivation
# SECURITY: In production, this MUST be a high-entropy secret from KV/Env
MASTER_DERIVATION_KEY = os.getenv("SECRET_KEY", "dev_secret_key_change_in_prod")

def derive_keypair(user_uid: str):
    """
    Derive a deterministic Stellar Keypair from User UID.
    Algorithm: Ed25519 Seed = SHA256(MasterKey + UID)
    Result: Always the same key for the same user. No DB needed.
    """
    try:
        from stellar_sdk import Keypair
        
        # Create predictable seed
        seed_source = f"{MASTER_DERIVATION_KEY}:{user_uid}".encode('utf-8')
        seed = hashlib.sha256(seed_source).digest() # 32 bytes
        
        # Derive keypair from raw seed
        keypair = Keypair.from_raw_ed25519_seed(seed)
        return keypair
    except ImportError:
        logger.error("Stellar SDK missing")
        return None

class DataPayload(BaseModel):
    key: str
    value: str # Base64 encoded value

@router.post("/get-stellar-account")
async def get_stellar_account(request: Request):
    """
    Get (Derive) the Stellar Account for the current user.
    Used by frontend to know its address.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing Token")
        
    token = auth_header.replace("Bearer ", "")
    user = await verify_pi_access_token(token)
    if not user:
        raise HTTPException(401, "Invalid Token")
        
    uid = user.get("uid")
    keypair = derive_keypair(uid)
    
    if not keypair:
        raise HTTPException(500, "Key derivation failed")
        
    return {
        "status": "success",
        "accountId": keypair.public_key,
        "publicKey": keypair.public_key,
        # SECURITY: NEVER return secret key to frontend
        # The backend handles signing via proxy endpoints
        "message": "Account derived successfully"
    }

@router.post("/data")
async def set_data(
    payload: DataPayload, 
    user_data: dict = Depends(verify_pi_token)
):
    """
    Write data to Blockchain on behalf of user.
    Backend signs the transaction using derived key.
    """
    uid = user_data.get("uid")
    keypair = derive_keypair(uid)
    
    if not keypair:
        raise HTTPException(500, "Blockchain service unavailable")
        
    # Sign and Submit
    try:
        result = await stellar_data.set_account_data(
            account_secret=keypair.secret,
            key=payload.key,
            value=payload.value
        )
        return result
    except Exception as e:
        logger.error(f"Blockchain write error: {e}")
        # Map specific Stellar errors?
        raise HTTPException(500, f"Blockchain write failed: {str(e)}")

@router.get("/data/{account_id}/{key}")
async def get_data(account_id: str, key: str, user_data: dict = Depends(verify_pi_token)):
    """
    Read data from Blockchain.
    """
    try:
        # We allow reading any account's data if you have the ID (Public Ledger)
        value = await stellar_data.get_account_data(account_id, key)
        if value is None:
            raise HTTPException(404, "Data not found")
            
        # Value is returned as base64 string (Stellar stores bytes)
        # We return it wrapper in JSON
        encrypted_val = base64.b64encode(value.encode('utf-8')).decode('utf-8')
        
        return {
            "key": key,
            "value": encrypted_val # Frontend expects base64
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Blockchain read error: {e}")
        raise HTTPException(500, "Blockchain read failed")

@router.delete("/data/{account_id}/{key}")
async def delete_data(account_id: str, key: str, user_data: dict = Depends(verify_pi_token)):
    """
    Delete data from Blockchain.
    Must be owner (derived key check).
    """
    uid = user_data.get("uid")
    keypair = derive_keypair(uid)
    
    if not keypair:
        raise HTTPException(500, "Key check failed")
        
    if account_id != keypair.public_key:
        raise HTTPException(403, "Cannot delete data of another account")
        
    try:
        result = await stellar_data.delete_account_data(keypair.secret, key)
        return result
    except Exception as e:
        logger.error(f"Blockchain delete error: {e}")
        raise HTTPException(500, str(e))

@router.get("/data")
async def list_data(account_id: str, prefix: str = "", user_data: dict = Depends(verify_pi_token)):
    """
    List data keys from Blockchain.
    """
    try:
        entries = await stellar_data.list_account_data(account_id, prefix)
        
        # Convert values to expected format
        formatted_entries = []
        for e in entries:
             # Value is already decoded string in list_account_data? 
             # Let's check service. Service returns {key, value_str}.
             # We should probably return encrypted blob as base64 for consistency?
             # pi-storage.js expects `entry.value` to be encrypted string.
             
             # Re-encode to base64 for transport if it was decoded?
             # Service: "value_str = value_bytes.decode('utf-8')"
             # wait, if it's encrypted JSON, decode utf-8 might fail if it's binary ciphertext?
             # StellarAccountData service assumes value is stored as base64 on chain.
             # It decodes the chain-base64 to bytes. Then decodes bytes to utf-8.
             # If our encryption output is Base64 (ciphertext), then utf-8 decode is fine.
             
             # Frontend expects: decrypt(value).
             # So we pass the string as is.
             formatted_entries.append({
                 "key": e["key"],
                 "value": e["value"]
             })
             
        return {"entries": formatted_entries}
    except Exception as e:
        logger.error(f"Blockchain list error: {e}")
        return {"entries": []}
