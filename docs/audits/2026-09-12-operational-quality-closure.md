# OMS v9.2.58 operational quality closure

Status: deployed and authenticated Production UAT complete
Scope: UI consistency, hydration safety, responsive geometry, permissions, performance, Attendance stability, documentation and Production UAT.

## Product decisions preserved

- Business workflows and role ownership are unchanged. Tests follow the current role-aware IA instead of restoring retired labels or permissions.
- High-density tables begin at `xl`; smaller workspaces use touch-first lists. Intentional inner table scrolling is allowed, while document-level overflow is a release blocker.
- Attendance mobile workflow actions own the bottom safe-area while editing; the persistent app navigation returns outside that task context.
- Outlet Daily continues Draft → Ready to post → Posted. Required sales evidence remains required before save.

## Candidate improvements

- Item and bulk-selection controls are inert until hydration, preventing first-paint action races.
- Interactive rankings expose hydration readiness for deterministic pointer, keyboard and touch verification.
- Purchase-request phone lines use equal Quantity/UOM tracks and a token-sized comment action column.
- Rejection guidance, supplier fallback copy and mobile submitter identity are explicit and decision-ready.
- Local fixture reconstruction removes dependent line revisions before replacing seeded purchase-request lines.

## Verification protocol

- Run unit/contract tests, lint, strict TypeScript, Production build and local schema UAT serially.
- Run route-heavy Playwright suites in viewport shards with one worker to avoid dev-server memory exhaustion.
- Distinguish skipped fixture-dependent mutations from passed assertions. A skip is not Production proof.
- Before release, inspect the linked Supabase migration state and the previous 24 hours of available runtime logs; then deploy and complete authenticated Production UAT, including the explicitly authorised schedule submit/publish action.

## Evidence boundary

- Current local evidence includes 1,235/1,235 contract tests, lint, strict typecheck, a 102-route Production build, local schema `V9_SCHEMA_OK`, broad responsive route audits, role permissions and real mutation workflows.
- Commits `06f25095` and `0926f3e5` were fast-forwarded to `main`; Vercel reported the Production deployment Ready and the custom domain rendered `v9.2.58`.
- Authenticated Owner UAT used Kwan Kee Store @ Mid Valley for 2026-09-07 through 2026-09-13: an OFF assignment was saved by Submit, survived reload in Submitted state, then was approved and survived a second reload in Published state.
- The two corresponding `POST /api/attendance/schedule` requests returned HTTP 200; the surrounding Production page reads also returned HTTP 200.
- A complete 24-hour runtime-log claim is not possible on the current Vercel plan because the dashboard reports a one-hour maximum retention window. Native Supabase logs also remain unverified: the browser required sign-in and the CLI failed at the Management API transport boundary. These observability limits do not invalidate the successful mutation and persisted-state evidence, but they remain an operations follow-up.
