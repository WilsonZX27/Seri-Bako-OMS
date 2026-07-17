# Seri Bako Operations Management System

Seri Bako Operations Management System is an internal operations platform for procurement, inventory, goods receiving, production, approvals, staff access, and operational records.

For product scope and operating principles, read `PRODUCT.md`.

For UI and interaction standards, read `DESIGN.md`.

## Current Pilot Baseline

- Application release: `v0.2.26 / Sprint 7.18.1`.
- Database migration ceiling: `065_fix_outlet_evening_completion_validation`.
- Pilot preparation is documentation and operator readiness only; it does not change the application release.
- Start with `docs/PILOT_BASELINE.md`, use the controlled CSV files in `docs/import-templates/`, and record sign-off in `docs/PILOT_QA_CHECKLIST.md`.

## Technology Stack

The application is built with:

- Next.js.
- TypeScript.
- Supabase.
- PostgreSQL.
- Supabase Auth.
- Supabase Row Level Security.
- Vercel for production deployment.

Refer to `package.json` for the current framework and library versions.

## Requirements

Before running the project locally, prepare:

- Node.js supported by the current project.
- npm.
- A Supabase project.
- A local `.env.local` file.
- Access to the required database migrations.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Copy environment variables

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### 3. Configure environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Environment variable rules

`NEXT_PUBLIC_SUPABASE_URL`

- Public Supabase project URL.
- Available to browser and server code.

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

- Public Supabase publishable key.
- Available to browser and server code.
- Database access must still be protected by Row Level Security.

`NEXT_PUBLIC_APP_URL`

- Canonical application URL.
- Recommended for production authentication redirects.
- Example:

```bash
NEXT_PUBLIC_APP_URL=https://seri-bako-oms-official.vercel.app
```

`SUPABASE_SERVICE_ROLE_KEY`

- Server-only secret.
- Never prefix it with `NEXT_PUBLIC_`.
- Never expose it to browser code.
- Used only for controlled administrative server actions such as staff account setup where required.

### 4. Apply database migrations

Follow `DEPLOYMENT.md` for the correct migration process.

Do not assume the database is current only because the application code is current.

### 5. Configure authentication

Configure the required Supabase Auth redirect URLs and production email provider.

See `DEPLOYMENT.md`.

### 6. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Common Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test:e2e
```

Additional commands may exist in `package.json`.

Before adding new scripts, confirm that an equivalent project script does not already exist.

## Repository Structure

```text
src/
  app/              Routes, layouts, pages, and route-level composition
  components/       Shared UI, layout, workspace, and domain components
  server/           Server actions and server-side queries
  lib/              Supabase clients, validation, permissions, and utilities

supabase/
  migrations/       Versioned database migrations

