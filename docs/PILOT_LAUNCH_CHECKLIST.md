# Seri Bako OMS Pilot Launch Checklist

Use this before enabling real daily pilot use. Keep the first pilot small and read-only where possible until opening stock and user access are confirmed.

## Before Launch

- Confirm the production URL: `https://seri-bako-oms-official.vercel.app` or the approved custom domain.
- Configure environment variables in the deployment target:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` as server-only
- Apply Supabase migrations through `050_sprint_7_2_33_supplier_permission_seed.sql`.
- Reload PostgREST schema after migration changes when required: `NOTIFY pgrst, 'reload schema';`.
- Confirm Supabase Auth redirect URLs include:
  - `/auth/callback`
  - `/set-password`
  - `/change-password`
  - the production wildcard URL
- Confirm production SMTP or the approved onboarding fallback is ready.
- Confirm owner login works and reaches Dashboard.
- Confirm pilot staff accounts exist, are linked to auth users, and have active roles.
- Confirm branch assignments for Purchasing, Kitchen / Production, Operations Admin, and first outlet staff where used.
- Confirm initial item, supplier, branch, recipe, and opening-stock data are ready.
- Confirm database backup or point-in-time recovery is available before go-live.
- Export critical data before first pilot day if production already contains setup data.

## First Pilot Scope

- Item and Supplier lookup.
- Low Stock monitoring.
- Purchase Request.
- Purchase Order.
- Goods Receiving.
- Stock Balance.
- Stock Ledger.
- Recipe lookup.
- Production Job.
- Stock Transfer.
- Stock Count.
- Write-Off.

Supplier Invoice and Purchase Return may remain available, but do not require every pilot user to use them on day one.

## Daily Pilot Checks

- Login and logout work for the owner and each pilot role.
- Sidebar and mobile drawer show only relevant modules.
- Stock balances look correct for the active pilot branches.
- Pending documents are visible to the staff who must act on them.
- Posting creates exactly one ledger movement.
- Refreshing a posted record does not duplicate stock transactions.
- Imports and opening stock are not confirmed twice.
- Completed records hide invalid repeat actions.
- Invalid routes show a handled page, not a blank screen.

## Issue Reporting

Capture this for every pilot issue:

- Screenshot.
- Page URL.
- Affected record number.
- Staff account and role.
- Action attempted.
- Expected result.
- Actual result.
- Severity: blocker, major, minor, or cosmetic.

## Severity Rule

P0 blocker:

- Cannot login.
- Core page unavailable.
- Stock posting incorrect.
- Duplicate stock movement.
- Data loss.
- Cross-company data access.
- Payment or amount corruption.

P1 major:

- Valid workflow cannot complete.
- Wrong permission blocks required staff.
- Wrong document status.
- Important data does not persist.

P2 minor:

- Confusing wording.
- Spacing issue.
- Missing timeline event.
- Non-critical mobile inconvenience.
- Inconsistent empty state.

P3 cosmetic:

- Alignment.
- Icon choice.
- Color nuance.
- Minor typography.

Do not stop pilot operations for P2 or P3 issues unless several users hit the same problem.

## QA Data Decision

Before real pilot use, choose one:

- Keep QA records in a dedicated test company or branch; or
- Manually remove QA records after backup and explicit approval.

Do not delete QA records casually. They may be linked to stock ledger, workflow, and audit history.
