# Sprint 7.23.5 legacy product ledger

This sanitized ledger records the local-only cleanup against baseline `c2e1b75aa3a17a2941ec1299784c69a79343c82e`. It contains no credentials, Production identifiers, or business records. Migrations `071`–`073` remain local-only.

## Product findings

| Area | Finding | Resolution | Status |
|---|---|---|---|
| Session | Idle logout reused link-expiry messaging | Added dedicated `idle-timeout` access state with exact re-entry copy and action | Removed |
| Governance | Finance/Manager branch administration and Finance staff/sequence duties were incomplete | Central permission matrix, routes, server owner guards, and migration `073` align the intended duties | Replaced locally |
| Operational unit | Location appeared as a user-facing parallel master | Navigation, forms, lists, filters, hubs, imports, breadcrumbs, cleanup, and docs now use Branch / Outlet; old routes redirect to `/branches` | Retired from product |
| Barcode | Forms, search/query shape, imports, cleanup, backup, data-onboarding, and dead scan aliases retained unused behavior | Runtime query/mobile navigation deleted and all product behavior removed | Retired from product |
| Samples | Early demo vocabulary did not match Seri Bako | Import/config examples now use PANDAN and STEAMED PANDAN CAKE; full banned-term scan completed | Replaced |
| PR creation | Grouping pushed the first requested item too low | One compact Request details row, two-line Remarks, then Requested Items | Replaced |
| Urgency | Native select did not express severity | Reusable Radix select with consistent critical, urgent, normal, and low badges | Replaced |
| Hubs | Procurement and Inventory behaved like duplicate launch grids | Both remain canonical role-aware workspaces with live counters, work queues, compact shortcuts, and right-console context | Replaced |
| Activity | Workspace updates ended without a clear continuation | Concise scoped activity plus explicit Show more link to `/activity` | Added |
| Repository | Local generated evidence/logs were present but ignored inconsistently | Ignore contract expanded and tracked-file audit completed | Corrected |

## Retained compatibility references

These names are not rendered as product concepts. They remain because posted stock and historical migrations depend on the physical schema. Removal requires a separate Production-data dependency audit, backfill plan, forward migration, and rollback rehearsal.

| Files | Why retained | Removal condition |
|---|---|---|
| `src/types/database.ts` | Generated shape for existing database columns/tables, including deprecated barcode storage | Regenerate after a separately approved destructive schema migration |
| `src/server/inventory/locations.ts`, `src/server/inventory/engine.ts` | Resolves the existing internal stock-area foreign key for branch-ledger posting | Ledger schema is migrated to a branch-native key and historical balances reconcile |
| `src/server/actions/goods-receivings.ts`, `procurement.ts`, `production-jobs.ts`, `purchase-returns.ts`, `stock-counts.ts`, `stock-operations.ts`, `stock-transactions.ts` | Writes existing ledger/RPC payload fields | All dependent RPCs, tables, views, and posted records are migrated |
| `src/server/queries/common.ts`, `foundation.ts`, `goods-receivings.ts`, `inventory.ts`, `outlet-daily-records.ts`, `procurement.ts`, `production-jobs.ts`, `stock-counts.ts`, `stock-operations.ts`, `data-onboarding.ts` | Reads legacy storage or maps it to Branch / Outlet output | Branch-native views replace every dependency and parity tests pass |
| `src/components/foundation-forms.tsx`, `src/app/(app)/staffs/new/page.tsx`, `src/app/(app)/staffs/[id]/page.tsx` | Hidden compatibility field names map branch choices into existing staff-scope storage | Staff scope tables are consolidated safely |
| `src/lib/mock-mode.ts`, `src/lib/validations/foundation.ts`, `procurement.ts`, `stock-count.ts`, `stock-operations.ts`, `stock-transaction.ts` | Types/validation accept existing database and RPC shapes | Server contracts and schema are migrated together |
| `src/app/(app)/stock-card/page.tsx`, `src/app/(app)/stock-transactions/export/route.ts` | Stable row keys/export fallback use existing query fields without exposing the retired term | Queries emit branch-native identifiers only |
| `src/app/(app)/locations/page.tsx`, `new/page.tsx`, `[id]/page.tsx`; `src/server/auth/route-permissions.ts` | Compatibility URLs converge to `/branches` | Redirect telemetry shows no consumers and a later route-removal sprint approves deletion |
| `src/server/actions/foundation.ts`, `src/server/queries/foundation.ts` | Legacy server functions remain for migration-era compatibility but have no navigable product route | Static import audit plus Production log audit proves no caller |
| Applied migrations `001`–`070` | Immutable schema history contains legacy table/column names and one historical `warehouse` enum label | Never edit in place; supersede only with approved forward migrations |
| Migrations `006`, `013`, `014`, `023`, `026`, `056`, `057`, `069` | Historical barcode schema/dependency handling | Deprecated physical objects are removed by a separately reviewed forward migration |

`window.location` in `src/components/auth/change-password-success.tsx` is a standard browser navigation API and is unrelated to the retired operational concept.

## Scan result

Case-insensitive scans covered `src`, `supabase`, `tests`, `docs`, import templates, scripts, public assets, and package/config files.

- Zero user-facing/runtime hits: `Location`, `Locations`, `Default Location`, `optional location detail`, `default locations`.
- Zero user-facing/runtime hits: `barcode`, `bar code`, `scanning`, `missing barcode`, `barcode import`, `barcode validation`.
- Zero demo/sample hits: `satay`, `chicken satay`, `satay meat`, `chicken thigh`, `basmati`, `salmon`, `beef striploin`, `debtor ledger`.
- One intentionally retained historical migration hit: `warehouse` in migration `001`; it is an applied enum label, not UI, fixture, seed row, or runtime copy.
- Remaining operational-unit and barcode matches are limited to the compatibility files listed above, applied migrations, generated types, and negative regression assertions.

## Git hygiene evidence

`git ls-files` found no tracked generated browser directory, logs, screenshots, PDFs, exports, coverage, build output, or environment values. The sanitized `test-results/sprint-7-23-0/page-matrix.json` remains intentionally source-controlled under the explicit QA-document exception. `.env.example` remains a placeholder-only template.

`git check-ignore -v` confirmed rules for `.next/`, `test-results/`, `playwright-report/`, `playwright/.cache/`, `coverage/`, screenshots, `qa-artifacts/`, `exports/`, PDFs, logs, and `.env.test.local`.

The disposable database reset applied migrations `001`–`073`. Rollback-only authenticated RLS tests proved Finance can update and role-assign a non-Owner staff fixture, cannot update an Owner fixture, and cannot assign the Owner role directly. They also proved Kitchen reads only its own assignment while Finance with `staffs.read` can read the company assignment set. The fixture transactions were rolled back; post-check business-row count remained zero.

Local migration `073_operating_governance_permissions.sql` SHA-256: `4C7EEB77F37536BA52DA2252EB4CEDBF482A7605DDB068C86407E9205328C6E7`.

## Next removal gate

Sprint 7.24.0 should not combine destructive schema cleanup with Dashboard V2. Dashboard V2 may add role-specific operational charts and action queues using current branch-scoped queries. Physical compatibility removal should remain a separate database-hardening sprint with dependency inventory, Production counts, backfill, rollback SQL, local reset, RLS bypass tests, and owner approval.
