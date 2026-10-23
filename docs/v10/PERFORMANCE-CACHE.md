# Performance and cache baseline

Source baseline: `ae6bc16423842824a212f0054b52d78b4912badd`. Measurement precedes optimisation. This file records observations and missing evidence, not promised speed gains.

## Available measurements

Node 22.23.4 / Next 15.5.21 compilation using a nonsecret synthetic loopback/discard endpoint passed. Next's build report estimated shared first-load JS at 102 kB and Middleware at 105 kB. Route first-load estimates: Dashboard 119 kB; Asset Management 170 kB; Goods Receiving 157 kB; Outlet Daily Records 159 kB; Purchase Requests 162 kB. These are build-report bytes, not measured network transfers, LCP, page timings or database latency. Baseline log: `/tmp/oms-v10-node22-baseline-build-ae6bc164.log`.

No real page/navigation or DB-call measurements were obtained. Runtime-log read for the exact Preview returned 403. Project and deployment-file endpoints returned 404 despite successful deployment metadata reads. A read-only TTFB query returned 400 without usable validation detail. No CLI is installed, and no permission/environment setting was changed to obtain access. These operations are blocked; do not repeatedly probe them or claim empty logs mean no errors.

Existing source observability: `src/server/observability/supabase-timing.ts` measures fetch duration and emits warnings >=1000ms with relation/method/status, excluding filters/records/URLs. `latency-percentiles.ts` emits process-local 25-sample windows, max 64 series, for aggregated sources. It is not a distributed per-page waterfall or SQL execution timer. Flags are defined in `src/lib/reliability/flags.ts`; effective hosted flag values were not read. Do not claim instrumentation is enabled in a deployment merely because the default is true in source.

Required next measurements: exact route/state/role, dataset size, build/runtime SHA, cold/warm definition, timestamp/window, sample count, p50/p95 TTFB and navigation timing, LCP/INP/CLS, request count/waterfall, Supabase relation/RPC count+duration, error rate and transferred bundle bytes. Collect only existing authorised logs/aggregates or isolated fixture runs. Do not run Production EXPLAIN ANALYZE, load tests, migrations or index DDL. SQL proposals need a reviewed plan before execution.

## Cache ownership and correctness map

| Owner/source | Scope/key | Lifetime/invalidation | Correctness boundary and next check |
| --- | --- | --- | --- |
| `src/server/queries/auth-user.ts` React cache | Current server render; no persistent shared user cache | Request/render lifetime; later request calls Auth again | Verify session/role change between requests; never lift to module map or persistent cache |
| `src/server/auth/permissions.ts` React cache and tenant actor | Current request + permission argument; session checks remain | Request lifetime; user state rechecked by action | Denied/expired results must not become a cross-identity grant; full grant tests required |
| React `cache` in `queries/assets.ts`, `notifications.ts`, `pending-actions.ts`, `items.ts` and related query owners | Memoisation within server render, arguments where supplied; authenticated Supabase/RLS | Request lifetime; next request re-reads | Request memoisation is not a tenant-wide TTL; test distinct role/tenant fixture requests |
| `src/lib/supabase/server.ts` and `server-fetch.ts` | Client created from current request cookies; request-specific credentials | Transport `cache: no-store`; local concurrency limiter 3 by default, bounded 1–12; remote bypasses local limiter | Stock/payments/approvals/permissions require read-after-write. No force-cache replacement. Retry only safe GET/HEAD, no mutation replay |
| `src/server/actions/*` `revalidatePath` | Module paths and related list/detail/dashboard paths | After successful business action | Audit each changed action's invalidation graph; revalidation cannot repair an incorrect data key. No mutation used in this baseline |
| Private export/attachment endpoints | Current authorised request, tenant/parent scope before export/signing | Explicit no-store/private headers on relevant routes | Audit all 38 handlers individually; current grep is not evidence every route is correct |
| Client form/asset drafts (`src/lib/asset-draft.ts`, `components/asset-draft-state.tsx`) | Session storage keyed by actor/company scope, route/form, revision and expiry | Four-hour validated expiry; clear on success/discard; reject mismatched scope/revision | This is input recovery, not authoritative business data or a session cache. Never persist tokens, broaden sensitive contents or replay a save |
| Reliability circuit/latency maps | Process-local availability/aggregate metadata | Bounded windows / retry policy; no returned row cache | No identity/data cache benefit claimed; per-process samples cannot prove fleet-wide p95 |
| Static Next assets | Content-hashed build artifact | New hashes on deploy | Measure real transferred/gzip bytes when browser access is available; no infrastructure/cache-header changes in this batch |

No persistent `unstable_cache`/`use cache` policy was introduced. Inventory all existing cache sites before proposing one. Any new cache needs explicit owner, tenant/company/branch/role/auth key, data class, TTL rationale, invalidation triggers, error behavior and tests across identities and writes. Payments, stock, approvals and permissions may not trade correctness for speed.
