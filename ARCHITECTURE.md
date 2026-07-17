# Seri Bako OMS Architecture

## Purpose

This document defines the technical architecture, system boundaries, authorization model, data principles, and implementation rules for Seri Bako OMS.

It is intended to keep future modules consistent as the system expands.

UI and visual implementation rules are defined separately in `DESIGN.md`.

## Architectural Goals

The architecture should support:

- Reliable daily operational use.
- Clear server and database boundaries.
- Permission-based access.
- Auditable operational records.
- Controlled inventory movement.
- Reusable page and workflow patterns.
- Incremental delivery.
- Safe Supabase migrations.
- Maintainable cross-module relationships.
- MVP-first implementation without unnecessary enterprise complexity.

## High-Level Architecture

Seri Bako OMS uses:

- Next.js for routing, layouts, server rendering, and application composition.
- TypeScript for application code.
- Supabase Auth for authentication.
- PostgreSQL through Supabase for operational data.
- Supabase Row Level Security for database access control.
- Server actions and server-side queries for protected business operations.
- Vercel for application deployment.

Conceptually:

```text
Browser
  |
  v
Next.js application
  |
  +--> Permission-aware UI
  |
  +--> Server actions and server queries
          |
          +--> Supabase Auth session
          +--> PostgreSQL
          +--> Row Level Security
          +--> Controlled service-role actions
```

## Application Layers

### Route and page layer

Location:

```text
src/app/
```

Responsibilities:

- Routing.
- Layout composition.
- Loading and error boundaries.
- Page-level data orchestration.
- Selecting the correct workspace or page skeleton.
- Passing server-derived data into components.

Pages should not duplicate domain logic that belongs in server actions, queries, or shared libraries.

### Component layer

Location:

```text
src/components/
```

Responsibilities:

- Shared application shell.
- Reusable UI components.
- Domain forms.
- Record workspaces.
- Document workspaces.
- Right-console panels.
- Workflow displays.
- Timelines.
- Status badges.
- Tables.
- Summary components.
- Attachments and comments.

Components must follow `DESIGN.md`.

### Server layer

Location:

```text
src/server/
```

Responsibilities:

- Authenticated queries.
- Server actions.
- Permission validation.
- Business operation orchestration.
- Controlled writes.
- Error normalization.
- Revalidation or refresh behavior.
- Cross-table transaction logic where required.

Sensitive business actions must not rely on browser-side permission checks.

### Library layer

Location:

```text
src/lib/
```

Responsibilities may include:

- Supabase clients.
- Authentication helpers.
- Permission utilities.
- Validation schemas.
- Formatting.
- Shared constants.
- Domain helpers.
- Compatibility aliases.
- Non-UI utilities.

### Database layer

Location:

```text
supabase/migrations/
```

Responsibilities:

- Tables.
- Relationships.
- Constraints.
- Views.
- Functions.
- Triggers.
- Sequences.
- Indexes.
- Row Level Security.
- Grants.
- Data migrations.
- Permission seed changes.

The migration history is the schema source of truth.

## Authentication Architecture

Supabase Auth provides user identity.

Application-specific user information is stored in profile or staff-related database records.

A valid auth user may require a matching application profile before full application access is granted.

Authentication flows may include:

- Login.
- Forgot password.
- Password reset.
- Invite callback.
- First password setup.
- Forced password change.
- Logout.

Authentication proves identity. It does not automatically grant permission to every module.

## Authorization Architecture

Seri Bako OMS uses permission-based authorization.

### Roles

A role is a named collection of permissions.

Examples may include:

- Admin.
- Manager.
- Procurement.
- Inventory.
- Production.
- Staff.

Role names are organizational shortcuts, not the final security rule.

### Permissions

Permissions represent specific capabilities such as:

- View.
- Create.
- Edit.
- Approve.
- Reject.
- Cancel.
- Export.
- Administer.
- Manage users.
- Manage roles.

Canonical permission codes should be stable.

Legacy aliases may be mapped for compatibility, but new code should prefer canonical permission definitions.

### Authorization layers

Authorization may be enforced at multiple levels:

1. Navigation visibility.
2. Route access.
3. Page data query.
4. Server action.
5. Database Row Level Security.
6. Controlled service-role operation.

No single front-end layer is sufficient on its own.

### Server-side authority

Server actions and database policies are the final authority for protected operations.

