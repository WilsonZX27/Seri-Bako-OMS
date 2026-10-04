## v9.2.82 (unreleased) — actionable plan review groups

The existing Plan checks console composes shared ConsoleSection/Button with native disclosure groups for Settings, quantities, Manager reasons and production balance. Exact product/outlet messages remain accessible, and the current-date/kitchen Settings link is shown only when configuration is incomplete. Unsaved edits never display Ready for review. Review and database gates are unchanged; no CSS, motion, permission or database changes. The business composition lives in production-planning-review-checks.tsx; generic components retain their existing ownership. Production remains v9.2.81 with 324, 326 and 327 applied, 325 pending. Formal v9.2.82 verification is not yet complete.

## v9.2.81 (deployed) — partial manual drafts / migration 327 applied

Draft save preserves unknown allocation quantities and tray counts as NULL, separately from explicit zero; submit/release remain blocked until quantities, minimums, yields and whole-tray balance are complete. Invalid numeric ranges and fractional trays are rejected at the action and database boundaries. The transactional function preserves its permission checks, locking, idempotency, audit and strict review rules. Manual-only generation skips unusable eight-week history; mixed same-day plans retain full food-record completeness checks. No grant or RLS policy change. Production is v9.2.81 with migrations 324, 326 and 327 applied; 325 remains unapproved. Guarded migration 327 applied independently after live function/source comparison, preserving ACLs, SECURITY DEFINER and owner. The old function reproduced the failure; 63 isolated PostgreSQL flow checks and 1,387 regressions pass. No local Supabase or production operational UAT writes. Deployment 8ZTxPzEZnK9tbjGiQJpb18TWrhPq completed successfully and is aliased to https://system.seribako.com.my. Authenticated Owner Planning reports v9.2.81; unknown quantities remain blank and review stays blocked. At 390/820/1180/1440px the document has no root horizontal overflow. No operational records were written.

## v9.2.80 (deployed) — selected-period Packaging reads

Packaging requests only the selected 7/30-day report once; outlet/product filters remain local. A period change performs server navigation, preserves client filter identity, and shows shared loading states instead of treating an unrequested month as missing or zero. Failures use ErrorState with the shared RetryButton, preserving the workspace URL. Latest closing stock remains independently returned by the existing report RPC, including records older than the selected period. No RLS, grant or inventory change. Deployment 2zJb5RgYqK5DR4haWDXcBwBGtrwS succeeded and is aliased to https://system.seribako.com.my. Database 324 and 326 are applied; 325 remains pending. Strict TypeScript, lint, hosted build and 1,385 regressions passed.

## 2026-10-04 current verified release — v9.2.79 / database 324 + 326 (325 pending)

Deployment `6DUNX69vZnWaH7RBRZAuisokn4WX` succeeded and the formal alias is https://system.seribako.com.my. Commit `0103a2f9` passed strict TypeScript, lint, hosted build and 1,381 regressions. Owner-authenticated checks verified the corrected Plan phone drawer, product-order guidance and focus restoration, and Packaging at 390/820/1180/1440px without root overflow. The phone inline filter card is 130px high with no empty primary row. Earlier release evidence below is historical; the larger QA goal remains open, including database performance/permissions, provenance and complete workflow/a11y acceptance.

## Database eligibility follow-up — migration 326 applied independently

Repository migrations reviewed through `326`; production ledger includes 324 and 326; 325 remains unapproved.

A disposable PostgreSQL fixture reproduced expired-but-active staff reading and configuring Planning through the legacy helpers. Migration 326 aligns planning_manager, planning_branch_access and planning_require_manager with the existing current_staff_id eligibility gate; Malaysia employment end dates remain inclusive. It changes no ACL, policy declaration or operational quantity. The fixture verifies ended/inactive/anonymous denial, eligible current-day/open-ended staff, and unchanged ACLs, SECURITY DEFINER flags and ownership. The production-planning integration suite passes 52 checks with 326. Migration 326 was applied in a guarded transaction and independently read back. Original function hashes matched preflight; ACLs, SECURITY DEFINER flags and owners were unchanged. The authenticated Owner still opens the editable draft. Production is application v9.2.79 with 324 and 326 applied; 325 remains unapproved. Future approved db push must include the earlier 325 with --include-all; do not assume a contiguous applied-through version.


## 2026-10-04 verified production authority — v9.2.78 / database 324

