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
- Technical tables pin their first semantic identity column by default (item, product, document title, record name, or document number) so horizontal scrolling never loses the current record. When selection and row action are present, the full left lead band is pinned in this order: checkbox, action, semantic identity/title. Header and body must use the same band; checkbox and action may never scroll away independently. The shared Action column is 4rem wide: its header says `Action`, while its row pen is small, optically centered in the full Action cell, and retains a 44px tablet touch target. Each pinned lead cell has an explicit shared width, and every following sticky offset equals the total width before it—sticky columns may never overlap or crop one another after horizontal scrolling. Internal lead-band cells have no divider or shadow. The trailing edge of the full fixed band gains one visible directional shadow only after horizontal scrolling begins; at scroll origin it stays flat. This stateful cue makes the fixed/scrollable boundary obvious without permanently elevating the table. Tables without selection/action still pin their semantic identity.
- Status is one compact dropdown in the shared filter bar, never a floating or standalone row. On tablet and desktop, keep the practical order `[search] [relevant dropdowns] [More filters when needed] [Search] … [result total]`; only render dropdowns that represent a real independent filter. The 768–1279px filter row stays on one line by allowing the search field to shrink before wrapping controls. On phone the search and Search button form the first row; relevant dropdowns/More filters form the compact second row, and the result total remains last. A page must not duplicate the same status choice.
- A list page with a permitted creation action must expose that action at every responsive breakpoint. On phone and tablet (including 768–1279px), use the shared bottom-safe circular plus action when the desktop action rail is not visible. The circle contains only the plus icon; its accessible name and tooltip carry labels such as `New PR`, `New GRN`, or `New branch`. It must be `fixed` above `--sb-mobile-nav-height` plus the safe area and must never be hidden between phone and desktop layouts.
- An icon-only create action must not leave an empty page-action strip behind. At `>=1280px`, render the labelled action once in the desktop action rail; below that breakpoint render only the shared circular plus FAB. A create-capable list must provide that desktop rail rather than duplicating the create action in the page header. Never combine a circular outline with visible `New …` microcopy. The shared app shell must reserve the FAB's lower scroll corridor so list tails and pagination remain reachable and are never covered by the fixed circle.
- A mobile primary action is fixed above the safe area, with enough document bottom padding that the last editable control remains reachable. Its border is neutral; it must not visually imply a completed workflow state.
- On phone, any page that owns a persistent Save or More action bar also owns the bottom action area: hide the global bottom navigation, anchor the task action bar directly to the safe area, and expose a 48px back button in the left top-bar slot. Dashboard/Home is the only route allowed to omit that back affordance. This prevents competing fixed controls, accidental navigation during edits, and ambiguity over which bar sits on top.
- A form or document that needs persistent context/actions must use the `/staffs/new` tablet pattern through the shared document split: from 768px portrait upward, keep the main task at left and a 16rem contextual action rail at right; phone collapses the same actions into the bottom action surface, while desktop keeps the standard right console. Do not hide the rail until 1024px.
- Record lifecycle state is not an ordinary editable form field. Creation uses the domain default; deactivate, archive, restore, post, reject, or cancel belong to explicit permission-aware action controls. A form must preserve the existing state as a hidden value when updating, never offer a competing status dropdown beside lifecycle actions.
- Bulk selection bars show a real permitted operation, not only `Deselect all`. The action must accept bounded validated IDs, re-check tenant scope and permission on the server, preserve audit history, and use concise 11–12px selection copy. If no safe bulk server action exists, selection checkboxes must not be exposed. Removing selection also changes the pinned lead band from `checkbox + Action + row identity` to `Action + row identity`; never leave an invisible or non-operational selection column occupying the fixed band.
- Full-width forms use `w-full min-w-0 max-w-full`. A form control may have a minimum touch target (for example quantity entry) but the surrounding layout must still shrink safely.
- Form sections that contain file inputs, long sample values, or native selects must also set `min-w-0` on the containing grid/flex items; native file controls must never widen their parent on narrow screens.

## Design language

The OMS uses one continuous high-density ledger language across phone, tablet, and desktop. Responsive layout changes information density and placement; it must not change the product's edge treatment, semantic color meaning, or interaction vocabulary.

