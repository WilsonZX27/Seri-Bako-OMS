# Seri Bako OMS — Full-System Closure Audit

Audit date: 2026-07-22 (Asia/Kuala_Lumpur)  
Audit mode: strict read-only review; no application, database, deployment, or production changes  
Framework alignment: ISO/IEC 25010, ISO/IEC 27001/27002, ISO 9241-210, OWASP ASVS, WCAG 2.2 AA, and PostgreSQL/Supabase transaction and RLS practices. This is not a certification or formal compliance assessment.

## 1. Executive verdict

**NO-GO for production release or broader multi-company use.** The repository builds and its 164 source-contract tests pass, and migrations 075, 078, 079, and 080 contain meaningful hardening. Those positives do not close six confirmed P0 root risks:

1. tenant isolation is not consistently enforced by RLS;
2. the Owner backup path exports all rows through the service role without company filtering;
3. privileged administration actions trust client company/record identifiers while bypassing RLS;
4. the reusable inventory movement writer and manual movement action are non-atomic;
5. transfer/wastage status changes can contradict already-posted ledger effects; and
6. production posting can partially consume inputs or create output.

The audit records **6 P0, 8 P1, 6 P2, and 1 P3 findings**. “Confirmed” means the defect is demonstrated by the checked-in implementation or migration chain. It does **not** mean production has already been exploited or that historical rows are corrupt. Production data impact was not queried and remains a separate read-only verification gate.

## 2. Audit baseline and scope

| Baseline item | Recorded value |
|---|---|
| Repository | `D:\0 Data\Seri Bako\Seri Bako OMS\seri-bako-oms` |
| Branch | `main` |
| HEAD | `bfa36a882b876ead0389170dc0c0087a0c060beb` |
| Worktree | Clean; `main...origin/main`; one worktree |
| Latest migration | `080_branch_scoped_supplier_items.sql` (80 migration files) |
| UI release | `7.23.5.9` / `v7.23.5.9`; “Branch-scoped supplier mappings” |
| Package version | `0.2.15` |
| App inventory | 110 `page.tsx` routes, 9 route handlers, 23 server-action modules, 31 query modules |
| Database inventory | 64 table declarations, 5 view declarations, 75 function declarations, 65 RLS enables, 204 policy declarations |
| Test inventory | 39 contract files / 164 passing tests; SQL validation scripts and Playwright suites are not wired into `npm`’s default test gate |

The baseline remained at the same HEAD and a clean worktree at report creation. An initial worktree collision was stopped by the user before the audit continued.

### Authoritative material read

- `PRODUCT.md`, `README.md`, `DESIGN.md`, `DEPLOYMENT.md`, and `ARCHITECTURE.md` were read.
- No repository-owned `AGENTS.md` applied to the application; the only matches were dependency-package files under `node_modules`.
- All 80 migrations, maintenance/reset paths, route/action/query inventories, and every inventory-affecting mutation entry point were searched. High-risk implementations were read in detail.

### Verification performed

| Check | Result |
|---|---|
| `npm.cmd run typecheck` | Pass |
| `npm.cmd run lint` | Pass; Next reports `next lint` is deprecated |
| `npm.cmd run build` | Pass; 89 static/dynamic application route entries generated |
| `node --test <39 contract files>` | Pass: 164/164 |
| Impeccable static detector | Used; `node .agents/skills/impeccable/scripts/detect.mjs --json src` returned `[]` |
| Manual UI source review | Completed for shell, tokens, shared controls, route skeletons, responsive tables/actions, redirects, and representative domain pages |

### Areas not verified

- **Deep security scan:** attempted and deferred at user direction. Preflight scan `24cbacea-d84d-4930-aee8-063a6035824d` required six workers; this session exposed only three usable worker slots. The local Codex concurrency setting was raised for future sessions, but it cannot change a running session’s cap. Rerun in the next round.
- **Production database contents:** not queried. The configured repository environment exposes only a publishable Supabase key. Signing in with configured test users would change external Auth state, contrary to the read-only boundary.
- **Playwright:** not executed. Its default base URL is the deployed application, several specs mutate business data, and the suite writes screenshot/trace artifacts. Safe disposable/rollback fixtures are required.
- **Production migration ceiling and grants:** not observed live. Migration-chain conclusions must be confirmed with the appendix queries.

## 3. Business-invariant map

| Invariant | Implementation status | Evidence / finding |
|---|---|---|
| Owner authority is company-wide, not cross-company | Failed | F-001, F-002, F-003 |
| Manager sees and performs Manager Review company-wide | Implemented in PR RLS/RPC | Migration 075; documentation contradiction in F-018 |
| Finance cannot substitute for Manager approval | Implemented in PR transition RPC | Migration 067 lines 191-215 |
| Kitchen/Outlet remain assigned-branch only | Partially implemented | Hardened inventory/PR functions; unscoped legacy policies in F-001 still defeat the general guarantee |
| Company/branch is server-authoritative | Failed in privileged admin actions | F-003 |
| Posted ledger is stock source of truth | Partially implemented | Views use posted ledger; F-004 through F-007 can create contradictory or partial ledger state |
| Draft/cancelled/rejected/partial failures do not affect stock | Failed | F-004, F-005, F-006 |
| Posting is atomic, locked, branch-safe, state-conditional, traceable, retry-safe | Failed outside four migration-079 RPCs; concurrency gaps remain inside them | F-004 through F-007 |
| No untraceable direct balance mutation | Failed | F-004 |
| Supplier mappings are branch-specific | New writes partially enforced | Migration 080; global supplier/item masters and historical mappings remain under F-001/F-020 verification |

## 4. Role, company, and branch access matrix

“Expected” is the product rule. “Observed” is the static effective design, not a claim about current production rows.

| Identity | Expected same-company scope | Expected branch scope | Observed effective path | Verdict |
|---|---|---|---|---|
| Owner | All company data/actions | All branches | UI/server permissions are broad; RLS and backup/admin service paths can cross companies | Fail |
| Finance | Company-wide finance plus documented admin/read union | All branches; no Manager Review or Purchasing mutations | PR transition separation is sound; unscoped policies can expose other-company data | Fail |
| Manager | Company-wide operations and Manager Review | All branches; assignment is default context | Migration 075 is correct; other legacy domain RLS remains permission-only | Partial |
| Purchasing | Company-wide procurement/master data; no finance | All branches | PR/PO role split exists; global masters, PO RLS, exports, and sequence RPC are not tenant-safe | Fail |
| Kitchen | PR/production for assigned Central Kitchen | Assigned Central Kitchen only | Hardened PR/inventory helpers constrain branches; legacy document/production/master policies can broaden access | Fail |
| Outlet Staff | Daily record for assigned outlet | Assigned outlet only | Daily-record RPCs are scoped; legacy shared policies can broaden ancillary reads | Fail |
| Authenticated but incomplete/disabled | No business access | None | Most `has_permission` paths fail closed; `next_document_number` has no identity check | Fail |
| Anonymous | No business access | None | Normal RLS is denied; default PUBLIC execute on `next_document_number` is not explicitly revoked | Fail / verify live grant |
| Different company | No visibility or mutation | None | Multiple confirmed permission-only/`true` policies and service-role paths | Fail |

## 5. Inventory workflow integrity matrix

