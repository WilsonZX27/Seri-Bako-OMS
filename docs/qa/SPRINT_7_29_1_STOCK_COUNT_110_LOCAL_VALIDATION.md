# Sprint 7.29.1 Stock Count migration 110 local validation

Date: 2026-07-29  
Result: Superseded blocker report; fresh validation required after canonicalization

## Isolation evidence

- Disposable project: `seri-bako-stock-count-110-validation`
- Disposable path:
  `.tmp/stock-count-110-validation-20260729`
- API: `http://127.0.0.1:55321`
- PostgreSQL: `127.0.0.1:55322`
- Baseline migration count: 107
- Baseline last migration: `109_stock_count_creation_atomicity.sql`
- Migration 110 was held outside the active migration directory.
- Migration 111 was not present in the disposable project.
- Canonical/copy migration 110 SHA-256:
  `3B6931D79D79413A47AEC68FACC2355F091E8A60E6F51A56343143781D13209D`

## Preflight result

- Migration 110 recorded: no
- Migration 111 recorded: no
- `kitchen` role: present and active
- Legacy Stock Counts: none in the disposable baseline
- Deployed pre-110 RPC: identified; it only accepted `approved`

Permission preflight:

| Permission | Exists | Granted to Kitchen |
| --- | --- | --- |
| `inventory.read` | yes | yes |
| `stock_balance.read` | yes | yes |
| `stock_balances.view` | **no** | **no** |
| `stock_count.create` | yes | yes |
| `stock_count.post` | yes | yes |
| `stock_count.read` | yes | yes |
| `stock_count.update` | yes | yes |
| `stock_transactions.read` | yes | yes |
| `stock.view` | yes | **no** |

## Resolved design defect

Repository audit confirmed `stock_balances.view` has no database permission
row, RLS dependency, function dependency, view dependency, or direct page
requirement. It is an application-only legacy alias for canonical permission
`stock_balance.read`.

Migration 110 now grants only eight canonical permissions and fails closed when
the Kitchen role, a permission row, or the final grant count is incomplete.
The alias resolves one-way to `stock_balance.read`. This document preserves the
first blocked run; the fresh validation result is recorded separately.