public/              Static public assets
```

The exact route and component list changes frequently. Do not use this section as a complete module inventory.

For current product modules, read `PRODUCT.md`.

## Application Areas

The application includes or is actively developing:

- Dashboard.
- Suppliers.
- Items.
- Purchase Requests.
- Purchase Orders.
- Goods Receiving.
- Supplier Invoices and partial/full supplier payments.
- AP Aging with supplier exposure, due-date buckets, and filtered CSV export.
- Live Payment Due Alerts on the dashboard, AP Aging, and eligible supplier invoices.
- Cash Flow Forecast with 7-day, 14-day, 30-day, and current-month payable pressure from the AP Aging source.
- Outlet Daily Records for morning receiving, evening leftovers, wastage, and review without inventory posting.
- Demand Trend Lite from completed/reviewed Outlet Daily Records, with coverage confidence and low-sample labels, without inventory or production writes.
- Production Planning Lite for cautious one-day guidance from reliable Demand Trend movement, without production or inventory writes.
- Production vs Outlet Demand Variance for read-only received, movement, leftover, and wastage signals.
- Operations Control Center Lite on the existing Dashboard, composed from existing read-only operational summaries.
- Master Data Cleanup Lite: a read-only checklist linking data-quality issues back to existing master pages.
- Stock Transactions and Stock Ledger.
- Stock Balance.
- Low Stock.
- Stock Counts.
- Production Jobs.
- Company Profile.
- Users and staff.
- Roles and permissions.
- Comments, attachments, and activity history where implemented.

Module availability depends on permissions and implementation status.

## Pilot Data Onboarding

Import only through the application's preview-and-confirm workflow. Use stable codes and resolve row errors before confirmation; the importer does not silently create missing suppliers, items, branches, roles, or UOM conversions.

Recommended order:

1. Suppliers.
2. Items.
3. Supplier-item purchasing records where needed.
4. Products where recipes or production require them.
5. Recipes through the supported application form; there is no recipe CSV importer.
6. Opening stock last, with explicit posting confirmation.

Opening stock uses `branch_code`; the application resolves that branch's default internal location. Preview each CSV and remove its placeholder example row before any pilot import.

The repository does not seed or assume dummy business records for production. Suppliers, Items, Products, Recipes, supplier mappings, and opening balances must be deliberately onboarded and reconciled.

## Authentication and Staff Onboarding

Seri Bako OMS supports Supabase Auth.

Production staff onboarding may use:

- Email invitation.
- Password reset.
- Temporary-password account creation.
- Forced password change on first login.

Supabase's built-in email provider is rate limited and should not be the only production onboarding method.

Configure custom SMTP for reliable production use.

Suggested providers include:

- Company SMTP.
- Resend.
- SendGrid.
- Mailgun.
- Amazon SES.

Never send temporary passwords or service-role secrets through logs, browser-visible responses, or public error messages.

## Authorization

The application uses permission-based access.

Roles contain permissions, but role names alone are not the final security boundary.

Authorization may be enforced through:

- Permission-aware navigation.
- Route checks.
- Server action checks.
- Server-side queries.
- Supabase Row Level Security.

Hiding a button or navigation item does not secure an action.

See `ARCHITECTURE.md`.

## Inventory Rule

Stock balance must be derived from controlled stock movement records.

Do not implement normal workflows that directly overwrite stock balance.

Corrections should create a new adjustment or inventory movement record.

See `PRODUCT.md` and `ARCHITECTURE.md`.

## Development Rules

### Follow the established design system

All new pages and components must follow `DESIGN.md`.

Do not invent unrelated page layouts, status systems, action placement, or color usage.

### Reuse existing components

Before creating a new component, check whether the project already contains a suitable:

- Workspace component.
- Record workspace.
- Document workspace.
- Timeline.
- Status badge.
- Workflow component.
- Summary card.
- Form control.
- Data table.
- Right-console panel.

### Preserve permission checks

Do not rely only on front-end hiding.

Any sensitive server action must validate the current user's permission.

### Use migrations for database changes

Do not make undocumented production-only schema changes.

Every required schema change should be represented by a versioned migration.

### Keep changes focused

Prefer one sprint or change set with:

- One main objective.
- Clear scope.
- Clear validation.
- Minimal unrelated refactoring.
- Updated footer or visible sprint version where required by the project workflow.

## Validation Before Handoff

At minimum, run the relevant checks available in the repository:

```bash
npm run lint
npm run build
```

Also validate the affected workflow manually when possible.

For database-related work, confirm:

- The migration exists.
- The migration was applied to the intended environment.
- PostgREST schema is refreshed where required.
- Required permissions and RLS policies work.
- The application does not assume unavailable tables, views, columns, or sequences.

## Deployment

Production deployment and migration procedures are documented in:

```text
DEPLOYMENT.md
```

Do not improvise the order of code deployment and database migration for schema-dependent changes.

## Documentation Map

- `PRODUCT.md` — product scope, operating principles, module maturity, and business rules.
- `README.md` — local setup and development overview.
- `DEPLOYMENT.md` — deployment, migrations, environment configuration, and recovery.
- `ARCHITECTURE.md` — technical architecture, authorization, inventory ledger, and system boundaries.
- `DESIGN.md` — UI/UX system, app shell, layouts, visual rules, and reusable components.