- **Screen-edge surfaces:** full-width mobile rows, workspace cards, list containers, and primary content sections use `rounded-none` so their borders align into one uninterrupted vertical rail.
- **Interior controls:** textboxes, numeric steppers, selects, buttons, filters, and row actions use only `rounded-sm` (`2px`) or `rounded` (`4px`). The default compact control radius is `2px`; use `4px` only when a control needs a slightly clearer hit area.
- **Panels and cards:** standard operational panels remain square (`rounded-none`) unless an existing component explicitly requires a small `2px` or `4px` interior treatment. `rounded-xl` and `rounded-2xl` are prohibited for product UI.
- **Pills:** use `rounded-full` only for statuses, numeric counts, and compact semantic badges. Ordinary controls, rows, panels, and containers must never become pills.
- **Whitespace and alignment:** use token-based padding and vertical rhythm for breathing room without softening the edge language. Keep headers and KPI summaries optically centered when the hierarchy permits it; keep dense tables left-aligned for scanability.
- **Borders and elevation:** use crisp 1px neutral borders and low-contrast horizontal separators (`border-slate-100`). Persistent panels do not use decorative shadows; transient overlays may use a restrained shadow only when it clarifies layering.

### Semantic color tiers

Color communicates workflow state, not decoration. All semantic text/background pairs must pass WCAG AA contrast: at least 4.5:1 for normal text and 3:1 for large text or UI boundaries.

- **Deep operational green:** primary actions, selected navigation, active workflow, keyboard focus, and normal/safe states.
- **Semantic red / crimson:** warning, danger, critical, destructive, rejected, or blocking states. Use it for low stock, pending approvals, overdue AP, out of stock, production exceptions, rejected statuses, validation failures, and destructive confirmations.
- **Neutral:** white surfaces, glare-free neutral canvas, neutral borders, and muted text. Blue, purple, teal, and amber must not be used as decorative workspace themes.

Never use red for ordinary emphasis. A semantic red state must appear with a text label, icon, or explicit status—not by color alone.

## Cross-platform workspace system

The OMS is one operational product, not three independently designed sites. Phone may reorganize a workflow for reachability, but tablet and desktop must retain the same data hierarchy, state language, components, and action priority.

