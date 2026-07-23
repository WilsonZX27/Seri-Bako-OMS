# Sprint 7.23.6.0-R1 — Independent Tenant Boundary Closure Review

Date: 2026-07-22 (Asia/Kuala_Lumpur)  
Mode: review and verification only  
Priority: P0 release gate  
Feature freeze: active

## 1. Review baseline

| Item | Independently observed |
|---|---|
| Repository | `D:\0 Data\Seri Bako\Seri Bako OMS\seri-bako-oms` |
| Branch | `main` |
| HEAD before and after review | `bfa36a882b876ead0389170dc0c0087a0c060beb` |
| Expected uncommitted state | Present; no review-time source remediation was made |
| Migration ceiling | `081_tenant_boundary_closure.sql` |
| Migration 081 SHA-256 | `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f` |
| Visible version | `v7.23.6.0` |
| Release note | `Sprint 7.23.6.0 — Tenant Boundary Closure` |
| Production access | None |
| Commit, push, deployment | None |

The baseline matched the supplied review brief. The worktree was stable during the review. The pre-existing full-system audit and the Sprint 7.23.6.0 remediation report were preserved. No released migration 001–080 was modified.

The authoritative `PRODUCT.md`, `README.md`, `DESIGN.md`, `DEPLOYMENT.md`, `ARCHITECTURE.md`, full closure audit, and remediation report were read. No repository-owned `AGENTS.md` applied to the application.

## 2. Actual diff and file-scope reconciliation

The worktree contained 42 modified tracked files and seven untracked files before this report. They reconcile to the remediation report:

- Production/migration: `src/app/api/imports/confirm/route.ts`, `src/app/api/items/quick-create/route.ts`, `src/lib/app-version.ts`, `src/lib/supabase/loose.ts`, `src/server/actions/foundation.ts`, `src/server/actions/items.ts`, `src/server/actions/master-data.ts`, `src/server/actions/production-jobs.ts`, `src/server/actions/products.ts`, `src/server/actions/suppliers.ts`, `src/server/backup/export.ts`, `src/types/database.ts`, new `src/server/auth/tenant-actor.ts`, and new migration 081.
- New verification: tenant-boundary SQL, backup Playwright, and tenant-boundary contract tests.
- Updated verification: four existing SQL fixtures, the opening-stock local fixture, and mechanical current-version assertions.
- Documentation: the pre-existing full closure audit and the remediation report.

No undocumented inventory, finance, UI, workflow, cleanup, deployment, secret, or generated artifact was found in the diff. `git diff --check` reported no whitespace errors. The existing test changes were principally required tenant ownership fixtures and version assertions; however, the new source-contract tests are implementation-mirroring and do not cover the release-blocking cases found below.

## 3. Security-diff-scan result

**Not run; security gate incomplete.**

The required native security-diff setup workspace opened as session `e55b6fa7-87b0-4aa4-89cf-2f5c31fd202e` and waited for the required **Start scan** action. No Start action or user response arrived. Following the standing instruction to skip a missing action and continue, the wait was terminated. Because the setup gate never started, no preflight or scan ID existed and no scan result was produced. This is not represented as passing.

## 4. Deep-security-scan result

**Not run; security gate incomplete.**

The required native deep-scan setup workspace opened as session `dd61b2ff-3fdc-493e-905f-f7e3395d1828` and waited for the required **Start scan** action. No Start action or user response arrived, so the wait was terminated under the same standing instruction. No preflight, worker run, scan ID, artifact, or result was produced. This is not represented as passing.

## 5. Migration 081 review

### Clean-chain evidence

- A disposable local reset replayed migrations 001–081 successfully.
- The effective post-080 catalog contained exactly 147 public policies, and the migration contained exactly 147 matching `(table, policy name)` drops. There were no missing or extra names in the clean checked-in chain.
- The clean post-081 catalog contained 78 public policies, no literal-true policy, and no RLS-enabled public table without a policy.
- All public views were `security_invoker=true`.
- The two-active-company fixture with an unowned item failed migration 081 with SQLSTATE `23514`, the documented non-sensitive message, and transaction rollback.
- An empty clean installation replayed successfully.

