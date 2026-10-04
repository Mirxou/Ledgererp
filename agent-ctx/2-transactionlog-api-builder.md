# Task 2: TransactionLog API Builder

## Completed APIs

### 1. POST /api/transaction-logs
- Create new transaction log entry with state machine
- Required: storeId, type (cash|pi|ousd|refund|expense), amount, currency (Pi|USD|OUSD)
- Optional: invoiceId, description, reference, createdBy
- New entries start with status "pending" stored in reference field as "pending:{reference}"
- Auto-links to invoice if invoiceId provided (validates invoice exists and belongs to store)
- Uses verifyPiAuth + checkRateLimit + roundPi

### 2. PUT /api/transaction-logs
- State machine transitions: pending → approved → completed | failed
- Body: { id, status: "approved"|"completed"|"failed", completedAt? }
- Only allows valid transitions (409 Conflict for invalid)
- Extracts current status from reference field prefix
- When status→"completed", records completedAt timestamp in description field
- Returns previousStatus in response for clarity

### 3. GET /api/transaction-logs?storeId=xxx&stats=true
- Returns: { totalByType, totalByCurrency, pendingCount, completedCount }
- Reads status from reference field prefix convention

### 4. PATCH /api/local-sales
- Refund/return handler: { id: saleId, action: "refund", reason?: string }
- Step 1: Creates refund TransactionLog entry (type="refund", reference="pending:refund:invoiceNumber")
- Step 2: Restores inventory using restockItems from inventory-guard
- Step 3: Reduces customer totalSpent and totalOrders (never below 0)
- Step 4: Marks sale notes with [REFUNDED] tag + timestamp + reason
- Prevents double-refund (checks for [REFUNDED] in notes)

## Design Decisions
- State machine uses reference field prefix convention since TransactionLog model has no status field
- CompletedAt stored in description field since model has no completedAt column
- Did NOT modify prisma schema per task constraints
- All routes use verifyPiAuth for authentication and checkRateLimit for rate limiting
