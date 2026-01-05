#!/bin/bash
# Script to test all required endpoints for Pi Network submission
# Usage: ./scripts/test_endpoints.sh [domain]
# Example: ./scripts/test_endpoints.sh piledger.app

DOMAIN=${1:-piledger.app}
BASE_URL="https://${DOMAIN}"

echo "=========================================="
echo "Testing Endpoints for: ${BASE_URL}"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3
    
    echo -n "Testing ${description}... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${endpoint}")
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: ${response})"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Status: ${response}, Expected: ${expected_status})"
        return 1
    fi
}

test_endpoint_content() {
    local endpoint=$1
    local expected_content=$2
    local description=$3
    
    echo -n "Testing ${description}... "
    
    content=$(curl -s "${BASE_URL}${endpoint}")
    
    if echo "$content" | grep -q "$expected_content"; then
        echo -e "${GREEN}✓ PASS${NC} (Contains: ${expected_content})"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Does not contain: ${expected_content})"
        return 1
    fi
}

# Test results
PASSED=0
FAILED=0

echo "=== Domain Verification ==="
if test_endpoint "/.well-known/pi-app-verification" 200 "Domain Verification"; then
    PASSED=$((PASSED + 1))
    test_endpoint_content "/.well-known/pi-app-verification" "piledger.app" "Domain Verification Content"
else
    FAILED=$((FAILED + 1))
fi
echo ""

echo "=== Manifest ==="
if test_endpoint "/manifest.json" 200 "Manifest"; then
    PASSED=$((PASSED + 1))
    test_endpoint_content "/manifest.json" "Ledger ERP" "Manifest Content"
else
    FAILED=$((FAILED + 1))
fi
echo ""

echo "=== Legal Pages ==="
if test_endpoint "/static/privacy.html" 200 "Privacy Policy"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

if test_endpoint "/static/terms.html" 200 "Terms of Service"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

echo "=== Health Checks ==="
if test_endpoint "/health" 200 "Health Check"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

if test_endpoint "/ready" 200 "Readiness Check"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

echo "=== Security Headers ==="
echo -n "Testing Security Headers... "
headers=$(curl -s -I "${BASE_URL}/static/index.html")

if echo "$headers" | grep -q "Content-Security-Policy"; then
    echo -e "${GREEN}✓${NC} CSP"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} CSP missing"
    FAILED=$((FAILED + 1))
fi

if echo "$headers" | grep -q "X-Content-Type-Options"; then
    echo -e "${GREEN}✓${NC} X-Content-Type-Options"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} X-Content-Type-Options missing"
    FAILED=$((FAILED + 1))
fi

if echo "$headers" | grep -q "X-Frame-Options"; then
    echo -e "${GREEN}✓${NC} X-Frame-Options"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} X-Frame-Options missing"
    FAILED=$((FAILED + 1))
fi

if echo "$headers" | grep -q "Strict-Transport-Security"; then
    echo -e "${GREEN}✓${NC} HSTS"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} HSTS missing"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "=========================================="
echo "Summary: ${PASSED} passed, ${FAILED} failed"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi

