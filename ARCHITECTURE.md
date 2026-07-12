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