A hidden button does not secure an action.

A visible button does not guarantee the action is authorized.

### Service-role boundary

The service-role key bypasses Row Level Security.

It may only be used in controlled server-only operations that genuinely require administrative access, such as selected staff onboarding flows.

Routine user actions should use the authenticated user's session wherever possible.

## Data Architecture Principles

### 1. Operational records are traceable

Important records should preserve:

- Creator.
- Created timestamp.
- Updated timestamp.
- Current status.
- Status history.
- Related records.
- Comments.
- Attachments.
- Workflow actions.
- Inventory effects.
- Responsible users where relevant.

### 2. Avoid silent destructive changes

Prefer:

- Status transitions.
- Reversal records.
- Adjustment records.
- Cancellation records.
- Archived states.

Avoid deleting or overwriting business history without a trace.

### 3. Upstream and downstream records remain linked

Examples:

- Purchase Request to Purchase Order.
- Purchase Order to Goods Receiving.
- Goods Receiving to Stock Movement.
- Stock Count to Stock Adjustment.
- Production Job to input and output movements.

Do not copy data without preserving the relationship to its source record.

### 4. Derived views are not independent sources of truth

Examples:

- Stock Balance.
- Low Stock.
- Dashboard metrics.
- Module summaries.
- Reporting views.

These should be derived from authoritative operational records.

## Inventory Architecture

### Inventory source of truth

Inventory movement records are the authoritative history of stock change.

Stock balance is calculated from those records.

### Valid inventory movement sources

Inventory may change through controlled events such as:

- Goods receipt.
- Transfer in.
- Transfer out.
- Adjustment increase.
- Adjustment decrease.
- Stock count reconciliation.
- Production consumption.
- Production output.
- Wastage.
- Supplier return.
- Customer or internal return where applicable.

### Direct balance editing

Normal pages must not directly overwrite stock balance.

If a correction is required, the system should create an adjustment or reconciliation movement with:

- Reason.
- Quantity.
- User.
- Timestamp.
- Related record.
- Supporting note or evidence where required.

### Idempotency

Actions that generate inventory movement should avoid accidental duplication.

Where practical, movement records should preserve a unique relationship to the originating operational line or action.

Re-running the same server action should not silently post the same stock movement twice.

### Transaction boundaries

Multi-step stock operations should be atomic where inconsistent partial completion would create incorrect balances.

Examples:

- Confirming goods receiving and creating all related stock movements.
- Posting production consumption and output.
- Reconciling a stock count.

Use database functions or controlled transaction logic when required.

## Procurement Architecture

Purchase Requests and Purchase Orders are distinct records.

### Purchase Request

Represents internal demand or request for approval.

### Purchase Order

Represents the formal purchasing instruction to a supplier.

A purchase order may be created from an approved purchase request, but the records should remain linked rather than merged into one mutable document.

### Receiving

Goods Receiving records actual receipt.

Ordered quantity and received quantity must remain distinguishable.

Discrepancies should remain visible.

## Production Architecture

Production Jobs represent controlled production activity.

A production job may include:

- Planned quantity.
- Actual output.
- Input material usage.
- Output items.
- Start and completion state.
- Assigned location.
- Responsible user.
- Notes and attachments.
- Inventory effects.

Recipe and BOM architecture should not be assumed complete until explicitly implemented.

Production inventory movements must follow the same ledger rules as other stock operations.

## Workflow Architecture

Documents may have statuses such as:

- Draft.
- Submitted.
- Pending approval.
- Approved.
- Rejected.
- Cancelled.
- Partially completed.
- Completed.
- Closed.

The exact state machine depends on the module.

### Workflow rules

- Status changes must be explicit.
- Protected transitions require permission checks.
- Invalid transitions should be rejected server-side.
- Timeline or activity history should record meaningful transitions.
- Downstream effects should occur only at the correct status.
- Cancellation should not silently delete operational history.
- Reversal may require a new compensating record.

## Document Relationships

Where possible, related operational records should expose links in both directions.

Examples:

- A purchase order shows its source purchase request.
- A goods receiving record shows its purchase order.
- A purchase order shows related receiving records.
- A stock movement shows its source document.
- A production job shows related stock movements.

This reduces repeated searching and improves auditability.

## Validation Architecture

Validation should exist at the correct layers.

### Client validation

Used for:

- Immediate feedback.
- Required fields.
- Basic formatting.
- Preventing obvious invalid submission.

### Server validation

Required for:

- Trusted business rules.
- Permission checks.
- State transition rules.
- Cross-record validation.
- Quantity and status restrictions.
- Protected writes.

### Database constraints

Used for invariants such as:

- Foreign keys.
- Required fields.
- Unique values.
- Valid numeric ranges where appropriate.
- Referential integrity.
- Critical consistency rules.

Client validation must never be the only protection for important business rules.

## Error Handling

The system should provide enough error handling to keep core workflows reliable without delaying MVP completion through excessive diagnostic design.

Priorities:

1. Prevent incorrect data writes.
2. Preserve user input where practical.
3. Provide a clear actionable message.
4. Log sufficient server context without exposing secrets.
5. Avoid generic blank pages.
6. Defer non-critical edge-case polish to cleanup sprints.

Sensitive database or service-role details must not be exposed to users.

## Performance Principles

The system should avoid unnecessary repeated loading.

Preferred approaches include:

- Server-side data fetching where appropriate.
- Reusing data already loaded for the current workspace.
- Targeted revalidation.
- Avoiding redundant requests across center workspace and right console.
- Pagination or controlled limits for high-volume lists.
- Querying only required fields.
- Adding indexes for real query patterns.
- Avoiding expensive dashboard aggregation on every interaction.

Performance improvements should be evidence-based and must not compromise correctness.

## Application Shell and Page Architecture

The application shell and approved page skeletons are defined in `DESIGN.md`.

Architecturally:

- The sidebar is part of the persistent application shell.
- The topbar begins to the right of the sidebar.
- The center workspace and right console are separate shell regions.
- The right console is persistent, while its contents change by page type.
- Center workspace scrolling and right-console scrolling should remain independently stable where designed.
- New modules should use the approved Workspace, List, or Document/Form page skeleton.

## Supabase Migration Architecture

All schema changes must use versioned migrations.

Rules:

- Prefer additive changes.
- Add compatibility before removal.
- Backfill before enforcing strict constraints.
- Create corrective migrations instead of rewriting applied history.
- Include Row Level Security changes with the relevant schema change.
- Include required grants and permission seeds.
- Refresh PostgREST schema after applicable production changes.

See `DEPLOYMENT.md`.

## Static Pages and Incomplete Modules

A static page is not considered an operational module.

Before a module is marked complete, confirm:

- Real query integration.
- Real write integration.
- Server-side authorization.
- Required RLS policies.
- Validation.
- Workflow state.
- Downstream effects.
- Empty and loading states.
- Basic error handling.
- End-to-end manual validation.

Static pages may be retained as visual references, but they must not be mistaken for completed business functionality.

## Reporting Architecture

Operational dashboards and reports should derive from authoritative records.

Future reporting should support pluggable widgets and editable layouts where planned, but reporting work should not create duplicate sources of truth.

Metrics must define:

- Source records.
- Date basis.
- Status filters.
- Location scope.
- Currency or unit.
- Refresh behavior.
- Permission scope.

## Security Boundaries

The following are sensitive:

- Service-role key.
- Authentication tokens.
- Passwords and temporary passwords.
- Private attachments.
- Staff personal information.
- Administrative actions.
- Permission assignments.
- Company-wide exports.

Security requirements:

- Keep secrets server-only.
- Use authenticated sessions.
- Enforce permissions server-side.
- Use Row Level Security.
- Limit service-role operations.
- Avoid logging secrets.
- Avoid exposing raw internal errors.
- Review export permissions.
- Validate attachment access.

## Architectural Decision Principles

When choosing between solutions, prefer the option that:

1. Completes the core workflow.
2. Preserves data integrity.
3. Reuses existing architecture.
4. Requires fewer user steps.
5. Is easy to operate daily.
6. Is easy to validate.
7. Avoids premature complexity.
8. Can be extended later without discarding the core model.

## Documentation Responsibilities

Update documentation when a change affects:

- Product scope.
- Module maturity.
- Inventory rules.
- Workflow behavior.
- Permission architecture.
- Environment variables.
- Deployment order.
- Migration procedures.
- App shell or page architecture.
- Security boundaries.

Related files:

- `PRODUCT.md`
- `README.md`
- `DEPLOYMENT.md`
- `DESIGN.md`

