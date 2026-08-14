# Seri Bako Operations Management System

## Product Overview

### Current audit baseline

The current released application baseline is `v8.36.16 — Procurement Variance Insight Layer`.
The repository migration history currently runs through migration `147`. Release
version authority lives in `src/lib/app-version.ts`; migration authority lives in
the immutable, forward-only `supabase/migrations/` directory. Documentation must
not claim a later release or database ceiling unless both authorities support it.
Deep operational green is the ordinary primary action color;
mobile controls keep a minimum 48px touch target. User-visible dates use
`dd/mm/yyyy`, while native date inputs continue to submit ISO date-only values.
Read failures must remain visibly unavailable rather than being presented as a
misleading zero or empty-success state. Save and confirm/post actions remain
separate, and retrying a committed inventory action must not create a second
movement.

Seri Bako Operations Management System (OMS) is an internal operations platform for managing Seri Bako's daily procurement, inventory, goods receiving, production, approval, staff access, and operational records.

The system is designed to replace fragmented workflows across spreadsheets, paper forms, WhatsApp messages, and disconnected records with a single operational source of truth.

Seri Bako OMS is not intended to be a full accounting ERP or a public-facing SaaS platform. Its primary purpose is to help internal teams complete routine operational work quickly, clearly, and consistently.

## Product Goals

Seri Bako OMS should:

- Reduce repeated manual data entry.
- Reduce dependency on spreadsheets, paper records, and WhatsApp follow-ups.
- Make document ownership, status, and next actions visible.
- Improve inventory accuracy across branches, outlets, stores, and production operations.
- Standardize procurement, receiving, stock, and production workflows.
- Provide clear audit history for operational records.
- Keep frontline and administrative workflows simple and fast.
- Support role-based and permission-based access without adding unnecessary complexity.
- Prioritize a complete working operational flow before secondary polish or edge-case handling.

## Product Principles

### 1. Operational clarity over feature volume

Every page must help the user understand:

- What record or task they are viewing.
- What status it is currently in.
- What action is required next.
- Who is responsible.
- What supporting records, comments, and attachments exist.

Features that do not improve daily operational clarity should not be prioritized over core workflows.

### 2. Fewer steps

Common tasks should require as few screens, clicks, and repeated inputs as reasonably possible.

The system should avoid:

- Re-entering information already available from an upstream record.
- Repeated navigation between related documents.
- Unnecessary confirmation steps.
- Duplicate loading of the same operational information.
- Splitting one simple task across too many pages.

### 3. Ledger-based operational records

Stock, workflow, and document history should be traceable.

Important balances and statuses must be derived from controlled records rather than edited directly without history.

### 4. Reusable system patterns

Pages and workflows must reuse the established app shell, page skeletons, interaction patterns, and shared components defined in `DESIGN.md`.

New modules should not invent unrelated layouts, button systems, status styles, or workflow patterns.

### 5. MVP-first delivery

Core end-to-end workflows take priority over:

- Deep edge-case handling.
- Exhaustive diagnostics.
- Decorative UI polish.
- Advanced automation.
- Non-critical error messaging.
- Premature architectural complexity.

Known non-critical limitations should be documented briefly and deferred to focused cleanup sprints.

## Fixed System Roles

Seri Bako OMS has exactly six system-controlled roles. They are reviewed in the owner-only Roles & Permissions overview and cannot be created, renamed, or edited through normal UI.

- **Super Admin / Owner (`super_admin`)**: protected owner controls, company setup, staff assignments, system numbering, backups, and full operational authority.
- **Finance (`finance`)**: company-wide finance review plus staff, numbering, imports, and branch administration; protected Owner and backup controls remain unavailable.
- **Manager (`manager`)**: company-wide operational visibility and Manager Review across all Outlets and Central Kitchens, plus branch maintenance. Branch assignment supplies default context and autofill only.
- **Purchasing (`purchasing`)**: company-wide purchasing, supplier, item/master-data, import, PO, and sourcing-review duties.
- **Kitchen (`kitchen`)**: assigned Central Kitchen workflows, including purchase-request creation/submission and production operations.
- **Outlet Staff (`outlet_staff`)**: assigned-outlet daily records only.

