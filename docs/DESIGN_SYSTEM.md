# Seri Bako OMS Design System

This document is the permanent UI reference for Seri Bako OMS. Use the Operations Workspace visual reference as guidance for spacing, hierarchy, grouping, card treatment, and color mood. Do not copy the screenshot exactly.

## Design Direction

Seri Bako OMS should feel clean, bright, modern, and enterprise SaaS-like. The interface should help operations staff scan quickly, understand where to go next, and take action without feeling crowded.

Prefer grouped workspace layouts over flat lists. Use tables when the page is mainly a list, report, queue, or transaction log.

The Procurement Workspace screenshot is the preferred visual reference for hierarchy, grouping, panel spacing, soft card treatment, and subtle color usage.

## Page Layout Rules

- Use section-based layouts for workspace, hub, and module landing pages.
- Start with a clear page header: title, one short description, and one primary action when applicable.
- Keep the primary action at the top right on desktop.
- Keep the primary action button dark green or teal.
- Group related tools into large soft background panels.
- Use a 4-column rhythm for action cards on wide desktop when space allows.
- Section panels can be arranged in a 2-column grid when there are multiple workflow groups.
- Avoid dense table-first pages unless the page is mainly a list, report, approval queue, or log.
- Keep repeated page patterns predictable across Procurement, Inventory, Reports, and Settings.

## Section Panel Rules

Each section panel should include:

- Large icon badge.
- Section title.
- Short description.
- Related action cards inside the panel.
- Soft background tint based on the section theme.
- Rounded corners.
- Light border.
- Generous internal spacing.
- Action cards arranged inside the section rather than floating separately.

Recommended section structure:

- Header area at the top of the panel.
- Action cards below the header.
- Cards aligned to a consistent grid.
- Empty space is acceptable when a section has only one action.

Avoid placing unrelated workflows in the same section just to fill space.

## Action Card Rules

Each action card should include:

- Icon badge.
- Title.
- One to two lines of description.
- Optional small recommended-for tag.
- Consistent height across cards in the same section.
- Rounded corners, soft shadow or light border, and clear hover state.

Action cards should feel calm and scannable. Avoid dense copy, crowded controls, or mixed card styles inside the same section.

Action card descriptions should explain the job, not the implementation. Good examples:

- "Create, review, and convert branch purchase requests."
- "Record goods received against purchase orders and post stock safely."
- "Upload supplier pricing and item references with preview validation."

Avoid long paragraphs or instructional text inside action cards.

## Icon Badge Rules

- Use a large badge for every section header.
- Use a smaller badge for every action card.
- Badge colors should match the section theme.
- Use simple line icons from the project icon library.
- Keep icon badges square or softly rounded, with enough padding to feel deliberate.
- Do not use decorative icons that do not help users scan the workflow.

## Color Theme Rules

Use subtle color themes per section:

- Requesting: green.
- Receiving: blue.
- Ordering: amber or yellow.
- Supplier Master Data: purple.
- Inventory: green or teal.
- Reports: neutral or blue.
- Settings: neutral with restrained green or slate accents.

Color should support grouping, not dominate the page. Prefer tinted backgrounds, soft icon badges, and small tags over heavy saturated panels.

## Button Rules

- Primary page action: top-right, dark green or teal.
- Secondary actions: outline or subtle neutral buttons.
- Destructive actions: red only for clearly destructive operations.
- Keep button labels short and task-focused.
- Use icons when they improve scanning, especially for create, upload, scan, transfer, and report actions.
- Avoid multiple competing primary buttons in one page header.
- Place workflow submit actions consistently in the header or footer area of forms.

## Form Rules

- Use a clear header/status/action area for transactional forms.
- Keep key document status as a pill or stepper, not an editable dropdown unless the user is intentionally changing status.
- Keep main details in a focused section before line items.
- Put repeating line items in their own section.
- Keep submit actions predictable: header action for quick save, footer action for long forms.
- Prefer searchable selectors for large master data lists.
- Auto-fill known item data where possible so staff only enter what changed.
- Do not show internal implementation placeholders such as auto-number sentinels. Use "Auto-generated on submit".
- Only show urgency or exception fields when relevant.

## Table Rules

- Use tables for pages that are truly list, queue, report, log, or reconciliation oriented.
- Tables should have clear filters, search, status tabs, and obvious row actions.
- Do not force workspace landing pages into dense tables.
- Keep table headers short and scannable.
- Hide advanced columns by default when they are not needed for daily work.
- Use empty states that explain what to do next.

## Dashboard Rules

- Dashboard sections should prioritize operational scanning.
- Group quick tools above operating picture or summary widgets.
- Use compact insight cards for counts and exceptions.
- Keep dashboard widgets visually consistent with workspace cards.
- Avoid turning the dashboard into a report page.
- Surface exceptions such as low stock, pending approval, and today's receiving activity with clear counts.

## Spacing Rules

- Use generous page padding and consistent gaps between panels.
- Keep section panels visually separated.
- Keep action cards aligned and equal height where possible.
- Avoid cards inside cards unless the inner cards are the actual repeated action items.
- Keep descriptions short enough to prevent uneven card heights.
- Do not let text overflow buttons, cards, or compact panels.
- Use consistent card heights within each section.
- Let larger section panels breathe; do not fill every blank area with extra controls.

## Procurement Example

Group Procurement into:

- Requesting: Purchase Requests, Create PR.
- Ordering: Purchase Orders.
- Receiving: Goods Receiving.
- Supplier Master Data: Suppliers, Supplier Items, Import Supplier Items.

Use green for Requesting, amber for Ordering, blue for Receiving, and purple for Supplier Master Data.

Preferred Procurement layout:

- Two-column section grid on desktop.
- Requesting and Receiving in the first row.
- Ordering and Supplier Master Data in the second row.
- Bottom Quick Insights row with safe counts when available.
- Create PR remains the top-right primary action.

## Inventory Example

Group Inventory into:

- Stock Operations: Stock Count, Stock Transfer, Stock Wastage.
- Stock Visibility: Stock Balance, Stock Card, Low Stock.
- Inventory Setup: Items, UOM Conversions, Opening Stock.

Use green or teal section treatment. Keep operational actions prominent and reporting/detail pages calmer.

Inventory landing pages should favor grouped cards for tools, but inventory balances, stock cards, and transaction history can remain table-based.

## Reports Example

Group Reports into:

- Operational Reports.
- Inventory Reports.
- Procurement Reports.
- Finance or Audit Reports when available.

Use neutral or blue styling. Reports can be more list-like, but the reports landing page should still use grouped panels.

Report result pages may be table-first. Report landing pages should still use grouped cards.

## Settings Example

Group Settings into:

- Company & Branding.
- Branches & Locations.
- Staff, Roles & Permissions.
- Numbering & System Preferences.

Use neutral styling with subtle accents. Keep admin setup separated from daily operations so staff-facing pages stay simple.

Settings can be quieter and more neutral than operations pages. Avoid bright colors unless they identify a clear group.

## Future Application Rule

Do not refactor the whole app just to match this document. Apply this standard gradually when a sprint explicitly touches a page or module.
