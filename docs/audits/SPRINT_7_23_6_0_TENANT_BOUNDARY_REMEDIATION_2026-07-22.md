# Sprint 7.23.6.0 — Tenant Boundary Closure Remediation

Date: 2026-07-22  
Mode: P0 remediation under feature freeze  
Outcome: **Fixed locally; awaiting review.**  
Findings: F-001, F-002, F-003 only

## Baseline and safety record

- Repository: `D:\0 Data\Seri Bako\Seri Bako OMS\seri-bako-oms`
- Branch: `main`
- Baseline and current HEAD: `bfa36a882b876ead0389170dc0c0087a0c060beb`
- Initial migration ceiling: `080_branch_scoped_supplier_items.sql`
- Initial visible version: `v7.23.5.9`
- Final migration ceiling: `081_tenant_boundary_closure.sql`
- Final visible version: `v7.23.6.0`
- Final release note: `Sprint 7.23.6.0 — Tenant Boundary Closure`
- The pre-existing untracked `docs/audits/FULL_SYSTEM_CLOSURE_AUDIT_2026-07-22.md` was preserved.
- No other active editor was found in this worktree.
- No production database was queried or mutated. No deployment, commit, push, historical-data cleanup, or work on F-004/F-005/F-006 occurred.
- Only the disposable local Supabase database was reset for the required clean migration replay.

The requested security scan was explicitly skipped at the user's direction. This is recorded as a deferred/failed verification item for this round and must be rerun in the next round; it is not represented as passing and was not used as a substitute for the behavioral tests below.

## Pre-fix reproducer

Before the fix, an authenticated active Company-A staff identity could select Company B from `public.companies` through the legacy `companies read` policy whose effective predicate was `USING (true)`. The reproducer ran inside a disposable local transaction and was rolled back. After migration 081, the two-company suite proves only the actor's company is returned and cross-company update, delete, and forged insert attempts leave Company-B state unchanged.

## Files changed

### Production and migration

- `supabase/migrations/081_tenant_boundary_closure.sql`
- `src/server/auth/tenant-actor.ts`
- `src/server/backup/export.ts`
- `src/server/actions/foundation.ts`
- `src/server/actions/items.ts`
- `src/server/actions/products.ts`
- `src/server/actions/suppliers.ts`
- `src/server/actions/master-data.ts`
- `src/server/actions/production-jobs.ts`
- `src/app/api/items/quick-create/route.ts`
- `src/app/api/imports/confirm/route.ts`
- `src/lib/supabase/loose.ts`
- `src/types/database.ts`
- `src/lib/app-version.ts`

`src/app/api/backups/system/route.ts` was reviewed and did not require a change: it accepts only log/attachment inclusion flags and has no caller-selectable company parameter.

### Behavioral and regression tests

- New: `tests/sql/tenant-boundary-closure-local-validation.sql`
- New: `tests/e2e/tenant-backup-isolation-local.spec.js`
- New: `tests/tenant-boundary-closure-contract.test.js`
- Updated local SQL fixtures: migration 075/Sprint 7.23.5.1, 078, 079, and 080 validations
- Updated opening-stock local HTTP fixture for tenant-owned masters
- Updated current-version assertions across the existing contract and E2E suites

## Migration identity

- Filename: `supabase/migrations/081_tenant_boundary_closure.sql`
- SHA-256: `dfbcec7a20b3f12a7eef07a306d7f48a129d3048a3296689117e115df6f2ca0f`
- Forward-only: yes; migrations 001–080 were not edited
- Clean replay: 001 through 081 passed
- Legacy master backfill: automatic only for an unambiguous single-company installation. A multi-company database with unowned legacy masters stops with SQLSTATE `23514` rather than guessing ownership.

## F-001 — Canonical tenant boundary

Migration 081 adds required `company_id` ownership to items, products, suppliers, supplier items, and UOM conversions; makes those columns non-null; replaces global active-code/UOM uniqueness with company-scoped uniqueness; and adds composite company foreign keys for master relationships.

The migration explicitly drops 147 policy names from the effective post-080 inventory. It does not use dynamic policy deletion. It then creates 78 canonical `tenant ...` policies:

- Identity/access: `tenant companies read/update`, `tenant permissions global reference`, `tenant profiles own`, `tenant branches read/insert/update`, `tenant locations read/manage`, `tenant staffs read/insert/update`, `tenant roles read/manage`, and tenant read policies for role permissions, staff roles, staff branches, staff locations, and staff overrides.
- Masters/mappings: tenant read/manage policies for items, products, suppliers, supplier items, UOM conversions, packaging, and barcode mappings; plus tenant branch-supplier mapping read.
- Audit/support: tenant activity logs, audit logs, attachment read/manage, document read/manage, document comments, document revisions, approvals, approval steps, document sequences/periods, notifications, notification recipients, user preferences, and deletion-tombstone read.
- Operational parents and children: tenant recipes/lines/snapshots, production jobs/ingredient/output lines, purchase requests/lines, purchase orders/lines, goods receivings/lines, purchase returns/lines, stock counts/lines, stock-transactions/lines read, transfers/lines, wastage/lines, supplier invoices/lines/payments, and outlet daily records/lines.

The exact 147 `(table, policy name)` drops and all 78 exact creates are the reconciliation blocks in migration 081. Final local catalog evidence:

- Public policies: 78
- Literal `USING (true)` / `WITH CHECK (true)`: 0
- Superseded non-`tenant ...` policy names: 0
- Public SECURITY DEFINER functions: 61
- SECURITY DEFINER functions with unsafe/missing fixed path: 0
- PUBLIC/anon execute grants on SECURITY DEFINER functions: 0
- anon table grants in `public`: 0
- SECURITY DEFINER functions explicitly executable by `authenticated`: 54

All public SECURITY DEFINER functions are reconciled to `search_path = pg_catalog, public` and lose PUBLIC/anon execution. The migration explicitly preserves the authenticated application RPC surface. The six new callable helpers/RPCs are:

- `current_staff_id()`
- `current_staff_company_id()`
- `current_staff_has_company_role(text[])`
- `can_access_company_branch(uuid, uuid)`
- `can_access_inventory_branch(uuid, uuid)`
- `replace_staff_access_atomic(uuid, uuid, uuid, uuid[])`

Each is revoked from PUBLIC/anon and granted to `authenticated`. Four tenant-integrity trigger functions for staff-role, staff-branch, staff-location, and branch-supplier-item relationships are revoked from PUBLIC, anon, and authenticated because only their triggers invoke them. anon loses all public table/sequence grants, and PUBLIC/anon/authenticated lose `CREATE` on the public schema.

`permissions` is the only intentionally global reference dataset. It contains capability-code reference data, not tenant business content. All operational masters are tenant-owned.

## F-002 — Company-scoped Owner backup

The backup now authorizes an active Owner first, derives `staffId` and `companyId` from the authenticated staff identity, and only then creates a service-role client. Request input cannot choose the company. Pagination is applied to every dataset and parent-derived exports use bounded ID chunks.

The explicit backup scoping manifest is:

- **company_id filtered:** companies (by `id`), branches, locations, staffs, roles, items, products, suppliers, supplier items, UOM conversions, barcode mappings, recipes, purchase requests, purchase orders, goods receivings, purchase returns, supplier invoices/payments, stock counts, transfers, wastage, production jobs, outlet daily records, documents, approvals, attachments, notifications, activity/audit logs, document sequences/periods, user preferences, and deletion tombstones.
- **parent-company filtered:** role permissions; staff roles/branches/locations/overrides; product packaging; recipe lines/snapshots; PR/PO/GRN/return/invoice/count/transfer/wastage lines; stock-transaction lines; production ingredient/output lines; outlet daily lines; document comments/revisions; approval steps; and notification recipients.
- **branch/company relation filtered:** branch supplier items and stock transactions.
- **intentionally global reference data:** permissions.
- **excluded:** `auth.users` and `storage.objects`. Scoped attachment metadata is included; authentication credentials, file bodies, signed URLs, and storage internals are not.