- **Phone (`<768px`)** is a focused single-task canvas with a role-aware bottom bar and the same razor-sharp edge language as tablet and desktop: full-width surfaces are square, and interior controls use `2px` or `4px` corners.
- **Tablet (`768px-1279px`)** is an iPad operational workspace. It uses the same role-aware bottom navigation component as phone, with four or five centered shortcuts and `More`; it does not use a persistent desktop side rail. The bar remains sticky in portrait and landscape, and every page reserves safe bottom space for it.
- Tablet primary actions are visible in the page action row or in the sticky task action area. They must not be hidden behind `Actions & context`. Context panels are secondary metadata, audit, and low-frequency actions only.
- `Actions & context` on tablet is a true drawer or sheet with an explicit backdrop and focus/scroll handling. It must never be an absolutely positioned child that overlaps table rows, status cells, or pagination.
- A form or document that needs persistent actions uses the shared tablet split from `768px`: the editable or review surface remains primary, while a compact 16rem contextual action rail remains visible on the right. `/staffs/new` is the canonical implementation and visual baseline; Company, Backup, Import, Product, Purchase Order, Production Job, and comparable forms must reuse `RecordWorkspace`, `DocumentWorkspace`, or `WorkspaceGrid documentMode + tabletRailMode="split"`. Data-heavy list pages may opt into the same rail at `1024px` so portrait tablet retains a readable table; this is an explicit shared breakpoint option, never page-local CSS. Phone collapses persistent actions into the bottom task action surface. Generic dashboard cards do not opt into this split.
- **Desktop (`>=1280px`)** is a three-region operational shell: persistent navigation, a flexible central workspace, and an optional 340px inspection/action rail. A record page uses its central width for the data form or ledger; the rail is for next actions, state, audit, and related context, never a duplicate copy of the main form.
- Context rails use flat divider groups for branch, supplier, and item drill-down. Do not nest rounded cards inside a rail section; hierarchy comes from section labels, spacing, and 1px separators.
- Phone, tablet, and desktop use the same square full-width surfaces and `2px`/`4px` interior control radii for panels, controls, menus, table containers, action rows, and icon tiles. Pills are reserved for statuses, counts, and compact semantic badges.
- The shared shell owns navigation, page spacing, rails, filter placement, and viewport behavior. Feature pages must compose those primitives rather than recreate their own page chrome.
- A retired route is deleted, not retained as a compatibility redirect. Remove its page file, permission exception, navigation/title metadata, action return paths, static/E2E audit inventories, and progress-tracker row in the same release. System-controlled read-only directories such as Roles expose only their collection route; create and dynamic edit routes must not exist.
- v7.76.0 confirms the legacy Settings, Settings › Backups, Quick Tools, Data Onboarding, and Daily Operations surfaces are retired at runtime. They must remain absent from route files, navigation metadata, permission allowlists, action redirects, and new tracking rows; historical audit documents may mention them only as archived decisions.
- A desktop or tablet action must never be duplicated in the page header, empty state, fixed bar, and inspection rail. One primary action is visible at a time; contextual alternatives remain secondary.
- The shared Top Bar owns the single canonical breadcrumb trail on tablet and desktop. `DocumentWorkspace` retains supplied breadcrumb metadata for route semantics, but does not render a second in-content breadcrumb trail. New documents show status, branch scope, and workflow only; they never repeat “New [document]” or the parent workspace title.
- On tablet and desktop, the compact workflow pipeline itself is the canonical visible document status. Do not add a second standalone status badge above it; keep that compact badge for the phone context row only.
- Workflow steps occupy equal grid tracks. Connectors run behind the labels from one track center to the next, so a two-step `Draft → Posted` pipeline remains optically centered instead of letting the first connector push one label sideways.
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
- Semantic red/crimson is the shared attention color for warning, urgency, danger, critical states, and compact notification cues. It is never a default button, navigation color, neutral icon tile, or decorative panel theme.
- Success, danger, information, and neutral states use their semantic tokens only when the data carries that meaning. Do not create blue, purple, teal, or amber workspace themes merely to decorate a directory or dashboard.
- Verify semantic foreground/background pairs against WCAG AA before shipping. Do not communicate a critical state by color alone; pair color with a label, icon, or explicit copy.
- White surfaces, the glare-free neutral canvas, 1px borders, and tabular data carry enterprise density. Shadows are reserved for temporary overlays; persistent cards and panels use borders rather than decorative elevation.
- Buttons, inputs, selects, action rows, popovers, menus, empty states, and tables use the shared token vocabulary. A new component must not introduce a one-off radius, brown accent, color family, or spacing scale. Use `rounded-sm`/`rounded` controls and square screen-edge surfaces everywhere.
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
- A page-level fixed primary action owns the phone bottom action area: its presence hides the bottom navigation and anchors the action directly above the home safe area. It must not cover the final field or the home indicator, and the shared top bar must retain the contextual back button.
- Pages without contextual actions must not render an empty or generic secondary action bar.
- Mobile sheets lock background scroll, support Escape dismissal, preserve focus, and sit above both navigation and page actions.
- The web manifest uses `display: standalone` so supported browsers may add the OMS to the home screen without creating a separate native application.

The mobile shell may reorganize navigation, information density, filters, and action placement, but it must reuse the same colors, terminology, permissions, route authorization, document states, and server actions as desktop.

## Typography and spacing

- Use `rem`, `em`, design tokens, or `clamp()` for type and spacing. Do not use screen-specific pixel font sizes or page-level pixel padding.
- Keep labels, status, and instructions concise. On small screens, progressive disclosure is preferred to a long uninterrupted form.
- Use the shared control-height token. Phone controls are 48px; tablet controls are 44px to remain iPad touch-safe; desktop regains 36px compact density at `1280px` and above. Do not let the 640px compact breakpoint reduce a phone control below 48px.
- All controls use the shared `2px`/`4px` interior radius and all full-width panels use square edges for a continuous Opening Stock ledger surface. No device-specific soft consumer radius is permitted.
- Quantity, currency, and date fields must be large enough to enter and review without zooming. Numeric values use tabular figures and retain a visible unit.
- Date fields use the shared `Input` control (or an equivalent token-based wrapper); do not introduce bare native date inputs that bypass the mobile control height, radius, border, and focus treatment.
- Date values render as an invariant `YYYY-MM-DD` label across browser and device locales. The native picker remains available as the input mechanism, but its locale-specific visual value must not be the only visible representation.

## Mobile color and shape language