Role determines allowed actions. The default Branch / Outlet controls initial context and autofill but is not an authorization boundary. Super Admin, Finance, Manager, and Purchasing have company-wide operational visibility. Kitchen and Outlet Staff remain strictly limited to assigned branches.

## Current Product Scope

The system currently covers or is actively implementing the following operational areas.

### Core Platform

- Supabase authentication.
- Login, password setup, password reset, and first-password change flows.
- User profiles.
- Staff onboarding through invitation or temporary-password setup.
- Roles and permissions.
- Permission-aware navigation and actions.
- Database row-level security.
- Shared application shell.
- Shared document and record workspace patterns.
- Comments, attachments, timeline, and activity history where implemented.

### Master Data

- Supplier Master.
- Item Master.
- Company Profile.
- User and staff records.
- Roles and permissions.

### Procurement

- Purchase Requests.
- Purchase Orders.
- Supplier-linked purchasing records.
- Approval and workflow actions where implemented.

### Inventory

- Stock Transactions.
- Movement Ledger.
- Stock Balance.
- Low Stock monitoring.
- Stock Count.
- Stock Adjustment and reconciliation flows where implemented.
- Inventory exports where permitted.
- Goods Receiving.
- Inventory movement generated by upstream operational documents where implemented.

### Production

- Production Jobs.
- Production input and output records.
- Production-related inventory movement where implemented.

### Operational Visibility

- Dashboard.
- Module summaries.
- Operational status indicators.
- Workflow history.
- Record timelines.
- Comments and attachments.
- Permission-controlled exports.

## Module Maturity

Module maturity must be understood separately from visual completion.

Current integration baseline: `v8.36.16 — Procurement Variance Insight Layer`, with repository migrations reviewed through `147`. Migrations `111` and `112` remain immutable history because they were applied to the linked database accidentally. Migration `113` removes their callable Central Kitchen PR RPC, prevents further access to the stock-holds table, and preserves that table temporarily for a non-destructive data audit. Later forward-only migrations add bounded inventory and Dashboard read models, repair grants and scoped access, and introduce branch supply-route provenance; they do not restore the retired Central Kitchen PR workflow.

A page may exist visually without its full workflow, validation, database integration, permissions, and downstream effects being complete.

### Operational

These modules are expected to support their primary working flow:

- Authentication and profile access.
- Supplier Master.
- Item Master.
- Stock Balance.
- Movement Ledger / Stock Transactions.
- Purchase Requests.
- Purchase Orders.
- Goods Receiving.
- Purchase Returns.
- Supplier Invoices.
- Stock Counts, Transfers, and Wastage.
- Outlet Daily Records for Central Kitchen quantities sent, Outlet Staff quantities received, wastage, and manager review.
- Products, Recipes / BOM, and Production Jobs.
- Company, Branch / Outlet, staff, and role administration.
- Private document attachments and activity history.
- Roles and permissions.

### MVP or In Progress

These modules may have working core flows while secondary cases remain incomplete:

- Dashboard.
- Pilot data onboarding and reconciliation.
- Export tools.
- Advanced stock reconciliation.
- Cross-module automation.

### Planned or Future Scope

The following areas are not considered complete unless later documentation explicitly states otherwise:

- Advanced accounts-payable forecasting and scheduled payment-alert delivery.
- Finance and general ledger.
- Full general-ledger accounting.
- Advanced business intelligence.
- Predictive demand and cash-flow forecasting.
- Automated replenishment.
- Full accounting reconciliation.

## Core Workflows

### Purchase Request to Purchase Order

The intended procurement flow is:

1. A user creates a purchase request.
2. The request is reviewed according to permissions and workflow rules.
3. An approved request may be converted or linked to a purchase order.
4. The purchase order becomes the formal purchasing record.
5. Receiving activity is recorded against the relevant purchase order where applicable.
6. Inventory is updated through controlled receiving or stock records.

