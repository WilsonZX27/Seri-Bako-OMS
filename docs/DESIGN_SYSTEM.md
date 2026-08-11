# Seri Bako Living Design System

This is an evolving product contract, not a frozen visual specification. `DESIGN.md` defines the workspace architecture; this document defines how that architecture adapts as the product matures. When research, usability evidence, and product-owner approval support a better pattern, update this contract instead of preserving a weaker legacy rule.

## Product character

- Premium utilitarian, calm, direct, and operationally dense.
- Hierarchy comes from typography, spacing, grouping, and restrained depth, not decoration.
- Every visible element must answer one question or enable one action. Repeated counters are a defect.
- Marketing-site effects, decorative gradients, floating glass inside data content, and oversized consumer cards do not belong in the OMS workspace.

## Evidence-based product principles

These rules translate current product-design research into acceptance criteria rather than visual adjectives:

- **Earn attention.** A surface may use strong color, size, elevation, or motion only for the current decision, exception, or primary action. Secondary metadata recedes through quieter type and spacing; it must not compete with the active task.
- **One fact, one home.** A metric, identity line, scope, status, or action appears once in the primary scan path. Dashboard signal mix, exception panels, and hero counters must not restate the same operational fact under different headings.
- **Stable action geography.** Desktop and tablet primary actions stay in the right action rail; phone primary actions stay in the bottom-safe action/FAB area. Filters end with their apply/reset action. Loading must not move an action to a different region.
- **Density follows frequency.** High-frequency expert workflows compress repeated rows and controls; low-frequency configuration may breathe more. Phone may use three compact columns for three short metrics and a two-by-two grid for four metrics instead of stacking every value vertically.
- **Graphics explain; they do not decorate.** Use a trend, comparison bar, distribution, or progress graphic only when it makes magnitude, direction, or exception concentration faster to understand than numbers alone. Every graphic retains an accessible numeric label.
- **Immediate, restrained feedback.** The first tap produces a pressed/pending state within one frame. Short transitions clarify state or spatial continuity and honor reduced-motion; ornamental motion, parallax, and indefinite shimmer are prohibited in operational work.
- **Validate the real view type.** List, split view, document, dense editor, and phone task flow are evaluated independently at their representative viewport. Passing one desktop screenshot never closes responsive acceptance.