Deployment `D2xa7BFBHrLG57s2d9n8SHNypRhB` succeeded and is aliased to https://system.seribako.com.my. Owner-authenticated production checks covered Plan, Settings, Events, Daily Records, Insights, the canonical DO list and Packaging at 390/820/1180/1440px without root overflow. Phone Plan actions opened successfully; Escape closed the drawer and restored trigger focus. Strict TypeScript, lint, hosted build and 1,377 regressions passed. These are surface checks, not complete workflow or WCAG certification. See docs/qa/OMS_PRODUCTION_REWORK_2026-10-04.md for evidence and unclosed gates. Database remains 324; prepared 325 and the live packaging RLS experiment are pending specific permission authorization.

## v9.2.79 (deployed) — provenance and shared phone filters

Candidate removes the blank primary row from shared inline phone filters, keeps unconfirmed packaging usage blank, and orders review checks by the displayed product/outlet sequence. Actual component render tests distinguish explicit zero from absent confirmation and preserve zero result counts. No database policy, grant, quantity or inventory change is included. This candidate was deployed and verified as recorded in the current release authority above.

## Historical v9.2.78 candidate — actionable validation

Event quantity validation opens the product section, shows the shared inline error and focuses its first quantity input before any action call. Native invalid quantities also reveal the section. Shared action errors classify schema-cache diagnostics as unavailable and keep internal table names in server logs. Six added server-action tests cover invalid/no-write boundaries, role denial, explicit zero minima, empty recipients and truthful unavailable-mail feedback. Production remains v9.2.77 until deployment is verified in the QA ledger.

## Historical verified release — v9.2.77

Application deployment `HDzwJWpTrajQF5ErPL2p1vP57ciE` completed and aliased to https://system.seribako.com.my. Hosted production build, strict TypeScript, lint and 1,359 regressions passed. The production login screen independently reports v9.2.77. Authenticated workflow and remaining device acceptance are pending; database remains migration 324, with 325 prepared and unapproved. Historical candidate and acceptance entries below are retained as dated evidence, not overall closure.

## v9.2.77 application candidate — scoped reads

Planning context loads current-tab dependencies; Settings/Events do not hydrate plans, DOs or email queues. Existing kitchen authorization results are reused. Plan version metadata remains available for the selector, while only the chosen version’s snapshots, allocations and products are hydrated. Forecast line reads select required fields and use at most four independent chunks concurrently, retaining exact pagination. No report cache crosses users or suppresses RLS. Migration 325 remains pending explicit production permission authorization. Current production database remains 324.

## 2026-10-04 authenticated closure authority — v9.2.76

Repository migrations reviewed through `325`; forward-only migration 历史已到 `325`. Migration 325 is prepared and rollback-tested but NOT applied: explicit production permission approval is pending. Production remains applied through 324. Migration 324 repairs draft-recalculation SQL aliases without changing authorisation or workflow. Owner UAT identified the failure; the expanded isolated fixture now covers recalculation, removal of obsolete allocations and preservation of reasoned manual quantities/trays. Production v9.2.76 is deployed (8u2otQahGNK3w3XXh7hdbat2mLtx); migration 324 is applied and live draft recalculation passed. Authenticated Owner surface checks and outstanding configuration dependencies are recorded in docs/qa/OMS_FEATURE_CLOSURE_2026-10-04.md; historical entries below do not define current deployment state.

## 2026-10-04 closure baseline — v9.2.75 candidate

Code, applied database migrations, production deployment and authenticated acceptance are separate evidence. Production deployment EmWcZ4wEdPU7Wqjs1P56x65SKA1L completed after an initial upload failure; authenticated acceptance remains pending. Repository migrations reviewed through `323`; linked Production ledger verified through `323` on 2026-10-04. Migration 323 adds reviewed per-product demand basis. Application deployment and authenticated acceptance remain separate gates.

Daily Records owns input/list, Insights and Delivery Orders tabs. Old DO list links redirect. WorkspaceGrid, WorkspaceTabs, FilterBar, Table, SelectControl, ModalShell and system-state primitives are the reusable owners; feature components compose them. No route-specific visual system is permitted. Responsive acceptance covers 390, 820, 1180 and 1440px, keyboard focus, 44px touch controls and reduced motion.

Production recommendations are a daily quantity proxy, never POS sales. Same-day eligibility must be explicitly confirmed per kitchen/product. Multi-day or unknown shelf-life requires Manager quantity; expiry wastage may exceed today's receipt with a food reason. Approval, production and dispatch remain distinct; only confirmed effective DOs populate source-locked Qty Sent. Received, Wastage and POS remain independently entered. Inventory posting stays in the existing production workflow.

Packaging uses one RLS-preserving report RPC; list and optional Insights reads stay separate. Missing, recorded zero, loading, empty and unavailable are distinct. Email needs a configured provider and recipients; an outbox entry is not proof of delivery. Hobby daily scheduling starts after 20:00 Malaysia time, within the provider's scheduling window; exact configurable execution needs a compatible scheduler rather than misleading UI promises.

