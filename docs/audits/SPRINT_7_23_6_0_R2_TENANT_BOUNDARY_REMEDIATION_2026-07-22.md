# Sprint 7.23.6.0-R2 — Tenant Boundary Closure Remediation

## Baseline

- Repository: `D:\0 Data\Seri Bako\Seri Bako OMS\seri-bako-oms`
- Branch / HEAD: `main` / `bfa36a882b876ead0389170dc0c0087a0c060beb`
- Visible version: `v7.23.6.0` — Sprint 7.23.6.0 Tenant Boundary Closure.
- Migration 081 was untracked and absent from repository history; it is therefore locally unreleased. No commit, push, deployment, production access, production mutation, or production backup occurred.
- Working tree was intentionally already dirty with the Sprint remediation files and unrelated pre-existing test edits. No separate local editor/session modifying the worktree was identifiable from the process view.
- Final current 081 SHA-256: `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f`.

## Remediation attempted

| R1 finding | Local correction | Evidence / limitation |
| --- | --- | --- |
| R1-001 policy drift | Not closed. 081 still uses its legacy named policy-drop list and does not yet contain the required exact pre-081 catalog definition/predicate reconciliation or rollback fixture suite. | Release blocker remains. |
| R1-002 owner lifecycle atomicity | `replace_staff_access_atomic` now accepts lifecycle/profile fields and checks owner demotion or deactivation under the company advisory lock. `set_staff_status_atomic` makes disablement a locked database transaction; `updateStaff` no longer commits a service-role status update before the RPC. | Clean replay passed; required real concurrent-session and archive/delete behavioral suite not run. |
| R1-003 archived ownership | Singleton determination now counts all company history, including archived/deleted company identities. | Clean replay passed; prescribed archived/multi-company rollback fixture matrix not run. |
| R1-004 privileged relationships | Added fixed-search-path, non-executable trigger protection for barcode item/product, recipe product, and recipe-line item ownership, alongside the prior composite supplier/UOM guards. | Clean replay passed; full service-role matrix remains unrun. |
| R1-005 immutable logs | Activity/audit policies are command-specific SELECT/INSERT policies; authenticated UPDATE/DELETE grants are revoked. Audit insert validates `changed_by`; activity insert validates `created_by`. | Clean replay passed; role command-matrix remains unrun. |
| R1-006 backups | `profiles` is explicitly excluded with a reason; pages are ordered by `id`; per-dataset and archive row limits fail the export instead of silently returning a partial archive; a failed dataset now aborts the whole backup. | Ordered offset pagination is not the required stable keyset/snapshot solution; required expanded archive and concurrency inspection is unrun. Release blocker remains. |
| R1-007 ambiguous role resolution | Active staff resolution requires exactly one active primary membership; role must be active, undeleted, and in the same company. | Typecheck/lint passed; prescribed behavioral matrix is unrun. |

## Policy and relationship design

The intended final log access matrix is SELECT plus authenticated, actor-bound INSERT only; ordinary authenticated application roles have neither UPDATE nor DELETE privilege. Relationship triggers run with `search_path = pg_catalog, public` and execution is revoked from public, anonymous, and authenticated roles.

The migration does **not** yet meet the required pre/post exact policy-catalog strategy: it lacks an exact expected pre-081 catalog, definition comparison, and final exact-catalog assertion. This is deliberately recorded as unresolved rather than treated as protected by the existing policy names.

## Backup semantics and limits

Company remains derived only from `requireActiveTenantActor({ owner: true })`; the export API accepts no company override. The manifest now classifies `profiles` as excluded and records ordered pagination and hard row limits. The current consistency statement is deterministic ordered offset pagination, not a point-in-time snapshot or stable cursor; it therefore requires further remediation and proof.

## Verification performed

- `npm.cmd run typecheck` — pass.
- `npm.cmd run lint` — pass, no warnings.
- `node --test tests/tenant-boundary-closure-contract.test.js` — 3/3 pass.
- `supabase db reset --local` (Docker-backed local test database) — clean replay 001–081 completed after correcting a real audit-column mismatch found by the first replay. The failed replay was transactional; no partial 081 application remained.
- `git diff --check` — pass before the final small cleanup edits; final full diff check not rerun.

## Required gates not completed

