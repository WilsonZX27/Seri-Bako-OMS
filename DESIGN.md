# Seri Bako OMS responsive design standard

This document is the implementation contract for every customer-facing route, form, record workspace, table, panel, dialog, and mobile action bar. It applies to new work and to refactoring of existing UI.

## Viewport contract

Design mobile first. The base class or CSS rule must be the 320px-639px experience. Enhancement uses the shared Tailwind thresholds only:

- `640px`: large phone / compact tablet; remains a single-column, touch-first experience.
- `768px`: tablet; the active task keeps the full workspace width. Tablet portrait and landscape use the same components as phone and desktop, with layout density and column placement changing only at this shared breakpoint.
- `1024px`: laptop desktop; dense line-entry layouts may expand, but a persistent inspection rail still remains hidden.
- `1280px`: full desktop; left navigation, main workspace, and optional right inspection rail may coexist.

Do not introduce a page-specific breakpoint. These thresholds serve distinct operational contexts, so a 1024px laptop is not forced into a cramped tablet layout and a full three-rail workspace is not shown prematurely. Test representative widths at 320, 390, 640, 768, 1024, 1280, 1440, and 2560px.

## Layout contract

- Use `min-w-0` on children of flex/grid layouts that contain text, controls, or tables.
- Use grid fractions, `minmax(0, 1fr)`, flex growth, percentages, or viewport-constrained `min()`/`max()` values for page structure. Do not give a page, panel, or content column a fixed pixel width.
- A dense desktop grid must collapse to one column by default; add the second/third column only at the semantic breakpoints.
- Tables must sit inside `.sb-table-region` or a local `overflow-x-auto` container. The document itself must never become horizontally scrollable.
- Technical tables pin their first semantic identity column by default (item, product, document title, record name, or document number) so horizontal scrolling never loses the current record. When selection and row action are present, the full left lead band is pinned in this order: checkbox, action, semantic identity/title. Header and body must use the same band; checkbox and action may never scroll away independently. Tables without selection/action still pin their semantic identity.
- Status is one compact dropdown in the shared filter bar, never a floating or standalone row. On tablet and desktop, keep the practical order `[search] [relevant dropdowns] [Search] … [result total]`; only render dropdowns that represent a real independent filter. On phone the same controls may wrap, while the result total remains last. A page must not duplicate the same status choice.
- A list page with a permitted creation action must expose that action at every responsive breakpoint. On phone and portrait tablet (including 768–1279px), use the shared bottom-safe floating plus action when the desktop action rail is not visible; it must never be hidden between phone and desktop layouts.
- A mobile primary action is fixed above the safe area, with enough document bottom padding that the last editable control remains reachable. Its border is neutral; it must not visually imply a completed workflow state.
- Full-width forms use `w-full min-w-0 max-w-full`. A form control may have a minimum touch target (for example quantity entry) but the surrounding layout must still shrink safely.
- Form sections that contain file inputs, long sample values, or native selects must also set `min-w-0` on the containing grid/flex items; native file controls must never widen their parent on narrow screens.

## Cross-platform workspace system

The OMS is one operational product, not three independently designed sites. Phone may reorganize a workflow for reachability, but tablet and desktop must retain the same data hierarchy, state language, components, and action priority.

