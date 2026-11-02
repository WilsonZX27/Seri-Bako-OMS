# New21 combined candidate verification

Product source tested: ad85f60295f631037ceb5bfd1e4849f6d8361a93. Subsequent delta consists only of this report, notification source-audit clarification, and supplied month-range test/report. No new production UI or SQL change in this final delta.

## Executed
- Combined targeted suite: 16/16 pass (`ad85-targeted.log`).
- Added month effective-range test: 1 node:test case passes, containing the six author query/aggregation/link checks; not six separate node:test cases (`month-contract.log`).
- Production build succeeds (`ad85-build-fixed.log`). First build lacked NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; corrected run uses a noncredential local placeholder, not real credentials.
- Current combined source rendered at 390/820/1440 in isolated worktree `/tmp/oms-new21-render-final-20261102`, localhost3497. Fifteen full-page captures and DOM overflow checks saved under `/tmp/oms-new21-20261102/handoff/`; all inspected. All document overflow deltas zero. Desktop app has an internal scrolling main region, so a fullPage capture is not evidence for every offscreen row.
- ODR populated actual components in app shell: compact quantities, responsive reason/comment, one-decimal summary, selected-period wording. Narrow layouts wrap intentionally; desktop inline behavior remains covered by author's targeted screenshots.
- RO full actual page: pending correction precedes balances, badge centered at mobile/tablet, visible action controls. Stores full actual page: desktop three-field movement row, tablet two columns, phone stacked controls. Their original mock queries reject real-client creation; isolated read-only synthetic query replacements were used exclusively in render worktree. No real business actions invoked and no fixtures committed to candidate.
- Asset full page: mock empty inspections, desktop equal-height panels. Dynamic 8→9-location/populated pagination evidence is reused from author's prior current-component checks, not rerun on real data.
- Planning full page: existing mock empty-plan view. Populated yield/input/adjust/header 390/820/1024/1440 author evidence remains separate; this run does not claim a populated combined planning visual pass.

## Limits and pending decisions
- Original live Reject/claim error response remains missing; no proven online root cause. Synthetic role/RPC evidence is not real multi-role acceptance.
- AST example versus AT numbering is unresolved; AT remains off, no historical backfill.
- Arbitrary additional sales money fields need business mapping; existing fixed15 settings remain the delivered scope.
- New21 has not been pushed or deployed. Notification SQL requires a separate specific approval, hash and impact recorded in new21-notification-review.md. No actual external duplicate scheduler was identified; residual cross-producer race is documented, not an indefinite hypothetical blocker.
- Real Purchasing/Chef/Outlet read-only coverage, populated combined Planning screen, and live new21 visual acceptance remain outstanding. Existing57fb Owner reads do not substitute for these.

Evidence is development synthetic rendering; Next development indicator is visible in captures. No real credentials, role grants, SQL installation or production promotion occurred in these checks.
