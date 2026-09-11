# OMS v9.2.58 operational quality closure

Status: release candidate under verification
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
- Final commit, push, linked migration check, deployment, 24-hour log review and post-deploy Production UAT remain pending until the candidate gates are rerun from the final tree.