Research basis: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines), [Apple design principles](https://developer-mdn.apple.com/videos/play/wwdc2026/250/), [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui), [Linear design refresh](https://linear.app/now/behind-the-latest-design-refresh), and [Basis density guidance](https://design.basis.com/foundations/density).

Additional implementation references: [Vercel Geist typography](https://vercel.com/geist/typography), [Vercel Geist materials](https://vercel.com/geist/material), [Vercel Geist sheets](https://vercel.com/geist/sheet), and [web.dev INP guidance](https://web.dev/articles/optimize-inp).

## Workspace architecture

- Desktop: left navigation, central work/data canvas, right action and context rail.
- Tablet: use a true master-detail split when actions or summaries matter during inspection. The main list owns at least 60% of available width; the rail never overlays filters or rows.
- Phone: one task canvas with a compact top context and bottom navigation/action rail. Move secondary context into a sheet, never below a long form.
- Phone and tablet use browser-native document scrolling. This lets mobile browser chrome collapse as the user moves through the page and avoids the false "app inside a webpage" feeling created by nested full-height scrollers. Only overlays, menus, and intentionally bounded data regions own nested scrolling.
- Installed standalone mode is optional. The responsive browser page remains the canonical experience and cannot depend on installation for full-height layout, safe-area handling, or access to any workflow.
- Primary actions belong in the right rail on desktop/tablet and in a visible bottom action or FAB on phone. Do not duplicate them in the center header.

## Responsive information hierarchy

- Preserve meaning, not desktop geometry. Multicolumn tables become scan-first operational rows on touch devices.
- Phone dashboards may use three compact columns for short pipeline metrics and a two-by-two grid for four status metrics.
- Hide or merge repeated summaries. An exception panel appears only when it contains an exception or an unavailable state requiring explanation.
- Critical names, locations, dates, statuses, and quantities wrap or reflow; they never use destructive truncation.
- A phone dashboard must keep its decision path within a practical scroll budget: identity, quick actions, primary operational pulse, and the first actionable queue should fit within roughly two 430px view heights. Repeated zero-state sections collapse or merge instead of extending the page.
- Tablet list workspaces use a deliberate master/list-to-rail ratio between `60/40` and `70/30`; filters and result counts remain wholly inside the list column and never render underneath the rail.

## Geometry and spacing

- Use an 8px spatial rhythm with 4px half-steps for dense controls.
- Panel radius: `8px`; control radius: `4px`; tiny status indicators may use a pill only when their semantic shape is intentional.
- A component and its siblings must use the same radius. Screen-edge rails and full-width mobile action bars remain square at the viewport edge.
- Shadows indicate elevation or sticky separation only. Default panels use one restrained card shadow, never stacked glow effects.
- Radius is tokenized, never improvised: panels use `8px`, controls use `4px`, compact chips use `999px`, and viewport-edge surfaces use `0`. A single component may not mix multiple panel/control radii.
- Use three elevation levels only: canvas (`none`), persistent panel (`0 1px 2px` plus a low-contrast border), and transient overlay/sticky separation (one stronger shadow). Elevation must communicate containment or overlap, not luxury decoration.
- Typography uses named roles rather than arbitrary size/weight combinations: page heading, section heading, body copy, compact label, metadata, tabular value, and button label. Operational numbers use tabular figures; labels pair with icons on one baseline and do not become bold merely because they are table headers.

## Operational feedback

- Every mutation acknowledges input immediately, disables duplicate submission, and uses an explicit verb state such as `Saving...` or `Posting...`.
- Passive loading uses skeletons within the final layout. Errors appear once, near the responsible context, with a recovery action.
- Use optimistic navigation only when the operation is safely idempotent or reversible. Financial posting, stock posting, and destructive actions wait for authoritative confirmation.
- Pending labels preserve control width so the layout does not jump. External `form="..."` triggers must clear pending on success, validation error, navigation failure, and thrown server error.
- Search/filter forms may apply immediately when the control changes. Once any filter is active, the terminal action may become a clearly labelled reset action; never keep a redundant Search button when results have already updated.

## Performance contract

- Dashboard and overview routes read pre-aggregated summaries, never full ledgers.
- Long lists are paginated server-side. Fetch detail streams only after a user opens a document or movement view.
- Keep initial route queries bounded and parallel. A timeout is a recovery guard, not the primary performance strategy.
- Validate representative phone (`430px`), portrait tablet (`820px`), landscape tablet (`1180px`), and desktop (`1440px+`) layouts before acceptance.
- Overview and list initial reads have explicit query bounds. A list route may fetch at most the requested page plus the small summary/category payload needed for that screen; it must not load the full table and paginate in application memory.
- Performance truth is measured at the data boundary: query row count, database duration, route response time, and transferred payload. Skeleton polish never substitutes for removing an unbounded query.
- Targets under warm normal conditions: summary query `p95 < 100ms`, list data query `p95 < 300ms`, visible mutation acknowledgement `< 100ms`, and no ordinary route may rely on a client timeout to appear responsive.
- Interaction acceptance targets INP `<= 200ms` at the 75th percentile separately for phone and desktop. Measure the actual slow interaction and its route/query context; loading animation duration is not response-time evidence.
- Ledger/history filters default to a useful bounded period and retain server-side pagination after search, branch, item, type, and date predicates are applied. Export is a separate explicit operation and is never implemented by silently expanding the on-screen query to all rows.

## Reference principles

- Apple HIG: purpose, familiarity, feedback, adaptive layout, and consistent hierarchy.
- Enterprise list patterns: split-view inspection on tablet, scannable row identity, and persistent action context.
- Accessibility is part of quality: keyboard focus, clear labels, reduced-motion support, touch-safe targets, and semantic live states are mandatory.
# Phone search and filter contract (v8.38.0)

The phone list surface is intentionally distinct from tablet and desktop. At `max-width: 639px`, `UnifiedListHeader` renders a single 44px search row with a Lucide search affordance, a clear affordance when text exists, a filter trigger, and the result count. The search control owns its form submission and debounces query updates without touching unrelated page forms.

The phone filter trigger opens a full-viewport backdrop at `z-index: 100` and a bottom sheet at `z-index: 101`. The sheet completely covers mobile navigation, respects the safe-area inset, and keeps Reset and Apply visible while its fields scroll. This is the only viewport that uses the iconic search/filter-drawer treatment.

At `640px–1023px`, retain inline filters and the documented master/list-to-rail split. At desktop, retain inline filters and the right action rail. Responsive presentation may change density and placement, but it must not change query semantics, authorization, business logic, or Supabase data sources.

The newest versioned rule is authoritative when it conflicts with an older historical note in this document. Promote a rule only after evidence from representative phone, tablet, and desktop routes demonstrates a real usability or density improvement.
# v8.36.3 shared list and daily-entry contract

- A list workspace has two sibling surfaces: `sb-list-query-card` and `sb-list-content-card`. Do not wrap both inside a third visual card.
- From 1024px upward, query controls use one row when space permits. From 640px through 1023px, search owns the first row and filters/actions own the second. Search is elastic; filters and the terminal action use the shared 8rem width and 44px height.
- The trailing group is ordered `record count → Search/Reset`, aligned to the far right. Search uses the primary green treatment; an active Reset keeps identical geometry.
- Phone uses `UnifiedListHeader` and a separate content surface. The drawer is phone-only and remains above the bottom navigation.
- Panel radius is 12px and control radius is 8px. Historical 8px/4px notes are superseded by this newest convergence contract.
- In Outlet Daily, conditional exception controls do not consume vertical space until wastage exists. Desktop reserves the exception column; tablet begins the exception row beneath Qty Sent; phone stacks it beneath the three quantities.
- Document actions are capability and state driven. One clear next action is primary; Save Draft and alternate authorized transitions belong to More.

# v8.36.4 procurement list surface contract

- Operational and master-data lists render query controls and result content as sibling surfaces, never as one clipped table card.
- Shared query controls are 44px high. At tablet and desktop sizes, search may grow while filter controls and Search/Reset stay 8rem wide; the result count stays in the terminal action group.
- `UnifiedListHeader` is the responsive owner for these rules, including `MasterDataFilters` consumers. Pages supply fields and data only; they do not recreate toolbar geometry.
