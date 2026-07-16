# Seri Bako OMS Deployment Guide

## Purpose

This document defines the production deployment, environment configuration, Supabase migration, authentication, and recovery procedures for Seri Bako OMS.

Use this guide whenever a change affects:

- Database schema.
- Database views.
- Sequences.
- Functions.
- Triggers.
- Row Level Security.
- Permissions.
- Authentication redirect URLs.
- SMTP.
- Server-only environment variables.
- Vercel production configuration.

## Production Services

Seri Bako OMS currently depends on:

- GitHub or the approved source repository.
- Vercel.
- Supabase Database.
- Supabase Auth.
- Supabase Row Level Security.
- A production email or SMTP provider.

## Required Environment Variables

Configure the following in the target environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Security rules

- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
- Never prefix the service-role key with `NEXT_PUBLIC_`.
- Never commit production secrets.
- Never expose secrets through browser bundles, logs, screenshots, or user-facing error responses.
- Confirm Vercel environment variables are configured for the correct environment: Production, Preview, or Development.

## Recommended Production URL

```text
https://seri-bako-oms-official.vercel.app
```

Set:

```bash
NEXT_PUBLIC_APP_URL=https://seri-bako-oms-official.vercel.app
```

Use the actual production domain if it changes.

## Supabase Auth Redirect URLs

Add the required URLs in:

```text
Supabase Dashboard
Authentication
URL Configuration
```

Recommended production entries:

```text
https://seri-bako-oms-official.vercel.app/auth/callback
https://seri-bako-oms-official.vercel.app/set-password
https://seri-bako-oms-official.vercel.app/change-password
https://seri-bako-oms-official.vercel.app/**
```

Recommended local entry:

```text
http://localhost:3000/**
```

If a custom domain is introduced, add the equivalent callback and wildcard URLs before switching production traffic.

## Production Email and SMTP

Supabase's built-in email provider is rate limited.

Production staff onboarding and password recovery should use custom SMTP.

Configure:

```text
Supabase Dashboard
Authentication
SMTP Settings
```

Supported provider options may include:

- Company SMTP.
- Resend.
- SendGrid.
- Mailgun.
- Amazon SES.

After SMTP changes, test:

- Staff invitation.
- Password reset.
- Set-password redirect.
- Change-password flow.
- Sender name.
- Sender address.
- Spam delivery.
- Production callback URL.

Temporary-password onboarding remains a fallback or alternative workflow where implemented.

## Database Migration Source of Truth

All required database changes must be represented by versioned files in:

```text
supabase/migrations/
```

Do not rely on undocumented manual production changes.

A migration may include:

- Tables.
- Columns.
- Constraints.
- Indexes.
- Views.
- Materialized views.
- Functions.
- Triggers.
- Sequences.
- Grants.
- Row Level Security policies.
- Data backfills.
- Permission code changes.

## Standard Deployment Sequence

For the current project workflow, use this order when code changes depend on new migrations:

1. Review the code and migration together.
2. Push the approved code to the remote repository.
3. Apply Supabase migrations.
4. Reload the PostgREST schema where required.
5. Redeploy or refresh the Vercel deployment when required.
6. Validate the affected production workflow.

Commands:

```bash
git push
npx supabase db push
```

Then run in the Supabase SQL Editor when schema caching requires refresh:

```sql
NOTIFY pgrst, 'reload schema';
```

The repository owner may perform the push manually according to the project workflow.

## Why Deployment Order Matters

The application code and database schema must remain compatible.

Typical failure patterns include:

### Code ahead of database

Symptoms:

- Missing table.
- Missing column.
- Missing view.
- Missing function.
- Missing sequence.
- Relation does not exist.
- API schema cache error.

Cause:

The code was deployed before its required migration was applied.

Resolution:

1. Apply the missing migration.
2. Reload PostgREST schema.
3. Revalidate the affected page.
4. Redeploy only if the application environment or generated build requires it.

### Database ahead of code

Symptoms:

- Older code fails against changed constraints.
- Renamed fields are still referenced.
- Old permission codes no longer match.
- Removed views or functions are still called.

