# Ledger ERP - Professional Non-Custodial ERP

![Ledger ERP Banner](/static/logo.png)

> **The Ultimate Non-Custodial ERP for Pi Network Merchants**  
> *Zero-Knowledge • Offline-First • Enterprise-Grade*

[![Pi Network](https://img.shields.io/badge/Pi%20Network-Integrated-purple?style=flat-square&logo=pi)](https://minepi.com)
[![License](https://img.shields.io/badge/License-Proprietary-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-green?style=flat-square)](PRE_PRODUCTION_CHECKLIST.md)

## 📸 Interface Preview

| Dashboard | Invoice Creation |
|:---:|:---:|
| ![Dashboard](/static/screenshots/screenshot_dashboard.png) | ![Invoice](/static/screenshots/screenshot_invoice.png) |
| *Real-time financial analytics* | *Professional invoice generator* |

## Overview
Ledger ERP is a comprehensive, non-custodial ERP system engineered specifically for the Pi Network ecosystem.  Built on a rigorous **47-Point Master Plan**, it delivers banking-grade security, complete data sovereignty, and seamless offline functionality for merchants worldwide.

## Implementation Status (47-Point Master Plan)

### I. CORE COMPLIANCE & IDENTITY (Req #1-6)
- **Req #1**: Pi.authenticate() ONLY - No custom login
- **Req #2**: onIncompletePaymentFound implementation (SDK Resilience)
- **Pi Network Blockchain**: 100% Web3 application
- **Req #4**: Legal disclaimer footer
- **Req #5**: Fiat policy (Offline Record Only)
- **Req #6**: Domain verification file

### II. ZERO-KNOWLEDGE & ADVANCED SECURITY (Req #7-15)
- **Req #7**: Client-side BIP-39 (12 words)
- **Req #8**: Anti-Phishing (Block 24-word inputs)
- **Req #9**: AES-GCM encryption with PIN-derived key
- **Req #10**: Recovery Vault (Encrypted cloud backup)
- **Req #11**: Input Sanitization (DOMPurify)
- **Req #12**: Trusted Device/Backup (Key shard export)
- **Req #13**: Secure Updates (Version check & force update)
- **Req #14**: Blind Sync (Backend stores encrypted blobs only)
- **Req #15**: Supply Chain Security (CSP headers & SRI)

### III. FINANCIAL ENGINE & LOGIC (Req #16-21)
- **Req #16**: Stellar Memo limit enforcement (<= 28 bytes)
- **Req #17**: Network fee calculation (+0.01 Pi)
- **Req #18**: Singleton Listener (Backend-only verification)
- **Req #19**: Split Pay (Partial Pi + Partial Cash)
- **Req #20**: Volatility protection (120s QR TTL + real-time rate)
- **Req #21**: AML Export (Source of Funds report)

### IV. INFRASTRUCTURE & OPS (Req #22-26)
- **Req #22**: Dual-Mode Polling (Local Node -> Public API)
- **Req #23**: Circuit Breaker (Hibernation Mode)
- **Req #24**: Persistence (navigator.storage.persist())
- **Req #25**: Conflict Resolution (Version-based merging)
- **Req #26**: Rate Limiting (Leaky Bucket)

### V. GROWTH & ENTERPRISE (Req #27-30)
- **Req #27**: Telemetry (Anonymous analytics)
- **Req #28**: KYB (Role middleware - Owner vs Cashier)
- **Req #29**: Globalization (Self-hosted assets, RTL support)
- **Req #30**: .pi Domains (Name resolution support)

### VI. REAL-TIME & USER EXPERIENCE (Req #31-36)
- **Req #31**: Server-Sent Events (SSE) for real-time payment notifications
- **Req #32**: Auto-Lock Timeout (Clear decryption keys after inactivity)
- **Req #33**: CSV Import/Export (Bulk data management)
- **Req #34**: Hardware Integration (Bluetooth printers & barcode scanner)
- **Req #35**: Immutable Audit Logs (Tamper-proof audit trail)
- **Req #36**: Visual Product Manager (Image-based inventory)

### VII. DATA SOVEREIGNTY & SHARING (Req #37-39)
- **Req #37**: Delete Account & Data Wipe (Complete data sovereignty)
- **Req #38**: Deep Linking (Shareable invoice links via Pi Chat)
- **Req #39**: Bug Reporting (Sanitized error logs for debugging)

### VIII. UNIVERSAL HARDWARE SUPPORT (Req #40)
- **Req #40**: Universal Printing (Bluetooth + USB/Network/System Printers)

### IX. LONG-TERM MATURITY (Req #41-44)
- **Req #41**: Auto-Archiving (Data hygiene - archive old invoices)
- **Req #42**: Dark Mode (System preference detection, battery optimization)
- **Req #43**: API Documentation (FastAPI auto-generated docs at `/docs`)
- **Req #44**: Human-Friendly Error Messages (Graceful degradation)

### X. REPOSITORY HYGIENE & STABILITY (Req #45-47)
- **Req #45**: Log Rotation (Prevent disk full crashes)
- **Req #46**: Git Security (Strict .gitignore to prevent secret leakage)
- **Req #47**: License Protection (Proprietary license for legal protection)

### XI. CHAT INTEGRATION
- **Chat Link**: Copy invoice link for Pi Chat (One-click sharing)

## Architecture

### Backend (FastAPI)
```text
app/
|-- main.py              # Main FastAPI app (CORS, CSP, Rate Limiting)
|-- core/
|   `-- config.py        # Strict config validation, log rotation
|-- routers/
|   |-- vault.py         # Encrypted Recovery Vault
|   |-- reports.py       # AML Export
|   |-- telemetry.py     # Anonymous Analytics + Bug Reports
|   `-- notifications.py # Server-Sent Events (SSE)
|-- services/
|   `-- blockchain.py    # Dual-Mode Listener + Circuit Breaker
`-- middleware/
    `-- kyb.py           # Role-Based Access Control
```

### Frontend (Vanilla JS)
```text
static/
|-- index.html             # Main HTML (Pi Auth, Disclaimer, RTL)
|-- js/
|   |-- security.js        # BIP-39, Encryption, Vault, Sanitization
|   |-- pi-adapter.js      # Pi Auth, Payments, Resilience
|   |-- lifecycle.js       # Version Check & Force Update
|   |-- db.js              # Dexie Schema, Persistence, Archiving
|   |-- invoice.js         # Invoice creation, QR generation
|   |-- hardware.js        # Universal printing, Barcode scanner
|   |-- auto-lock.js       # Auto-lock timeout
|   |-- sse-client.js      # Real-time notifications
|   |-- csv-import.js      # Bulk data import
|   |-- data-export.js     # CSV/JSON export
|   |-- audit-logs.js      # Immutable audit trail
|   |-- product-manager.js # Visual inventory
|   |-- deep-linking.js    # Shareable invoice links
|   |-- bug-reporting.js   # Error reporting
|   `-- account-settings.js # Settings, archiving, delete account
|-- sw.js                  # Service Worker (Offline-First)
`-- .well-known/
    `-- pi-app-verification # Domain verification
```

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js (optional, for frontend tooling)

### Installation
1. Install Python dependencies:
```bash
pip install -r requirements.txt
```
2. Run the backend:
```bash
python -m app.main
# Or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
3. Access the application:
- Frontend: http://localhost:8000/static/index.html
- API Docs: http://localhost:8000/docs

### Pi Network Integration
- **KYC Required**: All users must complete KYC verification in Pi Browser
- **Blockchain Storage**: All data stored on Stellar blockchain via Pi Network
- **No Offline Mode**: Requires internet connection (Pi Browser requirement)
- **No Demo Mode**: Live production environment only

## Security Features

### Zero-Knowledge Architecture
- Blind Server: Backend cannot decrypt user data.
- Client-Side Encryption: All sensitive data encrypted locally using AES-GCM.
- Recovery Vault: Encrypted cloud backup with separate recovery password.
- Data Sovereignty: Users can delete account and wipe all data (Req #37).

### Anti-Phishing Protection
- Blocks 24-word Pi wallet seed phrase inputs.
- Red warning messages in Arabic and English.
- Clear distinction from Pi wallet.

### Supply Chain Security
- Strict CSP headers.
- SRI (Subresource Integrity) hashes.
- Self-hosted assets (China-safe).

### Auto-Lock Security (Req #32)
- Automatic key clearing after 5 minutes of inactivity.
- Banking-grade security for financial apps.
- Forces PIN re-entry for security.

### Immutable Audit Logs (Req #35)
- Cryptographic hashing for tamper detection.
- Complete audit trail of all critical actions.
- Exportable for compliance.

## Financial Features

### Payment Processing
- Non-custodial P2P payments.
- Stellar memo format: P-{HexID}-{Code} (<= 28 bytes).
- Network fee calculation (+0.01 Pi).
- Real-time exchange rate with 2% volatility buffer.
- 120-second QR code TTL.
- Real-time notifications via Server-Sent Events (SSE).

### Split Payments
- Partial Pi + Partial Cash.
- Offline cash recording.
- Unified invoice management.

### Invoice Sharing (Req #38)
- Deep Linking: Shareable invoice links via Pi Chat.
- One-click copy: Copy invoice link with friendly message.

## Global & Enterprise Features
- Multi-Language: Arabic (RTL) & English (LTR).
- Offline-First: Self-hosted assets and Service Worker.
- Dark Mode: OLED-optimized battery saving (Req #42).
- KYB: Role-based access (Owner vs Cashier).
- Data Management: Auto-archiving for database hygiene.
- Hardware: Bluetooth/USB Printing & Barcode Scanning.

## Important Notes

### Legal Disclaimer
This application is independent and not affiliated with the Pi Core Team.

### License (Req #47)
- Proprietary License: All Rights Reserved.
- Commercial use requires explicit written permission.
- See LICENSE file for full terms.
- For licensing inquiries: abounaas54@gmail.com

### Security Warnings
- Never enter your Pi wallet seed phrase in this application.
- Keep your recovery password safe - it cannot be recovered.

## Contributing
This is a comprehensive implementation of the 47-Point Master Plan.

## License
Proprietary License - All Rights Reserved

Copyright (c) 2025-2026 mirxou

See LICENSE file for full terms and conditions.

## Acknowledgments
- Pi Network SDK
- Stellar Consensus Protocol
- OWASP Security Guidelines
- FastAPI Framework

---

Built with love for the Pi Network Ecosystem

**Version**: 1.0.0
**Status**: Production Ready
