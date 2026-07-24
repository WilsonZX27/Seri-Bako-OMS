# Seri Bako OMS — Full-System Closure Audit v2.0

Audit date: 2026-07-24 (Asia/Kuala_Lumpur)  
Scope: repository-only; no production database, deployment, import, push, or production-data mutation.

## Executive verdict

**Conditional GO for a clean, local-first operational rollout.** The P0 code roots from the 2026-07-22 audit are remediated in the current migration chain through `103`. The repository has recorded clean empty-database replays and has current build, type, contract, isolated browser, and direct SQL-fixture evidence. A fresh replay attempt during this continuation was blocked because Docker Desktop is manually paused; this is not a statement about historical production data: no production data or production grants were inspected.

### Owner summary

- Tenant isolation, company-scoped backup, service-role administration, inventory posting atomicity, transfer/wastage terminal state, production posting, and inventory concurrency have current migration and contract evidence.
- Inventory is now Branch/Outlet owned. Location tables, columns, permissions, route pages, types, runtime queries, backup content and maintenance paths were removed by forward migration `099`; migration `100` removes the two post-removal RPC residues found by direct SQL validation.
- Six roles passed local browser verification across six responsive widths; Stock Count passed dedicated desktop/tablet/mobile interaction and overflow checks.
- Do not import operational inventory until the exact release build is accepted. Mock Mode is a documented P2 source-reduction task, not a production runtime path or a release blocker.

## Verification performed

| Check | Result |
|---|---|
| Empty local database replay, migrations `001`–`100` | Pass (multiple clean resets) |
| `npm.cmd run typecheck` | Pass |
| Disposable local database incremental migration `103` | Pass; ledger and Kitchen permissions verified directly in Postgres |
| Fresh local database replay through migration `103` | Pass; reset completed, ledger ends at `103`, key business tables are zero-row, and no Location/Barcode columns or tables remain |
| Core database business chain | Pass; Stock Count, balance/low-stock views, PR, and GRN atomic routines exist after reset |
| `npm.cmd run test` | Pass, 200/200 |
| `npm.cmd run build` | Pass, 87 routes after Location removal |
| Super Admin route browser smoke | Pass |
| Five non-Owner dashboard/sidebar smoke | Pass |
| Six roles × 1440/1024/768/430/390/360 responsive audit | Pass |
| Stock Count 390/768/1440 regression | Pass; physical input >=144px mobile, no horizontal overflow |
| Direct SQL fixtures after Location removal | Pass: tenant boundary, PR draft edit, opening stock/GRN/return/count, branch supplier mapping |

## Prior-finding closure matrix

| Finding | Status | Current evidence |
|---|---|---|
| F-001 permissive RLS | Resolved | `081_tenant_boundary_closure.sql`, `082_owner_access_control_closure.sql`, `099_remove_locations_and_make_inventory_branch_owned.sql`; local replay and tenant contracts pass. |
| F-002 cross-tenant backup | Resolved | `src/server/backup/export.ts` uses company classification/predicates; tenant-backup local E2E and contract pass. |
| F-003 service-role admin scope | Resolved | migrations 081–083 plus current foundation contracts derive tenant actor and enforce Owner invariant. |
| F-004 non-atomic ledger/manual movement | Resolved | migrations 084, 085, 098 and atomic-inventory contract evidence. |
| F-005 transfer/wastage relabelling | Resolved | migrations 092, 094 and transfer/wastage atomicity contracts. |
| F-006 production partial posting | Resolved | migrations 096, 098 and production transition contracts. |
| F-007 concurrency/stale balances | Resolved | migration 085 and locked ledger/count/GRN contract coverage. |
| F-008 invalid PO state | Resolved | migration 086 contract. |
| F-009 PR/PO retry partial drafts | Resolved | migrations 087, 094–097 contracts. |
| F-010 sequence cross-tenant access | Resolved | migration 088 and document-number contract. |
| F-011 caller-supplied Auth identity | Resolved | tenant actor/foundation contracts. |
| F-012 temporary password URL | Resolved | staff onboarding contracts. |
| F-013 document/invoice state side effects | Resolved | migrations 089, 098 and document transition contracts. |
| F-014 stale reset runbooks | Resolved | maintenance scripts and docs use migration ceiling 100. |
| F-015 permission alias deny | Resolved | migration 090 and permission alias contracts. |
| F-016 stale email identity alias | Resolved | migration 090 and identity contracts. |
| F-017 critical invariants unexecuted | Partially resolved | local migration replay, 197 contracts and isolated E2E now run; production data/grant diagnostics intentionally not run. |
| F-018 role/release documentation drift | Resolved | README/ARCHITECTURE and release contracts now name 7.23.7.0 / 100. |
| F-019 diagnostic correlation | Partially resolved | common failures use the structured logger; specialised path review remains P2. |
| F-020 backup artifacts | Resolved in repository | ignored local artifacts remain untracked and are not source/release inputs; production history was not inspected. |
| F-021 select/file radius token | Resolved | shared UI contract and stylesheet checks pass. |