- Deep operational green is the only normal primary-action, selected-navigation, active-workflow, and keyboard-focus color.
- Semantic red/crimson is the shared warning and critical attention color, including pending approval, overdue AP, out of stock, rejected, destructive, and blocking states.
- Phone inputs, selects, text areas, buttons, filter triggers, popovers, and row actions use the same `2px`/`4px` interior radii as tablet and desktop. Full-width surfaces use square edges. Status and notification badges may remain fully pill-shaped; ordinary cards must not.
- A single phone surface must not mix square legacy fields, inconsistent radii, green primary buttons, and semantic colors used outside their tier.

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
- Summary values share one flat data strip. Semantic red appears only when the corresponding value requires attention; zero and normal states remain operational green.
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

### Full-system interaction audit

All business actions follow one visible feedback contract: the first activation
disables the control, sets `aria-busy`, shows a contextual pending label and a
small spinner, then resolves to an explicit success or error state. A form may not
silently submit, render a fabricated zero, or leave the user guessing whether a
posting action completed. Audit this contract at 390px, 820px, and 1440px using
the route matrix in `docs/qa/FULL_SYSTEM_AUDIT_MATRIX.md`.

## Release identification

- The visible footer version is the canonical application release identifier, not a build-only or sprint-only counter.
- Every production release uses a three-segment semantic version in `package.json` and `src/lib/app-version.ts`; the login footer and workspace sidebar render `vX.Y.Z` from that same source.
- Every user-visible change batch must increment that shared version before its Git commit. The commit subject and GitHub release title must use the same short change title as `APP_RELEASE_TITLE`; no UI batch may be pushed with a stale footer version.
- GitHub tags use `vX.Y.Z`. GitHub Release titles use `vX.Y.Z — Release title`, matching the short `APP_RELEASE_TITLE` stored beside the application version.

## Parallel work and business-logic integration

- Production is promoted only from the designated integration branch after every active workstream has been merged and verified. Never promote an older Preview merely because its isolated smoke test passed.
- Each concurrent Codex task owns a separate `codex/*` branch and worktree. A task may commit and push its own scoped work, but it must not promote Production or overwrite another task's branch.
- Business migrations, RPCs, server actions, API routes, and permission changes require an isolated commit and contract tests before entering the integration branch. UI-only changes must not silently introduce a second business workflow.
- A new specialized workflow may reuse the canonical aggregate operation, but it must not create a competing source of truth, bypass the established approval state machine, or reserve inventory unless that reservation rule is explicitly approved in product documentation.
- Database migration numbers are allocated once on the integration branch. Before adding a migration, fetch the integration branch and confirm that the number is unused; rebasing or renumbering happens before review, never after Production has applied it.
- Temporary capture scripts, local CSV reconciliation tools, generated exports, and `supabase/.temp` state stay outside release commits unless the repository intentionally adopts them as maintained tooling.
- Before promotion, record the candidate commit SHA, current Production SHA, migration range, test result, and rollback point. If Production has moved since validation, stop and rebuild a Preview from the latest integration branch.

### Table activation and filter overflow