### Release-blocking migration results

The clean-chain match is insufficient for a production-ready drift boundary. A synthetic, unexpected post-080 policy named `review_unexpected_permissive_drift` with `USING (true)` was added to `items`. Migration 081 applied and was recorded at ceiling 081, but the policy remained beside `tenant items read` and `tenant items manage`. PostgreSQL combines permissive policies with OR, so this preserves the exact exposure migration 081 is intended to close. See R1-001.

The backfill counts only companies whose `deleted_at` is null. In a fixture containing one active company, archived company history, and an unowned legacy item, migration 081 succeeded and assigned the item to the active company. The installation was not unambiguously single-company. See R1-003.

Dedicated fixtures for already-owned valid data and every malformed pre-081 relationship were not completed independently. The absence of those required cases is recorded as an evidence gap, not a pass.

### Master ownership and indexes

The new company columns, non-null constraints, company-scoped code indexes, and composite supplier/item/UOM foreign keys are directionally correct. Relevant company indexes exist for items, products, suppliers, supplier items, and UOM conversions. Migration 080 branch-supplier protection remained functional in its regression suite.

The structural model is incomplete for company-bearing relationships such as barcode mappings and recipe/product/ingredient relationships. Authenticated RLS validates these relations, but the database still accepts malformed relations through a service-role-equivalent path. See R1-004.

## 6. Effective policy, grant, and function review

The clean post-081 catalog showed:

| Inventory | Result |
|---|---:|
| Public policies | 78 |
| Literal-true policies | 0 |
| Public `SECURITY DEFINER` functions | 61 |
| Unsafe/missing fixed path | 0 |
| PUBLIC execute on definer functions | 0 |
| anon execute on definer functions | 0 |
| authenticated execute on definer functions | 54 |
| Function owners | 61 owned by `postgres` |
| anon public-table grants | 0 |

The seven definer functions not callable by `authenticated` were four trigger-only tenant guards plus the internal AP-aging, inventory-movement, and supplier-mapping validators. No broader overload grant was found. Public-schema `CREATE` was revoked from PUBLIC, anon, and authenticated without breaking the clean replay, SQL suites, build, or application backup test.

This otherwise sound catalog is undermined by two policy issues:

1. unexpected pre-existing policies are not rejected and can survive the migration (R1-001);
2. `activity_logs` and `audit_logs` use `FOR ALL` while authenticated retains DELETE/UPDATE table privileges, allowing destructive log mutation by a same-company role with `documents.read` (R1-005).

## 7. Tenant actor review

`requireActiveTenantActor` fails closed for no user, no staff row, disabled staff, deleted staff, null company, null role, and non-Owner callers to the backup. `staffs.auth_user_id` is unique, so multiple staff rows cannot normally be chosen for one Auth user. The resolver does not accept request company data or fall back to a service client.

Role selection is still ambiguous when legacy data contains multiple active memberships and no primary membership: `getCurrentProfile` uses `activeRoles.find(is_primary) ?? activeRoles[0]` without a deterministic ordering or a rejection. The schema permits multiple active non-primary memberships. See R1-007.

## 8. Service-role action review

The changed company, branch, location, staff, role, document-sequence, master-data, quick-create, import, and production-output paths generally derive company from the authenticated staff and add company predicates or use authenticated RLS. Cross-company role/branch inputs to the atomic access RPC were rejected and left access unchanged. Imports and quick-create set company ownership server-side.

Two boundaries remain unacceptable:

- `updateStaff` writes the staff payload, including caller-supplied status, through the service role before it invokes the atomic access RPC. The same-role fast path omits the last-Owner deactivation guard. This was reproduced as zero active Owners (R1-002).
- Database structural enforcement does not cover every related master relation reachable by present or future service-role code (R1-004).

No changed update/delete path was found that targets a different-company row using only its UUID. Errors used by the reviewed paths did not disclose another tenant's row content.

## 9. Atomic staff-access review