Upstream information should be reused rather than re-entered manually.

### Goods Receiving

Goods receiving should:

- Reference the relevant supplier and purchasing document where available.
- Record actual received quantities.
- Preserve discrepancies rather than silently overwrite ordered quantities.
- Support attachments or evidence where implemented.
- Generate controlled inventory movement only after the receiving action reaches the required valid status.

### Supplier Invoice and Payment

The operational payables flow is `PO -> posted GRN -> supplier invoice -> partial/full payment`.

- Finance and Owner users create draft invoices from uninvoiced quantities on same-company posted GRNs for one supplier.
- Invoice lines preserve PO ordered quantity, received quantity, previously invoiced quantity, PO price, invoice price, and variance.
- Draft totals are calculated server-side and lock when the invoice is approved/open.
- Payments are atomic, idempotent, company-scoped, and move invoices through Open, Partially Paid, and Paid.
- Voiding requires permission and a reason; invoices with payment history cannot be silently voided.
- Invoice and payment actions never create inventory movement.
- AP Aging, live Payment Due Alerts, and the Cash Flow Forecast report current MYR exposure from Open and Partially Paid invoices. Missing due dates remain visible; bank cash-flow forecasting, General Ledger, bank reconciliation, Accounts Receivable, payment reversal, and scheduled alert delivery remain future scope.

### AP Aging

AP Aging uses the company-scoped database report from migration `061`. Outstanding is invoice total minus recorded payments, never below zero. Buckets are Not Due, Due Today, 1–30, 31–60, 61–90, 90+ Days Overdue, and Missing Due Date. The report uses the company timezone when available; the current schema has no company timezone field, so it falls back to `Asia/Kuala_Lumpur`. Users with Supplier Invoice view permission may view and export the same filtered dataset; reporting does not mutate invoices, payments, or inventory.

### Payment Due Alerts

Migration `062` extends the AP Aging RPC with a live, read-only attention summary. Priority is Missing Due Date, 91+ Days Overdue, 31–90 Days Overdue, 1–30 Days Overdue, Due Today, then Due within the next seven days. Within each group, higher outstanding balance comes first, followed by earlier due date. The same `supplier_invoice.view`, company isolation, MYR, and `Asia/Kuala_Lumpur` fallback rules apply. Alerts appear on the dashboard and invoice/AP Aging views; there is no email, SMS, push, Cron, read state, snooze state, or scheduled notification delivery.

### Cash Flow Forecast

The read-only Cash Flow Forecast reuses the complete AP Aging result rather than create another payable-balance calculation. It groups open positive balances into 7-day, 14-day, 30-day, and current-month views; overdue balances and missing due dates remain separate. Top-supplier totals and invoice drill-through use the same report date, payment deductions, company isolation, permission check, MYR currency, and `Asia/Kuala_Lumpur` fallback as AP Aging. It forecasts supplier payable pressure only: no bank balance, receipts, GL, payment automation, notification, or inventory mutation is implied.

### Stock Count and Reconciliation

Stock counts should:

- Use one canonical lifecycle only: `Draft → Confirm & Post`. There are no submit, review, or approval states in this workflow.
- Autosave edits locally and to the server Draft so refresh, idle timeout, temporary network failure, or recoverable application errors do not discard a user's completed work.
- Save the latest visible form values before `Confirm & Post`; a failed save must leave the record in Draft and must never partially post it.
- Be completed by each Branch / Outlet at the end of the operating day as the practical inventory truth for the next day.
- Record counted quantities separately from the ledger balance and show the variance.
- Require an explicit reconciliation or adjustment action.
- Preserve the original count and resulting adjustment record.
- Avoid direct editing of the stock balance.
- Drive low-stock alerts and purchase-request suggestions from the reconciled Branch balance.
- Allow a Branch to submit a purchase request on any day; Sunday is the normal weekly consolidation cadence, not a system restriction.

### Production

Production records are an optional operational and costing workflow during the MVP. They must not be required for inventory, stock count, goods receiving, wastage, transfer, or purchase-request operation.

When the kitchen is ready to record batches, production records should:

- Identify the production job.
- Record relevant input and output quantities.
- Preserve operational status and history.
- Generate controlled inventory movement for consumed inputs and completed outputs where implemented and explicitly posted.
- Avoid direct balance editing.

## Inventory Rules

Current stock is derived from controlled inventory movement records and reconciled against the latest approved Branch stock count. The latest approved physical count is the operational truth when kitchen production activity is not recorded daily.

No page should directly overwrite stock balance as a normal business action.

Inventory changes may be generated by:

- Goods receiving.
- Stock transfer.
- Stock adjustment.
- Stock count reconciliation.
- Production material consumption, when production is explicitly recorded.
- Production output, when production is explicitly recorded.
- Wastage.
- Returns.
- Other approved inventory movement types.

Corrections must be posted as a new stock movement or adjustment record so the audit history remains intact.

Calculated stock views must not become independent sources of truth.

### Outlet Daily Receiving and Wastage

Outlet Daily Records capture product Qty Sent, Received, Wastage, Wastage Reason, and Remarks by branch and date. Central Kitchen controls Qty Sent; Outlet Staff confirms Received and records Wastage; neither role can overwrite the other role's fields. The established Draft, Morning Recorded, Evening Completed, Reviewed, and Void database states remain compatible while the interface uses concise daily language. Reviewed records are locked; voiding requires permission and a reason. Assigned-branch scope remains authoritative. Outlet Daily Records remain data capture only: they do not post stock movements, change production jobs, forecast demand, or create BI metrics.

### Demand Trend Lite

Demand Trend Lite reports only Outlet Daily Records in Evening Completed or Reviewed state. It estimates movement as received minus leftover and wastage, never below zero, and shows coverage separately because missing or incomplete outlet-days do not represent zero demand. Sprint 7.13.1 labels coverage confidence and low-sample products without changing those totals. It is not POS sales, a production suggestion, or a forecasting engine, and it does not write inventory or production data.

### Production Planning Lite

Production Planning Lite turns the same reliable Demand Trend movement into a cautious planning reference. It applies visible target days, buffer, and rounding values, and marks low-confidence or low-sample products for manual review. HQ/kitchen must check incomplete outlet data; it does not create production jobs, post inventory, or forecast automatically.

### Production vs Outlet Demand Variance

Production vs Outlet Demand Variance compares received quantities, estimated movement, leftovers, and wastage from reliable Outlet Daily Records by product and outlet. It uses conservative over-/under-supply signals and inherits demand coverage confidence; it does not compare production jobs until a reliable posted-output join is available, and it performs no writes.

### Operations Control Center Lite

The Dashboard composes existing outlet health, demand confidence, variance, planning, inventory, and payable summaries. Each outlet/demand section can be unavailable without blanking the rest of the Dashboard. It is read-only; planning values remain references rather than production orders.

### Master Data Cleanup Lite

Master Data Cleanup Lite is a read-only checklist for duplicate or variant codes, missing core fields, and inactive referenced master records. It links to existing master pages for human review; it does not merge, delete, or modify any record.

### Costing Readiness Lite

Costing Readiness Lite is a read-only checklist for item costs, supplier prices, recipe ingredients, and product-to-recipe coverage. It identifies data gaps before any future margin or costing work; fixes remain manual and it does not recalculate or write costs.

### Recipe Costing Lite

Recipe Costing Lite is a read-only estimate for recipes using the normalized Item Master base-UOM `cost`. It does not substitute supplier prices or recipe-line values when conversion is unclear, and it leaves missing costs visible rather than treating them as zero. It does not write recipe, product, inventory, production, or finance records; margin remains future scope.

Sprint 7.19.1 makes UOM mismatches, missing costs, output gaps, and manual corrective actions explicit without changing the estimate calculation.

### Product Cost & Margin Lite

Product Cost & Margin Lite is a read-only estimate. It only uses a High-confidence active recipe cost and one unambiguous active packaging price; missing recipe, cost, UOM alignment, or price blocks margin rather than becoming zero. Pricing remains manual and no product, cost, margin, inventory, production, or finance data is written.

