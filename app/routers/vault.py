"""
Vault Router - Encrypted Recovery Vault
Req #10: Recovery Vault (Audit Fix)
Req #14: Blind Sync (Backend stores only encrypted blobs)
Req #37: Data Sovereignty - Delete Account
"""
from fastapi import APIRouter, Request, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
import hashlib

from app.core.database import get_db
from app.models.sql_models import VaultEntry

logger = logging.getLogger(__name__)

router = APIRouter()

class VaultUpload(BaseModel):
    """Encrypted vault blob upload"""
    encrypted_blob: str  # Base64 encoded encrypted data
    recovery_hash: str  # Hash of recovery password (for verification only)
    version: str
    timestamp: str

class VaultDownload(BaseModel):
    """Vault download request"""
    recovery_password: str  # Will be hashed and verified

@router.post("/vault")
async def upload_vault(
    vault_data: VaultUpload,
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Req #10: Store encrypted vault backup
    Backend receives encrypted blob and stores it without decryption capability
    """
    try:
        # Extract user identifier from auth token (if available)
        user_id = "anonymous"  # In production, extract from Pi auth token
        
        # Check if vault already exists for user
        db_vault = db.query(VaultEntry).filter(VaultEntry.user_id == user_id).first()
        
        if db_vault:
            # Update existing
            db_vault.encrypted_blob = vault_data.encrypted_blob
            db_vault.recovery_hash = vault_data.recovery_hash
            db_vault.version = vault_data.version
            db_vault.timestamp = vault_data.timestamp
            db_vault.uploaded_at = datetime.now().isoformat()
        else:
            # Create new
            db_vault = VaultEntry(
                user_id=user_id,
                encrypted_blob=vault_data.encrypted_blob,
                recovery_hash=vault_data.recovery_hash,
                version=vault_data.version,
                timestamp=vault_data.timestamp,
                uploaded_at=datetime.now().isoformat()
            )
            db.add(db_vault)
        
        db.commit()
        db.refresh(db_vault)
        
        logger.info(f"Vault backup stored for user: {user_id}")
        
        return {
            "status": "success",
            "message": "Encrypted vault stored successfully",
            "vault_id": user_id
        }
    
    except Exception as e:
        logger.error(f"Error storing vault: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to store vault")

@router.get("/vault")
async def download_vault(
    recovery_password: str,
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Req #10: Download encrypted vault blob
    User must provide recovery password to download
    """
    try:
        user_id = "anonymous"  # In production, extract from auth token
        
        db_vault = db.query(VaultEntry).filter(VaultEntry.user_id == user_id).first()
        
        if not db_vault:
            raise HTTPException(status_code=404, detail="No vault found")
        
        # Verify recovery password hash (without seeing actual password)
        provided_hash = hashlib.sha256(recovery_password.encode()).hexdigest()
        
        if provided_hash != db_vault.recovery_hash:
            raise HTTPException(status_code=401, detail="Invalid recovery password")
        
        # Req #14: Return encrypted blob only (backend cannot decrypt)
        return {
            "status": "success",
            "encrypted_blob": db_vault.encrypted_blob,
            "version": db_vault.version,
            "timestamp": db_vault.timestamp
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving vault: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vault")

@router.delete("/vault")
async def delete_vault(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Delete vault backup"""
    try:
        user_id = "anonymous"  # In production, extract from auth token
        
        db_vault = db.query(VaultEntry).filter(VaultEntry.user_id == user_id).first()
        
        if db_vault:
            db.delete(db_vault)
            db.commit()
            return {"status": "success", "message": "Vault deleted"}
        
        raise HTTPException(status_code=404, detail="No vault found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vault: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete vault")

@router.get("/vault/exists")
async def check_vault_exists(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Check if vault exists for user"""
    user_id = "anonymous"  # In production, extract from auth token
    
    exists = db.query(VaultEntry).filter(VaultEntry.user_id == user_id).first() is not None
    
    return {
        "exists": exists,
        "has_backup": exists
    }