- A table row must never navigate on pointer-down or a single tap. Open a row with double-click/double-tap (or keyboard Enter/Space); explicit action controls remain single-tap.
- List filters are ordered Search → relevant dropdowns → Search button → result total. At constrained widths, move lower-priority filters into More filters rather than putting status before search or misaligning the control row.
- On phones, a simple Search + one status dropdown + Search + result total set stays on one row with a shorter search field. Only genuinely larger filter sets may wrap or move secondary controls into More filters.
- More filters is a modal surface on touch layouts: centered on tablet and bottom-aligned on phone. It sits above and temporarily obscures the bottom navigation, locks interaction with the page behind it, and always keeps Reset and Apply visible while only its fields scroll.
- Phone list-filter controls use the compact 34px height demonstrated by Movement Ledger; the search field, dropdowns, More filters trigger, Search/Filter button, and result summary share one visual baseline. Larger task-form controls keep their separate touch contract.
- Phone document workflow status is a compact secondary disclosure, not a full-width banner: cap it at 16rem, keep its trigger at 32px, and open the full workflow only on request.
- Autosave feedback belongs inside that same capped workflow summary; it may occupy a narrow trailing slot, but must never expand the summary back to full viewport width.
- A mobile page must not render a generic `More actions` bar merely because a desktop rail exists. The bar appears only after the user has selected a record/detail context or when the page has a real contextual action.
- A phone `OperationalHub` owns its own primary action. Its desktop-only context rail must set `hideMobileConsole`; never duplicate the hub action with a generic `More actions` bar or hide bottom navigation on the hub landing page.
- Every create FAB, including the `PageHeader` fallback used by list pages, uses the shared `data-mobile-create-fab` marker so safe-area clearance and tablet positioning cannot drift between action sources. Legacy `data-page-create-fab` may remain as a compatibility marker.
- **Mobile elevation:** Fixed bottom navigation and action bars use a restrained upward shadow so scrolling content is visibly separated from persistent controls.
- **Compact metric summaries:** Phone summaries with four or more scalar metrics use a dense two-column grid instead of one full-width row per value; tablet and desktop may expand to four or eight columns.
- **Short four-metric summaries:** When exactly four short totals fit legibly at the target phone width, keep them in one four-column strip. Do not turn a four-value status summary into four stacked cards.
- **High-count metric summaries:** When a phone summary contains eight short operational totals, it may use four compact columns and two rows; labels may wrap to two lines, but the summary must not become a long vertical ledger.
- **Mobile list status hierarchy:** A compact operational row may place its primary numeric value directly beneath the status badge. Supporting identity such as item code and branch/location wraps as separate lines instead of competing with that value.
- **Mobile pagination:** Phone pagination shows Previous, current/total, and Next only. Direct numbered page choices belong at tablet and desktop widths so pagination never collides with a floating operational action.
- **System-owned identifiers:** Auto-generated document numbers and versions are never editable form controls. Creation actions generate them authoritatively; the right rail may display their current system state.
- **Canonical units:** Quantity UOM fields use the shared canonical UOM list and normalization. Never accept free-text unit aliases where the value drives stock, recipe, or purchasing calculations.
- **Derived base units:** A recipe ingredient's base UOM comes from Item Master and is read-only in the recipe editor. Only the controlled recipe UOM may be selected; neither value accepts free-text aliases.
- **Report density:** Scalar report summaries use the shared compact metric strip (two columns on phones, expanding by viewport). Secondary report filters belong in `FilterBarMore`; primary search/status and submit remain in the single filter row.
- **Report issue rows:** Mobile report exceptions reuse the compact operational-list hierarchy: record first, severity and module together, reason next, and the recommended manual action as a final full-width detail. Do not render one bordered card with a full-width button per issue.
- **Read-only comparison rows:** A mobile comparison report may reuse `OperationalListRow` without navigation. In that case it shows no chevron, keeps the comparison status and key variance beside the primary identity, and places linked document references and compact quantities in the full-width detail layer.
- **Trend rows:** A mobile trend report does not squeeze a six-column analytic table into the viewport. Keep the full table from tablet upward; on phones reuse non-navigating operational rows with identity first, reliability signal and primary movement together, and the supporting received/leftover/wastage measures on one compact secondary line.
- **Readiness severity:** A readiness result is a semantic status, not an unstyled scalar. Ready uses success treatment; blocked or not-ready states use the shared red danger treatment.
- **Planning controls:** Report assumptions and tuning inputs (dates, target horizons, buffers, rounding, secondary dimensions) belong in `More filters`; the primary row keeps only the dimensions needed to identify the working dataset and its submit action.
- **Master-data units:** Product, item, recipe, packaging, and purchasing unit fields reuse the canonical UOM selector. A create form does not show an empty preview panel for an asset that cannot exist before submission.
- **Conditional line remarks:** Repeated quantity rows keep remarks collapsed until an exception exists (quantity mismatch, wastage/reason) or the user explicitly requests a remark. Existing remarks always remain visible.
- **Fixed line units:** When a line UOM is inherited from Item Master or the selected source document, submit it as a hidden value and show it beside the item code or quantity reference. Never spend a full phone input row on a read-only UOM.
- **Compact document setup:** On phones, pair related setup fields in a two-column grid when their values remain legible (for example date/reason or source/destination). Keep the required operational context visible and place optional notes, batches, references, and evidence fields behind an explicit inline disclosure.
- **Line removal affordance:** A repeated phone line keeps its remove control in a dedicated trailing column. Never overlay the remove control on the item search, quantity stepper, or expandable details.
- **Recoverable dependency errors:** When a form cannot continue because master-data mapping is missing, name the missing relationship and the exact workspace the user must open to repair it. Do not expose system-derived sourcing fields as a workaround.
- **Document rail actions:** A document right rail shows secondary actions directly on tablet and desktop; `More options` is reserved for phone-sized constrained action surfaces.
- **Create-document fields:** Auto-generated identifiers stay as hidden server inputs and may appear in the right-rail summary, but never consume editable form space. Repeated line-entry sections include explicit column headings at table widths.
- **Action-column label:** The shared lead action column is singular `Action`, centered in its fixed-width header and cells. Do not use a plural heading or left-align the pen/menu trigger.
- **Future-state line values:** A create form never asks the user to enter quantities or statuses produced by later workflow steps. New PO lines submit received and cancelled quantities as system-owned zero values; receiving and cancellation are recorded only from their dedicated workflows.
- **Automatic sourcing:** When branch–item mappings determine supplier, cost, and purchasing UOM, creation forms submit those values as system-derived hidden fields. Prefer the preferred mapping, otherwise use the first deterministic authorized mapping; do not expose automatic commercial fields as ordinary line controls.
- **User-initiated PR drafts:** Stock Count and Low Stock may let users add items to a cart, but a Purchase Request is created only after an explicit user action. The result is an ordinary Draft, never reserves inventory, and always returns to the canonical PR approval workflow.
- **Semantic urgency:** Priority inputs reuse the colored `UrgencySelect` whenever the choice affects operational scanning. Do not fall back to an indistinguishable plain select on adjacent workflows.
- **Related phone quantities:** When a repeated operational row contains three short, directly comparable quantities (for example Qty Sent, Received, and Wastage), keep them as three equal compact columns on one phone row. Exception reason and remarks remain absent until wastage is non-zero or persisted exception data already exists.
- **Mobile event feeds:** Activity and audit feeds reuse the compact `OperationalListRow` hierarchy on phones: event message first, actor/entity context second, timestamp aligned as meta, and one trailing chevron. Never create a separate leading `Details` column or repeat an icon on every row when it displaces the event content.
- **Recoverable long-form work:** Any operational form that normally takes several minutes or contains repeated line entry must keep a local recovery snapshot and autosave to its existing server-side Draft. Show a quiet inline `Saving…`, `Saved`, recovery, or retry state; do not add a modal or a new workflow status.
- **Stable background save:** Background autosave updates the Draft without route navigation, cache revalidation, scroll reset, or replacing the current client view. User view preferences such as sorting are stored independently from record data and survive autosave, refresh, and Draft route recovery. Stock Count defaults to Item Code order until the user explicitly chooses another order.
- **Persistent save feedback:** On a phone document with autosave, place its quiet save state in the sticky workflow summary so it remains visible while the user works. When both a manual Draft save and terminal action are available, they share the same bottom action row; do not duplicate either action as a large page-local button.
- **Terminal-action flush:** Posting, confirming, or completing a recoverable form must submit the latest visible values before changing lifecycle state. If that save fails, keep the record editable in its current Draft state and explain that it will retry.
- **Decimal-safe Stock Count:** Stock Count quantities accept up to four decimal places. Compare against a rounded value with floating-point tolerance; never reject valid user input because JavaScript added an IEEE-754 tail.
- **Bounded autosave retry:** Autosave retries only transient server or network failures. Validation and permission failures remain in the local recovery snapshot but must stop automatic retry loops until the user changes the form.
- **Non-retryable workflow conflicts:** A server response stating that an action cannot be completed in the current state is a lifecycle conflict, not a transient outage. Stop background retries, keep the local snapshot, and show that the changes remain recoverable on this device.
- **85% audit baseline:** Pages that use `DocumentWorkspace`, `WorkspaceGrid`, `OperationalList`, or the shared mobile action/filter surfaces inherit the approved `/staffs/new` tablet split, compact phone hierarchy, and action-first rules. Record the audit in Notion before changing a shared component; only promote a code change when a real contract or visual defect is found.
- **90% audit baseline:** Authentication and operational detail/report routes must be audited against the same shared shell before being marked ready; isolated auth pages keep business navigation out, while detail/report pages retain the approved right rail or compact operational list for their viewport.
- **Public route verification:** Next.js route-group segments such as `/(app)` are source layout folders, never production URL segments. Browser QA, screenshots, links, and Notion route records must use the literal public path (for example `/purchase-requests/new` or `/supplier-items/new`). Any result collected from a `/(app)/...` URL is invalid and must be discarded.