- Exact pre/post policy inventory, policy-definition drift, renamed/missing/extra policy rollback fixtures.
- Complete archived ownership, malformed relationship, audit command matrix, lifecycle concurrency, ambiguous membership, and expanded backup suites.
- Migrations 075/078/079/080, opening-stock, all contract, build verification.
- `codex-security:security-diff-scan` and `codex-security:deep-security-scan`: not run. Earlier operator direction was to skip the interactive scans and record the failure for the next round; no scan/session ID exists.

## Closure assessment

- F-001: **not closed** — catalog drift preflight and full policy proof remain missing.
- F-002: **not closed** — deterministic bounded behavior was improved but not converted to/proven as a stable cursor or snapshot export.
- F-003: **not closed** — atomic owner disable/update and relationship guards were improved, but the mandatory behavioral/concurrency matrix remains incomplete.

## R2 completion continuation

- 081 now starts with a canonical post-080 policy catalog fingerprint map. Every entry covers schema, table, policy name, command, roles, permissive mode, and whitespace-normalized USING/WITH CHECK expressions. Before any mutation, the migration rejects unexpected, missing, renamed, or definition-drifted policy entries.
- A local restrictive-policy drift fixture added an unexpected `items` policy after a reset through 080. `supabase migration up --local` aborted in 081's first statement and did not record 081; the isolated database was then cleanly reset through 081.
- Backup export now uses a captured `generated_at` upper boundary plus `(created_at, id)` ascending keyset pagination. Later inserts are excluded; retained rows at/before the boundary are emitted at most once. This is not a point-in-time snapshot: updates before a page can be reflected and deleted rows can be absent.
- Continuation verification passed: clean local 001-081 replay, `npm.cmd run typecheck`, `npm.cmd run lint`, and `git diff --check`.
- Remaining gates: all named policy-drift rollback fixtures, exact post-081 catalog fixture, full authorization/concurrency/backup archive suites, build/full regression, and both completed mandatory Codex Security scans.

### Continuation status override

**BLOCKED — the full policy-fixture matrix, behavioral/concurrency and backup archive suites, build/full regression, and both mandatory completed Codex Security scans remain incomplete.**

## Non-security-scan verification continuation

- Baseline remained `main` at `bfa36a882b876ead0389170dc0c0087a0c060beb`; migration 081 remained untracked/unreleased with final SHA-256 `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f` before and after this verification-only continuation.
- Executed local SQL suites against the isolated Docker database: `tenant-boundary-closure-local-validation.sql`, `migration-078-local-validation.sql`, `inventory-go-live-readiness-local-validation.sql` (including opening stock), and `branch-supplier-items-local-validation.sql` — all passed.
- Executed `node --test tests/*contract.test.js` — 167 passed, 0 failed. Executed `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` — all passed. The initial build command exceeded its short command window during static generation; the rerun completed successfully.
- The local backup browser suite was started only against `http://127.0.0.1:3000` and local Supabase. Its worker was blocked before fixtures ran because the execution environment stripped `SUPABASE_SERVICE_ROLE_KEY` from the Node process even though it was available to the local PowerShell parent. No nonlocal endpoint, credential printing, or test weakening was used.
- Security scans are externally coordinated. This session did not start, wait for, read, or claim either scan.
- No production access, commit, push, deployment, shared migration application, or historical-data mutation occurred.

### Latest local verification status

**BLOCKED — the complete policy-drift fixture matrix, real parallel owner-lifecycle concurrency suite, expanded backup boundary/limit archive suite, and local browser backup suite remain incomplete. External security-scan results are intentionally outside this session.**

## Remaining-local-gates continuation

### Policy-catalog matrix

Using isolated local resets through migration 080, the canonical catalog applied 081 successfully. Each independent drift fixture then caused `supabase migration up --local` to fail before 081 was recorded: unexpected permissive, unexpected restrictive, missing expected policy, renamed expected policy, changed command, changed role set, changed permissive/restrictive mode, permission-restricted USING broadened to `true`, and permission-restricted WITH CHECK broadened to `true`.

For each rejection, the migration-history query returned zero rows for version 081. The fixture was preserved until the next isolated reset, proving the failed preflight did not delete it. The final reset replayed cleanly through 081. The first attempted USING fixture used a pre-existing `companies read` predicate that was already unconditional; it was correctly identified as a no-op fixture and replaced by the restrictive `companies admin update` policy. No migration fingerprint was weakened.

