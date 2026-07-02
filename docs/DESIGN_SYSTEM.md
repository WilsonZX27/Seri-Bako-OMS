# Seri Bako OMS Design System

This document is the permanent UI reference for Seri Bako OMS. Use the approved Operations Workspace and KPI-style UI reference screenshots as guidance for spacing, hierarchy, grouping, card treatment, table density, form rhythm, and dashboard composition. Do not copy either reference pixel-for-pixel.

## Design Direction

Seri Bako OMS should feel clean, bright, modern, and enterprise SaaS-like. The interface should help operations staff scan quickly, understand where to go next, and take action without feeling crowded.

Prefer grouped workspace layouts over flat lists. Use tables when the page is mainly a list, report, queue, or transaction log.

The permanent visual direction merges:

- KPI-style information hierarchy, typography scale, table density, filter placement, and dashboard composition.
- Food Market Hub workflow simplicity for daily operations.
- Odoo-style document workflow clarity for PR, PO, GRN, and future ERP documents.
- Existing Seri Bako ERP business logic.

The Procurement Workspace remains the closest in-app reference for module landing pages. The newer KPI-style reference is the broader reference for page density, white space, forms, dialogs, filters, tables, and dashboard hierarchy.

When unsure, choose the simpler option. Avoid adding decorative UI just because space exists.

## Page Layout Rules

- Use section-based layouts for workspace, hub, and module landing pages.
- Start with a clear page header: title, one short description, and one primary action when applicable.
- Keep the primary action at the top right on desktop.
- Keep the primary action button dark green or teal.
- Group related tools into clear sections, but keep most surfaces white.
- Use a 4-column rhythm for action cards on wide desktop when space allows.
- Section panels can be arranged in a 2-column grid when there are multiple workflow groups.
- Avoid dense table-first pages unless the page is mainly a list, report, approval queue, or log.
- Keep repeated page patterns predictable across Procurement, Inventory, Reports, and Settings.
- Maintain generous vertical spacing between major sections.
- Place search and filters close to the table or list they control.
- Do not hide primary navigation targets below the fold or render target content inside landing pages.

## Section Panel Rules

Each section panel should include:

- Large icon badge.
- Section title.
- Short description.
- Related action cards inside the panel.
- Mostly white background with restrained tint only when it improves grouping.
- Rounded corners.
- Light border.
- Generous internal spacing.
- Action cards arranged inside the section rather than floating separately.
- Subtle borders and soft shadows, not heavy colored blocks.

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

Prefer mostly white cards. Icons, badges, status pills, and tiny tags should carry the accent color. Do not make full cards bright green, blue, yellow, or purple unless they communicate state.

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

Use Seri Bako brand colors:

- Deep Green for primary actions, success, and operational confidence.
- Warm Gold for caution, ordering, and attention states.
- Neutral Gray for structure, borders, secondary text, and calm enterprise surfaces.

Use subtle color themes per section only when they help orientation:

- Requesting: green.
- Receiving: blue.
- Ordering: amber or yellow.
- Supplier Master Data: purple.
- Inventory: green or teal.
- Reports: neutral or blue.
- Settings: neutral with restrained green or slate accents.

Color should communicate status, grouping, or priority. It should not decorate for its own sake.

Prefer:

- White cards.
- Light neutral panels.
- Accent-colored icons.
- Muted status pills.
- Small recommended-for tags.

Avoid:

- Large saturated section backgrounds.
- Colorful dashboards that compete with the data.
- One-off gradients or decorative color blocks.
- Introducing new colors outside the Seri Bako palette unless a status convention already requires it.

## Button Rules

- Primary page action: top-right, dark green or teal.
- Secondary actions: outline or subtle neutral buttons.
- Destructive actions: red only for clearly destructive operations.
- Keep button labels short and task-focused.
- Use icons when they improve scanning, especially for create, upload, scan, transfer, and report actions.
- Avoid multiple competing primary buttons in one page header.
- Place workflow submit actions consistently in the header or footer area of forms.
- Primary buttons should be visually obvious but not oversized.
- Secondary buttons should stay quiet and neutral.
- Table row actions should be compact.

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
- Keep forms in clean white cards with clear group headings.
- Use dialogs for lightweight creation or confirmation tasks.
- Dialogs should have a clear title, short description, grouped fields, and bottom-right primary action.
- Avoid long dense forms inside dialogs. If a task becomes large, use a full page.

## Table Rules

- Use tables for pages that are truly list, queue, report, log, or reconciliation oriented.
- Tables should have clear filters, search, status tabs, and obvious row actions.
- Do not force workspace landing pages into dense tables.
- Keep table headers short and scannable.
- Hide advanced columns by default when they are not needed for daily work.
- Use empty states that explain what to do next.
- Keep table density enterprise-friendly: compact enough for scanning, with enough row height for readability.
- Use status tabs above the table when workflow status is the main filter.
- Put search and common filters in a single bar directly above the table.
- Keep advanced filters secondary and visually quieter.
- Use subtle row hover, not heavy row decoration.

## Dashboard Rules

- Dashboard sections should prioritize operational scanning.
- Group quick tools above operating picture or summary widgets.
- Use compact insight cards for counts and exceptions.
- Keep dashboard widgets visually consistent with workspace cards.
- Avoid turning the dashboard into a report page.
- Surface exceptions such as low stock, pending approval, and today's receiving activity with clear counts.
- Prefer white cards with restrained icons and status colors.
- Use whitespace to separate major areas instead of large colored backgrounds.
- Keep recent activity, notifications, and assigned actions in Workspace Updates where possible.
- Use KPI-style composition for hierarchy, not decoration: clear cards, compact metrics, readable tables, and predictable filters.

## Spacing Rules

- Use generous page padding and consistent gaps between panels.
- Keep section panels visually separated.
- Keep action cards aligned and equal height where possible.
- Avoid cards inside cards unless the inner cards are the actual repeated action items.
- Keep descriptions short enough to prevent uneven card heights.
- Do not let text overflow buttons, cards, or compact panels.
- Use consistent card heights within each section.
- Let larger section panels breathe; do not fill every blank area with extra controls.
- Use consistent typography scale:
  - Page title: strongest hierarchy.
  - Section title: medium weight.
  - Card title: compact and clear.
  - Descriptions and metadata: muted, short, and secondary.
- Avoid oversized headings inside compact cards, tables, dialogs, or side panels.

## Sidebar Navigation Rules

- Sidebar navigation should remain calm, consistent, and enterprise-like.
- Use simple icons with text labels.
- Active state should be clear but restrained.
- Avoid decorative sidebar blocks.
- Keep version text small and subtle in the footer area.
- Brand/logo area should remain clickable and predictable.

## Dialog Rules

- Use dialogs for quick create, upload, confirmation, or short setup tasks.
- Keep dialog backgrounds white.
- Use section dividers or light grouped cards for multi-part dialogs.
- Primary action sits bottom-right.
- Cancel or close action must be available.
- Show friendly validation messages inside the dialog.
- Do not expose technical storage URLs, raw database fields, or implementation details.

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

Before implementing new UI, read this document first. Maintain consistency with the existing Procurement workspace and the approved visual references. If a new page feels like it is introducing a new product language, simplify it until it belongs inside Seri Bako OMS.