# Seri Bako OMS Architecture

## Historical repository baseline (v9.2.69)

The repository contains migrations through `300_stock_balance_summary`. Production deployment and migration evidence remain separate and are recorded in the current QA ledger; this architecture document never infers Production state from the repository alone.

The application shell uses dynamic viewport sizing (`dvh`) instead of a fixed
`100vh` contract. Mobile-safe content reserves space for bottom navigation and
sticky action rails, so browser chrome changes do not clip the work area. The
Next.js App Router exposes `src/app/manifest.ts` as a standalone portrait PWA
manifest. The optional Cordova wrapper is edge-to-edge with fullscreen and
status-bar overlay preferences; it is not an authorization boundary.

Operational reads must distinguish an unavailable query from a real zero.
Dashboard and Inventory surfaces render an explicit unavailable state when a
source query fails. Inventory balances remain derived from posted ledger
movements. Mutation forms use server-side permission checks and synchronous
client locks where a repeat click could create a second request.

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

Path:

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

Path:

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

Path:

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

Path:

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

Path:

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

Current authoritative scope baseline (v7.23.7.0 / migration 103): Super Admin, Finance, Manager, and Purchasing have company-wide operational scope; Kitchen and Outlet Staff are assigned-branch scoped. Inventory is owned by Branch/Outlet rather than a secondary Location dimension. PostgreSQL RLS and server guards are the authorization boundary. Older sprint notes below are historical.

### Roles

The role catalogue is fixed: `super_admin`, `finance`, `manager`, `purchasing`, `kitchen`, and `outlet_staff`. Migration 071 archives legacy role rows after guarded assignment conversion. Roles are system-controlled defaults, not user-created configuration.

`super_admin`, `finance`, `manager`, and `purchasing` have company-wide scope. `kitchen` and `outlet_staff` use assigned Branches / Outlets; Kitchen assignments are restricted to Central Kitchen branches and Outlet Staff assignments to outlets. The default Branch / Outlet is context only. `staff_branches`, the temporary compatibility scope mapping described in the Sprint 7.23.5 legacy ledger, server guards, and RLS remain the authorization boundary.

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

Production Jobs represent optional controlled production activity. The MVP does not require the Central Kitchen to enter a production job every day. Daily Branch stock count and reconciliation remain sufficient to keep operational inventory and procurement working.

A production job may include:

- Planned quantity.
- Actual output.
- Input material usage.
- Output items.
- Start and completion state.
- Assigned Branch / Outlet.
- Responsible user.
- Notes and attachments.
- Inventory effects.

Recipe and BOM architecture should not be assumed complete until explicitly implemented. Missing recipes must not block stock count, goods receiving, wastage, transfers, or purchase requests.

Production inventory movements must follow the same ledger rules as other stock operations.

The normal operating cadence is nightly Branch stock count, low-stock review, and a weekly Sunday purchase-request consolidation. Purchase requests remain available on any day for urgent or exceptional replenishment; Sunday is a planning cadence, not a permission or validation rule.

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
- Branch / Outlet scope.
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

## Sprint 7.23.1 canonical information architecture

`src/lib/information-architecture.ts` is the canonical registry for role-aware navigation labels, parent groups, permissions, Administration cards, breadcrumbs, and default landing order. Desktop and mobile sidebars consume the same registry. Route permission mapping adds only dynamic/create-route and compatibility-alias exceptions.

Canonical routes include `/administration`, `/administration/backups`, `/imports`, `/document-sequences`, and `/uom-conversions`. The retired `/settings`, `/settings/backups`, `/administration/imports`, `/data-onboarding`, `/quick-tools`, and `/daily-operations` surfaces have no route files, navigation entries, or compatibility redirects; requests must not be reintroduced as aliases. `/procurement/purchase-requests` and `/stock-balances` remain narrow legacy aliases to their canonical destinations while existing bookmarks are being retired. `/setup` remains an unaffiliated bootstrap-only route because the authentication bootstrap RPC is still live; it creates the first protected Owner and never appears in navigation.

Procurement, Inventory, Production, and Administration hubs remain only where they provide operational summaries, queues, or permission-aware management context. The former Quick Tools and Daily Operations link-only hubs are retired and must not be recreated.

## v0.2.15 pilot baseline architecture

The pilot runs on the validated fixed-sidebar shell with a compact topbar, center workdesk, and persistent contextual right console. The same contextual actions become the mobile action bar/drawer without changing business placement.

Authorization is server authoritative: route middleware, layouts, pages, actions, navigation, and RLS resolve the effective permission model. Role grants are defaults, explicit staff deny wins, and private document attachments are served only through authorized application routes and Storage policies.

