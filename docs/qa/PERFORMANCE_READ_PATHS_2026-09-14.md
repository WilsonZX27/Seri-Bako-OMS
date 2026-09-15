# Performance read paths — 2026-09-14

Candidate: v9.2.68, `efbde98d`, branch `codex/performance-read-paths`.
Baseline: local HEAD and fetched origin/main both matched `65fc93f69f7d0207b72e18b1d727a8e6060c0a6d` before changes. This verifies committed GitHub source, not unpushed Windows files.

## Findings and repairs

- Schedule planner performed independent reads sequentially. It now batches reads after their authorization/data dependencies are known. Overview mode no longer fetches a hidden planner or validates its assignments.
- Dashboard requested a paginated low-stock detail list solely to derive a count. It now uses one exact HEAD count against the same authoritative `stock_count_eligible_items` relation. Unavailable counts remain unavailable, never a fabricated zero or a legacy ledger fallback.
- Topbar pending actions requested eight permission RPCs and procurement details unused by that menu. Permissions are batched once and menu-only calls skip line/supplier/requester detail reads. Independent workflow reads run together. Dashboard detail consumers retain their existing data.
- Profile, branding and notification scope share one React request-scoped auth lookup. There is no cross-user TTL cache for operational data.
- Topbar activity resolves behind its own Suspense boundary so it does not hold the shell. Query failure remains an unavailable state.
- Slow Supabase attempts emit sanitized server warnings at 1,000 ms. Timing measures fetch until response headers, not SQL execution or full page load. Logs contain relation/RPC category, method, duration and status; no query filters, credentials or records. Existing reliability observation flag controls emission.

The dashboard query-performance report contained cumulative historical entries, including a low_stock_items count absent from the current primary code path. These statistics identify investigation targets; they do not establish current page latency. No conclusion that the database needs rebuilding follows from the slow-query count alone.

Production Vercel logs for baseline deployment `dpl_73h9fWcYzvwWQ81fdKWEejF836MY` show a Dashboard RSC GET at 18:13:43 MYT with 6.49 s function duration and 6.9 s response completion. This is one observed request, not a percentile or a controlled benchmark. An Outlet Daily prefetch at 18:16:03 completed in 870 ms and cannot be treated as a full page render measurement.

## Validation

- 1,252 unit/contract tests passed, including 11 behavioral tests for parallel dependencies, authorization, exact count, overview isolation, menu reads, Suspense and log redaction.
- Typecheck and lint passed. Node 22 production build compiled and generated 102 static routes.
- On this Mac, Webpack file hashing blocked while reading the ancestor Documents directory. The same source built successfully from an isolated temporary directory with installed dependencies. Local test environment values were used only for build validation; this artifact must not be deployed as a production-configured bundle.
- Local test secrets point to localhost. Authenticated local database/browser regression is unavailable without that local database. Preview and production verification must be recorded separately.
- No schema migration, RLS change or production business-data mutation was performed.
- `env.test.local` and `gitignore.txt` are excluded from Git and Vercel uploads. Neither is tracked.

## Release follow-through

Preview build: https://vercel.com/seribako/seri-bako-oms-official/AsYRHPQJr7P3542nJaf4iQxbEEWq

Remote build reached Ready at 18:23:50 MYT in 2m 35s. The deployed Preview login page rendered v9.2.68 at https://seri-bako-oms-official-40nrjpou4-seribako.vercel.app . Authenticated Preview checks await the user's login; production has not been promoted.

Before production promotion, verify authenticated Dashboard and schedule reads on Preview, confirm the current production/integration SHA, and follow the repository's tagged-release process. Measure page and server timings after deployment before claiming a quantified speed improvement. If slow reads persist, use the new relation/RPC timings to select current SQL plans for index/RLS review.
