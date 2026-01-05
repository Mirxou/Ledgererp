#!/usr/bin/env python3
"""
Verify local setup before deployment
Checks all files and configurations are ready
"""

import os
import json
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if a file exists"""
    path = Path(filepath)
    if path.exists():
        print(f"[OK] {description}: {filepath}")
        return True
    else:
        print(f"[FAIL] {description}: {filepath} - NOT FOUND")
        return False

def check_manifest():
    """Check manifest.json"""
    manifest_path = Path("static/manifest.json")
    if not manifest_path.exists():
        print("✗ manifest.json not found")
        return False
    
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        pi_app = manifest.get('pi_app', {})
        
        # Check critical fields
        checks = [
            ('app_id', 'pi-ledger-erp'),
            ('name', 'Ledger ERP'),
            ('developer', 'mirxou'),
            ('support_email', 'abounaas54@gmail.com'),
        ]
        
        all_ok = True
        for field, expected in checks:
            actual = pi_app.get(field, '')
            if actual == expected:
                print(f"[OK] manifest.json: {field} = {expected}")
            else:
                print(f"[FAIL] manifest.json: {field} = {actual} (expected: {expected})")
                all_ok = False
        
        return all_ok
    except Exception as e:
        print(f"[FAIL] Error reading manifest.json: {e}")
        return False

def check_domain_verification():
    """Check domain verification file"""
    verification_path = Path("static/.well-known/pi-app-verification")
    if not verification_path.exists():
        print("[FAIL] Domain verification file not found")
        return False
    
    try:
        content = verification_path.read_text(encoding='utf-8').strip()
        if 'piledger.app' in content:
            print(f"[OK] Domain verification: {content}")
            return True
        else:
            print(f"[FAIL] Domain verification: {content} (should contain piledger.app)")
            return False
    except Exception as e:
        print(f"[FAIL] Error reading domain verification: {e}")
        return False

def check_screenshots():
    """Check screenshots exist"""
    screenshots_dir = Path("static/screenshots")
    if not screenshots_dir.exists():
        print("✗ Screenshots directory not found")
        return False
    
    screenshot_files = list(screenshots_dir.glob("*.png")) + list(screenshots_dir.glob("*.jpg"))
    
    if len(screenshot_files) >= 3:
        print(f"[OK] Screenshots: Found {len(screenshot_files)} files")
        for f in screenshot_files:
            print(f"  - {f.name}")
        return True
    else:
        print(f"[FAIL] Screenshots: Only {len(screenshot_files)} found (need at least 3)")
        return False

def check_icons():
    """Check icons exist"""
    icon_192 = Path("static/icon-192.png")
    icon_512 = Path("static/icon-512.png")
    
    icons_ok = True
    if icon_192.exists():
        print("[OK] icon-192.png exists")
    else:
        print("[FAIL] icon-192.png not found")
        icons_ok = False
    
    if icon_512.exists():
        print("[OK] icon-512.png exists")
    else:
        print("[FAIL] icon-512.png not found")
        icons_ok = False
    
    return icons_ok

def main():
    print("=" * 60)
    print("Local Setup Verification")
    print("=" * 60)
    print()
    
    all_ok = True
    
    # Check critical files
    print("=== Critical Files ===")
    all_ok &= check_file_exists("static/index.html", "Main HTML file")
    all_ok &= check_file_exists("static/app.html", "App HTML file")
    all_ok &= check_file_exists("static/privacy.html", "Privacy Policy")
    all_ok &= check_file_exists("static/terms.html", "Terms of Service")
    all_ok &= check_file_exists("app/main.py", "Main application file")
    all_ok &= check_file_exists("static/js/pi-adapter.js", "Pi SDK adapter")
    print()
    
    # Check manifest
    print("=== Manifest ===")
    all_ok &= check_manifest()
    print()
    
    # Check domain verification
    print("=== Domain Verification ===")
    all_ok &= check_domain_verification()
    print()
    
    # Check assets
    print("=== Assets ===")
    all_ok &= check_icons()
    all_ok &= check_screenshots()
    print()
    
    # Check template files
    print("=== Template Files ===")
    check_file_exists("env.production.template", "Production env template")
    check_file_exists("scripts/check_submission_readiness.py", "Readiness checker")
    print()
    
    print("=" * 60)
    if all_ok:
        print("[SUCCESS] All critical checks passed!")
        print()
        print("Next steps:")
        print("1. Create .env file on production server")
        print("2. Generate SECRET_KEY: python scripts/generate_secret_key.py")
        print("3. Deploy to production server")
        print("4. Test endpoints: bash scripts/test_endpoints.sh or powershell scripts/test_endpoints.ps1")
        print("5. Test in Pi Browser")
        print("6. Submit to Pi Developer Portal")
    else:
        print("[FAIL] Some checks failed. Please fix the issues above.")
    print("=" * 60)
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    exit(main())

