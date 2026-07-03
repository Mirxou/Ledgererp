import { NextResponse } from "next/server";

function buildCategoryBreakdown(allIssues: { category: string; severity: string }[]) {
  const map = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();
  for (const issue of allIssues) {
    const existing = map.get(issue.category) || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    const sev = (issue.severity || 'medium').toLowerCase();
    if (sev === 'critical') existing.critical++;
    else if (sev === 'high') existing.high++;
    else if (sev === 'medium') existing.medium++;
    else existing.low++;
    existing.total++;
    map.set(issue.category, existing);
  }
  return Array.from(map.entries())
    .map(([category, counts]) => ({ category, ...counts }))
    .sort((a, b) => b.total - a.total);
}

function buildFileHeatmap(allIssues: { file: string; severity: string }[]) {
  const map = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();
  for (const issue of allIssues) {
    const f = issue.file;
    const existing = map.get(f) || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    const sev = (issue.severity || 'medium').toLowerCase();
    if (sev === 'critical') existing.critical++;
    else if (sev === 'high') existing.high++;
    else if (sev === 'medium') existing.medium++;
    else existing.low++;
    existing.total++;
    map.set(f, existing);
  }
  return Array.from(map.entries())
    .map(([file, counts]) => ({ file, ...counts }))
    .sort((a, b) => b.total - a.total);
}