- **Phone (`<768px`)** is a focused single-task canvas with a role-aware bottom bar and mobile-only 10px control / 12px panel radii.
- **Tablet (`768px-1279px`)** is an iPad operational workspace. It uses the same role-aware bottom navigation component as phone, with four or five centered shortcuts and `More`; it does not use a persistent desktop side rail. The bar remains sticky in portrait and landscape, and every page reserves safe bottom space for it.
- Tablet primary actions are visible in the page action row or in the sticky task action area. They must not be hidden behind `Actions & context`. Context panels are secondary metadata, audit, and low-frequency actions only.
- `Actions & context` on tablet is a true drawer or sheet with an explicit backdrop and focus/scroll handling. It must never be an absolutely positioned child that overlaps table rows, status cells, or pagination.
- At `1024px-1279px`, a document may opt into the shared tablet split: the editable or review surface remains primary, while a compact 18rem secondary context rail remains visible on the right. Below 1024px, secondary context uses the shared drawer/sheet opened from `More`; common actions remain in the page action row or sticky task action. This is for operational documents with active line entry or receiving, not generic dashboard cards.
- **Desktop (`>=1280px`)** is a three-region operational shell: persistent navigation, a flexible central workspace, and an optional 340px inspection/action rail. A record page uses its central width for the data form or ledger; the rail is for next actions, state, audit, and related context, never a duplicate copy of the main form.
- Context rails use flat divider groups for branch, supplier, and item drill-down. Do not nest rounded cards inside a rail section; hierarchy comes from section labels, spacing, and 1px separators.
- Tablet and desktop use the compact 2px enterprise radius for panels, controls, menus, table containers, action rows, and icon tiles. Pills are reserved for statuses, counts, and compact semantic badges.
- The shared shell owns navigation, page spacing, rails, filter placement, and viewport behavior. Feature pages must compose those primitives rather than recreate their own page chrome.
- A desktop or tablet action must never be duplicated in the page header, empty state, fixed bar, and inspection rail. One primary action is visible at a time; contextual alternatives remain secondary.
- The shared Top Bar owns the single canonical breadcrumb trail on tablet and desktop. `DocumentWorkspace` retains supplied breadcrumb metadata for route semantics, but does not render a second in-content breadcrumb trail. New documents show status, branch scope, and workflow only; they never repeat “New [document]” or the parent workspace title.
- On tablet and desktop, the compact workflow pipeline itself is the canonical visible document status. Do not add a second standalone status badge above it; keep that compact badge for the phone context row only.
- A record form uses one submit source: the shared desktop inspection rail, tablet context disclosure, and phone safe-area action may reference the same form via `form`; it must not retain an additional page-local submit bar.

### Shared component assembly

Every route is assembled from the same primitives. Responsive work may rearrange a primitive, but may not invent a device-specific replacement.

- **Shell:** Top Bar, role-aware navigation, page title/context, and safe-area handling.
- **Workspace:** one of `contained`, `wide`, or `full`; the content hierarchy remains the same at every viewport.
- **Actions:** one visible primary action, followed by secondary inline actions; context drawers are never the only route to a common task.
- **Records:** status tabs, filter bar, summary strip, semantic table/list, and pagination are shared components with responsive presentations.
- **Forms:** shared field/control tokens, progressive disclosure for notes and advanced options, and one canonical submit source.
- **States:** status, warning, error, loading, empty, and read-only states use the same semantic vocabulary across devices.

### Pagination contract

All paginated list, ledger, register, and history views must expose direct page navigation whenever more than one page exists: `Previous`, numbered pages, an ellipsis where needed, and `Next`. Previous/Next-only pagination is permitted only for a genuinely sequential stepper, not for a data list. The current page must be visibly selected, disabled edges must be announced, and page changes must preserve active filters and the semantic identity column.

## Color and component discipline

- Deep operational green is the only ordinary primary, active, selected, and focus color across every viewport.
- Warm orange is semantic only: warning, urgency, attention, or a compact notification cue. It is never a default button, navigation color, neutral icon tile, or decorative panel theme.
- Success, danger, information, and neutral states use their semantic tokens only when the data carries that meaning. Do not create blue, purple, teal, or amber workspace themes merely to decorate a directory or dashboard.
- White surfaces, the glare-free neutral canvas, 1px borders, and tabular data carry enterprise density. Shadows are reserved for temporary overlays; persistent cards and panels use borders rather than decorative elevation.
- Buttons, inputs, selects, action rows, popovers, menus, empty states, and tables use the shared token vocabulary. A new component must not introduce a one-off radius, brown accent, color family, or spacing scale.
- Every interactive component must have visible default, hover, keyboard-focus, disabled, loading, error, and empty/read-only states appropriate to its task.

## Mobile Web App shell

The authenticated phone experience is an application-style mobile Web layout, not a scaled desktop sidebar.