`replace_staff_access_atomic` itself passed the focused review:

- actor and target are company-checked;
- the selected role and branches are same-company and active;
- branch types are enforced for Kitchen and Outlet Staff;
- company-wide roles receive only active branches in the actor company;
- duplicate input branches are deduplicated;
- the role/branch/location/default-branch replacement is transactional;
- the per-company advisory lock serializes Owner changes;
- trigger guards reject cross-company access relations.

A real two-session test started two Owners demoting themselves concurrently. One transaction committed; the competing transaction failed with `Cannot remove the last Owner in this company`; exactly one active Owner remained. The RPC concurrency claim therefore passes.

The larger F-003 invariant does not pass because `updateStaff` performs a separate status commit before the RPC. The RPC cannot roll back that earlier request (R1-002).

## 10. Backup isolation review

Positive evidence:

- Company is derived from an active Owner before creating the service client.
- The route accepts no company override; a forged query parameter was ignored.
- Empty parent-ID sets return before querying child datasets.
- Parent IDs are chunked and company/branch roots are explicitly filtered.
- `auth.users` and `storage.objects` are excluded; scoped attachment metadata is separate.
- `permissions` contains capability reference metadata and is the only intentionally global dataset.
- Logged dataset diagnostics contain correlation/actor/company/table/count fields, not row bodies.
- The local archive test parsed every ZIP member and found no Company-B identifier or marker for a Company-A Owner.

The checked-in Playwright suite passed 3/3 for Company-A Owner, Manager denial, and disabled-Owner denial. It did not test Company-B Owner, incomplete identity, anonymous caller, a company with empty parents, or more than one page. Pagination has no deterministic `order`, all pages are accumulated in memory, CSV strings are accumulated again, and the final ZIP is built in memory. The manifest also omits the public `profiles` table without classifying it as excluded. See R1-006.

## 11. Behavioral and concurrency test evidence

| Verification | Independent result |
|---|---|
| Migration 081 checksum | Pass |
| Clean local replay 001–081 | Pass |
| Post-080 policy inventory vs 147 exact drops | Pass on clean chain |
| Unexpected-policy drift fixture | **Fail: permissive policy survived 081** |
| Two-active-company ambiguous unowned master | Pass: failed closed with `23514` |
| One-active-plus-archived-company unowned master | **Fail: ownership assigned to active company** |
| Post-081 cross-company barcode relation via privileged path | **Fail: insert accepted** |
| Two-company/six-role SQL suite | Pass |
| Migration 075 validation | Pass |
| Migration 078 validation | Pass |
| Migration 079 validation | Pass |
| Migration 080 validation | Pass |
| Real parallel `replace_staff_access_atomic` test | Pass: one success, one rejection, one Owner remains |
| `updateStaff` two-commit last-Owner reproduction | **Fail: zero active Owners remained** |
| Manager deletion of activity/audit fixtures | **Fail: both deletes succeeded** |
| Backup archive Playwright | Pass: 3/3 checked-in cases |
| Node contract tests | Pass: 167/167 |
| `npm run lint` | Pass; framework deprecation notice only |
| `npm run typecheck` | Pass |
| `npm run build` | Pass; 89 static pages generated |
| security-diff-scan | Not run; gate incomplete |
| deep-security-scan | Not run; gate incomplete |

All database fixtures were disposable local data. The final local database was restored by a clean 001–081 reset. No production system was queried or mutated.

## 12. Regression and performance risks

- Relevant company and parent-key indexes are present, and no RLS-table-without-policy or unsafe view was found.
- SECURITY DEFINER helpers prevent obvious same-table policy recursion; no policy-recursion error appeared in the SQL or E2E suites.
- Backup pagination uses offsets without deterministic ordering, so concurrent writes can cause skips/repeats. The test suite does not exercise page two.
- Backup generation is unbounded in application memory: row arrays, CSV strings, the files array, and the final ZIP coexist. This is a credible serverless memory risk for a large tenant.
- The new policies contain repeated stable helper/subquery calls. Supporting indexes exist for staff auth, staff roles, company masters, branches, and parent IDs; no speculative index change is recommended without representative production-safe plans.
- Imports, quick-create, selectors, document numbering, Manager scope, inventory hardening, and branch-supplier behavior passed the available regression gates. Live Kitchen/Outlet browser screens were not independently re-executed beyond SQL role coverage.