export async function GET() {
  const data = {
    meta: {
      projectName: "Ledgererp",
      repository: "https://github.com/Mirxou/Ledgererp",
      description:
        "A Non-Custodial ERP System for Pi Network - Zero-Knowledge security, Offline-First POS, and B2B inventory management. Built with FastAPI & Python.",
      auditDate: new Date().toISOString(),
      totalFiles: 67,
      totalLines: "~4,800+",
      techStack: ["FastAPI", "Python", "JavaScript", "Stellar SDK", "Pi SDK", "IndexedDB", "Cloudflare Pages"],
    },

    scores: {
      backend: { codeQuality: 42, security: 25, architecture: 35, overall: 31 },
      frontend: { codeQuality: 35, security: 18, piCompliance: 40, overall: 28 },
      piNetwork: {
        manifestCompliance: 45,
        domainVerification: 0,
        apiKeyManagement: 35,
        paymentFlow: 15,
        kycKyb: 10,
        deploymentReadiness: 30,
        nonCustodial: 5,
        overall: 18,
      },
      overall: 26,
    },

    summary: {
      totalIssues: 114,
      critical: 23,
      high: 28,
      medium: 39,
      low: 24,
      blockingDeployment: 7,
    },

    criticalFindings: [
      {
        id: "C-001", source: "Backend", file: "app/main.py", line: 548, category: "Hardcoded Secret",
        title: "Hardcoded default license signing secret",
        description: 'LICENSE_SIGNING_SECRET defaults to "super_secret_signing_key_change_me" via os.getenv fallback. An attacker can forge any subscription license.',
        recommendation: "Remove the default value entirely. Fail hard at startup if not set in production.",
      },
      {
        id: "C-002", source: "Backend", file: "app/services/blockchain.py", line: 159, category: "Hardcoded Secret",
        title: "Duplicate hardcoded signing secret in blockchain service",
        description: "Same default signing key duplicated in the blockchain service.",
        recommendation: "Use a single centralized secret management. Import from config module only.",
      },
      {
        id: "C-003", source: "Backend", file: "app/middleware/kyb.py", line: 59, category: "Authentication Bypass",
        title: "Unauthenticated requests silently pass through KYB middleware",
        description: "When the token isn't cached, unauthenticated requests silently pass through without verification.",
        recommendation: "Always validate tokens. Return 401 for requests without valid authentication.",
      },
      {
        id: "C-004", source: "Backend", file: "app/routers/notifications.py", line: 89, category: "Authorization Bypass",
        title: "Unauthenticated SSE stream exposes merchant payment data",
        description: "Anyone can subscribe to any merchant's real-time payment data with zero authentication.",
        recommendation: "Require authentication for SSE endpoints. Validate subscriber access.",
      },
      {
        id: "C-005", source: "Backend", file: "app/routers/blockchain.py", line: 110, category: "Authorization Bypass",
        title: "Any authenticated user can read any merchant's on-chain data",
        description: "The blockchain data endpoint takes merchant_id but never validates ownership.",
        recommendation: "Verify authenticated user owns the requested merchant_id.",
      },
      {
        id: "C-006", source: "Backend", file: "app/main.py", line: 585, category: "Runtime Crash",
        title: "Undefined variable 'stellar_account_data' crashes the app",
        description: "Reference to undefined variable causes runtime error. public_api.py imports from non-existent module.",
        recommendation: "Define the variable or remove the reference. Fix the broken import.",
      },
      {
        id: "C-007", source: "Backend", file: "app/main.py", line: 326, category: "Rate Limiting Bypass",
        title: "Rate limiting bypassed by setting User-Agent header",
        description: "Rate limiter exempts 'testclient' user agent. Any attacker can bypass all rate limiting.",
        recommendation: "Remove the test client exemption in production.",
      },
      {
        id: "C-008", source: "Backend", file: "app/middleware/kyb.py", line: 95, category: "Fake KYC",
        title: "KYC check always returns completed: True",
        description: "KYC endpoint always returns completed without verifying actual Pi Network KYC status.",
        recommendation: "Integrate with Pi Network's actual KYC verification API.",
      },
      {
        id: "C-009", source: "Backend", file: "app/main.py", line: 430, category: "Custodial Architecture",
        title: "System is fundamentally custodial despite claiming non-custodial",
        description: "Backend derives ALL user Stellar secret keys from SHA256(SECRET_KEY:UID). If that key leaks, every wallet is compromised.",
        recommendation: "Implement true non-custodial architecture where private keys never leave the client.",
      },
      {
        id: "C-010", source: "Frontend", file: "static/js/pi-adapter.js", line: 37, category: "postMessage Vulnerability",
        title: "postMessage to parent with wildcard origin '*'",
        description: "window.parent.postMessage sends SDK communication to ANY parent frame.",
        recommendation: "Use specific Pi Network origin instead of '*'.",
      },
      {
        id: "C-011", source: "Frontend", file: "static/js/pi-adapter.js", line: 125, category: "Pi SDK Bug",
        title: "PiAdapter.currentUser vs .user mismatch breaks all payments",
        description: "authenticate() stores user as this.currentUser but ALL consumers reference this.user / this.accessToken.",
        recommendation: "Add this.user and this.accessToken properties in authenticate().",
      },
      {
        id: "C-012", source: "Frontend", file: "static/js/b2b.js", line: 81, category: "XSS - Stored",
        title: "Unsanitized merchant data injected via innerHTML",
        description: "merchant.name, merchant.location, merchant.category directly interpolated into innerHTML.",
        recommendation: "Sanitize all fields using DOMPurify. Use addEventListener instead of inline onclick.",
      },
      {
        id: "C-013", source: "Frontend", file: "static/js/hardware.js", line: 161, category: "XSS - DOM",
        title: "Receipt HTML injection via unsanitized fields",
        description: "formatReceiptHTML() builds HTML via template literals with unsanitized shopName, customerName, invoiceId.",
        recommendation: "Use DOM API or sanitize all fields with DOMPurify.",
      },
      {
        id: "C-014", source: "Frontend", file: "static/js/invoice.js", line: 465, category: "XSS - DOM",
        title: "XSS in addItem() via DOMPurify fallback bypass",
        description: "If DOMPurify is unavailable, raw name is placed in an HTML attribute enabling injection.",
        recommendation: "Never use innerHTML for user input. Throw if DOMPurify unavailable.",
      },
      {
        id: "C-015", source: "Frontend", file: "static/js/auto-lock.js", line: 181, category: "Insecure Storage",
        title: "PIN stored and compared in plaintext in IndexedDB",
        description: "verifyPIN() compares user-entered PIN directly against stored plaintext PIN.",
        recommendation: "Hash PIN with PBKDF2/Argon2 before storing. Compare hashes.",
      },
      {
        id: "C-016", source: "Frontend", file: "static/js/pi-storage.js", line: 203, category: "Runtime Crash",
        title: "btoa(String.fromCharCode(...)) crashes on data >100KB",
        description: "Spread operator on large Uint8Array causes stack overflow.",
        recommendation: "Use TextDecoder or chunked approach instead of spread operator.",
      },
      {
        id: "C-017", source: "Frontend", file: "static/js/security.js", line: 16, category: "Weak Cryptography",
        title: "Fallback mnemonic: 24 words = ~55 bits vs required 128 bits",
        description: "WORD_LIST has only 24 words with modulo 24. A 12-word mnemonic has ~55 bits vs BIP-39's ~128 bits.",
        recommendation: "Refuse to generate mnemonics if ethers.js unavailable.",
      },
      {
        id: "C-018", source: "Frontend", file: "static/js/security.js", line: 244, category: "Weak Cryptography",
        title: "Hardcoded static salts for vault and device encryption",
        description: "PBKDF2 salts are fixed strings. All vaults with same password use same salt.",
        recommendation: "Generate random 16-byte salt for each encryption operation.",
      },
      {
        id: "C-019", source: "Frontend", file: "static/js/sw.js", line: 23, category: "Supply Chain",
        title: "CDN resources cached without Subresource Integrity (SRI)",
        description: "Service worker caches external resources without integrity checks. Compromised CDN would be cached indefinitely.",
        recommendation: "Add SRI checks before caching external resources.",
      },
      {
        id: "C-020", source: "Frontend", file: "static/js/invoice.js", line: 1527, category: "Authorization Bypass",
        title: "Refund authorization uses browser confirm() dialog only",
        description: "refundInvoice() for closed shifts uses confirm() for 'owner permission'. Any user can click OK.",
        recommendation: "Verify user role from session/backend before allowing refund.",
      },
      {
        id: "C-021", source: "Frontend", file: "static/js/subscription-manager.js", line: 197, category: "Runtime Error",
        title: "ReferenceError: closeUpgradeModal is not defined",
        description: "Lines 197-200 reference undefined function causing ReferenceError.",
        recommendation: "Remove lines 197-200 (function already on window).",
      },
      {
        id: "C-022", source: "Pi Network", file: "static/.well-known/", line: 0, category: "Domain Verification",
        title: "validation-key.txt missing - domain verification impossible",
        description: "The validation-key.txt required for Pi Network domain verification does not exist.",
        recommendation: "Generate and place the validation key at static/.well-known/pi-app-verification.",
      },
      {
        id: "C-023", source: "Pi Network", file: "wrangler.toml", line: 0, category: "Deployment",
        title: "No backend deployment - all API endpoints return 404",
        description: "Cloudflare Pages only serves static files. All /api/* endpoints return 404 in production.",
        recommendation: "Deploy backend as Cloudflare Workers or separate hosting.",
      },
    ],

    highIssues: [
      { id: "H-001", source: "Frontend", file: "deep-linking.js", line: 141, category: "XSS - Reflected", title: "invoiceId from URL injected into innerHTML" },
      { id: "H-002", source: "Frontend", file: "offline-sync.js", line: 8, category: "Insecure Storage", title: "Transaction data in localStorage unencrypted" },
      { id: "H-003", source: "Frontend", file: "pi-storage.js", line: 75, category: "Insecure Storage", title: "Stellar key in localStorage without integrity protection" },
      { id: "H-004", source: "Frontend", file: "ui-utils.js", line: 140, category: "XSS - Potential", title: "Modal allows iframe with arbitrary src" },
      { id: "H-005", source: "Frontend", file: "ui-utils.js", line: 252, category: "XSS - Potential", title: "Modal.prompt() passes message as HTML" },
      { id: "H-006", source: "Frontend", file: "invoice.js", line: 578, category: "Runtime Error", title: "Undefined variables in calculateTotals()" },
      { id: "H-007", source: "Frontend", file: "invoice.js", line: 2031, category: "Runtime Error", title: "Reference to undefined variable 'date'" },
      { id: "H-008", source: "Frontend", file: "invoice.js", line: 1218, category: "Info Disclosure", title: "Payment URL shown in alert() on error" },
      { id: "H-009", source: "Frontend", file: "db.js", line: 229, category: "Insecure Fallback", title: "getCurrentMerchantId() falls back to 'anonymous'" },
      { id: "H-010", source: "Frontend", file: "market-ticker.js", line: 12, category: "Supply Chain", title: "Direct WebSocket to Bitget without proxy" },
      { id: "H-011", source: "Frontend", file: "sw.js", line: 72, category: "Data Staleness", title: "Financial API responses cached and served stale" },
      { id: "H-012", source: "Frontend", file: "pi-storage.js", line: 206, category: "Deprecated API", title: "Use of deprecated escape()/unescape()" },
      { id: "H-013", source: "Frontend", file: "hardware.js", line: 500, category: "Supply Chain", title: "Script from unpkg.com loaded without SRI" },
      { id: "H-014", source: "Frontend", file: "security.js", line: 308, category: "XSS - Incomplete", title: "DOMPurify fallback regex insufficient" },
      { id: "H-015", source: "Backend", file: "app/core/security.py", line: 120, category: "Insecure Crypto", title: "SHA256 instead of HMAC for signatures" },
      { id: "H-016", source: "Backend", file: "app/main.py", line: 200, category: "CSP Misconfig", title: "CSP allows unsafe-inline and unsafe-eval" },
      { id: "H-017", source: "Backend", file: "app/services/blockchain.py", line: 300, category: "Event Loop Block", title: "Blocking Stellar SDK calls in async functions" },
      { id: "H-018", source: "Backend", file: "app/routers/blockchain.py", line: 45, category: "Auth Bypass", title: "No authorization on merchant data endpoints" },
      { id: "H-019", source: "Backend", file: "app/core/cache.py", line: 80, category: "Cache Bug", title: "hash() for Redis keys defeats distributed caching" },
      { id: "H-020", source: "Backend", file: "app/main.py", line: 150, category: "Circular Import", title: "Circular import between security.py and main.py" },
      { id: "H-021", source: "Backend", file: "app/core/cache.py", line: 45, category: "Memory Leak", title: "Unbounded in-memory cache collections" },
      { id: "H-022", source: "Backend", file: "app/routers/auth.py", line: 25, category: "Token Exposure", title: "Pi tokens stored raw in memory/Redis" },
      { id: "H-023", source: "Backend", file: "app/services/blockchain.py", line: 430, category: "No Pooling", title: "New HTTP client created per request" },
      { id: "H-024", source: "Backend", file: "app/main.py", line: 500, category: "Token Exposure", title: "Pi tokens embedded inside JWT payloads" },
      { id: "H-025", source: "Pi Network", file: "manifest.json", line: 0, category: "Manifest", title: "Missing pi_sdk_version field" },
      { id: "H-026", source: "Pi Network", file: "package.json", line: 0, category: "Deployment", title: "No start script or backend deployment config" },
      { id: "H-027", source: "Frontend", file: "invoice.js", line: 887, category: "Code Dup", title: "generateInvoice() is near-copy of saveDraft()" },
      { id: "H-028", source: "Frontend", file: "invoice.js", line: 0, category: "God Class", title: "invoice.js is 86KB/2054 lines monolith" },
    ],

    mediumIssues: [
      { id: "M-001", source: "Frontend", file: "invoice.js", category: "Weak Randomness", title: "Invoice ID uses Math.random() not crypto API" },
      { id: "M-002", source: "Frontend", file: "security.js", category: "Privacy", title: "Canvas fingerprinting for device identification" },
      { id: "M-003", source: "Frontend", file: "db.js", category: "Arch Bug", title: "String concatenation for table pluralization" },
      { id: "M-004", source: "Frontend", file: "db.js", category: "Performance", title: "Sync interval runs every 30s unconditionally" },
      { id: "M-005", source: "Frontend", file: "lifecycle.js", category: "Memory Leak", title: "setInterval never cleared" },
      { id: "M-006", source: "Frontend", file: "market-ticker.js", category: "Resource Leak", title: "WebSocket reconnection has no backoff" },
      { id: "M-007", source: "Frontend", file: "offline-sync.js", category: "Error Handling", title: "processQueue silently swallows errors" },
      { id: "M-008", source: "Frontend", file: "audit-logs.js", category: "XSS", title: "HTML entity encoding applied twice wrong" },
      { id: "M-009", source: "Frontend", file: "account-settings.js", category: "Race Condition", title: "deleteAccount sets href then reload()" },
      { id: "M-010", source: "Frontend", file: "bug-reporting.js", category: "Over-Sanitization", title: "Error regexes too broad, redacting legit data" },
      { id: "M-011", source: "Frontend", file: "data-export.js", category: "XSS Potential", title: "Shop name used in export unsanitized" },
      { id: "M-012", source: "Frontend", file: "reports.js", category: "Hardcoded Data", title: "Growth rate hardcoded to 15.4%" },
      { id: "M-013", source: "Frontend", file: "shift-management.js", category: "XSS Template", title: "Report text injected via innerHTML" },
      { id: "M-014", source: "Frontend", file: "subscription-manager.js", category: "Performance", title: "Quote polling every 15s while modal open" },
      { id: "M-015", source: "Frontend", file: "csv-import.js", category: "Incomplete", title: "File truncated at line 52" },
      { id: "M-016", source: "Backend", file: "app/core/audit.py", category: "Log Injection", title: "Audit log messages not sanitized" },
      { id: "M-017", source: "Backend", file: "app/routers/telemetry.py", category: "Privacy", title: "Telemetry sent without user consent" },
      { id: "M-018", source: "Backend", file: "app/services/market.py", category: "Error Handling", title: "Market price fetch has no timeout" },
      { id: "M-019", source: "Backend", file: "app/main.py", category: "Validation", title: "No input validation on several endpoints" },
      { id: "M-020", source: "Backend", file: "app/routers/payments.py", category: "Validation", title: "Payment amount not validated server-side" },
    ],

    piNetworkCompliance: {
      blockingIssues: [
        "validation-key.txt missing - domain verification impossible",
        "No backend deployment path - all /api/* endpoints return 404",
        "App is fundamentally custodial, claims non-custodial",
        "KYC endpoint returns fake completed status",
        "Pi SDK integration broken - payments cannot complete",
        "Missing pi_sdk_version in manifest",
        "Payment flow parameter count mismatch",
      ],
      manifestIssues: ["Missing pi_sdk_version field", "Missing required Pi Network metadata", "Icon paths may not match Pi Browser requirements"],
      deploymentIssues: ["Cloudflare Pages only serves static files", "No serverless function deployment", "Environment variables not configured for production", "No CORS for Pi Network domain"],
      securityHeaders: ["CSP allows unsafe-inline and unsafe-eval", "Missing Strict-Transport-Security", "Missing X-Content-Type-Options: nosniff", "Missing Referrer-Policy"],
    },

    codeQuality: {
      largestFiles: [
        { file: "static/index.html", size: 134461, lines: 3400 },
        { file: "static/js/invoice.js", size: 86400, lines: 2054 },
        { file: "static/css/style.css", size: 39473, lines: 980 },
        { file: "app/services/blockchain.py", size: 30193, lines: 780 },
        { file: "app/main.py", size: 24737, lines: 650 },
        { file: "static/js/hardware.js", size: 21274, lines: 520 },
        { file: "static/js/pi-storage.js", size: 21262, lines: 510 },
        { file: "static/js/security.js", size: 20343, lines: 490 },
      ],
      todoFixme: [
        { file: "auto-lock.js", text: "In production, use bcrypt or similar to verify PIN" },
        { file: "security.js", text: "Fallback mnemonic - NOT SECURE" },
        { file: "db.js", text: "Anonymous fallback - NOT SECURE" },
        { file: "reports.js", text: "Growth rate placeholder for MVP" },
      ],
      emptyFiles: ["app/models/__init__.py (0 bytes)"],
      incompleteFiles: ["csv-import.js (truncated at line 52)"],
    },

    architectureProblems: [
      { title: "Monolithic Frontend", description: "26 JS files loaded globally via <script> tags. No module system, no bundling, no tree-shaking. 134KB index.html." },
      { title: "No Build System", description: "No Webpack, Vite, or any bundler. All code shipped raw. No minification, no transpilation." },
      { title: "God Class Pattern", description: "invoice.js (86KB, 2054 lines) handles everything: CRUD, payments, QR codes, receipts." },
      { title: "Missing Abstraction Layer", description: "No data access layer, no repository pattern, no dependency injection." },
      { title: "Circular Dependencies", description: "Circular import between security.py and main.py. Modules tightly coupled." },
      { title: "No Backend Deployment", description: "FastAPI backend has no deployment target. All API endpoints return 404 in production." },
    ],

    recommendations: [
      { priority: 1, title: "Fix authentication bypass in KYB middleware", effort: "Small", impact: "Critical" },
      { priority: 2, title: "Remove all hardcoded secrets", effort: "Small", impact: "Critical" },
      { priority: 3, title: "Fix PiAdapter property naming (currentUser vs user)", effort: "Small", impact: "Critical" },
      { priority: 4, title: "Add authentication to SSE notification endpoint", effort: "Small", impact: "Critical" },
      { priority: 5, title: "Hash PINs before storing in IndexedDB", effort: "Small", impact: "Critical" },
      { priority: 6, title: "Fix postMessage origin from '*' to Pi Network domain", effort: "Small", impact: "High" },
      { priority: 7, title: "Sanitize all innerHTML usage with DOMPurify", effort: "Medium", impact: "Critical" },
      { priority: 8, title: "Add Subresource Integrity to all CDN resources", effort: "Small", impact: "High" },
      { priority: 9, title: "Fix btoa stack overflow on large data", effort: "Small", impact: "High" },
      { priority: 10, title: "Replace static PBKDF2 salts with random salts", effort: "Small", impact: "Critical" },
      { priority: 11, title: "Implement real KYC verification via Pi Network API", effort: "Medium", impact: "Critical" },
      { priority: 12, title: "Deploy backend API (Workers or separate host)", effort: "Large", impact: "Critical" },
      { priority: 13, title: "Add domain verification key file", effort: "Small", impact: "Critical" },
      { priority: 14, title: "Split invoice.js into separate modules", effort: "Large", impact: "Medium" },
      { priority: 15, title: "Implement proper build system (Vite/webpack)", effort: "Large", impact: "Medium" },
      { priority: 16, title: "Fix CSP to remove unsafe-inline and unsafe-eval", effort: "Medium", impact: "High" },
      { priority: 17, title: "Add merchant authorization checks on all endpoints", effort: "Medium", impact: "Critical" },
      { priority: 18, title: "Replace canvas fingerprinting with UUID", effort: "Small", impact: "Medium" },
      { priority: 19, title: "Complete CSV import functionality", effort: "Medium", impact: "Medium" },
      { priority: 20, title: "Implement proper offline sync with retry limits", effort: "Medium", impact: "Medium" },
    ],
  };

  // Build derived data after object is fully constructed
  const allIssuesForCategory = [
    ...data.criticalFindings.map(i => ({ ...i, severity: 'critical' })),
    ...data.highIssues.map(i => ({ ...i, severity: 'high' })),
    ...data.mediumIssues.map(i => ({ ...i, severity: 'medium' })),
  ];
  const allIssuesForFile = [
    ...data.criticalFindings.map(i => ({ file: i.file, severity: 'critical' })),
    ...data.highIssues.map(i => ({ file: i.file, severity: 'high' })),
    ...data.mediumIssues.map(i => ({ file: i.file, severity: 'medium' })),
  ];

  return NextResponse.json({
    ...data,
    categoryBreakdown: buildCategoryBreakdown(allIssuesForCategory),
    fileHeatmap: buildFileHeatmap(allIssuesForFile),
  });
}