- Below `1280px`, the primary navigation is a five-slot bottom bar: up to four permission-aware role shortcuts plus `More`. Phone and tablet share the component; tablet uses the same bar with wider centered shortcuts and never falls back to a persistent desktop rail.
- `More` opens the complete navigation allowed by the current role and effective permission map. It must never expose an unauthorized route.
- Shortcut destinations are role-aware. Owner and Manager emphasize requests, receiving, and stock count; Finance emphasizes requests, invoices, and stock; Purchasing emphasizes requests, orders, and receiving; Kitchen emphasizes production and assigned operational work; Outlet Staff emphasizes the daily record.
- Every role receives four permission-safe task destinations plus `More` when its effective permissions allow four destinations. Missing permissions fall back only to another authorized destination; navigation never duplicates a shortcut.
- The desktop sidebar remains the authoritative desktop navigation and is unchanged at `1280px` and above.
- The phone top bar uses a fixed three-slot structure: contextual back control on the left, a single centered page title, and workspace notifications on the right. Root workspaces reserve the left slot so the title remains optically centered.
- Company identity, profile, subtitles, and duplicate document labels do not appear in the phone top bar. Profile remains available through `More`; new, edit, and detail routes link back to their parent workspace.
- A phone page must not repeat the same workspace name in the top bar, page header, and document header. New documents show status, branch, workflow position, and the next permitted action beneath the top bar instead of repeating “New [document]” and the module title.
- On a phone document header, place status and branch scope on one compact context row; show workflow position in one small disclosure row beneath it. Do not spend a separate full-height row on the status, branch, and workflow label when the same context can be scanned together.
- The bottom bar observes `env(safe-area-inset-bottom)`. The top bar observes `env(safe-area-inset-top)`, and the root viewport uses `viewport-fit=cover`.
- A page-level fixed primary action sits above the bottom navigation. It must not cover the final field, the navigation, or the home indicator.
- Pages without contextual actions must not render an empty or generic secondary action bar.
- Mobile sheets lock background scroll, support Escape dismissal, preserve focus, and sit above both navigation and page actions.
- The web manifest uses `display: standalone` so supported browsers may add the OMS to the home screen without creating a separate native application.

The mobile shell may reorganize navigation, information density, filters, and action placement, but it must reuse the same colors, terminology, permissions, route authorization, document states, and server actions as desktop.

## Typography and spacing

- Use `rem`, `em`, design tokens, or `clamp()` for type and spacing. Do not use screen-specific pixel font sizes or page-level pixel padding.
- Keep labels, status, and instructions concise. On small screens, progressive disclosure is preferred to a long uninterrupted form.
- Use the shared control-height token. Phone controls are 48px; tablet controls are 44px to remain iPad touch-safe; desktop regains 36px compact density at `1280px` and above. Do not let the 640px compact breakpoint reduce a phone control below 48px.
- Phone controls use the shared 10px control radius and 12px panel radius for an iOS-like touch surface. Tablet and desktop retain the compact 2px enterprise radius.
- Quantity, currency, and date fields must be large enough to enter and review without zooming. Numeric values use tabular figures and retain a visible unit.
- Date fields use the shared `Input` control (or an equivalent token-based wrapper); do not introduce bare native date inputs that bypass the mobile control height, radius, border, and focus treatment.
- Date values render as an invariant `YYYY-MM-DD` label across browser and device locales. The native picker remains available as the input mechanism, but its locale-specific visual value must not be the only visible representation.

## Mobile color and shape language

- Deep operational green is the only normal primary-action, selected-navigation, active-workflow, and keyboard-focus color.
- Warm orange is reserved for warning, urgency, attention, and compact notification cues. It must not compete with green as a second ordinary button color.
- Phone inputs, selects, text areas, buttons, filter triggers, popovers, and legacy 2px surfaces normalize to the shared phone radii. Status and notification badges may remain fully pill-shaped; ordinary cards must not.
- A single phone surface must not mix square legacy fields, rounded mobile fields, green primary buttons, and brown primary buttons.

## Media and content safety

- Every `img`, `video`, `iframe`, `canvas`, `object`, and `embed` is constrained with `max-width: 100%` and `height: auto` unless an explicit aspect-ratio container owns its size.
- Images must have useful alt text unless decorative. They must use `object-fit` deliberately rather than relying on intrinsic dimensions.
- Long IDs, product names, branch names, and imported values must wrap, truncate with an accessible label, or remain in a scrolling subregion; they must never widen the page.

## Operational workflow UX