| Workflow | State guard | Atomicity / lock | Idempotency | Branch/item integrity | Verdict |
|---|---|---|---|---|---|
| Opening stock | Permission and branch checks | One DB RPC, but existence check is unlocked | Transaction number only | Location and item checked | P1: concurrent duplicate opening balances possible |
| GRN | Draft-only; evidence or exception | One DB RPC and GRN row locks | Posted state + deterministic line number | Branch/supplier/item checked | P1: PO lines are not locked/revalidated; concurrent over-receiving possible |
| Purchase return | Draft-only | One DB RPC; GRN line locked | Posted state + deterministic number | Receiving/branch/item checked | P1: stock-balance read is not protected against concurrent outflow |
| Stock count | Reviewed→approved→posted | One DB RPC; count/lines locked | Posted state + deterministic number | Branch/location/item checked | P1: posts stored theoretical variance instead of current locked ledger balance |
| Transfer | UI action guards only | Movement-by-movement application writes | Transaction number per line | RLS-dependent | P0: partial dispatch/receipt and cancellation after dispatch can contradict ledger |
| Production | Approved→posted check | Sequential header/line/status writes | Weak duplicate number behavior | Non-locking availability check | P0: partial consumption/output and concurrent negative stock |
| Wastage/damage | Draft posting; cancellation unrestricted | Movement-by-movement application writes | Transaction number per line | RLS-dependent | P0/P1: partial posting; posted deduction can later be labelled cancelled/rejected |
| Manual adjustment/movement | Type supplied by client form | Header, document, and line are separate writes | Header number only | No canonical source document invariant | P0: direct posted and potentially untraceable movement |
| Outlet daily record | RPC state checks | Database-authoritative record save | Controlled by branch/date constraint | Assigned outlet | Pass for stated scope; intentionally no ledger write |

## 6. Prioritized findings

### F-001 — Permissive legacy RLS defeats company and branch isolation

- **Severity / confidence / domain:** P0 / Confirmed / Authorization, RLS, privacy.
- **Affected roles/branches:** Any authenticated role with the relevant permission; all branches; different companies. Anonymous impact depends on live grants.
- **References:** `supabase/migrations/004_sprint_1_foundation_admin.sql:241-270`; `005_sprint_1_5_staff_access_document_sequences.sql:123-141`; `001_milestone_1_inventory_foundation.sql:286-342`; `002_products_master_data.sql:42-47`; `007_sprint_2_master_data_completion.sql:102-122`; `008_sprint_2_5_universal_document_framework.sql:265-304`; `009_sprint_3_procurement_core.sql:136-157`; `014_sprint_5_transfer_wastage.sql:137-152`; `031_sprint_7_production_jobs.sql:152-201`; `046_sprint_7_2_26_purchase_returns.sql:98-122`.
- **Observed:** Early migrations create `USING (true)` reads for companies, locations, roles, permissions, role permissions, activity/audit records, items, suppliers, products, supplier mappings, UOM conversions, and packaging. Shared document, PO, transfer/wastage, and production policies often check only a permission, not company/branch membership. PostgreSQL permissive policies combine with OR, so adding a later scoped policy cannot close an earlier permissive one. Several old policy names are never dropped.
- **Expected:** Every business row must be limited to the current active staff company and, for Kitchen/Outlet, an assigned branch. Child records must inherit scope through their parent.
- **Trace/reproduction:** As an authenticated user in company A, issue direct PostgREST SELECTs for the listed tables and compare returned `company_id`/parent company to `current_staff_company_id()`. Use the policy inventory query in Appendix A.
- **Root cause:** Authorization evolved additively without a canonical effective-policy migration; policy-name drift left permissive policies active.
- **Impact/scenario:** A role with `documents.read`, `production.view`, or related permissions can enumerate another company’s records. Permission-only write policies may also allow cross-company updates by known UUID. Search and CSV export propagate the RLS result.
- **Why controls missed it:** Contract tests assert selected migration strings and happy-path role behavior; they do not reconstruct the full policy lattice from migrations or run two-company negative probes. The earlier security baseline characterized always-true policies mainly as write risks and did not identify these surviving SELECT policies.
- **Direction:** Contain via one forward-only migration that inventories and drops superseded policies by exact name, then creates canonical company/branch predicates for every table and child relationship. Review table grants simultaneously.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Historical cleanup **unknown** (audit logs and cross-company references may already exist). Tests: two-company, six-role direct-table and RPC negative matrix. Parent of F-002, F-008, F-009, F-013, and F-020.

### F-002 — Owner backup exports every tenant through the service role

- **Severity / confidence / domain:** P0 / Confirmed / Backup, confidentiality.
- **Affected roles/branches:** Any active `super_admin` in any company; every company/branch represented in backup tables.
- **References:** `src/server/backup/export.ts:55-78` (`assertSuperAdminForBackup`, `generateSystemBackupZip`); `:83-101` (`createAdminClient`, unfiltered table loop/select); `src/app/api/backups/system/route.ts:4-24`.
- **Observed:** Role authorization is checked, then the service-role client loops through `BACKUP_TABLES` and executes `select("*").limit(10000)` without `company_id`, parent-company, or branch predicates. Global master tables are included as well.
- **Expected:** An Owner backup is company-wide for that Owner’s company, never system-wide across unrelated companies.
- **Trace/reproduction:** In a disposable two-company database, sign in as company-A Owner, download the backup, and inspect company-bearing CSVs for company-B identifiers. Do not run on production without a sanctioned read-only test account.
- **Root cause:** “Super Admin / Owner” was treated as a platform-global role once a service client bypassed RLS.
- **Impact/scenario:** One tenant Owner can download staff, operational, financial, audit, and attachment metadata belonging to every tenant.
- **Why controls missed it:** Existing tests check owner-only navigation/denial, not row-level contents of the generated archive.
- **Direction:** Build a company-scoped backup manifest and table-specific predicates/parent joins; explicitly classify truly global reference tables. Log counts without exposing other-tenant information.
- **Migration / cleanup / tests / dependencies:** Migration **unknown** (schema may need a scoped export RPC). Cleanup **no** for code fix; incident review **unknown** for prior backups. Tests: two-company archive-content test. Depends on F-001’s ownership model.

### F-003 — Privileged administration actions trust client company/record IDs while bypassing RLS

- **Severity / confidence / domain:** P0 / Confirmed / Administration, identity, company/branch context.
- **Affected roles/branches:** Finance/Manager/Owner for branch administration; staff administrators; all companies and branches reachable by UUID.
- **References:** `src/server/actions/foundation.ts:152-182`, `195-232`, `246-325`, `468-543`, `605-643`, `806-900`, `1227-1270`.
- **Observed:** Branch, location, staff, and document-sequence payloads accept `company_id` from `FormData`, then write through `createAdminClient()`. Updates/deletes target `.eq("id", id)` without actor-company predicates. `replaceStaffAccess` looks up roles and all active branches across all companies, deletes/recreates access non-atomically, and does not prove that role, staff, branch, and actor share a company. Manager is also omitted from its `companyWide` list despite product semantics.
- **Expected:** Derive company from the active staff identity; validate target and all related IDs in that company; use a transaction/RPC for staff access replacement.
- **Trace/reproduction:** From an authorized company-A administration action, replace hidden `company_id`, record ID, role ID, or branch IDs with company-B UUIDs. The server permission gate checks capability, while the service-role query bypasses RLS.
- **Root cause:** Permission authorization was separated from object/tenant authorization and then combined with a service-role client.
- **Impact/scenario:** Cross-company branch/location creation or mutation; cross-company staff reassignment; loss of the last Owner in one company because owner counts are global; cross-tenant sequence changes.
- **Why controls missed it:** UI forms normally supply same-company IDs. Tests do not forge payloads or target UUIDs across companies.
- **Direction:** Replace these actions with company-scoped SECURITY DEFINER RPCs or force all service queries to actor-company predicates; lock staff/access rows and update them atomically.
- **Migration / cleanup / tests / dependencies:** Migration **yes** for authoritative RPC/constraints. Cleanup **unknown**. Tests: forged FormData/UUID, cross-company role/branch, last-owner-per-company, partial-failure rollback. Duplicate root with F-001.

### F-004 — Canonical inventory movement and manual posting are non-atomic