Procurement conversion uses the atomic PR-to-PO RPC from migrations 053–054. Its transaction creates the header and lines, links the source PR, preserves audit behavior, and relies on the one-active-PO-per-PR index for idempotency. Application code must not reimplement that transaction.

Pilot imports use the catalogue in `src/lib/imports/config.ts`. They follow preview, validation, explicit confirmation, and targeted route revalidation. Opening stock posts ledger transactions for the selected branch; it never writes a balance directly. Audit and reconciliation therefore read the operational tables and ledger instead of maintaining a second pilot data store.

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

Sprint 7.23.5.1 adds migration 074 as a local-only forward migration. It introduces canonical `products.display_order`, seeds the approved product-code ranges, and adds `outlet_daily_record_lines.qty_sent`. The Daily Record save RPC enforces field ownership: Kitchen may change Qty Sent for assigned branches, while Outlet Staff may change Received, Wastage, reason, and remarks. Existing workflow statuses and reviewed/void locks remain unchanged. Recipe/BOM table RLS is reduced to Owner and read-only Finance. Production roles no longer read recipe tables directly; `get_production_recipe_options()` exposes only the active snapshot required to create a production job. Purchase Request list, detail, pending actions, dashboard, and notifications continue to converge through PR RLS plus the same assigned `staff_branches` scope.

## Operations Control Center Lite

Sprint 7.16 composes the existing dashboard, outlet-record, demand, variance, planning, stock, and AP query outputs. Outlet and demand calls use independent settled results so one unavailable source leaves the other dashboard sections usable. It adds no dashboard framework, migration, or business write path.

## Role-aware dashboard composition

Sprint 7.23.2 makes `/dashboard` the canonical landing route for every active role. The page remains a single route and a single composition component. `getDashboardSummary` resolves the authenticated staff scope first, then starts only the independent query groups required by that role. PostgreSQL RLS remains authoritative for company and assigned-branch visibility; the component receives already-scoped server data and does not fetch hidden role panels on the client.

Finance is company-wide and receives the read-level operational union of Manager and Purchasing plus its existing finance capabilities. Manager remains assigned-branch operational oversight; Purchasing remains company-wide procurement/master-data execution. They are sibling operational responsibilities, not an escalation chain. Migration `072` adds only the missing Finance read grants and Manager Review fallback, creates explicit item/supplier view permissions, and installs a PR status trigger that rejects requester self-approval. It does not grant owner controls or Purchasing mutations and changes no business rows. Migration `073` adds the Sprint 7.23.5 governance grants and company-scoped RLS for staff, Branch / Outlet, and document-sequence administration without changing business rows.

Payables queries execute only for Owner and Finance. Outlet and Kitchen workdesks rely on RLS-scoped daily-record, procurement, stock, and production queries. Optional sources degrade to useful empty/unavailable states without blanking the page.

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

## Procurement document evidence gates

Sprint 7.23.4 reuses the existing `documents` and `attachments` tables and private attachment actions; it adds no schema, RPC, RLS, role, or permission change. PR creation still saves a draft before the database-authoritative transition RPC submits it. PR-to-PO conversion remains the existing atomic conversion RPC and the supplied AutoCount PO number remains the resulting PO number.

Posting a draft Goods Receiving now checks for an active document attachment before inventory movement. When a supplier DO is genuinely unavailable, the authorized poster must provide an exception reason; that reason is written to the document activity log before the posted event. Already-posted historical records are not revalidated or mutated.

Supplier invoice approval now checks for an active document attachment before calling the existing approval RPC. The check changes no invoice calculation or finance permission: Purchasing can save details and manage permitted attachments, while only the existing Finance-authorized action can open the invoice. Attachment removal continues to use the document status lock, so approved and posted evidence cannot be silently replaced.

### Shared mobile action validation — v9.2.78

Right Console submits an external page form exactly once with its real submitter before unmounting the drawer. Native validation and the page form own error focus; internal drawer forms and prevented button actions retain their existing behavior. Esc closes the drawer and restores the More actions trigger. Inert phone checks covered invalid event, valid event, bulk minimum Enter and settings save. React hook/component review found no added network reads, dependencies, motion system or duplicated business state.

Plan checks now identify the product/outlet and required correction instead of a generic issue count. Shared domain checks distinguish missing from zero, manual adjustment reasons, confirmed-event quantities, minimum/reduction reasons, configured yields, whole trays, retention and surplus/shortfall. Database authorization, current-route/configuration checks and approval remain authoritative; these client checks do not replace them. Default forecast settings stay in Settings rather than repeating in the action rail.