## 13. New findings, deduplicated against F-001/F-002/F-003

### R1-001 — Unexpected permissive policy drift survives migration 081

- **Severity:** P0
- **Confidence:** Confirmed
- **Affected surface:** migration 081 policy reconciliation; every table where an unexpected permissive policy exists.
- **Exact evidence:** migration 081 lines 341–488 use exact `DROP POLICY IF EXISTS` statements but contain no pre/post catalog assertion. In a post-080 fixture, `review_unexpected_permissive_drift` (`items`, SELECT, `USING (true)`) was added. Migration 081 applied and ceiling became 081; the policy remained alongside both tenant item policies.
- **Reproduction/trace:** reset through 080; create an unexpected authenticated SELECT policy on `items` with `USING (true)`; apply 081; query `pg_policies`.
- **Expected invariant:** an effective-policy closure migration must fail and roll back when the live precondition or final catalog differs from the reviewed set.
- **Root cause:** the migration assumes the checked-in policy history is the live catalog and treats absent known names as harmless while never rejecting unknown names.
- **Impact:** a drifted permissive policy ORs with the canonical policy and preserves cross-company access after a nominally successful migration.
- **Closure impact:** invalidates F-001 closure.
- **Remediation direction:** add transactional exact-set preflight/final-state assertions or an equivalently fail-closed catalog reconciliation; do not silently accept unknown public policies.
- **Required regression:** extra, missing, renamed, and permissive post-080 policy fixtures must make 081 fail with complete rollback; the exact expected fixture must pass.

### R1-002 — `updateStaff` can commit disablement of the last active Owner before the atomic RPC rejects

- **Severity:** P0
- **Confidence:** Confirmed
- **Affected surface:** `src/server/actions/foundation.ts` staff update/lifecycle and `replace_staff_access_atomic` integration.
- **Exact evidence:** staff status is accepted in `staffPayload` (line 509); `assertCanAssignStaffRole` returns immediately for the same role (line 620); `updateStaff` commits the service-role staff update at line 900 and only then calls the RPC at line 902. The dedicated deactivation guard is used by `disableStaff`, not by this path.
- **Reproduction/trace:** after the parallel RPC test left one active Owner, issue the same-role staff payload update with `status=disabled`, then invoke the RPC. The update committed, the RPC failed because the actor was no longer active, and the active Owner count was zero.
- **Expected invariant:** every path that can remove active Owner authority must be serialized and atomically preserve at least one active Owner per company.
- **Root cause:** lifecycle status and access replacement are separate database requests; the precheck equates unchanged role with unchanged Owner authority.
- **Impact:** a company can be locked out of Owner administration despite the atomic RPC's correct internal guard.
- **Closure impact:** invalidates F-003 closure.
- **Remediation direction:** make status/lifecycle plus access replacement one locked database transaction, or remove status mutation from the general staff update and route it through the same Owner-protected operation.
- **Required regression:** same-role disable, self-disable, two-Owner concurrent disable/demotion, RPC failure after status validation, and complete rollback assertions.

### R1-003 — Archived-company history is ignored when deciding that legacy ownership is unambiguous

