# Milestone 1 Testing Checklist

## Current audit closure checks (v7.87.0)

- Confirm the app shell uses `dvh`, with no fixed `100vh` route clipping mobile
  browser chrome.
- Confirm `/manifest.webmanifest` reports `display: standalone` and
  `orientation: portrait`; verify the Cordova wrapper fullscreen/status-bar
  preferences separately.
- Force Dashboard and Inventory read failures; the UI must show `Unavailable`,
  never a fabricated zero or empty-success state.
- Double-click import confirmation and other mutation submits; only one
  request may be sent while the first is pending.
- Confirm import dates accept only date-only `YYYY-MM-DD` or `DD/MM/YYYY`,
  normalize without timezone drift, and return row-level errors.
- Confirm Stock Count Save draft and Confirm & Post remain distinct, stepper
  controls are at least 48px on mobile, and legacy Submit/Review/Approve paths
  are absent.
- Confirm Kitchen purchase-request creation/submission remains branch-scoped
  and ordinary procurement permissions are not removed.
- Run `npm run typecheck`, `npm run lint`, `npm run test:contract`, and
  `npm run build` before release handoff.

## Database

- Run `supabase/migrations/001_milestone_1_inventory_foundation.sql`.
- Confirm `locations` contains `CK` and `WH`.
- Confirm `stock_balances_view` shows stock calculated from posted stock ledger rows.
- Confirm `low_stock_items` shows flour and butter based on the sample opening balances.
- Confirm `stock_transactions` cannot be updated or deleted through authenticated RLS policies.

## Authentication

- Create a Supabase Auth user.
- Insert a matching `profiles` row with role `admin`.
- Confirm unauthenticated users are redirected to `/login`.
- Confirm authenticated users are redirected from `/login` to `/dashboard`.

## Supplier Master

- Create a supplier as `admin` or `purchasing`.
- Edit supplier contact and status.
- Confirm `finance`, `kitchen`, and `viewer` can read suppliers but cannot create or edit.

## Item Master

- Create an item with purchase unit, base unit, and conversion factor.
- Edit safety stock and cost.
- Confirm the item screen does not contain a current stock field.
- Confirm `finance`, `kitchen`, and `viewer` can read items but cannot create or edit.

## Stock Transactions

- Create an `opening_balance` transaction with quantity in.
- Confirm opening balance cannot be posted as quantity out.
- Create an outbound `wastage` transaction.
- Confirm stock balance decreases.
- Create a `correction` transaction.
- Confirm corrections create new ledger rows instead of editing old rows.
- Confirm no edit/delete actions are visible for stock transactions.

## Stock Balance

- Confirm current stock equals total quantity in minus total quantity out.
- Confirm stock is shown in item base unit.
- Confirm changing item safety stock updates low stock status.

## Dashboard

- Confirm low stock widget shows top low stock items.
- Confirm recent stock transactions appear after posting a new movement.
- Confirm dashboard does not show purchasing, production, or invoice modules.
