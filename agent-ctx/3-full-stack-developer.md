# Task 3: Create new API routes for all new database models

## Summary
Created 7 new API route files and updated 2 existing ones to support all new database models from the schema upgrade.

## New Routes Created
1. `/api/categories/route.ts` - Categories CRUD with hierarchical support, product count, slug uniqueness
2. `/api/inventory/route.ts` - Inventory management with low stock alerts, upsert, auto-movement logging
3. `/api/inventory/movement/route.ts` - Inventory movements with sign convention enforcement, auto stock update
4. `/api/customers/route.ts` - Customer CRUD with search across name/phone/email/piUid
5. `/api/local-sales/route.ts` - Local sales with auto TransactionLog, InventoryMovement, inventory update, customer totals
6. `/api/expenses/route.ts` - Expenses with stats mode, auto TransactionLog
7. `/api/transaction-logs/route.ts` - Transaction log listing with filters

## Updated Routes
- `/api/products/route.ts` - Added categoryId, sku, costPrice, stockQuantity, lowStockThreshold, trackInventory, unit fields; auto-create Inventory; category relation in GET
- `/api/invoices/route.ts` - Added paymentMethod, taxAmount, discountAmount; paymentMethod filter; auto-recalculate total

## Key Implementation Details
- All mutations require verifyPiAuth + verifyStoreOwnership
- All reads require checkRateLimit
- All string inputs sanitized with sanitizeString
- All Pi amounts rounded with roundPi
- Local sale auto-chains: TransactionLog → InventoryMovement → Inventory update → Product.stockQuantity → Customer totals
- Inventory movements enforce sign convention (in=positive, out/sale=negative)
- ESLint: 0 errors

## Files Modified/Created
- src/app/api/categories/route.ts (NEW)
- src/app/api/inventory/route.ts (NEW)
- src/app/api/inventory/movement/route.ts (NEW)
- src/app/api/customers/route.ts (NEW)
- src/app/api/local-sales/route.ts (NEW)
- src/app/api/expenses/route.ts (NEW)
- src/app/api/transaction-logs/route.ts (NEW)
- src/app/api/products/route.ts (UPDATED)
- src/app/api/invoices/route.ts (UPDATED)
