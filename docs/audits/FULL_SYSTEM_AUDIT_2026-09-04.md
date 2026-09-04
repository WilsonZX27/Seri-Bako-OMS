# Seri Bako OMS full-system audit — 2026-09-04

## Executive status

This is an audit report, not a remediation commit. The repository and deployed Owner surface were reviewed to the executable boundary available on 2026-09-04. The system must **not** be described as fully closed or fully UAT-verified yet.

- Repository HEAD: `b4b2619758932be163bc6a776e79523003389291` (`v9.2.26`)
- TypeScript strict check: pass
- ESLint: pass
- Production dependency audit: pass, 0 known vulnerabilities
- Contract suite: fail, 1 documentation-authority contract failure
- Local production build: compilation and type validation pass; prerender blocked because this worktree has no public Supabase build variables
- Production deployment: previously verified Ready; this audit did not treat that as proof of every workflow
- Authenticated browser coverage: representative Owner routes were verified earlier; the requested full route/role/viewport crawl could not be completed because the browser automation surface repeatedly timed out
- Full UAT matrix: blocked because this worktree has no `.env.test.local`, no fresh sanitized Production-like clone marker, and no running Docker runtime

## Severity summary

| Severity | Count | Meaning |
| --- | ---: | --- |
| P0 | 0 | No currently evidenced data-loss, tenant-escape, or Production-down defect |
| P1 | 2 | Release or workflow-integrity issues requiring remediation |
| P2 | 4 | Maintainability, consistency, or verification debt |
| P3 | 2 | Minor polish opportunities |

## P1 findings

### P1-01 — Main is not contract-green

`tests/documentation-authority-contract.test.js:27` expects the current migration authority phrase `forward-only migration 历史已到 \`259\``. `docs/SCHEMA_RELATIONSHIP_MAP_2026-07-23.md:3` now says `forward-only migration 历史与 Production ledger 均已到 \`259\``. The semantic documentation is accurate, but it broke the executable documentation contract.

Impact: `npm test` has one failure and the repository cannot honestly be called release-gate green.

Required closure: align the authority contract with the stronger wording or restore a stable machine-readable authority sentence, then rerun the entire suite.

### P1-02 — Compliance type creation can partially succeed

`src/server/actions/compliance.ts:246-259` creates the compliance type first and then inserts requirements for active Outlet and Central Kitchen branches. The second insert result is not checked and the two operations are not atomic.

Impact: a transient database/RLS/constraint failure can leave a visible type without complete site requirements, recreating the class of “applied only to some/all not guaranteed” annotation failures.

Required closure: move type creation plus requirement assignment into one tenant-scoped transactional RPC, or explicitly check the second write and perform a safe compensating rollback. Add a contract covering all eligible branches and insert failure.

## P2 findings

### P2-01 — Full role and viewport UAT evidence is absent for this release

The canonical matrix defines 8 roles across 390×844, 820×1180, 1180×820, and 1440×900. This audit could not execute it because the current worktree lacks the isolated test environment and fresh clone marker. Representative Owner pages are useful evidence but do not cover role denial, branch scope, mobile/tablet composition, or workflow mutations.

Required closure: provision a sanitized Production-like local clone, run the canonical matrix, and retain route/role/viewport artifacts separately from Production verification.

### P2-02 — Local build reproducibility depends on undocumented injected variables

`next build` compiles successfully in 11.2 seconds and completes type validation, then fails while prerendering `/document-sequences/new` and `/imports/autocount` because `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are absent.

Required closure: add a secret-free build-environment preflight and document the required variable names. Do not commit credentials.

### P2-03 — Browser audit tooling was not reliable enough for exhaustive route evidence

The current browser control session timed out repeatedly, including state recovery. An attempted 81-route static crawl did not complete, so no exhaustive browser claim is made.

Required closure: rerun in bounded route batches with authenticated fixtures and preserve per-route screenshots/console/network results.

### P2-04 — Visual tokens are not yet the sole styling authority

Examples include `src/components/documents/attachment-upload-form.tsx:63` (`#71847a`), `src/components/procurement-forms.tsx:408` (`#fafafa`), and literal overlay z-indices 100/101 in `src/app/design-system-v2.css:963-965` alongside the semantic z-index system.