### Latest authoritative local status

**BLOCKED — policy-catalog local verification is complete. Real independent-session Owner lifecycle concurrency, expanded backup keyset/boundary/limit archive verification, and the secure trusted-Node browser backup harness remain incomplete. The browser harness remains blocked because the execution environment removes the local service-role credential from the trusted Node worker; no credential was exposed or authorization bypass added. External security scans remain separately coordinated and are not assessed here. No production access, commit, push, deployment, shared migration application, or historical-data mutation occurred.**

## Final-three-gates continuation

- Policy verification is complete: canonical post-080 application and all nine drift variants passed their required outcomes. It is not an outstanding gate.
- Trusted-browser setup diagnosis: the local development server was launched as a hidden local `npm.cmd run dev` process and confirmed at `http://127.0.0.1:3000/login`. Playwright loaded its normal local configuration and was invoked with local `TEST_BASE_URL`, local Supabase API URL, and the explicit test-enable flag. The local service-role key was present in the PowerShell parent (presence and length checked without output), but a spawned `node` process received no `SUPABASE_SERVICE_ROLE_KEY`. Two Playwright attempts consequently stopped before any fixture or browser case. The first also exposed quoted local status values, which was corrected; the remaining blocker was specifically the missing key at the Node child-process boundary.
- No service credential was put in a `NEXT_PUBLIC_*` value, browser process, page, trace, screenshot, HTML, command output, or log. No nonlocal endpoint, authorization bypass, or production system was used.
- Required work still not executable in this session: independent-session Owner race fixture, export-level keyset/boundary/resource-limit fixture, and secure local browser fixture architecture. The repository has no existing trusted global setup or SQL/Auth fixture that supplies the required two-company browser identities without the removed Node service credential; creating one safely requires a dedicated local-auth/SQL harness and remains unimplemented.

### Bottom-most authoritative local status

**BLOCKED — three local gates remain unexecuted: (1) real independent PostgreSQL-session Owner lifecycle concurrency; (2) expanded export-level backup keyset, boundary, resource-limit, and ZIP inspection suite; (3) secure local browser backup E2E. The precise browser blocker is that the execution wrapper removes `SUPABASE_SERVICE_ROLE_KEY` at the trusted Node child boundary, and the repository has no alternative trusted local SQL/Auth fixture harness. External security scans are separately coordinated and not assessed here.**

## Executable-gates and manual-browser continuation

- A direct-RPC authorization gap was found while preparing lifecycle concurrency: `set_staff_status_atomic` counted remaining Owners but did not require an Owner caller when the target was an Owner. The unreleased 081 migration now applies the same Owner-caller rule used by role replacement. Local clean replay and `npm.cmd run typecheck` passed after the correction. Final 081 SHA-256: `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f`.
- Added `npm run test:e2e:tenant-backup-local`, which runs only the existing local backup browser suite. It does not add a browser bypass, public credential, or production target. In a normal local PowerShell session, its trusted Playwright Node worker inherits the already-present service credential; browser code receives only ordinary login credentials.

### Current manual checkpoint

**MANUAL ACTION REQUIRED — SECURE LOCAL BROWSER E2E READY. Run the documented local PowerShell workflow from a normal terminal, return only its exit code and sanitized Playwright summary, and do not include any environment values. Independent-session lifecycle concurrency and export-level archive suites remain unimplemented local gates. External security scans remain separately coordinated and unassessed.**

## Policy-fixture runner repair continuation

- Final migration checksum under verification: `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f`.
- The previous broadened-USING runner case was a fixture-setup failure because its SQL execution was redirected without checking its result. The repaired case uses `psql -v ON_ERROR_STOP=1`, proves the same local `public.companies` catalog row immediately before applying 081, and then checks the same local migration history.
- Verified broadened-USING evidence: `companies admin update` was `UPDATE`, `{authenticated}`, `PERMISSIVE`, `USING true`, with permission-restricted WITH CHECK. Migration 081 exited nonzero, reported catalog drift, and migration-history count for 081 was zero; the drift row remained present. This is not a reproduced 081 bypass.

### Current authoritative status

