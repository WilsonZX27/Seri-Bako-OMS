# Annotation-derived UI rules

This is the review contract extracted from Wilson's repeated browser annotations. It is a decision aid for future implementation and QA, not a replacement for product requirements or database semantics.

## 1. Trust states are visible

- Loading uses a skeleton or explicit loading state; it never renders `0`, an empty list, or an empty chart as a temporary placeholder.
- A failed or incomplete source is `Unavailable` with a retry action. Counts, pagination, totals, percentages, and chart points are hidden while unavailable.
- A successful empty result is a separate empty state that explains what will appear and how to create the first record.
- Detail reads must not be treated as proof that a list/read model is healthy. Each read surface owns its own availability state and telemetry.
- A missing optional enhancement may not hide the main record list. The optional block says unavailable without changing authoritative record content.

## 2. One component vocabulary

- At desktop/tablet widths, list controls are 44px high. Search is the only elastic control; filters, More filters, date controls, and the terminal action use the shared 8rem track unless a documented field label requires more.
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