- **Severity / confidence / domain:** P0 / Confirmed / Inventory ledger.
- **Affected roles/branches:** Any role with stock movement creation/posting; all accessible inventory branches.
- **References:** `src/server/inventory/engine.ts:54-145`; `src/server/actions/stock-transactions.ts:50-123`; `supabase/migrations/012_sprint_4_inventory_ledger_engine.sql:60-105,153-167`.
- **Observed:** `createInventoryMovement` performs duplicate lookup, balance read, posted header insert, line insert, and audit insert as separate requests. If line insertion fails, the posted header remains; retry sees the header and returns “duplicate” without repair. The ledger view explicitly falls back to header fields when no line exists. Manual `createStockTransaction` likewise creates a posted header, linked document, and line separately and accepts semantic transaction types without a canonical source workflow.
- **Expected:** One locked, idempotent database transaction must validate source/state/branch/item, insert header and lines, update source status, and record traceability.
- **Trace/reproduction:** Cause a line constraint/RLS/network failure after header insertion, then retry the same transaction number. Observe a posted header and duplicate short-circuit. Race two outflows after the same balance read.
- **Root cause:** A reusable application helper was treated as a transaction boundary; transaction-number uniqueness protects only the header.
- **Impact/scenario:** Wrong balance attribution, negative stock, header-only ledger movements, or direct adjustments with insufficient source evidence.
- **Why controls missed it:** Contract tests inspect expected strings and route behavior; no fault injection or concurrent database tests cover header/line rollback.
- **Direction:** Revoke direct posted ledger writes and route every movement through a locked DB RPC with a source-type/id/line uniqueness contract.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **unknown**; run orphan/header-only diagnostics. Tests: failure after each statement, retry, concurrent outflow, source uniqueness. Parent of F-005/F-006.

### F-005 — Transfers and wastage can be cancelled/rejected after stock has posted

- **Severity / confidence / domain:** P0 / Confirmed / Inventory workflow.
- **Affected roles/branches:** Transfer and wastage operators; source/destination branches.
- **References:** `src/server/actions/stock-operations.ts:119-186`, `219-257`.
- **Observed:** Dispatch, receipt, and wastage loop over lines and call the non-atomic movement helper before updating document status. `cancelStockTransfer`/`rejectStockTransfer` call `setTransferStatus` without allowed-from-state checks. Wastage cancel/reject directly updates status without checking current state or reversing a posted ledger movement.
- **Expected:** A cancelled/rejected document must have no ledger effect unless an explicit, posted reversal is created; transfer dispatch/receipt must each be atomic and state-conditional.
- **Trace/reproduction:** Dispatch a transfer, then invoke cancel; the outbound movement remains while the document becomes cancelled. Inject a failure on line N or status update to leave partial movement rows.
- **Root cause:** Document state and ledger state are maintained by separate application calls; cancellation is modelled as a label change rather than a controlled reversal.
- **Impact/scenario:** Stock disappears from a branch or a posted wastage deduction is hidden behind a cancelled/rejected document.
- **Why controls missed it:** UI presents actions in expected states, but exported server actions and direct calls are not protected by database state transitions. No ledger-versus-status invariant tests exist.
- **Direction:** Implement locked dispatch, receipt, wastage-post, and reversal RPCs; reject invalid transitions at the database layer.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **unknown**. Tests: every transition pair, multi-line fault injection, retry, and ledger reconciliation. Depends on F-004.

### F-006 — Production posting can partially consume input or create output

- **Severity / confidence / domain:** P0 / Confirmed / Production and inventory.
- **Affected roles/branches:** Kitchen/production posters in assigned branches; downstream inventory/report users.
- **References:** `src/server/actions/production-jobs.ts:302-430`, particularly inserts at `336`, `358`, `376`, `398`, and job update at `414`.
- **Observed:** Availability is read without locks. Usage header, usage lines, output header, output line, job status, document status, activity, and notification are sequential calls. There is no database transaction across them.
- **Expected:** Consumption, output, source job transition, document state, and audit trail must commit or roll back together after locked current-balance validation.
- **Trace/reproduction:** Inject failure after usage insertion or output header insertion; race two posts/outflows against the same ingredients.
- **Root cause:** Production uses direct ledger writes instead of the hardened inventory RPC architecture.
- **Impact/scenario:** Ingredients consumed without finished goods, output created without consumption, wrong header aggregation, or negative ingredient stock.
- **Why controls missed it:** Tests validate route permissions and source structure, not transactional failure points or concurrency.
- **Direction:** One production-post RPC with job/ingredient/balance locks, deterministic source-line keys, and idempotent completion.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **unknown**. Tests: failpoint matrix, duplicate submit, concurrent production/outflow, header/line/source reconciliation. Depends on F-004.

### F-007 — Hardened inventory RPCs retain concurrency and stale-balance defects

- **Severity / confidence / domain:** P1 / Confirmed / Inventory concurrency.
- **Affected roles/branches:** Opening-stock importers, GRN posters, return posters, stock counters.
- **References:** `supabase/migrations/079_inventory_go_live_hardening.sql:100-182`, `184-250`, `252-302`, `334-378`.
- **Observed:** Opening stock checks existence without locking or a unique `(branch_id,item_id,opening_balance)` constraint. GRN posting locks GRN rows, but not PO lines, and increments `qty_received` using draft-time pending quantities. Returns read ledger balance without serializing competing outflows. Stock-count post uses stored `physical_qty - theoretical_qty`; it does not recompute/lock the current ledger balance at posting.
- **Expected:** Competing operations must serialize on the business key and validate current truth inside the transaction.
- **Trace/reproduction:** Concurrent calls can create two opening numbers, over-receive the same PO line, both pass a return/outflow balance check, or post a stale count after intervening movement.
- **Root cause:** Header locking was added, but shared stock/PO business keys were not consistently locked or constrained.
- **Impact/scenario:** Duplicate opening stock, over-receiving, negative stock, or reconciliation to an obsolete theoretical quantity.
- **Why controls missed it:** SQL contract tests verify atomic function presence, not parallel sessions.
- **Direction:** Add business-key uniqueness/advisory locks, lock/revalidate PO and inventory keys, and define stock-count cut-off semantics.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **unknown**. Tests: two-session concurrency for each subcase. Related to F-004 but applies to the DB RPCs themselves.

### F-008 — Purchase-order status transitions accept invalid source states

- **Severity / confidence / domain:** P1 / Confirmed / Procurement and financial integrity.
- **Affected roles/branches:** Purchasing/approvers; all PO branches.
- **References:** `src/server/actions/procurement.ts:538-631`; `supabase/migrations/009_sprint_3_procurement_core.sql:148-157`.
- **Observed:** `updatePoStatus` reads a PO and writes the requested status/document status without an allowed-from-state predicate. Submit, approve, reject, send, cancel, and close wrappers do not supply a transition matrix. PO and linked document updates are separate calls.
- **Expected:** Database-authoritative transitions must enforce expected current states and downstream receipt/invoice constraints.
- **Trace/reproduction:** Invoke approve/close on Draft, approve a Cancelled PO, or cancel a received PO. Direct table policy is permission-only and does not enforce state.
- **Root cause:** PO lifecycle remained an application-level status setter while PR lifecycle moved to an RPC.
- **Impact/scenario:** A received PO can be cancelled while GRN stock remains, or financial/doc status can diverge.
- **Why controls missed it:** UI hides actions by current state; no direct server-action/database negative-transition matrix exists.
- **Direction:** Forward-only PO transition RPC/trigger with row lock, state matrix, downstream checks, and atomic document/activity updates.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **unknown**. Tests: all invalid/valid transitions and concurrent calls. Shares tenant risk with F-001.

### F-009 — PR and PO creation can strand partial drafts on retry

- **Severity / confidence / domain:** P1 / Confirmed / Procurement reliability.
- **Affected roles/branches:** Kitchen/Purchasing/Owner requesters and PO creators.
- **References:** `src/server/actions/procurement.ts:259-334`, `490-529`; migration 051 idempotency key.
- **Observed:** Header, document, lines, linkage, activity, and notifications are multiple calls. PR idempotency can cause a retry to redirect to an already-created header without repairing missing lines/document. PO creation has the same partial composition risk without equivalent repair.
- **Expected:** Draft composition must be atomic or resumable with a completeness invariant.
- **Trace/reproduction:** Fail the document or line insert after header creation, retry with the same PR browser key, and inspect the incomplete draft.
- **Root cause:** Request-level idempotency was added without making the multi-record aggregate transactional.
- **Impact/scenario:** Empty/stranded PR/PO, orphan document, incorrect notification/activity, or blocked workflow.
- **Why controls missed it:** Happy-path tests and migration regex checks do not inject failures between calls.
- **Direction:** Atomic create RPCs or explicit resumable state with repair and uniqueness constraints.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **unknown**. Tests: fail after each write, retry repair, orphan detection.