Diagnostics contain only correlation ID, actor staff ID, actor company ID, table name, and scoped row count. Exported contents and secrets are not logged.

The local HTTP archive test logged in as Company-A Owner, supplied a forged Company-B query parameter, parsed every uncompressed ZIP member, and found no Company-B company, branch, staff, item, marker, or business value. It also proved Manager denial and that a disabled Owner receives no ZIP.

## F-003 — Privileged administration

`requireActiveTenantActor` is now the common server-side actor resolver. Client `company_id` is ignored for company, branch, location, staff, role, document-sequence, item, product, supplier, supplier-item, UOM, quick-create, import, and production-output ownership.

The remediated privileged paths include:

- company profile and logo update/removal;
- branch create/update/archive/restore;
- location create/update/archive/restore and duplicate/default-location maintenance;
- staff creation/update, access assignment, invite/reset/link repair, lifecycle actions, and permanent deletion guards;
- role creation/update and role-company validation;
- document-sequence creation/update/archive;
- tenant-owned master creation and import support required by F-001.

Every relevant service-role target update/delete adds the actor-company predicate or first proves the target through a company-scoped lookup. Related branch, location, role, staff, supplier, item, and document-sequence ownership is checked server-side.

`replaceStaffAccess` now calls one locked SECURITY DEFINER transaction. It validates active actor permission, target company, selected-role company, branch company and type, Owner-only protected-role changes, per-company last-Owner protection, and role semantics. It uses a per-company advisory transaction lock, replaces role/branch/location/default-branch state atomically, assigns every active company branch to Owner/Finance/Manager/Purchasing, restricts Kitchen to Central Kitchen branches, and restricts Outlet Staff to Outlet branches.

## Verification evidence

| Check | Result |
|---|---|
| Clean local Supabase reset and migrations 001–081 | Pass |
| Two-company RLS/forged payload/atomic access/catalog suite | Pass |
| Migration 075 Manager company-scope validation | Pass |
| Migration 078 atomic PR regression validation | Pass |
| Migration 079 inventory hardening validation | Pass |
| Migration 080 branch-supplier validation | Pass |
| Company backup archive-content Playwright suite | 3/3 pass |
| Existing Node contract suite | 167/167 pass |
| `npm run lint` | Pass, no warnings or errors |
| `npm run typecheck` | Pass |
| `npm run build` | Pass; 89 static pages generated |

The two-company database suite covers Owner same/cross-company select and forged insert/update/delete with unchanged-state assertions; Manager company-wide visibility; Kitchen/Outlet assigned and unassigned branches; Finance/Purchasing capability separation; disabled and anonymous denial; cross-company role/branch rejection; branch-type rejection; atomic rollback; per-company last-Owner protection; Manager all-branch replacement; and policy/view/function/table-grant inventory invariants. Representative tenant parents and children cover identity/access, master/mapping, document, procurement, transfer/wastage, and production domains.

## Finding mapping

| Finding | Closure evidence |
|---|---|
| F-001 permissive legacy RLS | Migration 081 exact reconciliation, tenant-owned masters, parent-derived child policies, safe grants/search paths, two-company database tests, catalog inventory |
| F-002 system-wide Owner backup | Active company Owner resolver, explicit manifest, parent/branch scoping, no company override, every-file ZIP inspection, non-Owner/disabled denial |
| F-003 client-trusting privileged administration | Actor-company derivation, company-scoped targets and related IDs, atomic locked staff-access RPC, per-company Owner guard, forged payload tests |

## Remaining limitations and next round

- Production read-only verification was not performed because explicit production read-only authorization and credentials were not provided. Production status is therefore **not verified**.
- Before production migration, any real multi-company installation with legacy unowned master rows must assign their company IDs in an approved data-preparation step; migration 081 deliberately fails closed instead of inferring ownership.
- The broader security scan was skipped/deferred as directed. Record this round's scan outcome as not run/failed and rerun it in the next round.
- The Next.js `next lint` command reports a framework deprecation notice for Next.js 16 migration, but the current lint command exits successfully with no warnings or errors. This was not changed under the feature freeze.

No production data was mutated.
