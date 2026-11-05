# Procurement read concurrency follow-up

Base `7028827` (current Preview branch source at start). Local isolated patch only; no production data, permissions, tenant isolation, configuration, migrations or deployment changes.

## Measurement coverage and blocker

Independent IAB browser inventory still shows Production `/login?returnTo=...` and old Preview `/access-status?reason=idle-timeout`. No working independent authenticated page exists here. The shared native Chrome was actively used by the user in the prior batch, so it was not taken over. This is an authentication/session availability blocker, not a new access denial. No denied Vercel endpoints were retried and no session tokens were copied.

Therefore no comparable live first/repeat document or RSC/API timings were acquired for Daily, PR/PO or Inventory. Current source SHA is not a verified served SHA. Local fixture numbers below must not be presented as live browser performance, SQL timings, LCP or p95.

Source entry paths checked:
- Daily list: list data, form options without products, three permission checks and historical context already start in one Promise.all. `getOutletDailyRecords` also starts row-load and today-summary together. Existing React request caching reuses individual permission checks; blindly replacing them with another batch could introduce duplicate work. No Daily performance change justified in this pass.
- Inventory hub: dashboard summary, daily movement and permission map already start in one Promise.all under the existing deadline. This is entry-point inspection, not proof every downstream query is optimal. No Inventory change without further evidence.
- PR/PO: two confirmed independent read sequences described below were exercised using their actual query/page source.

## Changes

1. `getPurchaseRequests`: item default suppliers and branch-item supplier mappings both depend only on item/branch IDs already loaded. Previously serial; now one Promise.all. The same projections, ID scopes, active/deleted filters, missing/error validation and downstream supplier-resolution algorithm remain. Read count is unchanged; one request wave is removed. Failure in either parallel query still throws before supplier-item/supplier detail reads; the other independent query may already be in flight.
2. `/purchase-orders`: export branch options previously waited for the complete order list and summary plus permission. They now start immediately after `po.create` is granted, overlapping unrelated list/summary work. Denied grant still skips branch query entirely; `restrictToActorScope: true`, existing branch failure -> null handling, summary logging and list unavailable handling remain.

## Controlled before/after

Actual baseline/modified TS query/page source, authorized fixture data, no external network. One warm-up then seven paired samples, transpilation excluded. Node 24.21.0 host, not hosted Node 22 Next runtime.

| Path | Simulated dependency latency | Baseline median | Modified median |
| --- | --- | --- | --- |
| PR sourcing | items 25ms + branch mappings 25ms; other fixture reads immediate | 52.36ms | 26.29ms |
| PO page | permission 5ms, branches 25ms, list 40ms | 67.50ms | 41.34ms |

These demonstrate removed serial waits, not a promised Production percentage speedup. Evidence scripts and raw samples: `../procurement-performance-evidence-20261105/benchmark.cjs` and `benchmark.json`; immutable before sources saved alongside.

## Verification

13/13 tests pass across new `procurement-read-concurrency.test.js`, existing PR list-order, procurement read-bounds and progressive-sourcing suites. New actual-source tests check overlap, required filters, quantity/value preservation, either read failing closed, permission-before-branch and denied-grant no-read behavior. Focused ESLint and full `npx tsc --noEmit` pass; `git diff --check` passes.

No live after screenshots, first/repeat pairs, API or database latency percentiles were obtained. Remaining next measurement requires an available independent authorized session; keep the user's active window free. Do not change cache freshness or skip authorization to produce a quicker result.

## Integration on 27c807f

Applied cleanly after asset permission batching. Reviewed actual runtime boundaries: PR sourcing keeps the same authenticated Supabase client and ID sets derived from the already-scoped request page; no new company/branch input or service client is introduced. Branch supplier active/deleted filters are identical. Tenant isolation continues to depend on existing database RLS, not these scheduling changes. PO export options still await a positive `po.create` grant and use `restrictToActorScope: true`; that owner reads current-user scope, returns empty for absent/restricted-empty scope, and filters assigned branch IDs. Company-wide reads still rely on existing RLS. Live database policies were not retested.

Combined regression: 38 tests pass across procurement ordering/bounds/sourcing/branch-scope, asset permission batching/equivalence and performance read paths. Added permission-source rejection test: page rejects and no export-branch query starts. Existing branch-option failures remain null/unavailable; PR either-query errors stop supplier-detail reads. The other already-started independent read may finish after a failure, with no business writes. No production timing claim is made.

Full Next build including TypeScript and focused runtime ESLint passed (exit 0). CommonJS fixture lint passed with only `no-require-imports` disabled for the test command. Logs: `/tmp/oms-procurement-integrated.log`, `/tmp/oms-procurement-integrated-build.log`. Existing build warnings remain unchanged. Preview Ready and authenticated after measurements remain unverified.