### F-010 — Document-number RPC can consume another company’s sequence

- **Severity / confidence / domain:** P1 / Confirmed in migration; live grant Needs verification / SECURITY DEFINER.
- **Affected roles/branches:** Anonymous or authenticated callers who know a company UUID/document type; all companies.
- **References:** `supabase/migrations/077_monthly_document_numbering.sql:33-84`.
- **Observed:** `next_document_number` is SECURITY DEFINER, accepts arbitrary `p_company_id`, performs writes, and has no `auth.uid`, staff-company, or permission check. It is granted to authenticated and never explicitly revoked from PUBLIC/anon; PostgreSQL functions default to PUBLIC execute unless changed.
- **Expected:** Only an active staff member in the target company with the workflow permission may consume a number.
- **Trace/reproduction:** Inspect `proacl`, then call the RPC with another company UUID and valid document type in a disposable environment.
- **Root cause:** Atomic numbering focused on counter concurrency but omitted caller/object authorization and grant hygiene.
- **Impact/scenario:** Cross-company numbering gaps, operational denial, and sequence existence probing.
- **Why controls missed it:** Tests validate number format/atomic update, not adversarial caller identity or grants.
- **Direction:** Revoke PUBLIC/anon; derive company from actor or validate target company and a specific permission inside the function.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **no** (consumed gaps remain audit facts). Tests: anon/incomplete/different-company denial and concurrent valid calls.

### F-011 — Exported onboarding helper can accept caller-supplied Auth identity

- **Severity / confidence / domain:** P1 / Probable / Identity and server-action boundary.
- **Affected roles/branches:** Invited/linked staff in any company; an attacker able to invoke the generated server-action endpoint.
- **References:** `src/server/auth/staff-session.ts:1,18-44`.
- **Observed:** A `"use server"` module exports `acceptStaffInviteForUser(userId,email)`. It uses the service client and supplied identity to activate the linked staff and clear password-change flags. Unlike `acceptCurrentStaffInvite`, it does not bind arguments to the current authenticated user.
- **Expected:** Only a non-exported helper or an action that derives `user.id/email` from `auth.getUser()` may accept an invite.
- **Trace/reproduction:** Verify the build’s server-action manifest and attempt a forged action payload in a disposable environment. Static exposure is probable; independent remote reachability was not executed.
- **Root cause:** An internal service helper was exported from a server-action module.
- **Impact/scenario:** A caller with a known Auth UUID/email could activate another linked invite or clear mandatory password setup.
- **Why controls missed it:** Tests call only legitimate wrappers and do not inspect/invoke the action manifest adversarially.
- **Direction:** Keep the service helper private and enforce current-user equality immediately before mutation.
- **Migration / cleanup / tests / dependencies:** Migration **no**. Cleanup **unknown** (review invite acceptance audit). Tests: forged action args and current-user binding.

### F-012 — Temporary password is placed in the URL query string

- **Severity / confidence / domain:** P1 / Confirmed / Credential handling.
- **Affected roles/branches:** Newly created temporary-password staff; all companies.
- **References:** `src/server/actions/foundation.ts:852-880`.
- **Observed:** After account creation the action redirects to `/staffs/{id}?temp_password={password}`.
- **Expected:** Passwords must not appear in URLs, browser history, access logs, analytics, copied links, or referrers.
- **Trace/reproduction:** Create a temporary-password account in a disposable environment and inspect address bar/history/server logs.
- **Root cause:** One-time display state is transported through navigation rather than a non-persistent secure channel.
- **Impact/scenario:** Temporary credentials leak to browser history, screenshots, support logs, or anyone receiving a copied URL before forced change.
- **Why controls missed it:** Tests assert the password is shown once, not that it avoids URL/log surfaces.
- **Direction:** Use a short-lived server-side handoff or immediate protected response state; redact sensitive query keys from logs.
- **Migration / cleanup / tests / dependencies:** Migration **no**. Cleanup **unknown** (log retention review). Tests: URL/history/log redaction.

### F-013 — Generic document and invoice side effects are not state-atomic

- **Severity / confidence / domain:** P1 / Confirmed / Documents and AP traceability.
- **Affected roles/branches:** Document submitters/approvers; Finance invoice users.
- **References:** `src/server/actions/documents.ts:145-257`; `src/server/actions/supplier-invoices.ts:88-168`; migration 060 invoice RPCs.
- **Observed:** Generic submit/approve/reject/post/cancel actions do not require expected current states and update approvals, revisions, document status, and activity through separate requests. Invoice approval/void is atomic for invoice core state, but linked-document/activity updates happen afterward. Evidence count is checked before the approval RPC, not inside it.
- **Expected:** State transition, evidence requirement, linked document, approval step, and audit record must be one state-conditional transaction.
- **Trace/reproduction:** Post/cancel an invalid document state; inject failure after invoice RPC; archive evidence between the app check and approval call.
- **Root cause:** The universal document framework remains an application orchestration layer; later domain RPCs did not absorb all side effects/invariants.
- **Impact/scenario:** Approved invoice with draft document, missing activity, evidence-free approval under a race, or arbitrary document lifecycle jumps.
- **Why controls missed it:** Tests check visible actions/evidence presence and core invoice RPC strings, not transaction boundaries or TOCTOU.
- **Direction:** Domain transition RPCs should own evidence checks and linked document/audit updates; generic actions need a DB state matrix.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **unknown**. Tests: invalid transitions, evidence race, post-RPC failure reconciliation.

### F-014 — Reset and verification runbooks are stale against migrations 078-080

- **Severity / confidence / domain:** P1 / Confirmed / Migration operations and cleanup.
- **Affected roles/branches:** Operators performing controlled reset; all business data.
- **References:** `supabase/maintenance/reset_new_system_data.sql:48-54` (hard ceiling 051); `post_reset_new_system_verification.sql:162-165`; `go_live_full_reset.sql:1,115-121`; `080_branch_scoped_supplier_items.sql:6-20`.
- **Observed:** The older reset refuses any ceiling other than 051. The “current” full reset declares schema through 077 and deletes `supplier_items`/`items` without first deleting new `branch_supplier_items`, whose FKs are `ON DELETE RESTRICT`. Verification does not count the new mapping table.
- **Expected:** Destructive runbooks must pin the exact supported ceiling and include every later FK in preflight, deletion order, and verification.
- **Trace/reproduction:** Apply through 080 in a disposable database, create one branch mapping, and run only inside a rollback transaction; FK restriction should block the script.
- **Root cause:** Operational SQL is version-specific but lacks automated schema-ceiling/FK coverage.
- **Impact/scenario:** A sanctioned reset fails mid-run (transaction rolls back) or an outdated verification falsely claims completeness.
- **Why controls missed it:** Maintenance SQL is not part of build/test execution, and migration 080 contract tests do not exercise reset compatibility.
- **Direction:** Version and test a new forward maintenance script; never edit applied migrations. Include `branch_supplier_items` and all 078-080 invariants.
- **Migration / cleanup / tests / dependencies:** Migration **no**; new runbook **yes**. Cleanup **no** until separately authorized. Tests: fresh-schema rollback reset and expected-zero inventory.

### F-015 — Permission-alias deny semantics can reject valid alternative permissions