### v7.83.0 — Stock Count Autosave Visibility

- Stock Count autosave feedback is visible directly beside the count date whenever a server draft action is available, so `Saving…`, `Saved`, recovery, and retry states remain discoverable without opening another panel.
- Shared table Action links use a centered fixed touch target (`44px` on tablet, compact on desktop) rather than stretching the pen trigger across the entire cell; the Action header follows the same centered alignment.

### v7.84.0 — Filter Dialog Navigation Safety

- When `FilterBarMore` is open on phone or tablet, the mobile bottom navigation is hidden behind the dialog. The filter dialog owns the interaction surface until it is closed or applied.

### v7.85.0 — Stock Count Autosave Cleanup

- Stock Count keeps one canonical autosave status beside the count date; the retired event-driven duplicate status component is removed so the visible state cannot diverge between surfaces.
- Contract tests follow the fixed centered Action touch target and the single autosave status source.

### v7.86.0 - Shared Create FAB Safe-Area Alignment

- Page-header create actions now opt into the same `data-mobile-create-fab` contract as right-console create actions, keeping bottom-navigation clearance and safe-area positioning consistent across list pages.
- The legacy `data-page-create-fab` marker remains only for compatibility; it is no longer the sole positioning hook.
### v7.87.0 — Staff Access Default Branch Submission Fix

