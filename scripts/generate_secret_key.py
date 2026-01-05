#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to generate a secure SECRET_KEY for production environment
Usage: python scripts/generate_secret_key.py
"""
import secrets
import sys
import io

def generate_secret_key():
    """Generate a secure random secret key"""
    # Generate a URL-safe random token (32 bytes = 256 bits)
    secret_key = secrets.token_urlsafe(32)
    return secret_key

if __name__ == "__main__":
    # Set UTF-8 encoding for Windows compatibility
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("=" * 60)
    print("SECRET_KEY Generator for Ledger ERP")
    print("=" * 60)
    print()
    
    secret_key = generate_secret_key()
    
    print("Generated SECRET_KEY:")
    print("-" * 60)
    print(secret_key)
    print("-" * 60)
    print()
    print("Copy this key to your .env file:")
    print(f"SECRET_KEY={secret_key}")
    print()
    print("[IMPORTANT] Security Notes:")
    print("   - Keep this key SECRET and never commit it to Git")
    print("   - Use a different key for each environment (dev/staging/prod)")
    print("   - If compromised, generate a new key immediately")
    print("=" * 60)
    
    sys.exit(0)