- **Severity / confidence / domain:** P2 / Confirmed / Authorization reliability.
- **Affected roles/branches:** Staff with per-user overrides; any branch.
- **References:** `supabase/migrations/055_sprint_7_7_office_admin_role_correction.sql:31-59`; `052_sprint_7_5_staff_permission_overrides.sql:39-89`.
- **Observed:** `has_any_permission(codes[])` returns false if any matching override is `deny`, before checking a granted alternative code. Many callers pass old/new aliases as alternatives.
- **Expected:** A deny should override the same permission, not unrelated aliases in an “any of” check, unless alias groups are explicitly canonicalized.
- **Trace/reproduction:** Grant `pr.create`, deny `purchase_request.create`, then call `has_any_permission(array['pr.create','purchase_request.create'])`.
- **Root cause:** Override aggregation loses the permission code and applies one deny to the whole requested set.
- **Impact/scenario:** Valid users are unexpectedly blocked, encouraging unsafe broad grants/override removal.
- **Why controls missed it:** No mixed allow/deny alias test exists.
- **Direction:** Canonicalize permission aliases or evaluate effective permission per code before `bool_or`.
- **Migration / cleanup / tests / dependencies:** Migration **yes**. Cleanup **no**; override review **yes**. Tests: alias combinations and Owner semantics.

### F-016 — Staff email matching rejects a valid current identity when one stored alias is stale

- **Severity / confidence / domain:** P2 / Confirmed / Identity availability.
- **Affected roles/branches:** Staff with both `email` and `invite_email`; all branches.
- **References:** `src/server/auth/staff-session.ts:46-62,99-102`; similar exact-match logic in migration 076 lines 48-50.
- **Observed:** The code fails when `staffEmails.some(value => value !== normalized)`. Therefore one matching email plus one stale alias is rejected.
- **Expected:** At least one authoritative stored email should match, with a separate ambiguity/staleness repair rule.
- **Trace/reproduction:** Set `email` to the Auth email and retain a different legacy `invite_email`; request password setup/login context.
- **Root cause:** “All values equal” logic was used for an “any valid identity match” decision.
- **Impact/scenario:** Legitimate linked staff cannot complete onboarding or sign in until Owner repair.
- **Why controls missed it:** Fixtures keep the two email fields identical.
- **Direction:** Define one canonical email or compare with `some(value === normalized)` plus an audited stale-alias repair path.
- **Migration / cleanup / tests / dependencies:** Migration **unknown**. Cleanup **possibly** for stale aliases. Tests: null, one match/one stale, ambiguity, disabled staff.

### F-017 — Tests pass while critical transactional and isolation invariants remain unexecuted

- **Severity / confidence / domain:** P2 / Confirmed / Quality assurance.
- **Affected roles/branches:** All workflows.
- **References:** `package.json:6-13`; `tests/*.test.js`; `tests/sql/*`; `tests/e2e/*`; `playwright.config.js:19-31`.
- **Observed:** The 164 passing tests are predominantly source-contract/regex assertions. SQL validations and Playwright suites are separate, and the latter defaults to a deployed URL. There is no default two-company RLS test, parallel-session concurrency suite, database failpoint test, or reset compatibility test.
- **Expected:** Release gates must execute the business invariants that source inspection cannot prove.
- **Trace/reproduction:** Compare the passing suite to F-001 through F-014; the defects coexist with a green build.
- **Root cause:** The test strategy optimized rapid structural regression checks but did not add database integration/fault tests as workflows became transactional.
- **Impact/scenario:** Green CI can authorize a release containing cross-company exposure or partial ledger writes.
- **Why controls missed it:** This finding describes the gap itself.
- **Direction:** Add disposable local Supabase integration stages, rollback fixtures, parallel sessions, and a read-only deployed smoke stage separated from mutation suites.
- **Migration / cleanup / tests / dependencies:** Migration **no**. Cleanup **no**. Regression suite required for every P0/P1 finding.

### F-018 — Release and role documentation contradict the implemented baseline

- **Severity / confidence / domain:** P2 / Confirmed / Documentation and release control.
- **Affected roles/branches:** Operators and reviewers; especially Manager scope.
- **References:** `README.md:11-12`; `PRODUCT.md:82,87,153`; `DEPLOYMENT.md:510`; `ARCHITECTURE.md:196,708`; `src/lib/app-version.ts:1-3`; `package.json:3`.
- **Observed:** README/Product/Deployment claim `v0.2.29 / Sprint 7.21` and ceiling 065, while UI is `7.23.5.9` and migrations reach 080. Architecture still says Manager is assigned-branch at two locations, contradicting Product and migration 075. Package version is a third value (`0.2.15`).
- **Expected:** One release identity and one authoritative six-role scope model.
- **Trace/reproduction:** Compare the cited lines.
- **Root cause:** Sprint appendices accumulated without updating baseline summaries and architecture sections.
- **Impact/scenario:** Wrong migration/deployment gates, incorrect Manager testing, and audit ambiguity.
- **Why controls missed it:** Contract tests assert the UI footer but do not reconcile all authoritative documents/package metadata.
- **Direction:** In a documentation-only remediation, declare the canonical release and rewrite stale baseline/scope statements; preserve historical notes as dated history.
- **Migration / cleanup / tests / dependencies:** Migration **no**. Cleanup **no**. Test: documentation-release consistency check.

### F-019 — Production diagnostics are fragmented and lack correlation/error boundaries

- **Severity / confidence / domain:** P2 / Confirmed / Observability and resilience.
- **Affected roles/branches:** All users and operators.
- **References:** 37 `console.error/warn/log` call sites under `src`; no `src/app/error.tsx` or `global-error.tsx`; `package.json` contains Speed Insights but no error/trace SDK.
- **Observed:** Errors are often converted to generic UI messages (good for leakage control), but server diagnostics are plain console calls without request/actor/company/source correlation. There is no app-level error boundary in the App Router.
- **Expected:** Sensitive-safe structured diagnostics, correlation IDs, workflow/source identifiers, and recoverable error boundaries.
- **Trace/reproduction:** Search cited patterns and simulate an unexpected server-render failure in a disposable environment.
- **Root cause:** UX error sanitization was implemented without a matching structured operational telemetry layer.
- **Impact/scenario:** Partial workflow failures are difficult to reconstruct; generic fatal rendering can strand users without a recovery path.
- **Why controls missed it:** Tests assert generic messages, not diagnostic completeness or redaction.
- **Direction:** Add structured redacted logging and error boundaries; define retention/access and never log credentials/form bodies.
- **Migration / cleanup / tests / dependencies:** Migration **no**. Cleanup **no**. Tests: error boundary, correlation propagation, sensitive-field redaction.

### F-020 — Ignored production backup artifacts remain under the workspace

- **Severity / confidence / domain:** P2 / Confirmed / Data handling.
- **Affected roles/branches:** Local workstation users; backup contains multi-domain production identifiers and stored attachment bytes.
- **References:** `.gitignore:47`; ignored directory `outputs/go-live-backup-2026-07-20T10-25-09-949Z` (19 files, about 7.0 MB).
- **Observed:** The artifacts are correctly ignored and not tracked, but include purge manifests, storage inventory, SQL, and downloaded objects inside the project tree. No repository evidence establishes encryption, retention, or secure deletion policy.
- **Expected:** Production exports should live in an access-controlled encrypted backup location with documented retention, not an ordinary developer workspace.
- **Trace/reproduction:** `git check-ignore -v` and aggregate file metadata only; contents need not be exposed.
- **Root cause:** Operational evidence and source workspace share a filesystem location.
- **Impact/scenario:** Workstation backup/sync/malware or accidental archive can disclose operational data.
- **Why controls missed it:** `.gitignore` prevents commits but is not a data-protection control.
- **Direction:** Inventory, transfer to approved encrypted storage, set retention, then separately authorize secure deletion. Do not delete during remediation without owner confirmation.
- **Migration / cleanup / tests / dependencies:** Migration **no**. Cleanup **yes, separately authorized**. Test/process: backup handling checklist.

### F-021 — Undefined design token causes inconsistent select/file-input radius