## Source and file classification

| Classification | Files / rationale |
|---|---|
| Current authoritative | `src/`, `supabase/migrations/`, `supabase/maintenance/`, `tests/`, root product/release docs. |
| Compatibility/operationally required | `/settings`, `/settings/backups`, `/administration/imports`, `/data-onboarding`, `/quick-tools`, `/daily-operations`, `/stock-balances`, legacy procurement aliases. They are tiny redirects, route-permission allowlisted, and are still retained for bookmarks. |
| Historical reference | `docs/audits/*`, `docs/qa/*`, older sprint reports, all migrations `001`–`098`. Never delete migrations. |
| Removed residual | Location route pages; `src/server/inventory/locations.ts`; Location table/columns/permissions in migration 099; post-removal staff/PR RPC and execute-grant residue in migration 100; four cache revalidations pointed only at compatibility redirects. |
| Not safe for automatic deletion | `src/lib/mock-mode.ts` and its dependent branches across roughly 50 files. It is inactive for production but must be retired as a tested dedicated cleanup, not a search-and-replace. |

## Remaining findings

| Priority | Finding | Release position |
|---|---|---|
| P1 | No production-history / live-grant diagnostic was run. | Do not claim historical data is clean; run read-only diagnostics before any multi-company production use. |
| P2 | Mock Mode branch surface remains large and empty-data based. | Retire in a dedicated tested cleanup after confirming no developer workflow depends on it; it is explicitly disabled in production. |
| P2 | Some audit/QA docs are historical snapshots and mention retired Location behavior. | Keep as historical evidence; do not treat them as current SOP. |
| P2 | Structured observability remains incomplete in specialised paths. | Consolidate during the next maintenance pass. |

## Deletion and cleanup evidence

1. **Removed Location runtime surface:** no active `location_id`, `default_location_id`, `staff_locations`, Location type, query placeholder, route page, backup manifest, maintenance reset reference, or ignored Location API parameter remains outside historic migrations/audits.
2. **Removed stale revalidation calls:** `items`, `stock-transactions`, `purchase-returns`, and import confirmation no longer refresh redirect-only aliases. Typecheck and all contracts pass.
3. **Preserved compatibility redirects:** static route inventories and route-permission tests show they are explicit bookmark aliases, not duplicate business implementations.

## GO gate

**Conditional GO** when all of the following remain true on the exact release commit:

1. local database reset through migration 100 passes;
2. typecheck, lint, contracts, build and local browser suites pass;
3. no formal inventory/business import is performed before the release build is accepted;
4. production use starts with deliberate Branch/Outlet master data and opening stock, never Location records;
5. a future production-read-only review checks historical backup access and data effects before claiming historical integrity.

No push, deployment, production import, production reset, or production data deletion was performed by this audit.