Impact: theme drift and stacking regressions become more likely even though the current presentation is generally coherent.

Required closure: map remaining literals to semantic text/surface/layer tokens and add a bounded token contract.

## P3 findings

### P3-01 — Automated contrast detector produced two likely false positives

The detector flagged `src/components/attendance/schedule-planner.tsx:79,82`, but the slate and emerald classes belong to mutually exclusive variants. No defect should be filed without rendered-state contrast evidence.

### P3-02 — A small number of mobile/dialog shadows exceed the otherwise restrained elevation language

Examples are the mobile Purchase Order floating action and Stock Count export dialog. They are functional but should be considered during the next visual-system pass rather than changed in isolation.

## Security review

This was a degraded, single-reviewer standard security pass; it is not an independent deep-security attestation.

- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Authentication uses server cookies and an active tenant actor gate before permission evaluation.
- Representative attachment reads scope by `company_id`, active state, entity permission, and signed storage access.
- Compliance uploads enforce 4 MB, allowlisted MIME types, magic-byte signatures, randomized tenant paths, and cleanup on failed database linking.
- No `eval`, `new Function`, process spawning, or `dangerouslySetInnerHTML` usage was found in `src`.
- Administrative Supabase clients are server-only call sites, but their broad use remains an area requiring continuing contract and RLS review.
- No confirmed P0/P1 security vulnerability was found in this pass.

## Impeccable quality score

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Accessibility | 3/4 | Semantic labels and contracts are present; exhaustive keyboard/screen-reader execution was not completed |
| Performance | 3/4 | Production build times recovered and local compile is fast; full route timing and request fan-out were not remeasured |
| Responsive | 2/4 | Four canonical viewports exist, but the full role×viewport run is blocked |
| Theming | 3/4 | Strong token system with a small number of remaining literals |
| Anti-patterns | 3/4 | Shared layout authorities are established; isolated literal layers/elevation and a non-atomic workflow remain |
| **Total** | **14/20 — Good, not closed** | Release and UAT gaps prevent an Excellent/complete rating |

## Evidence boundary

### Verified in this audit

- Repository inventory and canonical route/role/viewport definitions
- Strict typecheck and lint
- Dependency vulnerability audit
- Contract failure reproduction
- Local build compile/type stage and exact environment blocker
- Focused authorization, tenant-scope, upload, attachment, backup, and dynamic-execution source review
- Design-token and visual anti-pattern scan

### Not verified in this audit

- Every route under all 8 roles and 4 viewports
- Full keyboard, screen-reader, console, network, and mutation-path browser coverage
- Fresh Production-like database behavior
- Production state beyond the separately recorded Owner route and migration checks
- Independent deep-security scan consensus

## Closure order

1. Repair P1-01 and return the full contract suite to green.
2. Make P1-02 atomic and add failure-path coverage.
3. Provision the isolated UAT environment and execute the 8-role × 4-viewport matrix.
4. Rerun bounded authenticated browser batches with captured artifacts.
5. Normalize the remaining visual literals and rerun accessibility/contrast checks on rendered states.

## Isolation and browser-verification update — 2026-09-04

The earlier UAT blocker was closed for a local, loopback-only environment. A disposable eight-role fixture was generated in the gitignored `.env.test.local`, the local Supabase stack was migrated through 259, and the application was exercised from an isolated production build. No Production database, deployment, identity, or file was mutated.

### Verified after remediation

- Canonical authenticated route matrix: **36/36 passed** in 20.4 minutes. This covers eight roles at 390×844, 820×1180, 1180×820, and 1440×900, plus the public auth surfaces at all four viewports.
- Contract suite: **1146/1146 passed**.
- Strict TypeScript: passed.
- ESLint: passed.
- Local schema/RLS/RPC gate: `V9_SCHEMA_OK`, migration 259, 105 tables, 6 views, and 173 security-definer functions.
- Isolated production build: compiled, type-checked, prerendered, and served successfully for the browser matrix.

### Defects closed by the matrix

