# Sprint 7.22 Go-Live Stabilization Ledger

Audit date: 2026-07-17. This ledger describes the local working tree only. Migration 067 has not been applied to any database, so the release is **not Go-Live ready**.

## Executive result

- Go-Live ready: **No**.
- Risk: **High until migration 067 and the role-based browser matrix are verified on a disposable database**.
- Current blockers: database migration verification, live active-role inventory, authenticated role E2E, PR concurrency/RLS integration tests, cross-module manual regression, and responsive browser review at the required zoom levels.
- Version remains `v0.2.29 / Sprint 7.21.1`. The Sprint 7.22 version must not be published before every acceptance gate is signed off.

## Root causes and local resolutions

| Symptom | Root cause | Affected layers | Local resolution | Evidence |
|---|---|---|---|---|
| Role edits did not reliably affect navigation or actions. | `resolveEffectivePermission` accepted the database result, then silently re-granted permissions from a hardcoded role matrix when the database returned false. Role saves also used non-transactional delete/insert and did not invalidate the app layout. | Permission helper, role action, layout/navigation | Production now returns only `has_any_permission`; the static matrix remains mock-only. `set_role_permissions` is atomic and role/staff permission changes revalidate the root layout. | `go-live-stabilization-contract.test.js` |
| Administrator could reach the PR list but not reliably read PR rows. | PR RLS required only legacy `purchase_request.read`, while bounded Administrator defaults use `pr.view_all`/`pr.view_branch`. | Role defaults, RLS, query | Migration 067 makes PR access alias-aware, active-staff/company-bound, and branch-scoped unless `pr.view_all` is effective. | Static contract; database integration pending |
| Manager approval reported a false stale-step error. | The application allowed `pr.manager_approve`, but direct table-update RLS required unrelated legacy update/review/approve keys. The filtered update returned no row and was reported as a workflow conflict. | Action, RLS, workflow error | All PR transitions now use one locked SECURITY DEFINER RPC with action-specific permissions, exact state rules, one audit row, idempotent repeat handling, and precise conflict errors. | Static contract; database concurrency test pending |
| PR workflow could partially update. | PR status, document state and activity history were three separate requests. | Action/database | Migration 067 performs all three writes in one transaction. Direct authenticated PR updates are revoked; only a narrow draft document-link RPC remains. | Static contract; rollback integration pending |
| Administrator regained Finance operations after role correction. | Migration 060 re-added approve/pay/void to Admin and Operations Admin after migration 055 bounded those roles. AP report RPC checked invoice view only. | Role defaults, routes, dashboard, RPC/RLS | Migration 067 removes approve/pay/void from office roles, restricts payment rows and the AP RPC to `supplier_invoice.pay`, and applies the same boundary to routes, export, dashboard, list and detail UI. | Static contract; role E2E pending |
| Final-owner protection counted Office Admin as an owner. | `activeSuperAdminCount` included both `super_admin` and bounded `admin`, so an Administrator assignment could incorrectly satisfy the owner-account floor. | Staff role change/deactivation protection | The counter now includes only active `super_admin` assignments. | Static contract; database role-change test pending |

## Authorization architecture

```text
staffs + staff_roles + roles + role_permissions + staff_permission_overrides
  -> public.has_any_permission(permission aliases)
  -> server resolveEffectivePermission
  -> sidebar visibility and middleware route guard
  -> server query RLS / company and branch scope
  -> server action or authenticated RPC permission check
  -> SECURITY DEFINER validation + row lock where atomic workflow is required
  -> table RLS/revoked grants as the final direct-access boundary
```

- Canonical effective permission source: `public.has_any_permission`.
- Explicit deny wins over allow/default; only active `super_admin` has implicit full access.
- React `cache()` is request-scoped. No permissions are stored in JWT claims or a long-lived application cache.
- After a role, staff-role or individual override save, the action revalidates the root layout. The next navigation/request uses the new mapping; logout is not intended to be required.
- Navigation is convenience, not authorization. Middleware, action/RPC checks and RLS/revoked grants remain required.

## Intended role responsibility matrix

This is the approved target for migrations 055, 066 and 067. Actual active assignments and effective overrides must be exported from the verification database before release.