- **Severity:** P0
- **Confidence:** Confirmed
- **Affected surface:** migration 081 legacy master backfill, lines 18–30.
- **Exact evidence:** `company_count` filters `where deleted_at is null` (line 21), then auto-assigns all null masters when that count is one (line 23 onward). A fixture with one active and archived companies assigned `LEGACY-ARCHIVED-AMBIG` to the active company and completed migration 081.
- **Reproduction/trace:** reset through 080; leave exactly one active company, archive at least one other company, insert an unowned legacy item, and apply 081.
- **Expected invariant:** no first/sole-active-company inference is allowed when more than one tenant identity exists or historical ownership is ambiguous.
- **Root cause:** active-company count is used as a proxy for installation tenant count.
- **Impact:** historical master data can be attributed to the wrong tenant, causing disclosure, corrupted references, or an unsafe production migration.
- **Closure impact:** invalidates F-001 closure.
- **Remediation direction:** treat all company rows as ownership candidates unless an approved data-preparation mapping proves otherwise; fail closed on any ambiguous history.
- **Required regression:** one active plus one/many archived companies with null masters must fail and roll back; a truly single-company fixture must backfill deterministically.

### R1-004 — Related master ownership is not structurally enforced for privileged writers

- **Severity:** P1
- **Confidence:** Confirmed
- **Affected surface:** `barcode_mappings`; structurally similar recipe/product and recipe-line/item relations; future service-role writers.
- **Exact evidence:** barcode mappings retain separate foreign keys to company and item/product. Migration 081 adds an authenticated `WITH CHECK` but no composite foreign key or trigger. A post-081 privileged insert created a Company-A barcode row referencing a Company-B item. Recipe relations likewise rely on policy subqueries rather than composite constraints/triggers.
- **Reproduction/trace:** create companies A/B and an item in B; insert `barcode_mappings(company_id=A, item_id=B-item, stock_entity_type='item')` through a service-role-equivalent connection. The insert succeeds.
- **Expected invariant:** cross-company master relations cannot be inserted or updated even when RLS is bypassed by a controlled service operation.
- **Root cause:** same-company integrity was implemented in RLS for these tables but not in the relational model.
- **Impact:** a privileged bug/import can create mixed-tenant mappings that later leak identifiers or corrupt backup/report relationships.
- **Closure impact:** invalidates full F-001 closure and weakens F-003's service-role guarantee.
- **Remediation direction:** add compatible composite ownership constraints or fail-closed tenant-integrity triggers for every company-bearing master relation, with preflight for existing malformed rows.
- **Required regression:** authenticated and service-role insert/update probes for barcode item/product, recipe product, and recipe ingredient relations across companies.

### R1-005 — Canonical audit/activity policies grant destructive log commands

- **Severity:** P1
- **Confidence:** Confirmed
- **Affected surface:** migration 081 `tenant activity logs` and `tenant audit logs` policies (lines 598–603).
- **Exact evidence:** both policies are `FOR ALL`; authenticated retains DELETE and UPDATE table grants. A synthetic Manager with `documents.read` deleted one same-company activity row and one same-company audit row under `role authenticated`; both returned `DELETE 1`.
- **Reproduction/trace:** seed same-company log rows; set an active Manager JWT claim with `documents.read`; delete both rows directly.
- **Expected invariant:** operational audit history is readable/append-only according to explicit capabilities and is not deletable or rewritable by ordinary document readers.
- **Root cause:** separate legacy read/insert policies were collapsed into broad `FOR ALL` policies without reconciling table-level command grants.
- **Impact:** authorized users can erase or alter evidence needed to investigate privileged and tenant-boundary actions.
- **Closure impact:** invalidates the claimed correctness of F-001's canonical policy replacement, though it does not create a cross-company read by itself.
- **Remediation direction:** use command-specific policies and revoke direct destructive grants; retain append behavior only through an authorized path.
- **Required regression:** per-role SELECT/INSERT/UPDATE/DELETE matrix for both log tables, including immutable historical-row assertions.

### R1-006 — Backup pagination, memory, manifest, and required identity coverage remain incomplete