- **Severity / confidence / domain:** P3 / Confirmed / UI consistency.
- **Affected roles/branches:** All users on forms using select/file input.
- **References:** `src/app/globals.css:127,137`; `src/components/urgency-select.tsx:11`; `src/components/ui/select-control.tsx:53`.
- **Observed:** Components use `--sb-radius-control`, but `:root` defines `--sb-panel-radius` and `--radius`, not `--sb-radius-control`. Invalid `var()` values can drop the property.
- **Expected:** All controls use a defined square operational radius token.
- **Trace/reproduction:** Inspect computed `border-radius` on the cited controls.
- **Root cause:** Token rename was not propagated.
- **Impact/scenario:** Minor cross-browser visual inconsistency; no functional loss.
- **Why controls missed it:** Impeccable’s static detector returned no findings and current UI contracts do not resolve custom-property definitions.
- **Direction:** Define or replace the token during the UI cleanup wave.
- **Migration / cleanup / tests / dependencies:** Migration **no**. Cleanup **no**. Test: computed-style design-token check.

## 7. Root-cause clusters

1. **Authorization by capability without object scope:** F-001, F-003, F-010, and parts of F-013 authorize a verb but not the target company/branch/record.
2. **Service-role use as an application data layer:** F-002/F-003 bypass RLS without recreating its tenant predicates.
3. **Application orchestration mistaken for a transaction:** F-004, F-005, F-006, F-008, F-009, and F-013 perform business aggregates through sequential requests.
4. **Idempotency at the wrong granularity:** Unique header numbers do not guarantee complete header/line/source aggregates.
5. **Additive migrations without effective-state reconciliation:** F-001, F-010, F-014, and F-018 reflect policy/grant/runbook/document drift.
6. **Structural tests substituted for behavioral database tests:** F-017 explains why severe defects coexist with green checks.

## 8. Legacy fallback/helper consolidation inventory

| Path/helper | Classification | Evidence and required verification |
|---|---|---|
| Mock mode (`isMockMode`) | Retain for local UI fixtures; harden configuration | It requires explicit non-production configuration and no Supabase env, so no confirmed production bypass. Keep a production-start assertion. |
| `createInventoryMovement` plus direct stock actions | Replace after migration | F-004; call sites are transfer/wastage and other direct movement flows. Remove only after every caller uses canonical RPCs and historical headers/lines are reconciled. |
| `getCurrentBalance` and SQL balance views | Consolidate | The helper sums header quantities while canonical views may use lines/fallback. Establish one DB balance function keyed by company/branch/location/item. |
| `getDefaultCompanyId` first-row fallback | Deprecate from authenticated writes | Currently used by import fallbacks, but permission checks normally require a profile. Replace with explicit active identity; retain only for controlled bootstrap if documented. |
| `getCompanyBranding` first company | Retain only for signed-out generic branding or replace with host/company resolution | Do not let first-row ordering become tenant context. |
| `staff_locations` compatibility mapping | Remove after data/call-site proof | Migration 073 labels it compatibility. Keep until all queries and historical assignments use `staff_branches` and verification finds no consumers. |
| Compatibility route redirects (`/locations`, `/roles`, `/stock-balances`, `/data-onboarding`, `/settings/backups`, etc.) | Retain short term, then deprecate | They provide finite canonical redirects and are covered by tests. Remove only after links/bookmarks/analytics show no use. |
| Legacy attachment `file_url` redirect | Deprecate after storage inventory | Retain for historical files; validate host allowlist and migrate metadata before removal. |
| Old reset scripts pinned to 051 | Archive as historical, do not execute | F-014. Name them with explicit ceiling or move to historical runbook storage after a current replacement is verified. |
| Root ignored debug scripts/logs and runtime screenshots | Clean under separate artifact policy | They are ignored, not application paths. Preserve required audit evidence; remove only with owner-approved retention rules. |

## 9. Historical-data verification and cleanup requirements

No cleanup was run. The following are **detection requirements**, not evidence that rows exist:

| Risk | Code defect? | Data query required? | Cleanup authority |
|---|---|---|---|
| Cross-company documents, staff access, roles/branches | Yes (F-001/F-003) | Yes | Controlled data migration after ownership is resolved |
| Header-only or line-mismatched ledger | Yes (F-004) | Yes | Reconstruct/reverse with finance/inventory sign-off; never delete blindly |
| Cancelled/rejected transfer or wastage with posted movement | Yes (F-005) | Yes | Post explicit reversal or correct document state based on evidence |
| Partial production usage/output | Yes (F-006) | Yes | Reconcile job, ingredient/output movements, and physical stock |
| Duplicate opening stock | Yes (F-007) | Yes | Determine authoritative opening event; reverse extras |
| Over-received PO / returned beyond available | Yes (F-007) | Yes | Procurement and inventory joint review |
| Invalid PO/document/invoice state combinations | Yes (F-008/F-013) | Yes | State correction with audit record; do not rewrite ledger history |
| Partial PR/PO aggregates | Yes (F-009) | Yes | Repair missing children/doc links or cancel with reason |
| Stale email aliases / cross-company staff branches | Yes (F-003/F-016) | Yes | Owner-approved identity repair |
| Missing branch supplier mappings | Limitation/history | Yes | Backfill through a controlled branch-specific mapping migration/import |
| Local backup artifacts | Operational | Inventory already confirmed | Separate encrypted-retention and deletion approval |

## 10. UI/UX audit and Impeccable results

Impeccable was actually used. Its source detector returned zero findings. Manual review covered all 110 page files by route group and the shared shell/control layer.

### Route-group coverage

- Identity/access: root, login, forgot/set/change password, access status, setup, account.
- Core shell/workdesks: dashboard, activity, administration, company, branches, staffs, roles, document sequences, settings compatibility routes.
- Master data/imports: items, suppliers, supplier items, products, recipes, UOM conversions, imports, opening stock, cleanup.
- Procurement/AP: procurement hubs, PR, PO, GRN, returns, supplier invoices, AP aging, cash flow.
- Inventory/production: inventory, low stock, stock balance/card/transactions/counts/transfers/wastage, production jobs/planning/variance, outlet daily records.
- Documents/reports: universal documents, costing readiness, demand trend, procurement variance, product margin, recipe costing.

### Positive evidence

- Deep-green desktop sidebar, topbar after sidebar, left breadcrumbs, right search/update/account region, and responsive mobile sidebar are implemented in shared components.
- The right console and mobile action sheet are shared rather than page-specific duplicates.
- Compact control heights, square buttons, sticky table action columns, responsive filter sheets, focus-visible treatment, and `prefers-reduced-motion` support are present.
- Impeccable found no detectable typography/layout anti-patterns in source.
- Build and contract tests cover canonical route redirects, A/B/C document skeletons, mobile action placement, and many empty/zero-safe lists.

### UI issues and limits

- F-021 is the one confirmed visual token defect.
- Permission-denied and generic error copy is generally safe, but F-019 means unexpected render failures lack a central recovery surface.
- UI action hiding is not a security/state boundary; F-005, F-008, and F-013 show server/database transition gaps.
- Live responsive, keyboard, loading, error, and stale-after-mutation states were not re-executed in this audit. Existing ignored screenshots and prior QA evidence are not a substitute for a fresh release gate.
- No decorative redesign is recommended. Remediation should preserve current shell density and reduce operational ambiguity only.

## 11. Test and observability gaps

Required additions, mapped to release blockers:

1. Two-company, six-role, assigned/unassigned-branch direct table/RPC matrix (F-001-F-003).
2. PUBLIC/anon/authenticated function grant tests for every SECURITY DEFINER function (F-010/F-011).
3. Parallel-session tests for opening stock, GRN, return, count, production, transfer, and wastage (F-004-F-007).
4. Failpoint tests after every write in multi-record workflows (F-004-F-006, F-009, F-013).
5. Complete invalid state-transition matrices for PO, transfer, wastage, document, and invoice evidence (F-005/F-008/F-013).
6. Historical malformed-row fixtures and reconciliation-query assertions.
7. Fresh-schema migration replay through 080 plus maintenance-script rollback test (F-014).
8. Playwright split into read-only deployed smoke and disposable mutation suites; cover pending/double-submit, stale UI, permission denial, mobile Kitchen/Outlet, keyboard, and error boundaries.
9. Structured logging tests that prove credentials, tokens, full FormData, and attachment URLs are redacted (F-012/F-019).

