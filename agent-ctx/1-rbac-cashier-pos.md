# Task 1: RBAC + Cashier POS Interface

## Completed Work

### 1. Cashier POS View Component (`src/components/cashier-pos-view.tsx`)
- Full POS-style interface optimized for touch/click interaction
- **Product Grid**: Categorized products with quick-search, shows name + price only (NO costPrice), available quantity indicator, out-of-stock disabled state, in-cart quantity badge
- **Cart Builder**: Add/remove items, quantity +/- controls, running subtotal, clear cart
- **Payment Method**: Cash/Card/Pi selection with visual indicators
- **Customer Lookup**: Search by name/phone, attach customer to sale, remove customer
- **Sale Creation**: One-click with confirmation dialog, uses `/api/local-sales` endpoint
- **Print Support**: Success dialog with print option, reprint from recent sales list
- **Recent Sales**: Last 5 sales displayed with invoice number, time, customer, total, reprint button

### 2. Role-Based Access Control (page.tsx)
- **Role State**: `role` state persisted in localStorage as `ledgererp_role` (default: "manager")
- **Tab Filtering**: Manager sees all 12 tabs; Cashier sees only: sales, orders, customers, shop
- **Role Switcher**: Prominent badge in header — "مدير" (emerald) or "كاشير" (amber)
- **Confirmation Dialog**: Prevents accidental role switch, explains what changes
- **Conditional Rendering**: Cashier → CashierPOSView; Manager → full tabbed interface
- **Header Simplification**: Cashier doesn't see notification bell or theme toggle

### 3. Cashier Cannot See
- Dashboard (financial stats)
- Products tab (cost prices exposed)
- Inventory (reserved quantities)
- Expenses (financial data)
- Finance (P&L data)
- Payments (transaction management)
- Settings (store configuration)
- Pi Setup (Pi configuration)

### Lint: 0 errors, 1 warning (pre-existing font warning)
### Dev Server: 200 OK