- **Severity:** P2
- **Confidence:** Confirmed for code/test gaps; probable operational impact
- **Affected surface:** `src/server/backup/export.ts` and `tests/e2e/tenant-backup-isolation-local.spec.js`.
- **Exact evidence:** `fetchPages` begins at line 112 and uses `.range` without `.order`; rows are accumulated at line 118, files at line 169, and the ZIP buffer at line 226. The public `profiles` table is neither exported nor classified as excluded. The checked-in suite contains only three cases.
- **Reproduction/trace:** static control-flow review plus the executed 3/3 suite; no page-two test exists.
- **Expected invariant:** deterministic complete pagination, bounded resource behavior, exhaustive dataset classification, and the full required identity/empty-company matrix.
- **Root cause:** pagination was added as offset batching without a stable cursor/order, streaming, or expanded behavior fixtures.
- **Impact:** large or concurrently changing backups can skip/repeat rows or exhaust memory; operators can mistake an incomplete manifest/test matrix for complete evidence.
- **Closure impact:** F-002 confidentiality is demonstrated for Company A but is not independently closed as a release gate.
- **Remediation direction:** deterministic keyset/order pagination, bounded/streamed archive construction where practical, explicit `profiles` classification, and the missing identity/tenant fixtures.
- **Required regression:** Company-B Owner, incomplete, anonymous, zero-parent, page-two, concurrent-write pagination, and large-volume memory tests.

### R1-007 — Tenant actor role resolution accepts ambiguous active memberships

- **Severity:** P2
- **Confidence:** Confirmed
- **Affected surface:** `src/server/queries/common.ts` and `requireActiveTenantActor` callers.
- **Exact evidence:** line 28 chooses `activeRoles[0]` when no primary role exists. `staff_roles_one_primary_idx` prevents two primary rows but does not require a primary or prevent multiple active non-primary rows; the query has no ordering.
- **Reproduction/trace:** create two active non-primary memberships for one staff row and call `getCurrentProfile`; the selected role depends on returned row order.
- **Expected invariant:** malformed or ambiguous membership must fail closed, not choose an arbitrary role.
- **Root cause:** compatibility fallback was retained in an authorization-sensitive actor resolver.
- **Impact:** inconsistent Owner backup eligibility and role-dependent action behavior for malformed legacy data.
- **Closure impact:** does not independently create cross-company authority, but leaves the F-003 actor-resolution evidence incomplete.
- **Remediation direction:** require exactly one active primary membership or reject ambiguity; add a data preflight before enforcing the invariant.
- **Required regression:** zero, one, and multiple active roles with/without primary, inactive roles, and cross-company malformed membership fixtures.

## 14. Closure verdicts

| Original finding | Independent closure verdict | Reason |
|---|---|---|
| F-001 — permissive legacy RLS / tenant boundary | **NOT CLOSED** | R1-001, R1-003, R1-004, and R1-005 invalidate the migration's fail-closed policy and ownership claims. |
| F-002 — cross-tenant Owner backup | **NOT CLOSED AS A RELEASE GATE** | Company-A content isolation passed, but deterministic pagination, exhaustive manifest classification, the required identity/company matrix, and both security scans remain incomplete (R1-006). |
| F-003 — client-trusting privileged administration | **NOT CLOSED** | The atomic RPC works, but the separate `updateStaff` lifecycle commit can remove the last active Owner (R1-002); structural service-role relation protection is also incomplete (R1-004). |

## 15. Production migration prerequisites

Before any checkpoint commit, Sprint 7.23.6.1 work, deployment, or production migration:

1. Remediate R1-001 through R1-005 and add their behavioral regressions.
2. Complete the missing realistic migration-080 fixtures, including truly single-company nonempty, already-owned, malformed relationship, archived-company, and drift catalogs.
3. Expand backup verification to the full required identity, tenant, empty-parent, and multi-page matrix; address deterministic pagination and classify `profiles`.
4. Make every Owner-removal path use the same company lock and transaction, then rerun real parallel lifecycle tests.
5. Rerun both mandated Codex Security scans to completion and deduplicate their validated findings into this report lineage.
6. Re-run clean replay, all SQL suites, full contracts, lint, typecheck, build, and local backup E2E from the corrected diff.
7. Obtain separate authorization for production read-only catalog/data preflight. This review does not authorize production access or cleanup.

## 16. Final gate verdict

**FAIL — remediation required before commit or further Sprint work.**

No commit, push, deployment, production migration, production query, cleanup, or Sprint 7.23.6.1 work was performed or authorized by this review.