Resolution:

Deploy compatible application code or restore backward compatibility through a corrective migration.

## Migration Safety Rules

### 1. Prefer additive migrations

Where possible:

- Add new columns before removing old ones.
- Add compatibility views or aliases during transition.
- Backfill data before applying stricter constraints.
- Introduce canonical permission codes without immediately breaking legacy aliases.

### 2. Avoid destructive changes without a recovery path

Before dropping or renaming:

- Columns.
- Tables.
- Views.
- Functions.
- Sequences.
- Permission codes.

Confirm:

- No active code references them.
- Data has been backed up or migrated.
- A rollback or corrective migration is possible.

### 3. Never edit an already-applied production migration casually

Create a new corrective migration instead.

Changing the contents of an old applied migration can cause environment drift.

### 4. Validate Row Level Security

A successful migration does not prove that users can access the correct records.

Test with representative roles and permissions.

### 5. Validate service-role usage

Service-role actions must remain limited to controlled server-only flows.

Do not use service-role access to bypass normal authorization for routine user operations.

## Pre-Deployment Checklist

Before deployment:

- Confirm the correct branch and commit.
- Confirm required migrations exist.
- Review environment variable changes.
- Review authentication redirect changes.
- Review SMTP changes.
- Run lint.
- Run build.
- Check that new permission codes are seeded or migrated.
- Check that new tables have RLS enabled where required.
- Check that policies exist.
- Check that server actions validate permissions.
- Check that affected pages handle the new schema.
- Check that the visible sprint or footer version is updated when required.

Recommended commands:

```bash
npm run lint
npm run build
```

## Post-Deployment Validation

After deployment, validate the affected production flow.

At minimum:

- Login works.
- Auth callback works.
- Protected routes remain protected.
- Permission-aware navigation behaves correctly.
- A representative permitted user can perform the action.
- A representative restricted user is blocked.
- New tables, columns, views, and sequences are accessible.
- PostgREST schema is current.
- Records save correctly.
- Downstream effects occur correctly.
- Inventory movement is generated correctly where relevant.
- Comments, attachments, and timelines still load where relevant.
- No sensitive server error is exposed to the browser.

## Staff Onboarding Validation

Test at least one supported path:

### Invite flow

1. Admin creates or invites the staff user.
2. Email is delivered.
3. User opens the production redirect.
4. User sets a password.
5. User reaches the correct protected application area.
6. The matching profile, role, and permissions are available.

### Temporary-password flow

1. Admin creates the staff account.
2. Temporary password is shown only through the intended secure response.
3. User logs in.
4. User is forced to change the password where implemented.
5. User receives the correct role and permissions.

## Rollback and Recovery

Supabase migrations are forward-oriented.

Do not assume an automatic safe rollback exists.

When a deployment fails:

1. Identify whether the failure is application, environment, authentication, or database related.
2. Stop additional unrelated changes.
3. Preserve current data.
4. Deploy a corrective application change or new migration.
5. Restore compatibility rather than editing production manually without record.
6. Revalidate permissions and downstream effects.

For destructive migration failures, restore from the available Supabase backup or point-in-time recovery capability if enabled and appropriate.

## Common Production Issues

### Missing table, view, column, or sequence

Likely cause:

- Migration not applied.
- Wrong Supabase project.
- Schema cache not refreshed.

Actions:

```bash
npx supabase db push
```

Then:

```sql
NOTIFY pgrst, 'reload schema';
```

### Authentication redirects to localhost

Likely cause:

- `NEXT_PUBLIC_APP_URL` missing or incorrect.
- Supabase redirect URL missing.
- Production deployment still uses old environment values.

### Invite or reset email not arriving

Likely cause:

- Built-in email rate limit.
- SMTP not configured.
- Sender domain not verified.
- Email blocked or sent to spam.
- Redirect URL rejected.

### User can see a page but cannot perform an action

Likely cause:

- Front-end permission and server authorization are not aligned.
- Required permission was not assigned.
- Legacy and canonical permission codes differ.
- RLS blocks the underlying query.

### User can perform an action they should not

Treat this as a security defect.