| Role code | Purpose and scope | PR responsibility | Operational access | Explicitly denied/restricted |
|---|---|---|---|---|
| `super_admin` | Owner recovery and final administration; company-wide | All stages and conversion when valid | Implicit full access; role protection | Final owner cannot be overridden through the role editor |
| `admin`, `operations_admin` | Office administration and data entry; company-wide PR view | Admin Review only; may read all PR stages | Operational master data, staff/roles only when explicitly granted, invoice view/create | Manager Review, Finance Review, AP Aging, payment, invoice approval/void, banking |
| `manager` | Branch operational oversight | Read assigned-branch PRs at every stage; Manager approve/reject only at Manager Review | Assigned branch inventory and approved management reports | Admin/Finance approval, conversion, AP/payment, system administration |
| `finance` | Financial and final review | Company PR read and Finance Review | Supplier invoice review, AP Aging, payment visibility/operations where granted | Manager/Admin approval, unrelated system administration |
| `purchasing` | Procurement execution | Read approved demand and convert only at Ready to Convert when granted | PO, supplier, receiving and returns | Payment clearing/banking; Manager/Admin/Finance review |
| `kitchen`, `kitchen_staff` | Branch kitchen and production work | Create/submit/cancel own or assigned-branch PRs; read assigned scope | Production and assigned operational inventory according to effective permissions | Approval stages, conversion, AP/payment, administration |
| `viewer` | Read-only inspection within assigned scope | Read only where explicitly granted and branch-scoped | No mutation | All create/approve/post/delete/payment operations |
| `outlet_staff` | Assigned-outlet daily capture | None | Exactly `dashboard.view`, `outlet_daily_record.view`, `.create`, `.update` | Every unrelated module and action |

No migration seeds separate `inventory` or `production` role codes. Any such live legacy role must be reviewed from the database rather than inferred from source.

## Purchase Request state machine

| Current status | Action | Capability | Next status | Audit/document result | Repeat/stale behaviour |
|---|---|---|---|---|---|
| `draft`, `rejected`, `returned` | Submit | `pr.submit` | `manager_review` | Pending / Manager Review; one `submitted` event | Same successful action is idempotent; other current stage is named |
| `manager_review` | Approve | `pr.manager_approve` | `admin_review` | Pending / Admin Review; one manager event | Manager cannot apply later approvals |
| `manager_review` | Reject with remarks | `pr.manager_approve` or `pr.reject` | `rejected` | Rejected; one rejection event | Remarks required |
| `admin_review` | Approve | `pr.admin_review` | `finance_review` | Pending / Finance Review; one admin event | Administrator only when permission is effective |
| `admin_review` | Reject with remarks | `pr.admin_review` or `pr.reject` | `rejected` | Rejected; one rejection event | Remarks required |
| `finance_review` | Approve | `pr.finance_review` | `ready_to_convert` | Approved / Ready to Convert; one finance event | Finance only |
| `finance_review` | Reject with remarks | `pr.finance_review` or `pr.reject` | `rejected` | Rejected; one rejection event | Remarks required |
| `draft` | Cancel | `pr.cancel` | `cancelled` | Cancelled; one cancellation event | No later-stage cancel |
| `ready_to_convert` | Convert | `pr.convert_to_po` | `converted_to_po` | Existing conversion RPC creates one PO/document and audit | Existing unique/idempotent conversion guard remains |

Read permission is independent from the action permission. A Manager retains branch-scoped read access after Manager Review; Administrator retains company-wide operational read access without Finance actions.

## Go-Live route reconciliation

Every retained route below is middleware-protected and still depends on its server queries/actions and table/RPC boundaries. `/**` lists the exact list/new/detail/edit children currently present in `src/app/(app)`.

