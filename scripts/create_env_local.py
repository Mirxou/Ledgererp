#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to create .env file locally for development/testing
Usage: python scripts/create_env_local.py
"""
import secrets
import sys
import os
from pathlib import Path

def generate_secret_key():
    """Generate a secure random secret key"""
    return secrets.token_urlsafe(32)

def create_env_file():
    """Create .env file from template"""
    # Set UTF-8 encoding for Windows compatibility
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    template_path = Path("env.production.template")
    env_path = Path(".env")
    
    if not template_path.exists():
        print(f"[ERROR] Template file not found: {template_path}")
        return False
    
    if env_path.exists():
        print(f"[WARNING] .env file already exists: {env_path}")
        response = input("Do you want to overwrite it? (y/N): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return False
    
    # Read template
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Generate SECRET_KEY
    secret_key = generate_secret_key()
    
    # Replace SECRET_KEY
    content = content.replace(
        "SECRET_KEY=REPLACE_WITH_STRONG_SECRET_KEY_32_CHARS_MIN",
        f"SECRET_KEY={secret_key}"
    )
    
    # Write .env file
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("=" * 60)
    print("[SUCCESS] .env file created successfully!")
    print("=" * 60)
    print()
    print(f"File: {env_path.absolute()}")
    print()
    print("[IMPORTANT] Security Notes:")
    print("   - Keep this file SECRET and never commit it to Git")
    print("   - .env is already in .gitignore")
    print("   - Use different keys for dev/staging/production")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    try:
        success = create_env_file()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] Failed to create .env file: {e}")
        sys.exit(1)

