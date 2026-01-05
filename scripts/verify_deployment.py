#!/usr/bin/env python3
"""
Script to verify deployment readiness
Checks all critical files and configurations before deployment
Usage: python scripts/verify_deployment.py
"""
import os
import sys
import json
from pathlib import Path

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"{GREEN}✅{RESET} {description}: {filepath}")
        return True
    else:
        print(f"{RED}❌{RESET} {description}: {filepath} - NOT FOUND")
        return False

def check_file_content(filepath, search_string, description):
    """Check if file contains specific string"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if search_string in content:
                print(f"{GREEN}✅{RESET} {description}: Found '{search_string}'")
                return True
            else:
                print(f"{YELLOW}⚠️{RESET} {description}: '{search_string}' not found")
                return False
    except Exception as e:
        print(f"{RED}❌{RESET} {description}: Error reading file - {e}")
        return False

def check_json_file(filepath, key, expected_value, description):
    """Check JSON file for specific key-value"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if key in data and data[key] == expected_value:
                print(f"{GREEN}✅{RESET} {description}: {key} = {expected_value}")
                return True
            else:
                actual = data.get(key, "NOT FOUND")
                print(f"{YELLOW}⚠️{RESET} {description}: {key} = {actual} (expected: {expected_value})")
                return False
    except Exception as e:
        print(f"{RED}❌{RESET} {description}: Error reading JSON - {e}")
        return False

def main():
    # Set UTF-8 encoding for Windows compatibility
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("=" * 70)
    print("Ledger ERP - Deployment Verification Script")
    print("=" * 70)
    print()
    
    checks_passed = 0
    checks_failed = 0
    checks_warning = 0
    
    # Check critical files
    print("[FILES] Checking Critical Files:")
    print("-" * 70)
    
    files_to_check = [
        ("static/.well-known/pi-app-verification", "Domain Verification File"),
        ("static/manifest.json", "Manifest File"),
        ("static/privacy.html", "Privacy Policy"),
        ("static/terms.html", "Terms of Service"),
        ("static/index.html", "Main Index File"),
        ("static/js/pi-adapter.js", "Pi Adapter"),
        ("app/main.py", "Main Application"),
        ("env.production.template", "Environment Template"),
    ]
    
    for filepath, description in files_to_check:
        if check_file_exists(filepath, description):
            checks_passed += 1
        else:
            checks_failed += 1
    
    print()
    
    # Check domain configuration
    print("[DOMAIN] Checking Domain Configuration:")
    print("-" * 70)
    
    domain_checks = [
        ("static/.well-known/pi-app-verification", "ledgererp.online", "Domain Verification"),
        ("static/manifest.json", "ledgererp.online", "Manifest Domain"),
        ("static/privacy.html", "ledgererp.online", "Privacy Policy Domain"),
        ("static/terms.html", "ledgererp.online", "Terms Domain"),
    ]
    
    for filepath, search_string, description in domain_checks:
        if check_file_content(filepath, search_string, description):
            checks_passed += 1
        else:
            checks_warning += 1
    
    print()
    
    # Check Pi SDK Configuration
    print("[PI SDK] Checking Pi SDK Configuration:")
    print("-" * 70)
    
    if check_file_content("static/js/pi-adapter.js", "sandbox: true", "Sandbox Mode (Testnet)"):
        checks_passed += 1
    else:
        checks_warning += 1
    
    if check_file_content("static/js/pi-adapter.js", "Pi.authenticate", "Pi.authenticate()"):
        checks_passed += 1
    else:
        checks_failed += 1
    
    if check_file_content("static/js/pi-adapter.js", "onIncompletePaymentFound", "onIncompletePaymentFound"):
        checks_passed += 1
    else:
        checks_failed += 1
    
    print()
    
    # Check Security Headers
    print("[SECURITY] Checking Security Headers:")
    print("-" * 70)
    
    security_checks = [
        ("app/main.py", "Content-Security-Policy", "CSP Headers"),
        ("app/main.py", "X-Content-Type-Options", "X-Content-Type-Options"),
        ("app/main.py", "Strict-Transport-Security", "HSTS"),
        ("app/main.py", "X-Min-Version", "Version Check"),
    ]
    
    for filepath, search_string, description in security_checks:
        if check_file_content(filepath, search_string, description):
            checks_passed += 1
        else:
            checks_warning += 1
    
    print()
    
    # Check Disclaimer
    print("[LEGAL] Checking Legal Compliance:")
    print("-" * 70)
    
    disclaimer_checks = [
        ("static/index.html", "not affiliated with", "Disclaimer in Index"),
        ("static/terms.html", "not affiliated with", "Disclaimer in Terms"),
        ("static/privacy.html", "not affiliated with", "Disclaimer in Privacy"),
    ]
    
    for filepath, search_string, description in disclaimer_checks:
        if check_file_content(filepath, search_string, description):
            checks_passed += 1
        else:
            checks_warning += 1
    
    print()
    
    # Check Manifest.json
    print("[MANIFEST] Checking Manifest.json:")
    print("-" * 70)
    
    if check_json_file("static/manifest.json", "name", "Ledger ERP", "App Name"):
        checks_passed += 1
    else:
        checks_warning += 1
    
    print()
    
    # Summary
    print("=" * 70)
    print("[SUMMARY] Verification Summary:")
    print("-" * 70)
    print(f"{GREEN}✅ Passed:{RESET} {checks_passed}")
    print(f"{YELLOW}⚠️  Warnings:{RESET} {checks_warning}")
    print(f"{RED}❌ Failed:{RESET} {checks_failed}")
    print()
    
    total_checks = checks_passed + checks_warning + checks_failed
    success_rate = (checks_passed / total_checks * 100) if total_checks > 0 else 0
    
    print(f"Success Rate: {success_rate:.1f}%")
    print()
    
    if checks_failed == 0:
        print(f"{GREEN}✅ Deployment Ready!{RESET}")
        print()
        print("Next Steps:")
        print("1. Generate SECRET_KEY: python scripts/generate_secret_key.py")
        print("2. Create .env file from env.production.template")
        print("3. Deploy to server with HTTPS")
        print("4. Test in Pi Browser")
        return 0
    else:
        print(f"{RED}❌ Deployment NOT Ready - Please fix failed checks{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

