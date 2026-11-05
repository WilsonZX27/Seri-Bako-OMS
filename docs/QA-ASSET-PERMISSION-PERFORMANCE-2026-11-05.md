# Read-only performance diagnosis and scoped optimization

Base source: `27a7954`. No Vercel/Supabase settings, data, schema, billing or deployment changes. No previously denied Vercel project/deployment/log endpoint was retried.

## Evidence and uncertainties

- Existing Chrome Supabase Billing tab visibly showed organization Seri Bako FREE / Current plan. Plan description lists shared CPU and 500 MB RAM. This establishes the organization plan, not a verified per-project compute SKU, current memory pressure or CPU saturation. No upgrade/spend-cap/payment control was clicked.
- Repository `vercel.json` requests `regions: ["sin1"]` (Singapore). Hosted effective function region and database project region were not read. Do not claim the regions are matched from source alone.
- Current Vercel plan, effective CPU/memory, DB CPU/memory/connections/IO, slow-query stats and hosted p50/p95 are unknown. Existing `docs/v10/PERFORMANCE-CACHE.md` records denied Vercel log/project reads; no alternate route was used to bypass them.
- Existing Chrome OMS tab showed an already-authenticated TEST MANAGER maintenance page (11 groups). No identity switch, save or business write was made. DevTools Network showed Dashboard RSC `dashboard?_rsc=...` 200, 2.3 kB transferred, 1.82 s, while the page URL remained Asset Management; treat this as a background/RSC/prefetch observation, not a full Dashboard navigation, TTFB or cold-start proof. Companion Dashboard JS was disk cached, 4 ms. No throttling; disable-cache unchecked; existing device emulation was already enabled. These two request rows are the only usable current network timings.
- Asset page refresh was initiated, but its completed timing was not captured: the user changed Chrome to FeedMe Portal. Automation stopped to avoid interfering. No valid first-versus-repeat page pair or live after measurement was obtained. IAB sessions were idle-timeout/login, and were not used to bypass this limitation.

## Implemented optimization

`src/app/(app)/asset-management/page.tsx` originally called `hasPermission` for report, then awaited data, then performed three further independent permission RPCs (manage/maintenance/transfer). It now uses the existing `getPermissionMap` once for the same four codes before route selection. This reduces these page-owned RPCs 4 -> 1 and permission-dependent waves 2 -> 1. Server query/action authorization and redirects remain in place; no cross-user cache or permission shortcut was introduced.

Semantics checked: `getPermissionMap` expands the existing aliases and uses `get_allowed_permissions`; migration 076 maps requested codes through `has_permission`, which migration 052 delegates to `has_any_permission`. Existing tenant actor validation is preserved. Live installed SQL was not inspected.

## Controlled local comparison

`../performance-evidence-20261105/permission-benchmark.cjs` loads actual before/after page source, stubs authorized reads, and simulates 25 ms per permission RPC. One warm-up plus seven paired samples; transpilation excluded from timer. Node 24.21.0 host; not a hosted Next build or app's Node 22 runtime.

- Before: median 52.32 ms, 4 permission RPCs.
- After: median 26.42 ms, 1 permission RPC.
- This establishes elimination of a request wave under controlled latency. It does not establish a 50% Production page speedup; DB execution cost, cache state, other data reads and network RTT differ.

New behavioral tests: 3/3 pass (one complete map, permission-error fail closed before workspace reads, restricted overview redirect). Focused ESLint and full TypeScript: pass. Broader `performance-read-paths` suite: 13 pass, 2 fail in pre-existing inventory test loader due unmocked `@/lib/inventory-activity-summary`; identical failures reproduced in unchanged parent workspace using NODE_PATH. Combined run: 16/18. These unrelated harness failures were not hidden or rewritten.

## Upgrade decision and next measurements

Prioritize fewer/parallel request waves and scoped read sizes before buying CPU blindly. Confirm Vercel effective runtime region and Supabase project region through already-authorized visibility; do not retry denied endpoints. Collect a controlled route/state pair under one authorized session: first full document then repeat, RSC navigation separately, request timing/TTFB, transferred bytes, server-operation and Supabase timings, plus concurrent CPU/memory/connection graphs. Current source slow-request timing is fetch-to-headers, not SQL time; process-local percentile windows are not global p95.

Supabase Pro can be justified for production operating needs/quotas/backups, but a plan change and a compute resize are separate decisions. Official docs state a Free-to-paid project can retain Nano and compute is not automatically resized; verify actual SKU after any separately authorized upgrade. More DB compute is a performance treatment when CPU/memory/connection/IO evidence supports it; it cannot remove four application round trips. Vercel CPU upgrades help CPU-bound work, not an unmeasured database/network wait. No guaranteed millisecond-wide outcome is supported by this evidence.

Official current references (read-only web lookup): https://supabase.com/docs/guides/platform/compute-and-disk ; https://supabase.com/docs/guides/troubleshooting/high-cpu-usage ; https://vercel.com/docs/functions/configuring-functions/memory ; https://vercel.com/docs/fluid-compute .

## Integration on 7028827

Patch applied cleanly to `7028827` (not its original `27a7954` base). Reviewed unchanged authorization owners: active tenant actor is checked before either helper; four asset codes have no aliases; source migration 076 resolves every requested code through migration 052's `has_permission` -> `has_any_permission`. No SQL, grants, query/action scope or cross-request cache changed. Live function definitions/RLS were not inspected in this pass.

Two old performance failures reproduced before the harness correction: both throw while importing `inventory.ts`, before any count assertions, because `@/lib/inventory-activity-summary` was omitted from the explicit loader. Added the actual pure module to that loader, preserving all assertions and runtime source. Combined 23 tests pass, including all 16 grant combinations using the actual permission helper, denied actor before RPC, separate company-session responses, permission error before workspace reads, restricted redirect and tenant source contracts. Session tests mock RPC responses; they do not claim live tenant penetration testing.

Full Next build (including TypeScript) exit 0; runtime page lint passes. CommonJS test-file lint requires the repository harness conventions (`no-require-imports` and `no-assign-module-variable` disabled for this command); default test lint reports those style rules. Logs: `/tmp/oms-asset-perf-before-harness.log`, `/tmp/oms-asset-perf-integrated.log`, `/tmp/oms-asset-perf-build.log`. No live after timing, deployment or database mutation. The only established performance change is four page permission RPCs to one.
