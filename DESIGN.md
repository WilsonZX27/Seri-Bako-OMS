# Seri Bako OMS responsive design standard

This document is the implementation contract for every customer-facing route, form, record workspace, table, panel, dialog, and mobile action bar. It applies to new work and to refactoring of existing UI.

## Viewport contract

Design mobile first. The base class or CSS rule must be the 320px–639px experience. Enhancement uses the shared Tailwind thresholds only:

- `640px`: large phone / compact tablet; remains a single-column, touch-first experience.
- `768px`: tablet; the active task keeps the full workspace width. Supporting context opens on demand instead of permanently narrowing forms or item names.
- `1024px`: laptop desktop; dense line-entry layouts may expand, but a persistent inspection rail still remains hidden.
- `1280px`: full desktop; left navigation, main workspace, and optional right inspection rail may coexist.

Do not introduce a page-specific breakpoint. These thresholds serve distinct operational contexts, so a 1024px laptop is not forced into a cramped tablet layout and a full three-rail workspace is not shown prematurely. Test representative widths at 320, 390, 640, 768, 1024, 1280, 1440, and 2560px.

## Layout contract

- Use `min-w-0` on children of flex/grid layouts that contain text, controls, or tables.
- Use grid fractions, `minmax(0, 1fr)`, flex growth, percentages, or viewport-constrained `min()`/`max()` values for page structure. Do not give a page, panel, or content column a fixed pixel width.
- A dense desktop grid must collapse to one column by default; add the second/third column only at the semantic breakpoints.
- Tables must sit inside `.sb-table-region` or a local `overflow-x-auto` container. The document itself must never become horizontally scrollable.
- A mobile primary action is fixed above the safe area, with enough document bottom padding that the last editable control remains reachable. Its border is neutral; it must not visually imply a completed workflow state.
- Full-width forms use `w-full min-w-0 max-w-full`. A form control may have a minimum touch target (for example quantity entry) but the surrounding layout must still shrink safely.
- Form sections that contain file inputs, long sample values, or native selects must also set `min-w-0` on the containing grid/flex items; native file controls must never widen their parent on narrow screens.

## Typography and spacing

- Use `rem`, `em`, design tokens, or `clamp()` for type and spacing. Do not use screen-specific pixel font sizes or page-level pixel padding.
- Keep labels, status, and instructions concise. On small screens, progressive disclosure is preferred to a long uninterrupted form.
- Use the shared control-height token. Touch controls are at least 44px on mobile; denser desktop controls may use the tablet/desktop token only when their role remains clear.
- Quantity, currency, and date fields must be large enough to enter and review without zooming. Numeric values use tabular figures and retain a visible unit.

## Media and content safety

- Every `img`, `video`, `iframe`, `canvas`, `object`, and `embed` is constrained with `max-width: 100%` and `height: auto` unless an explicit aspect-ratio container owns its size.
- Images must have useful alt text unless decorative. They must use `object-fit` deliberately rather than relying on intrinsic dimensions.
- Long IDs, product names, branch names, and imported values must wrap, truncate with an accessible label, or remain in a scrolling subregion; they must never widen the page.

## Operational workflow UX

- The current status and the next permitted action appear before secondary metadata.
- A form starts with only the fields needed to begin. Notes, advanced filters, and audit detail use progressive disclosure.
- Line-entry documents place the editable value and unit together, keep theoretical/variance feedback visible, and avoid card height that makes a count feel endless.
- Long repeated tasks show completion progress and provide an in-list find/remaining-items view. A physical count must require an explicit physical value instead of silently copying the theoretical balance.
- Per-line remarks remain directly visible in dense desktop layouts. On touch layouts they may collapse until requested, but must open automatically when a variance makes the reason mandatory.
- Destructive, posting, approval, cancel, and backup actions must state their consequence and remain distinct from save/draft actions.
- Role restrictions must result in an explanatory read-only state, not a missing or broken-looking page.

## Verification gate

A UI change is not complete until:

1. every affected route loads with the global stylesheet parsed;
2. no page-level horizontal overflow occurs at 320, 390, 640, 768, 1024, 1280, 1440, or 2560px;
3. every visible link, button, input, select, textarea, and summary remains inside the viewport unless it is inside an explicitly contained scrolling table region;
4. keyboard focus, errors, empty states, loading states, and primary actions remain visible and usable;
5. the related workflow Playwright test passes using isolated local data; and
6. static route layout audit and typecheck/lint/build remain green.

The Playwright route-layout audit is the baseline guard for all static workspaces. Workflow specs provide the mutation/role coverage; neither replaces the other.
