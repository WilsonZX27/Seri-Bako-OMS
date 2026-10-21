# v9.2.125 — local UI review candidate

This candidate applies the latest user annotations in the local workspace. Production and Vercel Preview are unchanged; the review target remains `http://127.0.0.1:3000`.

## Changes

- Production Planning tabs use a 36px desktop control inside the existing compact surface; touch layouts retain 44px targets. Sidebar group attention dots appear only while the group is collapsed, aligned at the trailing edge; expanded groups show item dots.
- Asset overview removes the “Assets by location” chart card. Its mobile action rail places Inspect a location and Report a problem in equal columns, respecting existing permissions. Inspection records no longer wrap their list and empty state in a second card. Transfer status stays inline where it fits; Stock Count date filters expand inline on tablet and remain in the sheet on phones.
- Purchase Request table headings use two lines without slash separators. The phone filter entry is icon-only, and the compact PR row retains full amount/date and wrapped supplier names.
- Goods Receiving keeps search, search action, filter icon and result count on one phone row. Tablet landscape navigation opens as a centered two-column panel. Dashboard actions stay in a right rail on portrait and landscape tablets, and pending PR metadata can wrap without clipping.
- “Mark as read” is an unframed icon action. Existing notification icon meanings and navigation remain intact.

## Local review evidence

- `docs/qa/2026-10-21-closure.md` records rendered local checks, screenshots observed in the browser, and unverified work.
- `npm run typecheck` and `git diff --check` passed after the source edits. No automated tests were added or run for this batch.
- Local Mock data verified the long supplier name and seven-digit amount, empty receiving/transfers/inspection states, and dashboard pending PR. Real tenant data, role-specific permissions, transaction actions and notification clearing against live data remain unverified.

This is a review candidate, not a release sign-off.
