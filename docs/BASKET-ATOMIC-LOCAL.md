# Basket atomicity — local candidate only

2026-11-02: the historical 164/375 checkpoint below is superseded by `handoff/basket14/REPORT.md`. Current base is a44e1986; SQL is unnumbered `supabase/maintenance/basket_atomic.PROPOSED.sql`, outside automatic migrations. Full local Auth/PostgREST/browser/179-table restore evidence is recorded in that handoff; production activation remains separate.

User chose whole-basket success or whole-basket rollback. This candidate is based on164 `efc28d530e7aef873178ef822e67734b630da016`;164production promotion is separately blocked by Vercel reauthentication. No basket deployment or production migration is authorized/performed.

## Changes

- `createPurchaseRequestsFromBasket` validates all groups then invokes one new RPC. Ordinary single-PR aggregate remains unchanged.
- Migration375 adds actor/company/key receipts with RLS and no direct public/anon/authenticated table access. Only the permission-checked RPC can create/read receipts. It validates branch and item/supplier scope, serializes identical keys, rejects changed successful payloads, and calls existing PR+number functions inside one PostgreSQL transaction.
- Number allocation, PRs, documents, revisions, lines, activity and receipt all roll back on any supplier failure.
- LowStockPrForm and both StockBalanceWorkspace form surfaces call one durable identity helper before submission. Refresh reuses key; edits retain key so a successful different payload is rejected rather than silently reused. Empty basket clears identity for a new intent. Unavailable browser storage blocks sending and explains why.
- Backup dataset and TypeScript table contracts include receipt table; schema history is marked local375, not applied.

## Evidence

`/tmp/oms-basket-atomic-evidence/`:
- `db-results.json`: actual candidate RPC, existing migration160 PR function, existing migration127 document numbering; two suppliers/three lines with fractionalKG/PCS, entire second-group failure rollback, same-key receipt, changed payload reject, six concurrent same-key callers, permission and branch denials, foreign supplier rejection, empty groups, direct receipt access denied, anonRPC denied, prior receipt replay after supplier deactivation.
- `action.log`: actual TypeScript server action/schema/UOM/branch checks calling localPostgreSQL; create/retry/mismatch/rollback/denial.
- `browser-retry.json`: actual helper in browser, refresh identity preserved, edit retains key, explicit empty starts new key.
- `browser-server-action.json`: actual Nextserver-action echo receives persistent key and same key after refresh. No business writes in browser fixture.
- `tests-final.log`:2128pass0fail (164base2125+3identity tests); `types-final.log`, `lint.log`, `build-final.log` exit0. Build uses synthetic localhost values.

Mocked/limited: anonymous identity/permission/scope helpers and minimal relational schema; production triggers/RLS and current deployed SQL parity not established. Browser echo is not complete LowStock/StockBalance real-account end-to-end. LocalStorage loss, intentional clearing or different browsers represent new request identity; no claim of cross-device content deduplication. Pending/unknown result must be retried before intentionally clearing basket. Restore of a legacy draft that already created partial PRs under the old implementation requires reconciliation; new receipts cannot infer historical partial results.

## Consumers and publication requirements

Changed shared action has exactly two component consumers (three form surfaces). Helper is new and only those consumers use it. SinglePR aggregate and other document paths unchanged. Backup manifest/type additions are necessary dependencies of the receipt table, no unrelated layout work.

Migration375 is a separate pending schema/ACL review: one new table and one authenticatedRPC execute grant, retaining existing purchase_request.create and branch restrictions. Apply only with explicit production approval and fresh migration-number/schema parity check; then deploy app caller. Do not deploy caller before function exists. Review backup/restore receipt ordering with full schema before production activation. No production permission change performed.

Rollback candidate: restore prior app caller only after assessing whether partial behavior is acceptable; leave receipts for audit/retry safety. Never delete successful PRs to emulate rollback. No automatic rollback/activation is implemented.

## Superseding correction after production metadata preflight

The earlier aac3aa7 candidate is NOT installable: actual employment-end helpers returned NULL scope for an ended but active manager and the old `NOT` check accepted it in an anonymous local reproduction. The revised basket-only function selects the canonical current_staff_id plus auth UID and rejects permission/scope unless explicitly TRUE. Shared helpers and ordinary single-PR action remain unchanged.

Inherited service_role defaults are now explicitly revoked for the new table and RPC. Only SELECT on receipts is explicitly restored for the existing admin-only backup exporter; no service INSERT/UPDATE/DELETE or basket RPC EXECUTE. authenticated retains only RPC execute, not direct receipt table access; anon has neither. Migration375 remains a filename placeholder blocked by the separate supplier-recovery375 proposal and production history reconciliation (registry latest370; do not replay371–374 blindly).

Fresh `fixed-production-dependency-local-results.json` verifies17 cases using13 captured production functions and10 triggers: ended/inactive/NULL permission/NULL scope/foreign company/unassigned location rejected; eligible manager/chef allowed; whole basket failure rolls back both sequence counters and every related row; concurrent and changed-payload retries; effective ACL after simulating broad defaults. Anonymous identity and minimal tables remain; not full production RLS/role/restore acceptance. Old positive tests do not supersede the newer rejection evidence.

Release still requires numbering/history reconciliation, full restore/rollback preparation and explicit production approval. No production installation or permission change performed.

Final corrected gates:2130pass0fail (164base2125 +original3identity tests +2fail-closed/ACL contracts), typecheck/lint/build exit0. Actual basket action and unchanged single-PR draft action passed against the corrected anonymous DB with captured production dependencies. service_role is BYPASSRLS in production metadata and existing local container; explicit receipt SELECT succeeds locally, RPC execution and table writes denied. Full backup/restore remains unverified. Final logs use `*-fixed` filenames under /tmp/oms-basket-atomic-evidence. No production application or database change.
