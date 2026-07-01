# Seri Bako Operations Management System

Milestone 1 implements the inventory foundation for Seri Bako:

- Supplier Master
- Item Master
- Stock Transactions
- Stock Balance View
- Low Stock page and dashboard widget
- Supabase Auth gate
- Role-aware database policies

Purchasing, production, invoices, recipe/BOM, goods receiving, and finance modules are intentionally excluded from this milestone.

## Setup

1. Install dependencies.

```bash
npm install
```

2. Copy environment variables.

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not prefix it with `NEXT_PUBLIC_`; it is used by server actions for staff invitations and first-password setup.

4. Run the database migration:

```text
supabase/migrations/001_milestone_1_inventory_foundation.sql
```

5. Create a Supabase Auth user, then create a matching `profiles` row.

```sql
insert into public.profiles (id, full_name, role)
values ('AUTH_USER_ID_HERE', 'Admin User', 'admin');
```

6. Start the app.

```bash
npm run dev
```

## Structure

```text
src/app
  (auth)/login
  (auth)/forgot-password
  (auth)/set-password
  auth/callback
  (app)/dashboard
  (app)/suppliers
  (app)/items
  (app)/stock-transactions
  (app)/stock-balances
  (app)/low-stock

src/components
  layout
  ui
  supplier-form.tsx
  item-form.tsx
  stock-transaction-form.tsx

src/server
  actions
  queries

src/lib
  supabase
  validations

supabase
  migrations
```

## Inventory Rule

Current stock is calculated from `stock_transactions`.

No page updates stock balance directly. Corrections must be posted as a new stock transaction.
