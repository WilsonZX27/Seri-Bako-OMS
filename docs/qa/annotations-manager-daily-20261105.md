# User annotations — 2026-11-05 (batch 7)

Base 4dd4cce. Screenshots are user evidence; no business records changed.

1. RO: user explicitly approved Manager review within authorised branches, no self-review. Migration 274 revoked Manager comp_time.approve; current live permission check uses SQL, not mock matrix. A grant alone is unsafe: original decide function checks company and self-review but lacks a general branch guard. Prepare scoped SQL before installation. OT reconciliation must remain People/Owner.
2. Daily reason: keep four shared quantity tracks; food_daily uses spare final track at container >=36rem; narrower layout retains full-row reason. Other comment remains below reason; carryover has Tomorrow in final quantity track, so details remain below.
3. KG review: two recorded measurements are separate from posted inventory due unresolved historical KG/CTN baseline. No conversion or stock correction inferred from product name or zero measurement.
4. Packaging: summary/store workspace is Owner-only in page, server query/action and SQL. Manager can read outlet report; changing independent-store access needs explicit scope decision, not a UI-only unlock.
5. Attendance: stable two-column desktop action grid replaces variable right-aligned flex wrapping; mobile flex retained.
6. Remove visible rate suffix only; calculations unchanged. Cross-unit Daily totals remain a separate high-priority investigation.
7. Publika: authenticated Preview read-only confirmed Wastage enabled; More options contains only Void. Record morning_recorded + Qty Sent Pending falls through primary buttons and gates Save on confirmed. Restore Confirm Qty Sent for authorised actor in that state and Save Changes for outlet editor. No change to backend permission, reviewed/void lock or historical Usage.

Verification pending; no Preview or Production acceptance claimed.

## Checkpoint

- Local 32 targeted checks passed before final RO scope/copy regression. 10 isolated PGlite checks against actual SQL candidate and original decision function passed: assigned approve/reject, reason, self-review, foreign/null branch, missing permission, Owner/People continuity, cross-company denial. Fixture identity helpers are not live policy verification.
- Manager candidate uses explicit staff_branches membership, because the legacy general branch helper treats Manager as company-wide. OT reversal remains separately guarded. No live SQL installed; capture live preimage/ACL and verify company/role before installation.
- User subsequently authorises Manager management of specified independent stores; exact store and Manager assignment requested and pending. No all-store grant. Requires store-specific backend scope, not only page visibility.
- Full build passed before last scope/copy changes. Final build pending.
- Cross-unit issue confirmed from source: Daily totals do not use unit snapshots; historical unit provenance incomplete. Do not attach current product unit to old totals. Safe follow-up needs a versioned summary contract returning per-unit groups only with provenance; otherwise unavailable, with rates only within the same verified population/unit. Raw lines remain untouched. Not fixed by removing the rate suffix.

## Final local verification

40 targeted Node tests pass; 10 isolated RO checks pass; 28 existing carryover full-save-chain checks pass (fixture identities and previously captured function bodies, not a fresh production hash check). Final Next production build passes, including TypeScript. Existing fonteditor dynamic dependency and production-sheet unused-index warnings remain. Focused changed-source lint and git diff whitespace checks pass.

Synthetic browser layout at 1440×900 / 430×932 used the actual owning Daily container CSS with fictional fields: ordinary-food reason occupies final desktop column; Other comment below; mobile and carryover details retain full row. This is not authenticated updated Preview visual acceptance. Attendance grid and weight copy still require updated Preview visual confirmation.

Production untouched. RO SQL is review-only and not auto-installed; installation requires live preimage/ACL check and action-time permission-expansion confirmation. Packaging assignments pending exact names.
