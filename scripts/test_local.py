#!/usr/bin/env python3
"""
Local Testing Script for Pi Ledger
Tests basic functionality before submission
"""

import requests
import json
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_endpoint(url, method="GET", data=None, expected_status=200):
    """Test an endpoint"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            return False, f"Unsupported method: {method}"
        
        if response.status_code == expected_status:
            return True, f"✓ {method} {url} - Status: {response.status_code}"
        else:
            return False, f"✗ {method} {url} - Expected {expected_status}, got {response.status_code}"
    except requests.exceptions.ConnectionError:
        return False, f"✗ {method} {url} - Connection refused (server not running?)"
    except Exception as e:
        return False, f"✗ {method} {url} - Error: {str(e)}"

def test_security_headers(url):
    """Test security headers"""
    try:
        response = requests.get(url, timeout=5)
        headers = response.headers
        
        required_headers = {
            'Content-Security-Policy': 'CSP',
            'X-Content-Type-Options': 'X-Content-Type-Options',
            'X-Frame-Options': 'X-Frame-Options',
            'Strict-Transport-Security': 'HSTS',
            'Referrer-Policy': 'Referrer-Policy',
            'Permissions-Policy': 'Permissions-Policy'
        }
        
        results = []
        for header, name in required_headers.items():
            if header in headers:
                results.append(f"✓ {name}: Present")
            else:
                results.append(f"✗ {name}: Missing")
        
        return results
    except Exception as e:
        return [f"✗ Error checking headers: {str(e)}"]

def main():
    print("=" * 60)
    print("Pi Ledger - Local Testing")
    print("=" * 60)
    print()
    
    # Check if server is running
    print("1. Checking if server is running...")
    success, message = test_endpoint(f"{BASE_URL}/")
    print(f"   {message}")
    if not success and "Connection refused" in message:
        print("\n⚠️  Server is not running!")
        print("   Start the server with: uvicorn app.main:app --reload")
        return 1
    print()
    
    # Test basic endpoints
    print("2. Testing basic endpoints...")
    endpoints = [
        ("/", 200),
        ("/health", 200),
        ("/ready", 200),
        ("/manifest.json", 200),
        ("/.well-known/pi-app-verification", 200),
        ("/static/index.html", 200),
        ("/static/privacy.html", 200),
        ("/static/terms.html", 200),
        ("/docs", 200),
    ]
    
    passed = 0
    failed = 0
    
    for endpoint, expected_status in endpoints:
        success, message = test_endpoint(f"{BASE_URL}{endpoint}", expected_status=expected_status)
        print(f"   {message}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print()
    
    # Test security headers
    print("3. Testing security headers...")
    header_results = test_security_headers(f"{BASE_URL}/static/index.html")
    for result in header_results:
        print(f"   {result}")
    print()
    
    # Test API endpoints
    print("4. Testing API endpoints...")
    api_endpoints = [
        ("/blockchain/status", 200),
    ]
    
    for endpoint, expected_status in api_endpoints:
        success, message = test_endpoint(f"{BASE_URL}{endpoint}", expected_status=expected_status)
        print(f"   {message}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print()
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total: {passed + failed}")
    
    if failed == 0:
        print("\n✅ All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())