- Staff creation keeps the default branch visually locked while submitting it as an accessible branch value, so the server-side access validation receives the required branch instead of an empty checkbox payload.
### v7.89.0 — Integrated OpsLogic Business Workflows

- Integrated the committed OpsLogic branch into the UI closure branch without dropping the existing shared-component work.
- Preserved branch-scoped Purchase Request creation, transition authorization, Stock Count cancellation atomicity, and Stock Transfer reservation/partial-receiving contracts.
- Release gate: 451/451 contract tests, typecheck, strict typecheck, and lint pass. No Supabase migration was executed from this worktree.

### v7.91.0 — Stock Count Detail Query Reliability

- Stock Count detail loading now reads only the current count's line item IDs and branch instead of scanning all Items and Branches for every detail request.
- This preserves the Draft → Confirm & Post workflow and autosave behavior while reducing the chance of a detail page remaining in `Loading data…` on larger workspaces.
- Browser evidence: phone Stock Counts list and Draft workflow passed; detail reload still requires production three-viewport verification when the browser runner is available.
- Release gate: 451/451 contract tests, strict typecheck, and lint pass. Production build remains environment-dependent when Supabase variables are absent.

### v7.90.0 — Purchase Request Branch Scope Hardening

- Purchase Request branch selectors use an explicit typed scope option and only expose branches assigned to the actor when required.
- Server-side creation and submit transitions continue to validate branch access; client selection is not treated as an authorization boundary.
- Release gate: 451/451 contract tests, typecheck, strict typecheck, and lint pass. Supabase migrations remain staged but unapplied until the linked project and migration history are verified.

### v7.92.0 — Stock Count Three-Viewport Acceptance

- Production acceptance completed against `/stock-counts` and a real Draft record at desktop (1440×900), tablet (820×1180), and phone (393×852).
- All three viewports reached the Stock Count list and Draft detail without a login redirect or route error.
- The Draft detail visibly exposes `Autosave ready`, preserves the `Code` sort selector, and exposes both `Save draft` and `Confirm & Post Count`.
- Desktop/tablet use the approved right action rail; phone uses the shared bottom action row with both actions visible together.
- Evidence screenshots: `D:/CodexHome/visualizations/2026/08/02/stock-count-audit/` (`*-list.png`, `*-detail.png`).
- This acceptance verifies the UI contract only; it does not post or mutate production business data.

### v7.93.0 — Tablet Filter Dialog Navigation Safety

- `FilterBarMore` now removes the mobile bottom navigation on every mobile and tablet viewport (up to 1279px) while open.
- The dialog therefore owns the full interaction surface; Apply, Reset, and Close cannot be obscured by or compete with bottom navigation.
- This is a shared rule and applies to every page using `FilterBarMore`; no page-specific duplicate implementation is allowed.

