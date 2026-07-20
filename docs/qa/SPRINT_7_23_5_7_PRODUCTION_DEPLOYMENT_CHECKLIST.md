# Sprint 7.23.5.7 Production Deployment Checklist

This sprint does not authorize deployment, push, database push, or Production mutation.

## Before approval

- [ ] Confirm the approved release commit and a clean working tree.
- [ ] Review the v7.23.5.7 E2E matrix and all unresolved limitations.
- [ ] Confirm typecheck, zero-warning lint, contracts, production build, authenticated Playwright, accessibility checks, secret scan, and `git diff --check` passed locally.
- [ ] Confirm ignored screenshots, videos, traces, and reports contain no credentials or confidential values.
- [ ] Confirm Production environment variables and Supabase project identity without printing secrets.
- [ ] Query and record the Production migration ceiling and checksums for 071–075.
- [ ] Confirm a current backup/PITR recovery path and named rollback owner.
- [ ] Obtain explicit approval for application deployment and separate explicit approval for any migration or staff data change.

## Controlled deployment

- [ ] Push only after approval; do not combine deployment with staff correction.
- [ ] Apply only reviewed, missing migrations in numeric order and only with separate authorization.
- [ ] Do not edit an already-applied migration; use a reviewed corrective migration if needed.
- [ ] Reload PostgREST schema only when required by an approved database change.
- [ ] Deploy the exact approved commit to the intended Vercel project.

## Post-deployment verification

- [ ] Verify all six logins and role workdesks.
- [ ] Verify notification links and direct-route denials.
- [ ] Verify PR, PO, GRN, Supplier Invoice, and Daily Record read/action states without unsafe business mutation.
- [ ] Verify Items, Products, Recipes, Procurement, Inventory, Activity, and Staff boundaries.
- [ ] Verify 1440, 1024, 768, 430, 390, and 360 widths for overflow and action reachability.
- [ ] Verify account menu, filters, selects, dialogs, mobile sheets, focus behavior, and logout.
- [ ] Confirm no console/runtime errors and no stale loading state.
- [ ] Record the deployed commit, migration ceiling, approver, timestamp, and sanitized evidence location.

## Rollback trigger

Stop rollout and preserve evidence for any role leakage, broken workflow destination, migration mismatch, repeated write, authentication loop, or unavailable core workflow. Restore compatibility through the approved application rollback or forward corrective migration; never delete Production records to make validation pass.