## Sprint 7.5 staff permission resolution

Effective access is resolved from the permission catalogue as:

`active role grants + staff allow overrides - staff deny overrides`

An explicit deny wins across the legacy aliases supplied for one business capability. The database functions `has_any_permission(text[])` and `has_permission(text)` are the authoritative resolver for production authorization. The application uses that resolver for navigation, direct-route checks, and server-side permission guards; RLS remains the final data boundary.

Staff overrides are stored in `staff_permission_overrides` and mutated only through the atomic `set_staff_permission_overrides(uuid, jsonb)` function. The function requires `roles.update`, prevents cross-company changes and grant escalation, protects Super Admin/Owner access, and records an activity-log entry in the same transaction. Role assignments remain defaults; individual overrides do not modify the shared role definition.

The request middleware enforces mapped workspace permissions for direct navigation. This supplements, and never replaces, permission checks in server actions and database policies.

## v0.2.15 pilot baseline architecture

The pilot runs on the validated fixed-sidebar shell with a compact topbar, center workdesk, and persistent contextual right console. The same contextual actions become the mobile action bar/drawer without changing business placement.

Authorization is server authoritative: route middleware, layouts, pages, actions, navigation, and RLS resolve the effective permission model. Role grants are defaults, explicit staff deny wins, and private document attachments are served only through authorized application routes and Storage policies.

Procurement conversion uses the atomic PR-to-PO RPC from migrations 053–054. Its transaction creates the header and lines, links the source PR, preserves audit behavior, and relies on the one-active-PO-per-PR index for idempotency. Application code must not reimplement that transaction.

Pilot imports use the catalogue in `src/lib/imports/config.ts`. They follow preview, validation, explicit confirmation, and targeted route revalidation. Opening stock posts ledger transactions at the branch default location; it never writes a balance directly. Audit and reconciliation therefore read the operational tables and ledger instead of maintaining a second pilot data store.

## Supplier invoice and payment foundation

Migration `060` adds line-level GRN matching and database-authoritative invoice workflow functions. Draft save locks receiving lines before checking uninvoiced quantity; approval recalculates and locks totals; payment locks the invoice row, rejects overpayment, and uses a company-scoped idempotency key; void requires authorization and a reason. These `SECURITY DEFINER` functions use a fixed `search_path` and resolve the active actor and company internally. They do not write inventory tables.

The current purchasing model has one operating currency (MYR), so multi-GRN invoice currency compatibility is implicit. Add explicit PO/GRN currency columns before supporting another currency. AP Aging should derive from approved/open invoice due dates and outstanding balances rather than create a second payable balance.

## AP Aging reporting

Migration `061` adds one read-only, company-scoped `get_ap_aging_report` RPC. It aggregates payments, outstanding balances, aging buckets, supplier exposure, filters, and pagination in PostgreSQL. The function requires `supplier_invoice.view`, uses a fixed `search_path`, and performs no invoice, payment, or inventory writes. Open and Partially Paid invoices with positive balances are included; Draft, Paid, Void, zero, and negative balances are excluded. Missing due dates remain in a dedicated bucket. The current schema has no company timezone column, so the report date uses `Asia/Kuala_Lumpur`. UI and CSV export call the same RPC and filters.

## Payment Due Alerts

Migration `062` replaces the same `get_ap_aging_report` function definition forward-only and adds an `attention` result. This keeps one database-authoritative calculation path for balances, aging, permissions, company scope, and timezone. The dashboard consumes only the compact attention payload; AP Aging exposes filtered links and severity labels; eligible invoice details resolve their live row through the same RPC. The event-based notification tables and topbar read state are intentionally unchanged because live AP attention is not a delivered notification. No scheduled delivery or mutation is performed.

## Cash Flow Forecast

Sprint 7.11 adds no competing payable RPC or migration. The server retrieves all pages from `get_ap_aging_report`, then groups that already-authorized result by the RPC report date into 7-day, 14-day, 30-day, and current-month horizons. Overdue and missing-due-date exposure stay separate, while supplier aggregation and invoice drill-through share the same rows. Pagination happens after server-side forecast classification, so only the current detail page is rendered to the client. The report performs no writes and inherits active-staff, `supplier_invoice.view`, company, status, payment, currency, and timezone rules from AP Aging.

