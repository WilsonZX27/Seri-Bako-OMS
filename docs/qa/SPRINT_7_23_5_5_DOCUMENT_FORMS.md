# v7.23.5.5 Document Forms — Local Validation

Date: 2026-07-19
Boundary: local code and local production-build browser verification only. No form submission, Production business-data mutation, migration, push, or deployment.

## Implemented pattern

- Purchase Request, Goods Receiving, Supplier Invoice, Purchase Return, Stock Transfer, Stock Count, Production Job, and Outlet Daily Record creation/detail surfaces use the shared document workdesk.
- Desktop keeps the persistent Right Console; tablet uses the 70/30 in-page inspector; mobile uses the compact workflow summary and accessible bottom sheet.
- A sticky mobile action is rendered only when the current role/status has a real primary action. Secondary and destructive controls use More Options.
- Right Console order is Primary Action, Validation / Next Step, optional More Options, Attachments, Comments, and Activity.
- Manager, Purchasing, and Finance approvals use actor-explicit labels. Approval confirmation traps focus, locks page scroll, closes with Escape/backdrop, and returns focus.
- Required Delivery Order, supplier invoice, and high-variance count evidence remain visible in the mobile work area at the stage where they are required.
- Shared tables own their horizontal data canvas; redundant route-level overflow wrappers were removed.
- Outlet Daily Record retains Qty Sent, Received, Wastage, Wastage Reason, and Remarks ownership.

## Role verification

| Role | Read-only authenticated route exercised | Result |
| --- | --- | --- |
| Super Admin / Owner | Purchase Request creation | Pass |
| Finance | Supplier Invoices and available detail | Pass; no Manager approval action |
| Manager | Manager Review Purchase Requests and detail | Pass; confirmation shown without transition |
| Purchasing | Purchase Orders and available detail | Pass |
| Kitchen | Purchase Request creation | Pass; no Finance/Owner action leakage |
| Outlet Staff | Outlet Daily Record creation | Pass; no Finance/Owner action leakage |

## Responsive evidence

The document matrix covered Purchase Request, Purchase Order, Goods Receiving, Supplier Invoice, Outlet Daily Record, and Stock Count at 1440, 1024, 768, 430, 390, and 360 pixels. Empty detail collections used the corresponding non-mutating creation workspace. Assertions covered:

- no whole-page horizontal overflow;
- no generic `Page actions` surface;
- compact document identity and workflow;
- tablet inspector visibility at 768–1024;
- mobile `View workflow`, backdrop, scroll lock, Escape, focus trap, and focus return;
- no critical browser console/page errors in the completed runs.

## Automated gates

- TypeScript: passed.
- ESLint: passed with zero warnings.
- Contracts: 151/151 passed.
- Production build: passed; 89 static pages generated.
- Authenticated Playwright: six role checks passed; responsive matrix passed; mobile workflow/approval accessibility passed.

## Deferred workflow-model gap

Supplier Invoice currently moves from `draft` directly to `open` through the existing Finance approval action. There is no separate submitted/Finance Review database status. This sprint keeps that verified transition intact and labels the actor clearly; any extra review stage belongs to the later Procure-to-Pay workflow-model sprint.

PO sending, receiving, AP/payment, and stock transitions retain their existing database states and server authority. No new transition or permission was introduced.