## 12. Recommended remediation waves

### Wave 0 — Containment of P0 risks

- Suspend multi-company claims and production release.
- Temporarily disable or tightly restrict system backup, direct manual stock posting, production posting, transfer/wastage posting/cancellation until scoped fixes are deployed.
- Preserve logs and backup-access evidence; do not mutate historical business rows.

### Wave 1 — Identity, authorization, company, and branch context

- Canonical effective-policy/grant migration for every table/view/RPC.
- Replace service-role object access with actor-company-scoped RPCs.
- Fix onboarding action binding, password URL transport, alias semantics, and per-company Owner protection.

### Wave 2 — Ledger, posting, idempotency, and concurrency

- One authoritative movement/posting architecture with locks, source-line uniqueness, state predicates, and atomic audit/document updates.
- Port production, transfer, wastage, and manual adjustment flows.
- Close migration-079 concurrency gaps.

### Wave 3 — Historical detection and controlled cleanup

- Run Appendix A read-only in production and export only aggregates/IDs to an approved secure location.
- Approve each repair/reversal class with operational owners; preserve an immutable reconciliation record.

### Wave 4 — Helper/fallback consolidation

- Remove direct ledger and default-company helpers after call-site proof.
- Replace stale reset runbooks; date/archive legacy redirects and compatibility mappings only after usage/data verification.

### Wave 5 — UI/UX consistency and feedback

- Fix the token, add error boundaries, and align pending/success/failure surfaces with the corrected atomic APIs.
- Preserve the verified shell, density, color discipline, and mobile action model.

### Wave 6 — Regression, observability, and final release verification

- Execute fresh-schema, two-company, concurrency, failpoint, historical-data, read-only browser, and disposable mutation gates.
- Rerun the deferred deep security scan with at least six usable workers.
- Reconcile documentation/version/migration ceiling and obtain explicit production authorization.

## 13. Release gates

Release remains blocked until all are true:

- [ ] Every P0 is remediated and independently regression-tested.
- [ ] Effective live RLS policy/table-grant/function-grant inventory shows no unintended PUBLIC or cross-company path.
- [ ] Backup archive content is proven company-scoped.
- [ ] All service-role actions prove actor company and target ownership.
- [ ] Inventory workflows pass concurrent, retry, and failpoint tests with zero partial ledger effects.
- [ ] Read-only historical queries are reviewed; any cleanup/reversal has a separately approved plan.
- [ ] Fresh migrations 001-080 replay and the current maintenance runbook rollback test pass.
- [ ] Six-role, two-company, assigned/unassigned branch matrix passes.
- [ ] Read-only browser smoke and disposable mutation E2E pass at desktop/tablet/mobile sizes.
- [ ] Structured diagnostics and error recovery are deployed and credential redaction is tested.
- [ ] Product/Architecture/Deployment/README/package/UI release identity is reconciled.
- [ ] Deferred deep security scan is rerun and its validated findings are merged/deduplicated with this report.
- [ ] Worktree, deployment commit, and production migration ceiling are pinned for final sign-off.

## Appendix A — Read-only diagnostic queries

Run with a role authorized for audit metadata/data. Save outputs securely. These queries do not repair anything.

