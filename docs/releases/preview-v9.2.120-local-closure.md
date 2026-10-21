# Preview v9.2.120 — local closure batch

This batch is for Preview review. Production remains unchanged. The detailed annotation and verification ledger is `docs/qa/2026-10-21-closure.md`.

## Changes since v9.2.119

- Purchase Requests: clarify the permission-aware empty state, keep a single 56px phone create FAB, and give the 640–1279px server-rendered toolbar enough width to show its status and priority labels before the compact Filter layout takes over.
- Daily Records: explain the empty list according to create access and avoid showing fictitious zero totals when no historical completed day exists.
- Asset Management: group the six phone overview metrics into three columns with shorter labels; preserve 12px checklist guidance and asset names. Local asset registration, attendance, procurement, delivery and Activity Log reads now show explicit Mock states without altering production query branches or submit actions.
- Workspace Updates: center the existing button-style Activity Log action while keeping semantic 16px notification icons.
- QA: add explicit viewport-width and effective tap-area checks; record the current role-matrix drift rather than changing runtime permissions to satisfy stale assertions.

## Local verification

- 92 routes × 4 widths: 368 visits. No error boundary or document overflow; three navigation timeouts passed on a 12-visit focused rerun.
- Purchase Requests, Daily Records, Asset overview and Attendance at 360, 393, 768, 1180, 1279, 1280, 1399, 1400, 1440, 1535 and 1536px: 44 visits, with no navigation failure, error boundary or document overflow.
- Effective checkbox tap targets at 320/390px: four checked states, none below 44px.
- Lint and TypeScript checks pass. The full contract suite reports 1,661/1,663 passing; two older role-matrix assertions still expect the former Kitchen access model. The current UAT matrix lacks Chef and differs from current navigation on 16 parent destinations.

## Review limits

Local checks use Mock or synthetic data. Populated records, non-Owner roles, save/approval flows, live attention-dot clearing, notification delivery, and performance on authenticated Preview remain unverified. The shared list header still has a small layout shift below 1280px during hydration. This Preview is not a production release or a full historical-annotation sign-off.
