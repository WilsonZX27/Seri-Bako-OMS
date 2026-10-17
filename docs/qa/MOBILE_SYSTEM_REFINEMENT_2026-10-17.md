# Mobile system refinement — 2026-10-17

Local candidate only. No production deployment, production data change, Google upload or paid API call. Changes extend the existing `codex/ui-consistency-20261016` branch.

## User comments mapped to implementation

|Comments|Change and shared scope|
|---|---|
|1|ProductForm now has mobile inner padding. Shared Field automatically marks a single required child, covering Product, Recipe and other consumers.|
|2|Earlier UnifiedListHeader fix retains the short visible Search placeholder and full accessible label. Production remains unchanged until release.|
|3|Shared phone filter is icon-only, transparent and borderless, with a 44px touch target, accessible name and active-count badge. Competing old CSS and the 104px grid column were corrected.|
|4|Right-console and navigation sheets now portal to body. Source scan also found and corrected the stock-balance basket/conflict dialog and tablet sidebar. Existing document sheets and ModalShell already portal. Legacy anchored filters retain form ownership and suppress bottom chrome while open.|
|5|Removed additive mobile console margins; one 12px gap separates sections.|
|6|Shared phone pagination omits its duplicate summary row while retaining Previous, Next, page jump and accessible row count.|
|7–8|Removed install promotion and its unused event/guide code. Profile and danger-colour Logout now share a row in mobile navigation. Standalone manifest support remains.|
|9–10|Set all as checked uses the primary green button. Shared asset checklist choices combine labels/icons, green Checked, pale-red Damaged/Missing, pale-yellow Needs Maintenance and a selected outline.|
|11|No speculative quantity repair. The current submit function does not write holding.quantity; blank optional counts stay null only in inspection records. Local authenticated E2E preserves registered quantity 12 across submission/reload. The import converter explicitly preserves empty source Qty as null. Actual production history is not available through current tools, so the reported production root cause is unresolved.|
|12|Migration 361 locks the tenant/location row, rejects a different submission for the same date, permits exact retries and rejects changed retry line sets. It never updates registered quantities. UI checks prior submissions, explains the once/day rule and replaces the form after success. Partial selection consumes the daily submission, explicitly explained before submission.|
|13|General repair has a wrench icon and shared warning guidance surface.|
|14–15|Maintenance note spans the row, Status and Save align below it, labels use the same size, history remains visible in a padded section.|
|16–18|Author and reference are visible, history and attachments are distinct sections, upload is always visible in a muted card. Essential context is not hidden behind disclosures.|

## Fifth Gemini review

- Consolidated required markers, mobile task titles and Product padding into shared rules above.
- Empty Product/Ingredient dependencies now have recovery guidance; unavailable recipe prerequisites disable creation.
- Recipe title matches navigation; mobile ingredient search spans the row. Desktop tables expose horizontal scroll affordances.
- Rejected the inference that a still image proves absence of skeleton animation: the existing skeleton has a 1.35s animation and reduced-motion handling.
- Supplied batch contained four routes × two widths = eight primary screenshots, plus two scroll evidence images, not eight distinct logical pages.

## Evidence and coverage

Evidence lives in the task's `audit-evidence/mobile-system/` directory, outside application source.

- 10 representative routes × 390/430/768 = 30 UI checks, no document overflow or obscured More actions sheet in these checks.
- All 92 non-dynamic app routes attempted at 430×932: 76 checked, 16 fixture-unavailable. Dynamic route templates and all role/state combinations are not claimed as fully tested.
- 16 unavailable mock routes: activity, administration/system-health, asset-management and its assets/new, maintenance/new, transfers/new pages; attendance/imports, review, schedule, settings; outlet-daily-records/delivery-orders; production/delivery-orders; purchase-returns and new; supplier-invoices and new. Actual local-auth asset location/checklist/maintenance routes were additionally tested using synthetic records.
- Recipe table at 1024/1280/1440 scrolls internally (612/572/444px measured scroll range), no document overflow. 320px recipe form also has no document overflow.
- Filter computed transparent background, 0px border, 44px width. Filter and PR basket hit tests pass after animation completion.
- PostgreSQL: exact retry does not duplicate; a second submission ID for the same date is rejected; another date is allowed; blank physical count preserves holding quantity 12. Concurrent independent requests produced exactly one success and one rejection.
- Local real Auth E2E: submit, reload to already-submitted state, navigate to holdings and verify quantity 12; author and attachment upload visible without disclosure.
- lint, TypeScript and 1637 contract tests passed. Production build passed with local placeholder configuration; no deployment.

## Remaining production investigation

Action pending: read the affected production outlet's asset holdings, original Qty, check records and quantity-confirmation/master-update history. Reason: this execution environment exposes no authenticated production database/browser read tool. This is an access limitation, not a denied action and not proof of corruption. No production repair was attempted. The exact stored old/new values must be established before any correction.

The UI and database guard are local changes; migration 361 must accompany a later release. No claim is made that the formal site already contains these changes.
