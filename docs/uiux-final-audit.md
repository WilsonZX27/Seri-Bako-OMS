# Seri Bako OMS UI/UX Final Audit Ledger

Last updated: 2026-08-11

This is the running evidence ledger for the strict UI/UX and responsive audit. It is intentionally not a completion certificate until authenticated browser and cloud-data gates pass.

## Current verification snapshot

| Gate | Result | Evidence / limitation |
|---|---|---|
| TypeScript strict check | PASS | `npm run typecheck:strict` completed without errors. |
| ESLint | PASS | `npm run lint` completed without errors. |
| Production build | PASS | `npm run build` completed; Next.js generated 88 routes. |
| Full local contract inventory | PASS | `npm test -- --test-reporter=dot` completed with 395/395 passing tests. |
| Focused shared-shell contracts | PASS | 26/26 passed after reconciling stale assertions and fixing mobile action guards. |
| Authenticated Playwright E2E | BLOCKED | The configured suite points to local Supabase at `127.0.0.1:54321`, which is not running. |
| Browser automation matrix | BLOCKED | Chrome launch previously failed with `DevToolsActivePort`; no authenticated visual pass is claimed. |
| Cloud Supabase migration/data verification | BLOCKED | CLI migration-ledger connection was not available; local migration 113 is not claimed as deployed. |

## Changes verified in this continuation

- Shared mobile action rails are now explicitly suppressed when the caller has no creation permission on Items, Products, Supplier Items, Stock Ledger, Purchase Orders, Purchase Requests, Inventory, and related workspace shells.
- Dashboard quick actions retain role-specific destinations and use the canonical panel/control radius tokens.
- Stock-balance mobile action buttons use the canonical control radius token.
- Contract assertions were reconciled with the current shared API (`WorkspaceGrid`, `tabsRef`, semantic third-column identity anchors, and tokenized radii); no business logic or Supabase path was changed.
- The complete local contract inventory is green (395/395); this validates source-level invariants only and does not replace authenticated browser or cloud-data verification.

## Responsive matrix continuation (2026-08-11)

The interrupted local audit was resumed on `http://127.0.0.1:3015` with the disposable Super Admin fixture. The complete 75-route static workspace inventory passed at 390x844, 768x1024, 820x1180, 1024x900, 1180x820, and 1440x960. Each route was checked for login redirect, global CSS, application errors, page overflow, and interactive bounds. Role workspace E2E passed 8/8 serially, including Outlet Staff daily-record access/denial boundaries; `/roles` mobile visual smoke passed 1/1.

The local Next dev server can saturate its stylesheet asset endpoint during long-lived sessions; affected batches were rerun in short deterministic sessions and passed. This is recorded as infrastructure noise, not silently counted as a product pass. Cloud Supabase timeout/permission evidence, migration-ledger reconciliation, production application of migration 113, and a real cloud-authenticated browser session remain open.

## Unresolved gates (must remain visible)

1. Restore an authenticated Owner browser session and execute the route matrix at 390x844, 820x1180, 1180x820, and 1440x900. Inspect every primary button, dropdown, filter drawer, table anchor, action rail, empty/error/loading state, and refresh persistence.
2. Restore or validate the cloud Supabase migration ledger, then apply and verify `supabase/migrations/113_repair_outlet_staff_daily_record_access.sql` for Outlet Staff. The migration is local-only until a successful cloud push is evidenced.
3. Resolve the supplied Supabase timeout/permission evidence before declaring data visibility fixed: 43 log rows contained 21 `57014` timeouts, 21 HTTP 500 responses, and one `42501` permission error.
4. Re-run the full contract inventory (not only the 26 focused shell contracts) and classify any remaining failures as implementation defects or intentionally retired assertions.

## Related evidence

The broader route inventory, prior screenshots, Supabase log analysis, security baseline, and browser blockers are recorded in [SYSTEM_E2E_UIUX_AUDIT.md](qa/SYSTEM_E2E_UIUX_AUDIT.md). No statement in either ledger should be read as “all annotations fixed” until the unresolved gates above pass.