- The current status and the next permitted action appear before secondary metadata.
- Dashboard workspaces show the signed-in operational context consistently at every breakpoint: `Welcome, [staff name] | [role] | [actual branch scope]`. This replaces generic labels such as "Assigned branches". Company-wide roles show `Company-wide`; assigned roles show the readable names of their assigned branches.
- The contextual welcome line is a dashboard identity and scope cue, not a second top-bar title. Phone top bars continue to use only the centered page title; tablet and desktop place the same contextual line in the workspace header.
- Role-specific Dashboard quick actions are creation or immediate-execution actions. Mobile navigation instead carries the role's most frequent workspaces. For Kitchen this deliberately separates `Purchase Request`, `New Production`, and `Receive` in Quick actions from `Stock Count`, `Stock Balance`, and `Stock Wastage` in the bottom bar.
- Module landing pages use the operational hub hierarchy: one current-day summary, one primary task, one attention queue, and one compact tool list. They do not use repeated icon-card directories or duplicate explanatory copy.
- The operational hub keeps the same information order on phone and desktop. Responsive behavior changes column placement and density, not terminology, color roles, or task priority.
- Summary values share one flat data strip. Semantic orange or red appears only when the corresponding value requires attention; zero and normal states remain operational green.
- A form starts with only the fields needed to begin. Notes, advanced filters, and audit detail use progressive disclosure.
- Line-entry documents place the editable value and unit together, keep theoretical/variance feedback visible, and avoid card height that makes a count feel endless.
- Long repeated tasks show useful review progress and provide an in-list find/adjusted-items view. A repeated physical count may prefill each line from its latest posted physical result; when no posted result exists, it may use the current ledger balance as an explicitly labelled starting estimate. Prefill is never hidden, is immediately editable, and the UI must distinguish values ready for review from values the user has adjusted.
- Quantity controls pair a direct numeric field with decrement/increment controls when rapid adjustment is the primary task. Mass and volume units (`KG`, `G`, `L`, `ML` and their documented variants) allow fractional entry; discrete count units such as `CAN`, `ROLL`, `PACK`, and `BTL` accept whole numbers only in both the client and server validation.
- Per-line remarks remain directly visible in dense desktop layouts. On touch layouts they may collapse until requested. A variance may recommend a note, but creating a draft must not force one; high-variance review and approval controls remain auditable and separate from draft entry.
- Repeated line-entry work uses three density modes from the same row component: phone is a divided input-first row; tablet portrait uses a four-column ledger (`identity`, `reference`, `editable value`, `variance`) with notes on demand; laptop and desktop add a persistent fifth remarks column. Do not delay all table structure until desktop-sized breakpoints.
- Destructive, posting, approval, cancel, and backup actions must state their consequence and remain distinct from save/draft actions.
- Role restrictions must result in an explanatory read-only state, not a missing or broken-looking page.

## Mobile operational surfaces

- A phone workflow uses one boundary per operational unit. Do not place a bordered or shadowed card inside another card merely to group ordinary fields, progress, search, or line items.
- Use a separate setup panel only when the user must establish context before beginning work (for example, date, branch, and tolerance). The repeatable work itself belongs in one continuous operational surface.
- Within a continuous operational surface, use flat section backgrounds and 1px dividers for progress, filters, and rows. Do not wrap those sections in additional cards.
- Preserve the same content hierarchy on desktop, but mobile may split setup from the active work surface to improve scanning and prevent nested-card visual noise.
- A multi-column editable desktop table must not be the primary phone input. Keep the desktop table at `md` and above, then render the phone workflow as continuous divided rows: identity first, editable operational value and unit next, reference/calculated values last.
- Do not use a horizontally scrolling table as a substitute for a phone line-entry layout. Horizontal scrolling remains acceptable only for read-only technical detail that has no safe compact representation.

## Verification gate

A UI change is not complete until:

1. every affected route loads with the global stylesheet parsed;
2. no page-level horizontal overflow occurs at 320, 390, 640, 768, 1024, 1280, 1440, or 2560px;
3. every visible link, button, input, select, textarea, and summary remains inside the viewport unless it is inside an explicitly contained scrolling table region;
4. keyboard focus, errors, empty states, loading states, and primary actions remain visible and usable;
5. the related workflow Playwright test passes using isolated local data; and
6. static route layout audit and typecheck/lint/build remain green.

The Playwright route-layout audit is the baseline guard for all static workspaces. Workflow specs provide the mutation/role coverage; neither replaces the other.

## Release identification

- The visible footer version is the canonical application release identifier, not a build-only or sprint-only counter.
- Every production release uses a three-segment semantic version in `package.json` and `src/lib/app-version.ts`; the login footer and workspace sidebar render `vX.Y.Z` from that same source.
- GitHub tags use `vX.Y.Z`. GitHub Release titles use `vX.Y.Z — Release title`, matching the short `APP_RELEASE_TITLE` stored beside the application version.
