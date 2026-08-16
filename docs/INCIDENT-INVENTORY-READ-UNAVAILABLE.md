# Incident: inventory list reads shown as unavailable

## Evidence

The supplied `supabase_logs.csv` contains 116 rows. The relevant groups are:

- 19 HTTP 404s for `get_stock_count_variance_insight`;
- 22 statement cancellations (`57014` timeout);
- 13 HTTP 500s for `get_stock_ledger_bounded_page`;
- 9 HTTP 500s for `get_stock_card_bounded`.

The same export also contains expired-session signals (`403 /auth/v1/user` and
`400 /auth/v1/token`). Those are a separate authentication condition, not a
valid reason to render inventory as zero.

## Root cause

The list and detail views do not use the same read path. A detail route can read
one transaction and hydrate its referenced item/branch, while a list/report
route uses bounded RPCs and aggregate read models. The logs show that those
read-model calls are either missing in the connected database (404) or timing
out/returning 500 (inventory ledger/card).

Therefore “detail visible, list unavailable” is consistent with a failed list
read model, not proof that the records do not exist. Rendering the failed list
as an empty array or zero count would be misleading.

## Code response in v8.64.2 (in progress)

- Stock Count variance insight has a strict base-table fallback when migration
  149's RPC is absent or stale. Any incomplete fallback source remains
  `available: false`.
- Stock Card and Movement Ledger use a bounded direct-table fallback after RPC
  failure. It never uses the unbounded `stock_ledger_view` and refuses to
  return a success result when the safe read bound or hydration is incomplete.
- Inventory daily movement now has the same bounded direct-table fallback when
  migration 148's optional RPC is absent. The fallback expands transaction
  lines exactly once, fills calendar dates only after a successful source read,
  and keeps `unavailable: true` on any source or bound failure.
- Stock Balance failures now propagate an explicit unavailable state into
  Movement Ledger valuation. A failed balance query cannot appear as `0` stock
  rows or `RM 0.00` stock value.
- Movement Ledger shows `Unavailable`, suppresses result counts/empty states,
  and does not display zero totals during an incomplete read.
- Migration `150_inventory_read_reliability_indexes.sql` adds date-first
  partial indexes for posted ledger reads and supporting count/line indexes to
  address the timeout pattern in the supplied logs.
- Contract tests cover the fail-closed behavior.

## Required database follow-up

The fallback protects the UI, but the connected Supabase database still needs
the repository migrations that define the missing/stale RPCs and indexes. This
requires an authorized Supabase migration execution path (dashboard SQL
editor, CI deploy role, or a supplied database password). No migration was
executed from this workspace because only the public client key is present and
the linked CLI could not authenticate as the database role.

After deployment, verify these calls in the same project and company scope:

1. `get_stock_count_variance_insight`;
2. `get_stock_card_bounded`;
3. `get_stock_ledger_bounded_page`;
4. the supporting indexes from their repository migrations.

The acceptance condition is not “the page loads”; it is: list, summary, and
detail agree on the same records, and any read failure is visibly unavailable
instead of zero.