| Routes | Module / purpose | Navigation | View permission | Action permissions | Scope / data / RLS | Disposition |
|---|---|---|---|---|---|---|
| `/dashboard`, `/account`, `/activity` | Workspace, account, audit | Sidebar/topbar | `dashboard.view` or `reports.view` | Page-specific | Effective permission and query RLS | Keep |
| `/quick-tools`, `/daily-operations` | Legacy operational link hubs | Indirect | `dashboard.view` | Destination guards | No independent writes | Defer post-pilot review |
| `/procurement`, `/procurement/purchase-requests` | Procurement hub/compatibility | Sidebar/indirect | `purchase_request.read` aliases | Destination actions | PR RLS | Keep; review compatibility route later |
| `/purchase-requests`, `/purchase-requests/new`, `/purchase-requests/[id]` | PR list/create/document | Sidebar | PR read aliases | create, submit, stage-specific review/reject/cancel/convert/delete | Company/branch PR RLS; workflow/hard-delete RPC | Keep |
| `/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/[id]` | PO list/create/document | Sidebar | `purchase_order.read` | create/approve/send/cancel/close | Existing PO RLS/RPC | Keep |
| `/goods-receivings`, `/goods-receivings/new`, `/goods-receivings/[id]` | GRN | Sidebar | `goods_receiving.read` | create/post | Existing GRN RLS/RPC | Keep |
| `/purchase-returns`, `/purchase-returns/new`, `/purchase-returns/[id]` | Returns | Sidebar | `purchase_return.view` | create/post/cancel | Existing return RLS/RPC | Keep |
| `/supplier-invoices`, `/supplier-invoices/new`, `/supplier-invoices/[id]` | Operational invoice records | Sidebar | `supplier_invoice.view` | create/approve/pay/void separately | Company RLS and invoice RPCs | Keep |
| `/supplier-invoices/aging`, `/supplier-invoices/cash-flow` | Finance payables reports | Invoice console | `supplier_invoice.pay` | CSV export uses same permission | Company-scoped AP RPC | Keep, Finance-restricted |
| `/suppliers/**`, `/supplier-items/**`, `/uom-conversions/**` | Supplier masters | Sidebar | matching master view/read | matching create/update/delete | Existing master RLS | Keep |
| `/inventory`, `/stock-balance`, `/stock-balances`, `/stock-card`, `/stock-transactions/**`, `/stock-transfers/**`, `/stock-counts/**`, `/stock-wastage/**`, `/low-stock`, `/opening-stock/import` | Inventory hubs, ledger and controlled stock work | Sidebar/hubs | matching inventory permission | create/post/review/export by route | Branch/location RLS and posting RPCs | Keep; `/stock-balances` compatibility review later |
| `/items/**`, `/products/**`, `/recipes/**` | Item/product/recipe masters | Sidebar | matching view | matching create/update/approve | Company RLS | Keep |
| `/production`, `/production/jobs/**`, `/production/planning`, `/production/variance` | Production work and read-only reports | Sidebar/hub | production or outlet-report view | job create/approve/post only on job pages | Existing production RLS/RPC | Keep |
| `/outlet-daily-records/**` | Assigned-outlet daily capture | Sidebar | `outlet_daily_record.view` | create/update/review/void separately | Company and assigned-branch RPC/RLS | Keep |
| `/reports`, `/reports/demand-trends`, `/reports/costing-readiness`, `/reports/recipe-costing`, `/reports/product-margin`, `/reports/procurement-variance` | Read-only reports directory/views | Sidebar | `reports.view` or route-specific outlet view | Export only where present | Server queries under company/branch RLS | Keep |
| `/documents`, `/documents/[id]` | Document history/collaboration | Indirect | `documents.view` | comments/attachments by separate permissions | Document/company RLS | Keep |
| `/company`, `/branches/**`, `/locations/**`, `/staffs/**`, `/roles/**`, `/document-sequences/**` | Administration | Sidebar/settings | matching read | matching create/update/archive; role changes via RPC | Company RLS; owner protections | Keep |
| `/imports`, `/imports/[entity]` | Canonical import directory/workspaces | Sidebar | imports permission | validated import actions | Import RPC/actions | Keep |
| `/administration/imports`, `/data-onboarding` | Old import/onboarding entry points | No duplicate nav | imports permission | None | Redirect only | Redirect to `/imports` |
| `/settings` | Live settings directory | Indirect | `settings.manage` | Destination-specific | No placeholder actions | Keep |
| `/settings/backups` | Owner backup export | Settings | owner/settings boundary | export | Server authorization | Keep owner-only |

No route was removed. Detailed legacy-route reasons remain in `docs/qa/STATIC_ROUTE_INVENTORY.md`.

## Dashboard and UI status

- Payables data now loads and renders only when `supplier_invoice.pay` is effective; the destination route and CSV enforce the same boundary.
- Dashboard sections still isolate AP/query failures, and no new data source or widget was added.
- Existing UI contract tests cover the app shell, dashboard section order, compact filters, import controls and collapsed technical permission details.
- No broad typography/layout rewrite was made because the reported authorization blockers had deterministic root causes and the current shared UI contracts pass.
- Visual sign-off at 90%, 100%, 110%, 125% and mobile remains a manual blocker.

## Manual Go-Live QA

Use a disposable local/staging company and records prefixed `QA-GL-<timestamp>-`. Never use Production business records.