### v7.94.0 - Compact Dropdown-First Filter Rows

- Shared filter rows keep a first-position dropdown content-sized (14rem maximum) on tablet and desktop, leaving intentional breathing room instead of stretching a lone status control across the canvas.
- Search-first rows retain their flexible search field; the rule applies to both native selects and the shared Radix select trigger.

### v8.04.0 — Safe Mobile Pagination Density

- Shared pagination keeps its result summary shrinkable and its navigation controls intact on narrow phones; desktop page choices may wrap instead of clipping the final controls.

### v8.03.0 — Unposted Stock Count Deletion

- Stock Counts may be removed while they are still unposted, including legacy pending and cancelled records; autosave-created work is not trapped in an undeletable state.
- Posted Stock Counts remain immutable because they have already changed the stock ledger. Deletion remains soft, branch-scoped, permission-gated, confirmation-protected, and activity-logged.

### v8.02.0 — Lightweight New-Document Headers

- New documents show their descriptive title as plain context text instead of a bordered document-number control; generated document numbers keep the shared number treatment on detail pages.

### v8.01.0 — Centered Table Actions

- Shared table action links use a block-level flex control so the pen/action icon is truly centered inside the fixed Action column at phone, tablet, and desktop widths; sticky checkbox/action/identity offsets remain unchanged.

### v8.00.0 — Aligned Filter Rails and Dashboard Actions

- Shared list filters use a consistent 8px control gap on wider surfaces; compact mobile rows retain their explicit density rules so search, dropdowns, submit, and result totals stay aligned without accidental crowding.
- Dashboard payables actions use the compact action text scale, matching the operational console instead of competing with the metric hierarchy.

### v7.99.0 — Focused Stock Count Actions

- Stock Count details keep Save draft and Confirm & Post as the primary action pair; Cancel and Delete remain available inside collapsed More options to reduce accidental destructive actions and visual noise.
- Collapsing secondary actions is opt-in per workflow, so existing procurement action rails are not changed without an explicit rule.

### v7.98.0 — Compact New-Document Context Headers

- New-document headers use a smaller document identifier and tighter vertical rhythm on phones; status and branch remain visible without turning the context row into a large action surface.
- Workflow progress remains a compact, accessible secondary summary; the primary page content and action bar retain visual priority.

### v7.97.0 — Focused Stock Count and Receiving Surfaces

- Stock Count status filters expose only the current Draft, Posted, and Cancelled states; legacy records remain readable without reviving the retired approval chain.
- Goods Receiving list filters use the compact mobile search/status/result arrangement, and the new receiving form has one surface boundary instead of a nested duplicate card.

### v7.96.0 — Safer Stock Count Draft Management

- Stock Counts in `draft` or `cancelled` status may be soft-deleted by users with `stock_count.update` access; posted counts remain immutable and their audit history is retained.
- Stock Count CSV export respects the selected from/to date filters and excludes soft-deleted records.
- Stock Count autosave waits for 2 seconds of user idle time, keeps recovery state locally, and reports its status in the mobile action bar.
- Mobile Stock Count rows use compact 44px steppers and preserve the item-first reading hierarchy; Save draft and Confirm & Post share one action row when both are valid.

### v7.95.0 - Compact Dropdown-First Filter Rows on Phones

- A leading status or category dropdown stays content-sized on phones instead of inheriting the full-width search slot.
- Search-first rows keep their flexible search behavior; this shared rule keeps dropdown-first filters within the approved two-row mobile density.
- This closes the Costing Readiness “All severities” density annotation without changing the canonical Search-first ordering or mobile wrapping behavior.

### v7.88.0 — Tablet Split Action Deduplication

- A tablet split workspace exposes its primary action in the right rail. The shared mobile FAB and mobile action bar are suppressed between 768px and 1279px so one task never presents duplicate primary actions. Phone retains the FAB and desktop retains the right console action.
### v7.89.0 — Integrated OpsLogic Business Workflows

- Integrated the committed OpsLogic branch into the UI closure branch without dropping the existing shared-component work.
- Preserved branch-scoped Purchase Request creation, transition authorization, Stock Count cancellation atomicity, and Stock Transfer reservation/partial-receiving contracts.
- Release gate: 451/451 contract tests, typecheck, strict typecheck, and lint pass. No Supabase migration was executed from this worktree.