- Added the missing Outlet Supervisor fixture and aligned its approved Outlet Daily, Outlet Compliance, and Outlet Calendar authority.
- Converted a missing People detail record to the normal route-level not-found boundary instead of emitting a production Server Component error.
- Restored practical mobile touch targets for Staff branch shortcuts and Stock Count “Add item”.
- Closed accidental People Operations access to the generic Documents and Procurement workspaces while retaining its approved People and Compliance scope.
- Aligned Finance Staff routes with migration 229, which intentionally removed Finance People controls.
- Protected the real Attendance Settings route with `shift_template.manage`.
- Aligned the legacy `/compliance` compatibility redirect with the same approved roles as `/outlet-compliance`.

### Remaining evidence boundary

This is **local isolated verification**, not a sanitized clone of current Production data and not Production verification. A fresh Production-like clone remains blocked until an ignored source environment supplies `RUN_PRODUCTION_CLONE=confirmed`, `EXPECTED_SUPABASE_PROJECT_REF`, and `SUPABASE_DB_PASSWORD`. Secrets must not be committed or pasted into chat. P1-02 (atomic compliance type plus requirement creation) remains open and is not represented as closed by the route matrix.

## v9.2.28 mobile workflow closure evidence — 2026-09-05

The annotation-derived mobile and workflow changes were tested against the same loopback-only environment. Migration 260 was applied locally and adds controlled Outlet Daily posting; it was not applied to Production.

### Verified locally

- Contract suite: **1,155/1,155 passed**.
- Strict TypeScript and ESLint: passed.
- Local schema/RLS/RPC gate: `V9_SCHEMA_OK`, migration 260, 105 tables, 6 views and 173 security-definer functions.
- Isolated Next.js production build: compiled, type-checked and prerendered **95/95** static pages.
- Focused 390×844 workflows: **6/6 passed**, covering Outlet Daily layout and controlled posting, persistent navigation and Calendar, Compliance 70/30 upload controls, Attendance scheduling, More Actions spacing and dashboard divider removal.
- Affected-route responsive matrix: **4/4 viewport projects passed** across 390×844, 820×1180, 1180×820 and 1440×900 for Dashboard, Outlet Daily Records, Outlet Calendar, Outlet Compliance and Attendance Schedule.
- Preview deployment: **READY** at `https://seri-bako-oms-official-4i0vujatj-seribako.vercel.app`, commit `4a06cb5`, branch `codex/annotation-closure-loading-schedule`.
- Remote public auth/setup UI E2E: **8/8 passed** across 320×700, 390×844, 640×900, 768×1024, 1024×900, 1280×960, 1440×960 and 2560×1440. The protected `/dashboard` route also redirected to `/login?redirectedFrom=%2Fdashboard` as expected.

### Follow-up receipt — 2026-09-05

- The legacy Purchase Request validation-copy assertion was aligned with the current field-level message (`Choose one supplier for this purchase request.`); the focused isolated E2E passed **1/1**.
- A fresh local schema verifier rerun returned `V9_SCHEMA_OK` at migration 260, and the complete mobile closure suite passed **6/6** in the isolated fixture (including Ready to post → Purchasing Post → immutable edit lock).
- Commit `54411fd` was pushed to `codex/annotation-closure-loading-schedule`. Its Vercel Preview deployment is READY at `https://seri-bako-oms-official-8dta09z4f-seribako.vercel.app`.
- The latest application Preview passed the public auth/setup UI E2E matrix **8/8** across 320×700, 390×844, 640×900, 768×1024, 1024×900, 1280×960, 1440×960 and 2560×1440. The follow-up documentation deployment `8f1f828` is also READY at `https://seri-bako-oms-official-igrcwcmub-seribako.vercel.app`. This does not prove authenticated feature mutation or Production behavior.

### Still open

- The Preview branch has been pushed and its deployment is READY, but it has not been promoted or observed in Production.
- The full all-role authenticated regression was not repeated against the remote Preview; the focused Outlet and Purchasing workflow was exercised locally.
- The remaining four checks in that legacy annotation batch still need their authenticated fixture run; the validation-copy assertion itself is closed by the follow-up receipt above.
- The independent deep-security scan produced no canonical manifest because three discovery workers failed after the scan service reached its usage limit. Security closure therefore remains incomplete; no absence-of-findings claim is made.
