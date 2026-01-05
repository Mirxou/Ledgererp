# GitHub Copilot Instructions for Pi Ledger

Purpose: Equip AI coding agents to work productively in this repo with minimal ramp-up, aligned to the project’s architecture, workflows, and conventions.

## Big Picture
- Backend: FastAPI app in `app/` with routers (`vault`, `reports`, `telemetry`, `notifications`), service layer (`services/blockchain.py`), and middleware (`middleware/kyb.py`). Entrypoint is `app/main.py`.
- Frontend: Vanilla JS served from `static/` (modules under `static/js/`) plus service worker `static/sw.js`. UI HTML in `static/index.html` with Demo Mode.
- Zero-knowledge design: Backend stores only encrypted blobs (no decryption capability). See `vault` endpoints and comments in `app/routers/vault.py`.
- Payment verification: Only backend verifies Pi payments via the singleton `BlockchainService` (dual-mode polling + circuit breaker). See `app/services/blockchain.py` and `/blockchain/*` endpoints.

## Architecture & Data Flow
- Frontend generates invoices and handles client-side encryption (AES-GCM, BIP-39) per `static/js/security.js`, `invoice.js`, `db.js`. It registers invoices to the backend via `/blockchain/register-invoice`.
- Backend `BlockchainService.verify_transaction()` enforces:
  - Memo limit (≤ 28 bytes), invoice ID presence.
  - Amount, recipient, merchant ID checks.
  - Anti-replay tracking of used transaction hashes.
  - SSE notifications via `notifications.notification_manager`.
- Vault: `/sync/vault` stores opaque `encrypted_blob` with `recovery_hash` and metadata; `/sync/vault` GET verifies hash before returning the blob; `/sync/vault/exists` and DELETE for existence and wipe.
- Notifications: `/notifications/stream` provides SSE for real-time updates.

## Roles (KYB)
- Middleware: `KYBMiddleware` in [app/middleware/kyb.py](app/middleware/kyb.py) enforces roles.
- Public paths: `/`, `/.well-known/*`, `/static/*`, `/blockchain/status` bypass auth.
- Auth: When `require_auth=True`, expects `Authorization: Bearer <token>`; the middleware mocks user extraction from the token prefix.
- Roles: `OWNER` (full access), `CASHIER` (create/view invoices only). Access to `/vault/*` and `/reports/*` requires `OWNER`.
- Request state: `request.state.user_id` and `request.state.user_role` are populated for downstream handlers.

## Critical Conventions
- Requirements mapping (Req #X) is embedded in code comments; preserve and reference them when adding features.
- CSP, headers, and versioning are enforced in a global middleware in `app/main.py`. Do not bypass; update via that middleware.
- Rate limiting: `RateLimitMiddleware` in `app/main.py` (proxy-aware). Test clients are excluded; respect that behavior in tests.
- Logs: Rotating file logs in `logs/server.log` via `RotatingFileHandler`; privacy filter anonymizes IPs and sanitizes URLs. Keep sensitive params out of logs.
- Self-hosted assets: Prefer local assets under `static/`; external sources allowed per CSP for `sdk.minepi.com`, `cdn.jsdelivr.net`, `esm.sh`.

## Reports (AML)
- Endpoint: `POST /reports/aml` generates a “Source of Funds” report; request model fields: `merchant_id`, `start_date`, `end_date`, optional `format` (`pdf` or `json`).
- Output: `application/pdf` with attachment disposition for PDF; JSON payload when `format=json`.
- Template: `GET /reports/aml/template` returns required fields and supported formats.
- Transactions: Mocked by `_fetch_transactions()` with `transaction_id`, `timestamp`, `amount`, `currency` (`PI`/`USD`), `memo`, `payment_method` (`pi`/`cash`), `verified`.

## Developer Workflows
- Run backend (dev):
  - `python -m app.main`
  - Or: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Access:
  - Frontend: `http://localhost:8000/static/index.html`
  - API docs: `http://localhost:8000/docs`
- Tests:
  - All (Windows): run `run_tests.bat` (installs deps, runs backend tests, opens frontend suite).
  - Backend only: `pytest tests/test_backend.py -v`
  - Frontend suite: open `http://127.0.0.1:8000/static/test_suite.html`
- Config: environment via `.env` (see `README.md` for keys). Key configs surfaced through `app/core/config.py` and used by `app/main.py`.

  ## SSE Payload Schema
  - Server emits via `notification_manager.broadcast_notification(merchant_id, payload)`; typical `payment_confirmed` payload includes:
    - `type`: `payment_confirmed`
    - `invoice_id`, `merchant_id`, `status`: `paid`
    - `amount`, `transaction_hash`, `timestamp`, `message`
  - Client listens in `static/js/sse-client.js` to `/notifications/stream` and should handle `type`-based routing.

## Patterns to Follow
- Routers: add new endpoints under `app/routers/<feature>.py`; include in `app/main.py` via `app.include_router()` with tags and sensible prefixes.
- Services: implement business logic in `app/services/*.py`; keep routers thin and stateless where possible.
- Middleware: global concerns (auth roles, rate limiting, headers) live in `app/middleware/*.py` and `app/main.py`.
- SSE: use `notifications.notification_manager.broadcast_notification(merchant_id, payload)` from service layer rather than pushing from routers.
- Static JS: follow existing module organization (security, pi-adapter, db, invoice, telemetry). Keep encryption client-side; never move secrets server-side.

## Integration Points
- Pi Network SDK: frontend auth and payments handled in `static/js/pi-adapter.js`; backend only verifies and listens.
- Dual-mode blockchain: local node at `LOCAL_NODE_URL` and public API `PUBLIC_API_URL` configurable via env; circuit breaker drives `HIBERNATION` mode.
- Telemetry: anonymous event/log endpoints under `/telemetry/*` with health metrics; ensure no PII.

## Testing Expectations
- Backend tests assert headers (CSP, `X-Min-Version`), static asset availability, rate limiting middleware presence, and key endpoints. See [tests/test_backend.py](tests/test_backend.py).
- Frontend tests in [static/test_suite.html](static/test_suite.html) cover security primitives (BIP-39, AES-GCM, sanitization), DB ops, and module imports.
- When adding endpoints/features, extend `tests/test_backend.py` minimally to validate behavior without breaking rate-limit logic.

## Gotchas & Tips
- Memo format: keep invoice ID within 28 bytes; use `INV-...` pattern to embed; backend will derive invoice ID from memo.
- TestClient exclusion: rate limiting skips `pytest`/`testclient` UA—don’t rely on this in production logic.
- Privacy filter: logging may rewrite messages; avoid logging raw URLs with sensitive query params.
- Static MIME: JS responses set `application/javascript` and disable caching in `add_security_headers()`; don’t override per-route.
- Demo Mode: frontend can operate without Pi auth for review; keep backend verification strict regardless.

## Where to Look First
- Entrypoint and global concerns: [app/main.py](app/main.py)
- Payment verification: [app/services/blockchain.py](app/services/blockchain.py)
- Vault (encrypted backup): [app/routers/vault.py](app/routers/vault.py)
- SSE notifications: [app/routers/notifications.py](app/routers/notifications.py)
- Tests overview: [tests/README.md](tests/README.md), [tests/test_backend.py](tests/test_backend.py)
- Frontend modules: [static/js](static/js)

---
Feedback: If any workflow or convention above is unclear or incomplete (e.g., KYB role rules, report formats, or SSE client expectations), tell me what you need and I’ll refine this doc.