Sprint 7.20.1 labels non-positive margin as Review, not an automated pricing decision, and makes the product and recipe review paths explicit.

## Roles and Permissions

Seri Bako OMS uses permission-based access.

Roles are collections of permissions. A role name alone must not be treated as the final authorization rule.

Access control may include:

- Navigation visibility.
- Page access.
- Record viewing.
- Record creation.
- Record editing.
- Workflow approval.
- Cancellation or rejection.
- Export access.
- Administrative actions.
- Branch / Outlet or organizational restrictions where implemented.

Front-end visibility is not a security boundary.

Sensitive actions must also be protected through:

- Server-side authorization.
- Server action checks.
- Database row-level security.
- Controlled service-role usage.

Legacy or alias permission codes may be supported for compatibility, but canonical permission definitions should remain stable and documented.

## Product UX Direction

All UI and interaction implementation must follow `DESIGN.md`.

At a product level, the experience must remain:

- Clear.
- Fast.
- Consistent.
- Operational.
- Low-friction.
- Easy to scan.
- Reusable.
- Suitable for repeated daily use.

The system should not introduce new page structures outside the approved page skeletons unless the product architecture is intentionally revised.

Workflow actions should appear in the correct page context rather than as unrelated global actions.

## Data and Audit Expectations

Important operational records should preserve:

- Creator.
- Created time.
- Last updated time.
- Status history.
- Workflow actions.
- Comments.
- Attachments.
- Related upstream and downstream records.
- Inventory or document effects.
- Relevant user identity.

Destructive changes should be avoided where an auditable status change or reversal record is more appropriate.

## Role-aware Dashboard and Capability Hierarchy

`/dashboard` is the default authenticated landing page for all six active roles. It is one server-composed workdesk, not six routes: each role receives only the actionable queues, metrics, alerts, and links supported by its effective permissions and RLS-visible scope.

- Super Admin / Owner has company-wide business, finance, and protected system capability.
- Finance is the second-highest company-wide role. It combines read-level Manager and Purchasing operational visibility with AP, invoice, cash-flow, and payment capability. Its PR authority begins at Finance Review; it does not receive Manager Review, owner controls, or Purchasing mutations and cannot approve its own PR.
- Manager and Purchasing are sibling company-wide operational roles: Manager performs Manager Review across the company; Purchasing runs procurement and master-data workflows.
- Kitchen is limited to assigned Central Kitchen work; Outlet Staff is limited to the assigned outlet and today’s daily-record tasks.

Manager, Purchasing, Kitchen, and Outlet dashboards must never expose AP Aging, Cash Flow, aggregate debt, payment controls, Finance-only recipe costing, or Owner controls. Kitchen and Outlet dashboards must not expose operational information outside assigned branches.

## Out of Scope

Unless explicitly implemented in a later sprint, Seri Bako OMS does not guarantee:

- Full statutory accounting.
- Payroll.
- Tax filing.
- Bank reconciliation.
- Enterprise manufacturing resource planning.
- Customer-facing ecommerce.
- Public ordering.
- Franchise billing.
- Full point-of-sale functionality.
- Replacement of all external finance or HR systems.

## Definition of Done

A module is not complete only because its page exists.

A module is considered operationally complete when its intended core workflow has:

- A working entry point.
- Real database integration.
- Required validation.
- Correct server-side authorization.
- Required database policy protection.
- Clear status behavior.
- Correct downstream effects.
- Loading, empty, success, and failure handling at an MVP-appropriate level.
- Responsive behavior appropriate to its users.
- Consistency with `DESIGN.md`.
- Basic end-to-end validation.
- Updated documentation where the product scope or operating rules changed.

## Related Documentation

- `README.md` — local development and repository overview.
- `DEPLOYMENT.md` — production deployment, environment, migration, and recovery procedures.
- `ARCHITECTURE.md` — application architecture, data rules, permissions, and technical boundaries.
- `DESIGN.md` — application shell, page skeletons, visual system, components, and interaction standards.
