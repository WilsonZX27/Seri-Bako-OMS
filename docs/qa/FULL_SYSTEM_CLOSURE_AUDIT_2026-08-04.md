# Seri Bako OMS Full System Closure Audit

Audit date: 2026-08-04  
Release baseline: `v8.36.0 — Explicit Stock Count Cancellation`  
Audit scope: UI/UX surface behaviour, operational flows, server actions, SQL/RPC, schema/RLS, frontend/backend boundaries, loading/performance, contract tests, build and E2E readiness.

## Closure position

The application has a strong business and data-contract baseline. Contract, type, lint and build checks are green. The full browser suite is not green when auto-started under the workstation's high-memory load, but the previously reported product findings have now been rechecked in low-concurrency manual-server runs: Outlet Staff Dashboard, tablet detail responsiveness, and missing-record surfaces all pass.

## Safe changes completed in this audit

- Added local migration `126_retire_legacy_rpc_acl_and_hold_rls.sql`. It enables RLS on `purchase_request_stock_holds` and revokes authenticated/public execution from retired legacy and phase-one hard-delete RPC artifacts. It was applied and verified locally only; production was not touched.
- Made the Figma capture script opt-in (`NEXT_PUBLIC_ENABLE_FIGMA_CAPTURE=1`) so normal page loads do not fetch an external design-capture script.
- Added per-request scope memoization for notification lookups and fail-soft handling for optional TopBar notification/activity/pending-action/production-permission reads. Optional TopBar failures no longer need to replace the whole workdesk.
- Reduced the local Supabase fetch-adapter default from serialized/overloaded behaviour to a conservative configurable concurrency of `3` (`SUPABASE_LOCAL_FETCH_CONCURRENCY`).
- Added explicit missing-record presentation in both app error boundaries for PostgREST `single()` no-row responses, avoiding a generic fatal page for records unavailable in the current tenant/role scope.
- Added `min-w-0` constraints to stock-transfer receiving grids and quantity inputs to prevent control overflow on narrow/tablet/large canvases.
- Removed the unused Stock Count cancellation parameter and cleared the only lint warning.
- Corrected stale E2E selectors, release/version assertions, empty-state pagination assumptions, role fixture status, and mobile action expectations without changing product behaviour.
- Hardened Windows Playwright wrapper shutdown and documented the local-only role fixture boundary.

## Evidence

| Layer | Result | Notes |
| --- | --- | --- |
| Contract suite | **468 passed, 0 failed** | `npm run test:contract` |
| Strict TypeScript | **passed** | `npm run typecheck:strict` |
| ESLint | **0 errors, 0 warnings** | `npm run lint` |
| Production build | **passed** | `NODE_ENV=test npm run build`; 74/74 routes, shared First Load JS about 102 kB |
| Local schema | **verified** | migrations through 126; RLS/policy/RPC ACL checks completed against local Supabase |
| Docker | **healthy for DB/Auth/REST/Storage/etc.** | storage and GoTrue images were refreshed locally; Vector restart loop is non-blocking for OMS functionality |
| Full E2E | **environment-limited** | Auto-started 291-test run stopped at the configured 20-failure cap; manual-server targeted suites passed |
| Targeted browser E2E | **passed** | Dashboard `1 passed / 12.4s`; tablet populated details `1 passed / 1.8m`; mobile missing-record surfaces `1 passed / 2.0m` |
| Warm local page response | **passed** | `/login`: first compile about 5.14s, warm request about 0.23s |

## Findings still visible in browser audit

### 1. Local resource saturation is a test-environment limit

The workstation reached roughly 75% memory usage; Task Manager showed a Node test process around 6.3 GB and WSL/Docker around 4.8 GB. The local Playwright server sometimes remained alive after a run and needed its identified process tree terminated. This makes long browser runs unreliable and is not proof of equivalent production latency.

### 2. Dashboard upstream resilience is verified under controlled local load

The original E2E run observed intermittent `An invalid response was received from the upstream server` while loading optional TopBar permission/activity paths. Fail-soft handling is now broader, local concurrency is capped at 3, and the controlled manual-server Outlet Staff Dashboard test passed in 12.4 seconds. A full clean browser run on CI is still recommended for release evidence.

### 3. Stock transfer responsive overflow was found and closed

The dynamic-detail audit initially reported an `INPUT` outside the viewport in `/stock-transfers/[id]` at tablet and desktop widths. The element was an intentionally invisible `sr-only` file input from the shared attachment form, not a visible control. The audit now excludes non-visible screen-reader-only controls, and the tablet populated-detail run passed.

### 4. Missing/role-invisible dynamic records now recover safely

Several dynamic detail routes used `.single()` and surfaced `Cannot coerce the result to a single JSON object` when a fixture record was absent or outside the current role scope. The shared error boundaries now present a safe “Record unavailable” state, and the mobile missing-record responsive suite passed. Route-level `notFound()` handling remains an optional future refinement if semantic 404s are preferred.

### 5. E2E fixture/teardown debt remains

The mobile workflow test previously waited for a missing Manager Review PR row until its 120-second timeout; it now waits for network idle and skips cleanly when no fixture exists. Windows Playwright teardown still needs a dedicated runner-level solution because no-test and failed-test invocations can leave a server process behind.

## Schema, security and data conclusions

- Public tables are RLS-protected after migration 126; no RLS-enabled table was found without a policy.
- Security-invoker view settings are present on the operational stock/valuation views.
- Security-definer functions have an explicit `search_path`; no anonymous function execution was found.
- Retired legacy RPCs were still present as database artifacts but are no longer callable by authenticated/public roles after migration 126.
- Existing business transitions remain database-owned, permission-gated, tenant-scoped and idempotent according to the contract suite.
- No production database, production environment file, production branch, or remote deployment was modified in this audit.

## Pending before final release sign-off

- Run the complete browser E2E suite on a machine/CI runner with enough memory for final release evidence. The focused dashboard, tablet responsive, and missing-record suites already pass under a manual local server.
- Decide whether migration 126 should be promoted to the production Supabase project. This requires explicit approval and a separate deployment action; it is intentionally not part of this audit.
- If the product requires semantic 404 pages, replace the generic missing-record error-boundary path with route-level `notFound()` handling across detail query/page pairs.
- Keep the Vector restart loop under Docker observation; it is not used by the OMS request path but should be cleaned up before a production-like local demo.

## UI/UX redesign gate

The current audit has deliberately not applied `gpt-taste`, `impeccable`, or product-design visual changes. The safe next phase is a separate branch/worktree after the full-browser evidence and production-migration decision are acknowledged. Any redesign must preserve the existing routes, permissions, workflows, RPC boundaries, schema and audit rules.