Check:

- Server action permission validation.
- Database policy.
- Service-role usage.
- Role-to-permission assignment.
- Permission alias behavior.

## Environment Separation

Keep Production, Preview, and Development environments clearly separated.

Do not point a local or preview application at the production database unless intentionally performing an approved production test.

When multiple Supabase projects are used, label them clearly and verify the project URL before applying migrations.

## Deployment Ownership

The person performing deployment is responsible for confirming:

- The correct repository state.
- The correct Supabase project.
- The correct Vercel project.
- The correct environment variables.
- The required migration order.
- The post-deployment validation result.

Deployment is not complete when Vercel reports success. It is complete only after the affected operational workflow has been validated.

## v0.2.15 pilot baseline

The local application baseline is `v0.2.15` with migration ceiling `060`. Before pilot access, confirm the linked Supabase and Vercel projects, required environment variables, private `document-attachments` bucket and policies, effective-permission route rejection, and at least one active owner-class account. Apply `060` only after review and before deploying the supplier-invoice foundation code; validate draft creation, approval, partial/final payment, void rejection, company isolation, and unchanged inventory afterward.

## Sprint 7.9 AP Aging deployment

The Sprint 7.9 application baseline is `v0.2.17 / Sprint 7.9` with migration ceiling `061`. Review and apply `061_ap_aging_report.sql` once before deploying the AP Aging application code. Then verify Finance/Admin/Owner access, cross-company rejection, aging boundaries, missing due dates, partial-payment balances, supplier totals, filtered CSV totals, and the dashboard summary. Confirm the RPC performs no invoice, payment, or inventory mutation. Production remains on the previous behavior until migration 061 and the matching deployment are both live.

## Sprint 7.10 Payment Due Alerts deployment

The Sprint 7.10 application baseline is `v0.2.18 / Sprint 7.10` with migration ceiling `063`. Apply `061`, `062`, then `063` in order before deploying the matching application code. Verify Finance/Admin/Owner visibility, restricted-role and cross-company rejection, all due-date boundaries, priority ordering, dashboard counts/amounts, AP Aging filter links, eligible invoice detail status, MYR totals, and unchanged invoice/payment/inventory records. Confirm the global notification icon remains event-based and that no scheduled notification delivery exists.

Production installations that applied `061` and `062` must also apply `063_fix_ap_aging_runtime.sql`. Migration `063` removes the invalid runtime reference to `suppliers.company_id`; it does not mutate business data. Afterward, call AP Aging as an authenticated permitted user, confirm the report returns JSON, and verify the dashboard continues rendering even if the AP panel is unavailable.

## Sprint 7.11 Cash Flow Forecast deployment

The Sprint 7.11 application baseline is `v0.2.19 / Sprint 7.11` with migration ceiling `063`. No migration `064` is required because the forecast reuses the complete `get_ap_aging_report` result. Deploy the application only after `061`, `062`, and `063` are present. Verify an authenticated user with `supplier_invoice.view` can open `/supplier-invoices/cash-flow`; confirm 7-day, 14-day, 30-day, and current-month amounts against AP Aging; verify overdue and missing-due-date exposure remain separate; and confirm Draft, Paid, Void, zero, and negative balances are absent. Restricted and cross-company access must remain rejected, and no invoice, payment, inventory, notification, or Production business data should change during verification.

Use versioned migrations as the source of truth. If a migration must be applied through the Supabase SQL Editor, record the project ID, source filename, ledger result, and verification evidence; never edit an already-applied file. No pilot CSV should be imported until a backup/recovery path and an owner-approved rollback or correction procedure are known.

If CLI migration access fails because DNS or network resolution is unavailable, do not retry blindly. Use a controlled SQL Editor application only with explicit authorization, apply the reviewed migration once, and verify the migration ledger and live objects afterward.

Pilot rollback is operational rather than an automatic reverse migration: stop writes, preserve evidence, identify the last verified application and migration state, restore through the approved Supabase backup/PITR capability when necessary, and deploy only a reviewed compatible code change or corrective migration. Do not delete real records to make a failed check appear clean.