```sql
begin transaction read only;
set local statement_timeout = '60s';

-- A1. Live migration ceiling.
select version
from supabase_migrations.schema_migrations
order by version desc;

-- A2. Effective permissive RLS policies and always-true predicates.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    regexp_replace(coalesce(qual, ''), '\\s', '', 'g') in ('true','(true)')
    or regexp_replace(coalesce(with_check, ''), '\\s', '', 'g') in ('true','(true)')
  )
order by tablename, cmd, policyname;

-- A3. SECURITY DEFINER functions and execute grants.
select n.nspname as schema_name,
       p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef,
       p.proconfig,
       coalesce(array_to_string(p.proacl, ','), '<default PUBLIC execute>') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname, arguments;

-- A4. Company-bearing rows whose parent belongs to another company.
select 'location_branch_company' as defect, l.id, l.company_id as child_company, b.company_id as parent_company
from public.locations l join public.branches b on b.id = l.branch_id
where l.company_id is distinct from b.company_id
union all
select 'staff_default_branch_company', s.id, s.company_id, b.company_id
from public.staffs s join public.branches b on b.id = s.default_branch_id
where s.company_id is distinct from b.company_id
union all
select 'staff_branch_company', sb.staff_id, s.company_id, b.company_id
from public.staff_branches sb
join public.staffs s on s.id = sb.staff_id
join public.branches b on b.id = sb.branch_id
where s.company_id is distinct from b.company_id;

-- A5. Staff identity/membership anomalies.
select s.id, s.staff_code, s.company_id, s.auth_user_id, s.status,
       count(sr.id) filter (where sr.effective_from <= current_date and (sr.effective_to is null or sr.effective_to >= current_date)) as active_roles,
       count(sb.id) as branch_assignments
from public.staffs s
left join public.staff_roles sr on sr.staff_id = s.id
left join public.staff_branches sb on sb.staff_id = s.id
where s.deleted_at is null
group by s.id
having s.auth_user_id is null
    or count(sr.id) filter (where sr.effective_from <= current_date and (sr.effective_to is null or sr.effective_to >= current_date)) <> 1
    or (s.status = 'active' and count(sb.id) = 0);

select auth_user_id, count(*)
from public.staffs
where auth_user_id is not null and deleted_at is null
group by auth_user_id
having count(*) > 1;

-- A6. Orphan or incomplete posted ledger aggregates.
select st.id, st.transaction_no, st.transaction_type, st.status,
       count(stl.id) as line_count
from public.stock_transactions st
left join public.stock_transaction_lines stl on stl.stock_transaction_id = st.id
where st.status = 'posted'
group by st.id
having count(stl.id) = 0;

select stl.id, stl.stock_transaction_id
from public.stock_transaction_lines stl
left join public.stock_transactions st on st.id = stl.stock_transaction_id
where st.id is null;

select st.id, st.transaction_no, st.item_id as header_item, stl.item_id as line_item,
       st.location_id as header_location, stl.location_id as line_location,
       st.branch_id as header_branch, stl.branch_id as line_branch
from public.stock_transactions st
join public.stock_transaction_lines stl on stl.stock_transaction_id = st.id
where st.item_id is distinct from stl.item_id
   or st.location_id is distinct from stl.location_id
   or coalesce(st.branch_id, stl.branch_id) is distinct from coalesce(stl.branch_id, st.branch_id);

-- A7. Duplicate source movements and duplicate opening stock.
select reference_type, reference_id, item_id, location_id, transaction_type, count(*) as movement_count,
       array_agg(transaction_no order by transaction_no) as numbers
from public.stock_transactions
where status = 'posted' and reference_type is not null and reference_id is not null
group by reference_type, reference_id, item_id, location_id, transaction_type
having count(*) > 1;

select branch_id, item_id, count(*) as opening_count,
       array_agg(transaction_no order by transaction_date, created_at) as numbers
from public.stock_transactions
where status = 'posted' and transaction_type = 'opening_balance'
group by branch_id, item_id
having count(*) > 1;

-- A8. Documents marked posted with no matching ledger and ledger without a source document.
select d.id, d.document_no, d.document_type, d.related_entity_type, d.related_entity_id
from public.documents d
left join public.stock_transactions st on st.document_id = d.id and st.status = 'posted'
where d.status = 'posted'
  and d.document_type in ('goods_receiving','purchase_return','stock_count','stock_transfer','stock_wastage','production_job','stock_transaction','opening_balance')
group by d.id
having count(st.id) = 0;

select st.id, st.transaction_no, st.reference_type, st.reference_id, st.document_id
from public.stock_transactions st
left join public.documents d on d.id = st.document_id
where st.status = 'posted'
  and (st.document_id is null or d.id is null);

-- A9. Cancelled/rejected operational records that still have posted movements.
select 'transfer' as source_type, t.id, t.transfer_no as source_no, t.status, count(st.id) as movements
from public.stock_transfers t
join public.stock_transactions st on st.reference_type = 'stock_transfer' and st.reference_id = t.id and st.status = 'posted'
where t.status in ('cancelled','rejected')
group by t.id
union all
select 'wastage', w.id, w.wastage_no, w.status, count(st.id)
from public.stock_wastage w
join public.stock_transactions st on st.reference_type = 'stock_wastage' and st.reference_id = w.id and st.status = 'posted'
where w.status in ('cancelled','rejected')
group by w.id;

-- A10. Production usage/output completeness.
select pj.id, pj.production_job_no, pj.status,
       count(st.id) filter (where st.transaction_type = 'production_usage') as usage_headers,
       count(st.id) filter (where st.transaction_type = 'production_output') as output_headers
from public.production_jobs pj
left join public.stock_transactions st
  on st.reference_type = 'production_job' and st.reference_id = pj.id and st.status = 'posted'
group by pj.id
having (pj.status = 'posted' and (
          count(st.id) filter (where st.transaction_type = 'production_usage') = 0
       or count(st.id) filter (where st.transaction_type = 'production_output') = 0))
    or (pj.status <> 'posted' and count(st.id) > 0);

-- A11. PO/GRN quantity integrity.
select pol.id, po.po_no, pol.qty_ordered, pol.qty_received, pol.qty_cancelled
from public.purchase_order_lines pol
join public.purchase_orders po on po.id = pol.purchase_order_id
where coalesce(pol.qty_received,0) + coalesce(pol.qty_cancelled,0) > pol.qty_ordered;

select grl.id, gr.grn_no, grl.received_qty, grl.rejected_qty, grl.pending_qty, grl.returned_qty
from public.goods_receiving_lines grl
join public.goods_receivings gr on gr.id = grl.goods_receiving_id
where grl.received_qty + grl.rejected_qty > grl.pending_qty
   or grl.returned_qty > grl.received_qty;

-- A12. Cross-document company/branch mismatches in the procurement chain.
select 'po_vs_pr' as entity, po.id as downstream_id, pr.id as upstream_id,
       po.company_id as downstream_company, pr.company_id as upstream_company,
       po.branch_id as downstream_branch, pr.branch_id as upstream_branch
from public.purchase_orders po
join public.purchase_requests pr on pr.id = po.purchase_request_id
where po.company_id is distinct from pr.company_id or po.branch_id is distinct from pr.branch_id
union all
select 'grn_vs_po', gr.id, po.id, gr.company_id, po.company_id, gr.branch_id, po.branch_id
from public.goods_receivings gr
join public.purchase_orders po on po.id = gr.purchase_order_id
where gr.company_id is distinct from po.company_id or gr.branch_id is distinct from po.branch_id
union all
select 'return_vs_grn', prt.id, gr.id, prt.company_id, gr.company_id, prt.branch_id, gr.branch_id
from public.purchase_returns prt
join public.goods_receivings gr on gr.id = prt.goods_receiving_id
where prt.company_id is distinct from gr.company_id or prt.branch_id is distinct from gr.branch_id;

-- A13. Missing active branch supplier mappings on active PR/PO lines.
select 'purchase_request' as entity, pr.id as header_id, pr.branch_id, prl.id as line_id,
       prl.item_id, prl.suggested_supplier_id as supplier_id
from public.purchase_requests pr
join public.purchase_request_lines prl on prl.purchase_request_id = pr.id
where pr.status not in ('cancelled','rejected')
  and prl.suggested_supplier_id is not null
  and not exists (
    select 1 from public.branch_supplier_items bsi
    join public.supplier_items si on si.id = bsi.supplier_item_id
    where bsi.branch_id = pr.branch_id and bsi.item_id = prl.item_id
      and si.supplier_id = prl.suggested_supplier_id
      and bsi.status = 'active' and bsi.deleted_at is null
  )
union all
select 'purchase_order', po.id, po.branch_id, pol.id, pol.item_id, po.supplier_id
from public.purchase_orders po
join public.purchase_order_lines pol on pol.purchase_order_id = po.id
where po.status not in ('cancelled','rejected','closed')
  and not exists (
    select 1 from public.branch_supplier_items bsi
    join public.supplier_items si on si.id = bsi.supplier_item_id
    where bsi.branch_id = po.branch_id and bsi.item_id = pol.item_id
      and si.supplier_id = po.supplier_id
      and bsi.status = 'active' and bsi.deleted_at is null
  );

-- A14. UOM conversion defects.
select id, item_id, from_uom, to_uom, factor, status
from public.uom_conversions
where factor is null or factor <= 0
   or lower(trim(from_uom)) = lower(trim(to_uom));

select item_id, lower(trim(from_uom)) as from_uom, lower(trim(to_uom)) as to_uom, count(*)
from public.uom_conversions
where status = 'active' and deleted_at is null
group by item_id, lower(trim(from_uom)), lower(trim(to_uom))
having count(*) > 1;

-- A15. Null scope and invalid state aggregates.
select 'purchase_requests_null_company_or_branch' as check_name, count(*) as row_count
from public.purchase_requests where company_id is null or branch_id is null
union all select 'purchase_orders_null_company_or_branch', count(*) from public.purchase_orders where company_id is null or branch_id is null
union all select 'goods_receivings_null_company_or_branch', count(*) from public.goods_receivings where company_id is null or branch_id is null
union all select 'stock_transactions_null_branch', count(*) from public.stock_transactions where status = 'posted' and branch_id is null
union all select 'documents_null_company', count(*) from public.documents where company_id is null;

-- A16. Balance comparison independently re-aggregated from ledger lines/header fallback.
with recomputed as (
  select coalesce(stl.item_id, st.item_id) as item_id,
         coalesce(stl.branch_id, st.branch_id) as branch_id,
         coalesce(stl.location_id, st.location_id) as location_id,
         sum(coalesce(stl.quantity_in, st.quantity_in) - coalesce(stl.quantity_out, st.quantity_out)) as qty
  from public.stock_transactions st
  left join public.stock_transaction_lines stl on stl.stock_transaction_id = st.id
  where st.status = 'posted'
  group by 1,2,3
)
select coalesce(r.item_id, v.item_id) as item_id,
       coalesce(r.branch_id, v.branch_id) as branch_id,
       coalesce(r.location_id, v.location_id) as location_id,
       r.qty as recomputed_qty, v.current_stock as view_qty
from recomputed r
full join public.stock_balances_view v
  on v.item_id = r.item_id and v.branch_id is not distinct from r.branch_id
 and v.location_id is not distinct from r.location_id
where coalesce(r.qty,0) is distinct from coalesce(v.current_stock,0);

rollback;
```

## Appendix B — Evidence summary

- Migration 075 correctly makes Manager PR visibility company-wide and treats branch assignment as default context.
- Migration 078 provides atomic, optimistic-concurrency PR draft editing and prevents branch changes/mixed-branch lines.
- Migration 079 revokes direct authenticated execution of its internal movement writer and hardens opening stock, GRN, return, and count paths, but F-007 remains.
- Migration 080 adds branch-scoped supplier mappings, preferred-mapping uniqueness, RLS, an atomic save RPC, and PR/PO mapping triggers.
- `set search_path` is present on reviewed SECURITY DEFINER functions; the remaining primary risk is grants and missing internal object authorization, not a broad missing-search-path pattern.
- The final report is the only intentional source-tree file created by this audit. No remediation was started.

---

**Audit stop:** Await review and authorization for a separate remediation phase. Do not apply fixes, migrations, cleanup, or deployment from this report without a new controlled task.
