# Preview v9.2.121 — review follow-up

This is a consolidated Preview batch. Production remains unchanged. The full annotation and verification ledger is `docs/qa/2026-10-21-closure.md`.

## Changes since v9.2.120

- Improve the contrast of workspace page-header descriptions on their pale surface without changing approved type sizes or other muted text.
- Let Attendance task descriptions and long NGTeco import filenames wrap inside their cards on narrow screens.
- Make the Attendance Overview import action open the existing import workflow directly in the Review page.
- Include every fetched permission-scoped actionable notification destination in navigation attention, while keeping the popover limited to five visible rows.

## Local verification

- Page-header color and visibility checked at 393, 768, 1180 and 1440px; scoped contrast calculation is about 4.88:1 on the workspace header surface.
- Attendance description checked at 320, 360, 393, 768 and 1440px; a long import filename stayed within its card at 320, 393, 768 and 1440px.
- Import action navigated to `/attendance/review?import=1#import-punches` and opened the existing import panel. Direct loads at 320, 360, 393, 768 and 1440px kept its heading visible without page overflow.
- Full lint, TypeScript and optimized build pass. The build retains a `fonteditor-core` dynamic-dependency warning from the delivery-order export route and webpack cache-size warnings.
- The complete contract suite reports 1,661/1,663 passing. The two older route-matrix assertions still expect the former Kitchen role model; neither is caused by this batch. The focused navigation/notification contracts pass 3/3.

## Review limits

Authenticated Preview checks remain needed for populated records, non-Owner permissions, actual import submission, notification delivery, and attention-dot clearing after work is completed. The shared list header's small hydration shift below 1280px and the older Kitchen/Chef route-matrix drift remain open. This version is not a full historical-annotation sign-off.
