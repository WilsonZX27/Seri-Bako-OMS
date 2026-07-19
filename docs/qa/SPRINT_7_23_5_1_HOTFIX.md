# Sprint 7.23.5.1 local hotfix evidence

Date: 2026-07-19
Scope: local-only implementation and verification
Production mutation: none

## Outcomes

- `/purchase-requests?status=in_review` maps the synthetic filter to `manager_review`, `admin_review`, and `finance_review` before querying the status enum.
- Superseded by the authoritative Manager correction: Manager PR visibility is now same-company across list/detail RLS, pending actions, dashboard queues, and PR notifications. Manager branch assignments remain default context only.
- Recipe/BOM master data is Owner and read-only Finance only. Kitchen production uses a narrow active-recipe snapshot RPC and cannot query recipe tables directly.
- Manager, Purchasing, and Finance approval actions use role-explicit green labels and a confirmation dialog. Finance is explicitly excluded from Manager approval.
- The PR filter row has no visible Priority label and keeps Search, priority select, and Search button in the compact filter surface.
- Import suppresses the generic mobile Page actions surface. Daily Record shows a sticky mobile action only when a current primary action exists.
- Daily Record presents Qty Sent, Received, Wastage, Wastage Reason, and Remarks without a mobile table. Central Kitchen and Outlet Staff field ownership is server-authoritative.
- `products.display_order` is editable through the existing authorized Product form. Operational product order uses the supplied SC, RB, SRR, BI, RT, BB, and PKG family/category order, then display order, then natural code. Product master, Daily Record form/detail, and the narrow production snapshot reuse it; Opening Stock remains CSV-driven and Stock Wastage remains item-based, so neither exposes a full-product list today.

## Database verification

- Disposable reset: migrations 001 through 075 passed after the authoritative Manager correction.
- Migration 074 recorded once locally.
- SHA-256: `9988E7FA7A241B955A1DA1E797AF7B78FDF4C6843958F7753B58EBEC971ECB51`.
- Active recipe grants after reset: Finance has `recipes.read`; non-Owner Manager, Purchasing, Kitchen, and Outlet Staff have no recipe permission.
- Kitchen Daily Record grants: view, create, and Qty Sent only; generic update was removed.
- Rollback-only fixture verified:
  - An Office-only Manager saw PR-00008 at CK-PJS10 and PR-00011 at CK-ALMA, completed only Manager Review, and received no Finance, recipe-costing, or Owner capability.
  - Kitchen and Outlet Staff could not see the out-of-branch PR; Finance and Owner retained company-wide PR visibility.
  - Manager and Kitchen direct recipe reads returned zero rows.
  - Finance direct recipe read returned the fixture recipe.
  - Kitchen received one minimal active production recipe snapshot.
  - Kitchen Qty Sent remained authoritative while Outlet Staff Received, Wastage, reason, and remarks remained authoritative after cross-role updates.

The executable fixture is `tests/sql/sprint-7-23-5-1-local-verification.sql`; it rolls back all dummy rows.

## Browser evidence

Local mock-mode Playwright passed 8/8 checks. Daily Record and the direct filtered PR route were checked at 1440, 1024, 768, 430, 390, and 360 pixels with no document overflow or critical page errors. Import at 390 pixels had no generic Page actions footer. Screenshots are in `test-results/sprint-7-23-5-1/`.

## Quality gates

- Typecheck: passed.
- Lint: passed with zero warnings.
- Production build: passed; 89 static pages generated.
- Contract tests: 136/136 passed.
- Targeted Playwright: 8/8 passed.

## Ashley and Jack role gate

The disposable local database contains no staff row whose name or email matches Ashley or Jack, and neither identity is present in repository source or documentation. Because this sprint forbids Production mutation and is local-only, no real staff record was changed. Their exact Production staff IDs, current roles, and whether Finance is the correct target require a separately authorized controlled Production read. Any role change must then identify the account, current role, target Finance role, branch scope, effective date, and rollback assignment before mutation.