Migration `063` corrects the report join to match the actual supplier schema: suppliers have no `company_id`, while supplier invoices carry the authoritative company boundary. The RPC therefore joins the supplier by its referenced ID and continues to restrict invoice and payment records by the active staff company. Dashboard AP failure is isolated so unrelated operational sections still render.

## Outlet Daily Receiving and Wastage

Migration `064` adds company- and branch-scoped outlet daily headers and product lines. Authenticated reads require the module view permission and either explicit company-wide access or a matching `staff_branches`/default-branch assignment. All writes use fixed-`search_path` RPCs that recheck the active staff member, permission, company, branch, state transition, quantities, reasons, and duplicate outlet/date rule. Reviewed and Void records are locked from normal edits. The module intentionally has no stock-ledger, stock-balance, production-job, AP Aging, or Cash Flow write path; a later approved workflow must add any inventory posting as a separate auditable operation.

## Demand Trend Lite

Sprint 7.13 adds a server-side report query over the existing outlet daily headers and lines. The query uses the existing `outlet_daily_record.view` permission and RLS branch boundary, includes only Evening Completed and Reviewed records in reliable totals, and keeps draft/morning records in coverage warnings only. Sprint 7.13.1 derives compact coverage confidence, low-sample product labels, and outlets without completed records from the same read-only result. It has no RPC, migration, stock, production, AP, or Cash Flow write path.

## Production Planning Lite

Sprint 7.14 reuses the Demand Trend query and its permission/RLS scope. It derives a rounded suggestion from reliable movement, coverage, bounded target days, buffer, and rounding unit. Low confidence and low-sample products suppress the suggested quantity in favour of manual review. Sprint 7.14.1 clarifies the output as a planning reference requiring HQ/kitchen review. It adds no migration, RPC, production-job, inventory, AP, or Cash Flow write path.

## Production vs Outlet Demand Variance

Sprint 7.15 reuses the same read-only Demand Trend result and RLS branch scope to aggregate product/outlet rows. It classifies conservative leftover/wastage and low-leftover movement signals, while low confidence and low sample force manual review. Production Jobs are intentionally excluded because no trusted posted-output join is introduced. It adds no migration, RPC, or write path.

## Operations Control Center Lite

Sprint 7.16 composes the existing dashboard, outlet-record, demand, variance, planning, stock, and AP query outputs. Outlet and demand calls use independent settled results so one unavailable source leaves the other dashboard sections usable. It adds no dashboard framework, migration, or business write path.

## Operations Navigation & Smoke Polish

Sprint 7.16.1 keeps one direct sidebar path to Outlet Daily Records, a single Production hub path to Planning and Variance, and Demand Trends in Reports. It only clarifies navigation, copy, console order, and existing responsive table behavior; it adds no migration or business write path.

## Master Data Cleanup Lite

Sprint 7.17.3a keeps the existing Dashboard summaries and actions unchanged while improving metric readability and shared static-page controls. It adds no query, mutation action, RPC, or migration.

## Costing Readiness Lite

Sprint 7.18 adds a server-side, read-only report over existing items, supplier items, recipes, recipe lines, and products. It uses the existing `reports.view` boundary and current RLS-visible rows, with no new RPC, migration, or cost write path.

Sprint 7.18.1 only clarifies issue severity, manual corrective actions, and all-clear copy; it does not alter the report query or calculations.

## Recipe Costing Lite

Sprint 7.19 adds a server-side, read-only recipe estimate over existing recipes, recipe lines, products, and items. It requires `reports.view` and uses the current RLS-visible rows. The only automatic cost source is `items.cost` in the matching item base UOM; missing costs or unclear conversion make the estimate incomplete instead of zero. It adds no RPC, migration, or write path.

Sprint 7.19.1 exposes missing-cost and UOM-mismatch counts separately, with no calculation or data-source change.

## Product Cost & Margin Lite

Sprint 7.20 reuses the Recipe Costing calculation for active products. Only a High-confidence active recipe with matching product selling UOM and one active packaging price produces a cost and gross margin. Missing or ambiguous source data remains unavailable. It requires `reports.view` and adds no migration, RPC, or write path.

Sprint 7.20.1 only changes confidence presentation and review links; it leaves the data source and margin formulas unchanged.

Sprint 7.21 adds a server-side, read-only procurement variance query. It joins only existing document-line foreign keys and does not infer missing links or mutate procurement data.
