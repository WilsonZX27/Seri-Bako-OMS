# Annotation-derived UI rules

> Workflow review: the Ready-to-post rule below and the direct-Posted rule in §5 conflict if read as universal. Their current scope and later decision remain unverified; follow the [Daily workflow open decision](rules/contracts.md#daily-workflow-decision-still-open) before changing posting behavior. The newer Daily form-specific instruction removes its Details control only; general progressive disclosure elsewhere remains applicable.

## 2026-09-04 mobile closure rules

- Loading replaces content, not application chrome. Keep the authenticated bottom navigation fixed and suppress stale route-specific actions while the next route resolves.
- Two mobile document actions share one 50/50 row. Do not make the primary action span both columns and push the secondary action to another row.
- Outlet Daily remains editable by Outlet through `Ready to post`; an authorised finaliser owns `Post`, and the resulting `Posted` state is locked. The finaliser's queue must surface every ready record.
- Dense numeric entry may use two phone columns when each field retains its label, currency/unit, numeric keyboard and validation.
- Phone Attendance uses day selection plus compact employee assignment rows. Do not present the full desktop weekly spreadsheet as the primary phone interaction.
- File selection remains visually dominant in a same-row upload control; 70/30 is the default split. Sheets and metric grids require deliberate gaps and two-dimensional divider logic.

This is the review contract extracted from Wilson's repeated browser annotations. It is a decision aid for future implementation and QA, not a replacement for product requirements or database semantics.

## Release reliability rule

- A visual or regex contract cannot substitute for strict TypeScript and the real production compile/type-validation path. Both are blocking release gates.
- New database tables must be members of `Database.public.Tables`; placing a type near the schema without compile-time membership is not coverage.
- Deployment installs use the committed lockfile under the pinned LTS runtime. Mutable dependency resolution during a Production build is prohibited.
- Repeated annotations must become a shared component, token, query authority or contract. Page-specific patches are accepted only when the business workflow is genuinely different.

## 1. Trust states are visible

- Loading uses a skeleton or explicit loading state; it never renders `0`, an empty list, or an empty chart as a temporary placeholder.
- A failed or incomplete source is `Unavailable` with a retry action. Counts, pagination, totals, percentages, and chart points are hidden while unavailable.
- A successful empty result is a separate empty state that explains what will appear and how to create the first record.
- Detail reads must not be treated as proof that a list/read model is healthy. Each read surface owns its own availability state and telemetry.
- A missing optional enhancement may not hide the main record list. The optional block says unavailable without changing authoritative record content.

## 2. One component vocabulary

- Shared query controls follow the current product authority: 36px visual controls at desktop widths, with 44px minimum touch targets on phone and touch-tablet. A smaller desktop glyph is allowed only when its visual action remains clear and the hit area is preserved where touch applies. Search absorbs available width; filter/date/action tracks use the shared responsive geometry rather than a fixed width that forces wrapping.
- Do not open a filter sheet solely because the viewport is a phone. If the search control and filter fields fit in the available list width, keep filters inline and allow a compact second row or two-column group. Use the sheet when the route's fields cannot remain readable beside or below search without clipping, tiny controls, or horizontal page overflow. A visible icon-only Filter trigger keeps its accessible name.
- Phone lists use one shared search surface: one search field, one icon-led Filter trigger, and one result count. The result/content surface is a sibling, never a nested card.
- A query card and its result card are two sibling surfaces. Nested cards are allowed only when the inner surface is a genuinely different task boundary, such as a right action rail or progressive detail.
- Primary actions use the same icon vocabulary, icon-to-label spacing, height, radius, and semantic color across modules. A plus action is not redesigned per page.
- Rounded corners, borders, shadows, and focus rings come from the shared tokens. Do not mix square and rounded shells without a hierarchy reason.

## 3. Density follows the task

- The first screen should communicate the page title, status, scope, next action, and the first useful content without a large decorative headline or empty vertical field.
- Do not repeat section titles, branch names, statuses, or helper copy on every row when the parent header already owns them. Use a compact first-row label or a progressive disclosure affordance.
- Use the right rail as real display space for secondary context, guidance, and summaries; do not force every secondary detail into the central list.
- Preview surfaces are compact. A basket, hover preview, tooltip, or selected chart value is not an edit form and should not use full-size editor steppers.
- On phone/tablet, prefer two-column item cards when the content is repeated and the card can remain readable. On desktop, keep the dense table/list pattern when it is the established operational convention.

## 4. Progressive disclosure must be interaction-complete

- High-volume matrices keep a stable identity column while date/value cells scroll in a bounded region. The left identity column may not drift or be clipped.
- Exact values and verbose exception details appear on hover, focus, click, or touch—not hover only. Keyboard focus and touch must expose the same information and drill-through as pointer hover.
- Optional coverage, daily data, remarks, and guidance stay collapsed when they are secondary. Their summary must remain concise and must not reserve excessive height.
- A collapsed setup surface has one disclosure control and one source of truth. Do not repeat the same branch/date/status in a second header.

## 5. Workflow language must match the database

- Do not invent steps, review states, or approval stages. Stock Count is `Draft → Confirm & Post`; Outlet Daily staff posting is directly `Posted` unless the product explicitly requires review.
- Status labels are business states, not visual decoration. A row must not say “Evening Completed” when the user action has already posted the record.
- Actions must explain the next valid transition and remain separate from destructive actions.
- UOM is a business choice. When purchase UOM differs from base UOM, show the selectable purchase UOM and conversion; never hard-code `KG` merely because the item list displays KG.

## 6. Responsive and accessibility gates

- Verify phone portrait, portrait tablet, landscape tablet, and desktop for every changed route.
- No document-level horizontal overflow. A scrollable matrix/table must have a bounded work surface and an explicit affordance.
- Never let labels collapse into one-character columns or let a stepper clip either control. Preserve a minimum 44px touch target.
- Every interactive component has default, hover, focus-visible, active, disabled, loading, and error states. Reduced-motion users receive an immediate equivalent.
- Text hierarchy is compact and stable; product UI uses one readable sans family and avoids oversized dashboard headlines that expand cards without adding meaning.

## Review checklist

Before accepting an annotated fix, ask:

1. Is this a data-state problem, a component-vocabulary problem, a density problem, a workflow problem, or a responsive problem?
2. Does an existing shared component already own the pattern?
3. Is the proposed state distinguishable from loading, empty, unavailable, and zero?
4. Does the change preserve the database lifecycle, permissions, UOM semantics, and branch scope?
5. Does it still work with pointer, touch, keyboard, and reduced motion at all four release-gate viewports?
6. Did the change reduce repetition/nesting/height without hiding information the operator needs?

## New21 follow-up — 2026-11-02

Latest user #1 supersedes historical alternating white/green row guidance: remove decorative zebra only; retain semantic status, warning and selection color. Checklist #16 desktop panels follow the location panel height, with a readable minimum and separately scrolling inspection body; smaller stacked layouts keep their own bounds. Stores #18 uses compact desktop quantity alongside reason, while tablet and phone retain readable responsive columns. Source, decisions and evidence: [new21 assets follow-up](qa/new21-assets-followup-20261102.md). No business-rule change; real Preview acceptance remains separate.

## Authenticated page audit follow-up — 2026-11-04

Daily desktop columns fit the actual central canvas; preserve the existing desktop table and compact breakpoint. Restore annotated72px quantity tracks while retaining existing touch heights and money-input geometry. Long Daily outlet and Asset checklist location names wrap so similarly prefixed locations remain distinguishable on touch screens. This supersedes two-line/ellipsis identification for these location rows only; updater compact summaries still retain their own contract. Source, tests and environment limits: [page audit correction](qa/page-audit-followup-20261104.md). No business-rule change or deployment.

## Preview16501bb follow-up — 2026-11-04

PO/GR supplier columns leave the numeric ending visible in the810px desktop canvas; smaller table canvases keep the house visible scrollbar. Dashboard roster approvals identify their branch using the existing scoped data. No workflow/query change. Source, screenshots and verification boundaries: [Preview audit follow-up](qa/preview-16501bb-audit-followup.md).

## Second page-audit follow-up — 2026-11-04

Linked GRN cards reflect the existing finance-closed display state used by the detail; raw stock posting state and transitions remain unchanged. Planning Delivery date retains an explicit accessible name through filter restructuring. Source and environment-specific evidence: [second page-audit fixes](qa/second-page-audit-fixes-20261104.md).

## PO detail table — 2026-11-04

Ordered Items keeps all ten semantic columns and full quantity/currency/comment content. Proportional columns fit the standard desktop canvas; smaller canvases retain visible bounded scrolling. Mobile cards and all calculations remain unchanged. [Source/evidence](qa/po-detail-layout-20261104.md).

## Catalogue / Stock Balance readability — 2026-11-04

Stock Balance proportional columns supersede its historical70rem minimum and9rem/12rem code/name tracks; all nine fields remain present with visible scrolling on constrained canvases. Product catalogue copy describes current fields rather than future modules. No query/basket/business-rule change. [Source and evidence](qa/catalog-stock-readability-20261104.md).

## 2026-11-04 — technical table follow-up from Preview f2b2dc2

Supersedes the historical Movement Ledger72rem/nth-child fixed tracks for this caller only. GR detail, Stock Card, Movement Ledger and Recipes retain every field with bounded percentage tracks, wrapped headings and visible narrow-canvas scrollbars. Ordinary desktop widths770/810px must expose the rightmost fields; long values wrap instead of being dropped. Phone operational rows and business/query/permission semantics remain unchanged. UOM description states only current management capability and removes speculative future receiving copy. Evidence and acceptance limits: [technical tables QA](qa/technical-table-followup-20261104.md). Historical annotation IDs and prior evidence remain intact.

## 2026-11-04 — shared surface timing follow-up

Viewport-specific filter layout, dialog/sheet positioning and background scroll lock, and RightConsoleMount ownership registration/cleanup must settle in React's layout phase before client-navigation/open paints. Preserve identical SSR/first hydration trees; do not read viewport in initial render. Keep focus containment, Escape and focus restoration. This supersedes post-paint timing in those shared owners only; no backdrop color/blur redesign. Source/lifecycle checks and the expired-Preview blocker are documented in [timing QA](qa/shared-surface-timing-20261104.md); the reported visual glitch still requires authenticated reproduction and changed-Preview acceptance.

## 2026-11-04 — new annotation7–9, Low Stock

Source reference: user message Sentinel_c100ade746488191a1db2721de076306, annotations7–9 as delegated. Separate below_qty/quantity_uom into their own labelled threshold card; query forms must preserve each other's active search/branch/status/threshold values. Phone replenishment rows show one supplier line, concise decision, labelled Current/Safety/Suggested metrics and quantity/UOM inputs. Preserve selection staging, branch authority, stored basket, permission/hydration gates and supplier-group PR creation. This supersedes the prior all-in-one Low Stock filter composition only. Existing historical annotation IDs are untouched. Original screenshot could not be retrieved through read_thread; do not claim pixel acceptance. See [QA and remaining acceptance](qa/low-stock-annotations-7-9-20261104.md).

## Stock count annotations 2–6 — 2026-11-04 local candidate

Keep pending weight-review explanations outside compact status tracks. Read-only Count Lines retains searchable original indices and bounded 15-row pages using shared pagination; draft input and inventory semantics stay unchanged. Evidence and unresolved original-image/authenticated checks: [stock count annotation record](qa/stock-count-annotations-20261104.md).

## 2026-11-05 — Low Stock explanation at the safety boundary

Actual Owner Production phone sample shows Current0/Safety0 with Below safety by0 KG. Phone explanations must distinguish a positive shortage, equality and inconsistent out-of-stock status; do not change getReplenishmentDecision, suggested quantities or purchasing data. Follow-up to annotations7–9, preserving original IDs. Evidence/limits: [QA](qa/low-stock-safety-copy-20261105.md).

## 2026-11-05 — bounded shared line-chart frame

Actual Owner Production Demand Trend phone screenshot shows an SVG growing to67176px (viewBox height67140) at390px viewport. The observer may update SVG drawing coordinates, but the rendered frame height must come from caller height/compact minimum, never the measured SVG intrinsic ratio. Preserve points, units, gaps, pointer/keyboard selection and preview semantics; check all shared callers. See [QA](qa/line-chart-height-20261105.md). This is geometry only, not a Daily/report-data change or broad no-flicker closure.

## 2026-11-05 — phone asset names and locations

The mobile asset register must wrap asset names and location names within its existing bounded tracks. Single-line ellipsis conceals identifiers needed to choose a record. Preserve asset codes, registered quantity semantics, permissions, detail links and desktop table behavior. This is a follow-up to long-name readability, not closure of registration or transfer annotations. See [QA](qa/asset-register-phone-names-20261105.md).

## 2026-11-05 — narrow phone Stock Count draft

Below390px use a single draft-item card column so decimal quantities remain readable between the existing touch controls. At390px and above retain the established two-column phone pattern; desktop rows remain unchanged. Preserve quantities, autosave and confirmation logic. Real before screenshot and limits: [QA](qa/stock-count-narrow-draft-20261105.md).

## 2026-11-05 — compliance site identity

Outlet compliance detail must retain its actual branch name on phones using the existing PageHeader showMobileIdentity contract. The generic shell module label cannot identify the site whose editable records are shown. No permission, form, record, or attachment change. Evidence and limits: [QA](qa/compliance-mobile-identity-20261105.md).

## 2026-11-05 — mobile document task label

MobileTaskSheet triggers must retain full action names when sharing the phone footer with Files and More. Wrap task labels and allow touch-height growth rather than clipping long approval names; omit the redundant task chevron to preserve text space. Workflow and Files triggers retain their own appearance. No action, permission, focus or sheet behavior change. See [QA](qa/mobile-task-label-20261105.md).

## 2026-11-05 — completion matrix outlet identities

The sticky outlet column in Daily Insights Completion wraps full names within its existing9rem/12rem tracks, so similarly named Sunway locations remain distinguishable without hover. Preserve bounded horizontal date scrolling, cell labels,selection and record destinations. See [QA](qa/completion-matrix-names-20261105.md).

## 2026-11-05 — published schedule initial guidance

Published/locked schedule initial guidance must describe its read-only state rather than instructing assignment edits while controls are disabled. Preserve authorised correction entry,permissions and all schedule data. Evidence and limits: [QA](qa/schedule-readonly-copy-20261105.md).

## 2026-11-05 — employee profile phone identity

Employee detail uses existing PageHeader showMobileIdentity so the selected employee name stays visible under the generic Employees phone shell. Preserve all section permissions,personal fields,correction and account actions. Evidence/limits: [QA](qa/employee-mobile-identity-20261105.md).

## 2026-11-05 — Stock Card quantity totals require an item

Stock Card all-items history must not publish a combined quantity across KG,LITRE,PACK,PCS or other item units. Show guidance instead of aggregate numbers until an item is selected;single-item net and movement-summary amounts include its base unit. Preserve ledger rows,filters,query and accounting data. See [QA](qa/stock-card-unit-totals-20261105.md).

## 2026-11-05 — Movement Ledger identity and unit-safe page totals

Ledger detail retains transaction number on phones via existing PageHeader identity contract. Ledger quantity summaries refer explicitly to the current page and require a selected item,with its base unit;all-item history never combines incompatible quantities. Currency valuation,rows,queries andposting remain unchanged. See [QA](qa/ledger-identity-unit-totals-20261105.md).

## 2026-11-05 — inventory purchase summary quantity guard

The existing purchase summary returns name and quantity without item identity or UOM and groups by name. Do not display those values as comparable quantity rankings or guess units from names. Keep the returned item names and a purchase-ledger review entry, explicitly state quantity totals unavailable until the summary has reliable per-item units. No query or record changes. See [QA](qa/inventory-purchase-unit-guard-20261105.md).

## 2026-11-05 — inventory activity compatibility

Purchase/Consumption activity panels label posted movement record counts explicitly, never quantities or invoice counts. Unsupported historical quantity/UOM payloads remain guarded. New validated activity arrays distinguish empty from unavailable; use item identity, not name, as row key. [Compatibility and readonly plan evidence](qa/inventory-unit-summary-design-20261105.md#compatible-ui-and-readonly-plan-review--2026-11-05). Local candidate only; database approval pending.

### Quantity aggregation follow-up — 2026-11-05

- Goods Receiving PO options must show pending line counts, not a sum of pending quantities across PO items/UOMs. Per-line quantities and conversions remain authoritative.
- Stock Count reversal confirmation must show adjustment line count; never show summed inward/outward quantities across count items without a valid unit basis. Preserve fingerprint, idempotency, reason and acknowledgement gates.
- Delivery summary quantities must remain separated by stored line UOM. Only normalized identical units may combine; unknown units/invalid quantities remain unavailable, while a confirmed zero keeps its unit. Voided orders are excluded.
- This rule does not declare Daily Record/Insights cross-product totals dimensionally valid. Their unit provenance and derived rates require separate remediation and verification.
