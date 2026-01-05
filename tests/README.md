# Pi Ledger - Test Suite

## Overview

This directory contains automated tests for the Pi Ledger project. All tests use pytest and verify the implementation of the 47-Point Master Plan.

## Test Files

- `test_backend.py` - Backend API tests (endpoints, security headers, rate limiting)
- `test_persistence.py` - Database persistence tests
- `test_blockchain_full.py` - Blockchain service tests (dual-mode polling, circuit breaker)

## Running Tests

### Prerequisites

Install test dependencies:
```bash
pip install -r requirements.txt
pip install pytest httpx
```

### Run All Tests

```bash
pytest tests/ -v
```

### Run Specific Test File

```bash
pytest tests/test_backend.py -v
pytest tests/test_persistence.py -v
pytest tests/test_blockchain_full.py -v
```

### Run with Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

## Test Coverage

### Backend API Tests (`test_backend.py`)

- API endpoints (root, health, ready)
- Domain verification endpoint
- Static file serving
- Security headers (CSP, X-Frame-Options, etc.)
- Rate limiting middleware
- Vault endpoints (encrypted blob storage)
- Reports endpoints (AML export)
- Telemetry endpoints (anonymous analytics)
- Blockchain service status

### Database Tests (`test_persistence.py`)

- SQLite database creation
- Vault entry persistence
- Telemetry event storage
- Bug report storage
- Data integrity verification

### Blockchain Tests (`test_blockchain_full.py`)

- Dual-mode polling (local node → public API)
- Circuit breaker logic
- Transaction verification
- Memo validation (28-byte limit)
- Hibernation mode

## Requirements Coverage

Tests verify implementation of key requirements:

- **Req #6**: Domain verification endpoint
- **Req #10**: Vault endpoints (encrypted blob storage)
- **Req #13**: Version headers
- **Req #15**: CSP headers
- **Req #16**: Memo validation (28-byte limit)
- **Req #18**: Blockchain service (dual-mode polling)
- **Req #21**: Reports endpoints (AML export)
- **Req #22**: Dual-mode polling
- **Req #23**: Circuit breaker
- **Req #26**: Rate limiting
- **Req #27**: Telemetry endpoints

## Troubleshooting

### Tests fail to run

1. Ensure all dependencies are installed:
   ```bash
   pip install -r requirements.txt
   pip install pytest httpx
   ```

2. Verify Python version (3.9+):
   ```bash
   python --version
   ```

### Database errors

- Tests create temporary database files (automatically cleaned up)
- Ensure write permissions in project directory

### Import errors

- Verify you're running tests from project root directory
- Check that `app/` directory structure is intact

