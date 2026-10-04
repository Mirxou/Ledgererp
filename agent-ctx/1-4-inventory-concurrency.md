# Task 1-4: Inventory Concurrency Management

## Summary
Implemented complete inventory concurrency management with optimistic locking, reserved quantities, and stock validation guards to prevent overselling.

## Changes Made

### Schema
- Added `version Int @default(0)` to Inventory model (optimistic locking)

### New File: `/src/lib/inventory-guard.ts`
- `checkStockAvailability()` - checks available = quantity - reservedQuantity
- `reserveStock()` - reserves stock for escrow, atomic with version check
- `releaseReservedStock()` - releases reservation on cancel/dispute
- `deductStock()` - deducts stock for local sales or escrow completion
- `restockItems()` - returns items to inventory

### Modified Files
- `/src/app/api/local-sales/route.ts` - strict stock check + atomic deductStock
- `/src/app/api/invoices/route.ts` - escrow reserve/release/deduct on status transitions
- `/src/app/api/inventory/route.ts` - optimistic locking in PATCH, availableQuantity in GET/POST
- `/src/app/api/inventory/movement/route.ts` - version increment on movement

## Key Guarantees
- Local sales BLOCKED if available stock insufficient (409 Conflict)
- Escrow reserves stock atomically on paid_escrow
- Concurrent modifications detected via version check → 409 Conflict
- All operations use db.$transaction for atomicity