1. Owner: confirm full navigation, edit a non-owner test role, verify navigation/route/action changes on the assignee's next request without logout, then restore it. Confirm failed invalid permission save rolls back.
2. Administrator: open all QA PR stages/history/comments/attachments; complete only Admin Review. Confirm Manager/Finance actions and AP Aging/Cash Flow/payment/approve/void are absent and direct URLs are denied.
3. Manager assigned to Branch A: create/open Branch A PR, approve Manager Review once, retain read access at Admin/Finance stages, reject a separate QA PR with remarks. Confirm Branch B and later approvals are denied.
4. Finance: open Finance Review, AP Aging and Cash Flow; complete only Finance Review. Confirm role/staff administration and Manager/Admin actions are absent.
5. Purchasing: convert one Ready-to-Convert QA PR. Retry conversion and confirm no second PO. Continue through QA PO/GRN/invoice links without payment-clearing access.
6. Outlet Staff: verify only Dashboard and assigned Outlet Daily Records; save/complete one QA outlet record. Confirm PR, inventory administration, reports and finance direct URLs are denied.
7. Minimal Viewer: verify only explicitly granted read routes and assigned branch rows; all mutation controls and direct action requests are denied.
8. Concurrency: open the same Manager Review PR in two sessions, approve simultaneously, verify one transition and one timeline event; the loser receives the current canonical stage.
9. Permission refresh: remove and re-add one safe test permission while the assignee remains logged in; verify sidebar, route and action on the next navigation each time.
10. Responsive: inspect retained Go-Live pages at desktop zoom 90/100/110/125 and a narrow mobile viewport; record route, role, viewport and screenshot for every failure.

## Database and release status

- Deployed migration ceiling documented by the repository: 065.
- Migration 066: present locally, modified because it was never applied. It still only seeds the four minimum Outlet Staff permissions, now as one company-scoped role per active company instead of a global null-company role.
- Migration 067: added locally, not applied. It contains the authorization, PR workflow/RLS and Finance-boundary corrections described above.
- Local Supabase CLI: 2.109.0. The local database is unavailable because no Docker/Supabase container is running; SQL execution and RLS tests are blocked.
- Production/remote migrations: none applied.
- Production data: not read or mutated.
- Commit/push/deploy: none performed.

## Remaining release risks

- Migration 067 has only received static review. Its functions, grants, RLS policies, concurrency behaviour and rollback/error messages must be exercised against a disposable migrated database before release.
- Purchase Request workflow transitions are atomic after migration 067, but initial PR creation still spans the request, document, line and activity inserts. A forced-failure database test is required to prove or improve creation rollback safety.
- Role defaults are protected by the atomic RPC and direct authenticated table mutations are revoked. Staff creation, assignment, branch/location access and individual-override actions still require a complete cross-company integration test with forged identifiers before Go-Live.
- Final-owner protection now counts only active `super_admin` assignments; the bounded Administrator role can no longer satisfy the owner-account floor.
- The full seven-role authenticated route/action matrix, concurrent PR transition test, permission-refresh test and responsive visual pass have not run. Static contracts and build success do not replace these gates.
- Migration 066 and 067 must be reviewed, applied exactly once to a disposable environment, smoke-tested, and only then promoted through the normal release process. The application version intentionally remains `v0.2.29 / Sprint 7.21.1` until these gates pass.

## Local validation results

| Check | Result |
|---|---|
| `node --test tests/*.test.js` | Passed: 86, failed: 0, skipped: 0 |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Passed with no warnings/errors |
| `npm.cmd run build` | Passed; 84 static pages generated and route manifest completed |
| `git diff --check` | Passed; line-ending notices only |
| `npx.cmd playwright test --list` | Passed discovery: 72 tests in 28 files |
| Authenticated browser role matrix | Not run; no disposable migrated database/test-user environment was available |
| Migration/RLS execution | Not run; local Docker/Supabase database unavailable |
| Manual cross-module QA | Not run; remains a Go-Live blocker |

## Files changed by category

- Authorization: `src/server/auth/permissions.ts`, `src/server/auth/route-permissions.ts`, `src/server/actions/foundation.ts`, supplier-invoice pages/export, Dashboard query/component, and generated database function types.
- Workflow: `src/server/actions/procurement.ts` and the Purchase Request detail action bindings.
- Migrations: local-only migration 066 company-scope correction and new forward-only migration 067.
- Tests: Go-Live static contract plus corrected/expanded role and PR Playwright scenarios.
- Documentation: this audit, role, workflow, route and manual-QA ledger.
- Packages: no changes to `package.json` or `package-lock.json`.