**BLOCKED — the final-checksum full policy matrix must still be rerun using the repaired fail-fast runner. Independent PostgreSQL-session Owner lifecycle concurrency and export-level backup keyset/boundary/limit/ZIP verification are also unfinished. The manual browser checkpoint must not be requested until those gates and affected regression pass. External security scans remain separately coordinated and unassessed.**

## Historical final status (superseded)

## Final-checksum policy-matrix continuation

- Verified the final migration checksum before execution: `081_tenant_boundary_closure.sql` SHA-256 `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f`.
- Executed the complete isolated local policy matrix using `node_modules/.bin/supabase.cmd db reset --local --no-seed --version 080`, fail-fast `psql -v ON_ERROR_STOP=1`, and `supabase migration up --local`. The runner checked the altered `pg_policies` catalog before every rejection, verified no `081` migration-history row, verified ceiling `080`, checked that neither 081 lifecycle RPC survived, then reset and verified canonical replay through 081.
- Result: canonical catalog plus all nine drift rejections passed: unexpected permissive; unexpected restrictive; missing expected; renamed expected; changed command; changed role set; changed permissive/restrictive mode; broadened USING; broadened WITH CHECK. The runner’s first six cases completed before the command window expired; the final three were run immediately afterward with the same fresh-reset assertions and a final canonical replay. This is one complete 10/10 final-checksum gate, not a carry-forward from the prior checksum.
- The prior inverted missing-policy assertion and the earlier broadened-USING fixture setup fault were fixture-runner defects only; neither reproduced a migration-081 bypass.
- No production access, external scan, commit, push, deploy, migration 082, credential output, or authorization weakening occurred.

### Bottom-most authoritative local status

**BLOCKED â€” Gate 2 (real independent PostgreSQL-session Owner lifecycle concurrency) and Gate 3 (real export-level backup keyset/boundary/limit/ZIP suite) remain unimplemented and unexecuted. Gate 1 passed 10/10 on the final 081 SHA-256 `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f`. The local PostgreSQL image does not provide `dblink`, so Gate 2 must be implemented with externally orchestrated distinct local `psql` sessions and a barrier; no single-session or simulated substitute was claimed. Browser E2E has not been requested.**

**FAIL — release blockers remain: exact policy-catalog reconciliation and all required behavioral/security-scan gates are incomplete; backup cursor/snapshot semantics are not closed.**

## Gate 2 regression infrastructure — authoritative result (2026-07-23)

- Added `npm.cmd run test:gate2-owner-concurrency`, a repository-native disposable local PostgreSQL runner using separate piped `psql` transactions, distinct backend PIDs, an external advisory-lock barrier, awaited exit statuses, idempotent Company-A/Company-B fixture setup, and sanitized assertions.
- Migration 083 serializes the supported lifecycle and role-replacement RPCs on the target company row before delegating to the existing authorization/invariant bodies; migration 082 remains unchanged.
- The command passed: disable-vs-disable, demote-vs-demote, disable-vs-demote, lifecycle-vs-role, sequential sole-Owner rejection, rollback-state comparison, and cross-company isolation. Focused contract tests, typecheck, lint, and `git diff --check` also passed.

**PASS — migration 083 verified; complete Gate 2 regression suite passed.**

## Gate 3 trusted tenant-backup/export verification — authoritative result (2026-07-23)

- Inspected `npm.cmd run test:e2e:tenant-backup-local`, which reaches `/api/backups/system` and parses the real returned ZIP/archive; it does not substitute mocked export output.
- Inspected `src/server/backup/export.ts`: deterministic `(created_at,id)` keyset ordering, captured boundary, dataset/archive row limits, manifest metadata, and ZIP safety limits are implemented in the exporter path.
- Non-credential preflight passed: exporter/tenant-boundary contract inspection, `npm.cmd run typecheck`, `npm.cmd run lint`, and `git diff --check`.
- Credentialed local run failed closed because the current environment has no `SUPABASE_SERVICE_ROLE_KEY`; the suite stopped before fixture seeding/export and emitted no credential material. The unrelated v7.23.7.0 versus v7.23.6.0 application-version baseline mismatch remains separate from Gate 3.

**MANUAL ACTION REQUIRED — TRUSTED LOCAL EXPORT READY**
