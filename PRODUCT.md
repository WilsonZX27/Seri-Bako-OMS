# Seri Bako Operations Management System

## Product Overview

Seri Bako Operations Management System (OMS) is an internal operations platform for managing Seri Bako's daily procurement, inventory, goods receiving, production, approval, staff access, and operational records.

The system is designed to replace fragmented workflows across spreadsheets, paper forms, WhatsApp messages, and disconnected records with a single operational source of truth.

Seri Bako OMS is not intended to be a full accounting ERP or a public-facing SaaS platform. Its primary purpose is to help internal teams complete routine operational work quickly, clearly, and consistently.

## Product Goals

Seri Bako OMS should:

- Reduce repeated manual data entry.
- Reduce dependency on spreadsheets, paper records, and WhatsApp follow-ups.
- Make document ownership, status, and next actions visible.
- Improve inventory accuracy across outlets, stores, warehouses, and production locations.
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

## User Groups

### Administrators

Administrators manage:

- Company settings.
- Users and staff accounts.
- Roles and permissions.
- Master data.
- System-wide operational visibility.
- Sensitive or restricted administrative actions.

### Managers and Approvers

Managers and approvers review and act on operational documents such as:

- Purchase requests.
- Purchase orders.
- Goods receiving records.
- Stock adjustments.
- Stock counts.
- Production jobs.
- Other approval-based records.

Their available actions depend on assigned permissions.

### Procurement Team

The procurement team manages:

- Suppliers.
- Purchase requests.
- Purchase orders.
- Purchasing follow-up.
- Supplier-related operational records.

### Inventory and Store Team

Inventory users manage:

- Stock balances.
- Stock ledger records.
- Stock transactions.
- Goods receiving.
- Stock counts.
- Stock transfers.
- Adjustments, wastage, and reconciliation records where available.

### Production Team

Production users manage:

- Production jobs.
- Production inputs and outputs.
- Production-related stock movement.
- Production status and operational records.

### General Staff

General staff may have limited access to view or create records relevant to their assigned role, outlet, department, or location.

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
- Stock Ledger.
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

A page may exist visually without its full workflow, validation, database integration, permissions, and downstream effects being complete.

### Operational

These modules are expected to support their primary working flow:

- Authentication and profile access.
- Supplier Master.
- Item Master.
- Stock Balance.
- Stock Ledger / Stock Transactions.
- Purchase Requests.
- Purchase Orders.
- Goods Receiving.
- Roles and permissions.

### MVP or In Progress

These modules may have working core flows while secondary cases remain incomplete:

- Dashboard.
- Stock Count.
- Production Jobs.
- User administration.
- Company Profile.
- Attachments.
- Comments and timeline.
- Export tools.
- Advanced stock reconciliation.
- Cross-module automation.

### Planned or Future Scope

The following areas are not considered complete unless later documentation explicitly states otherwise:

- Recipe and Bill of Materials.
- Production material planning.
- Supplier invoices.
- Accounts payable.
- Finance and general ledger.
- Full debtor and creditor management.
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

### Stock Count and Reconciliation

Stock counts should:

- Record counted quantities separately from current system balances.
- Show the variance between expected and counted stock.
- Require an explicit reconciliation or adjustment action.
- Preserve the original count and resulting adjustment record.
- Avoid direct editing of the stock balance.

### Production

Production records should:

- Identify the production job.
- Record relevant input and output quantities.
- Preserve operational status and history.
- Generate controlled inventory movement for consumed inputs and completed outputs where implemented.
- Avoid direct balance editing.

## Inventory Rules

Current stock must be derived from controlled inventory movement records.

No page should directly overwrite stock balance as a normal business action.

Inventory changes may be generated by:

- Goods receiving.
- Stock transfer.
- Stock adjustment.
- Stock count reconciliation.
- Production material consumption.
- Production output.
- Wastage.
- Returns.
- Other approved inventory movement types.

Corrections must be posted as a new stock movement or adjustment record so the audit history remains intact.

Calculated stock views must not become independent sources of truth.

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
- Location or organizational restrictions where implemented.

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