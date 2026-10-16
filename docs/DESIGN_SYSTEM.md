## Current authority — v9.2.105 and bounded local remediation

PRODUCT.md owns density: controls are 36px at >=1024px and at least44px below1024px. The shell right Console remains >=1280px. WorkspaceGrid with a landscape split keeps actions/context stacked at768–1023px, then inline beside the canvas at1024–1279px. Context-mode documents expose tablet actions independently of Files/Activity. These local action/focus/semantics fixes are not a deployment claim.

Filter sheets and ModalShell use the shared dialog-focus helper: hidden state fields are never tab stops; entry and Tab/Shift+Tab containment stay inside the dialog, and Escape restores the trigger. Field descriptions and errors retain all existing aria-describedby references. Business display formatters preserve pending, unavailable, zero and not-final meanings across table and compact layouts.

All versioned sections below are historical evidence. Their earlier density values and portrait-tablet More placement are superseded by this section and PRODUCT.md; they must not be used as current release contracts.

## v9.2.86 (historical deployed release) — annotated operational density correction

The owner's 2026-10-04 annotations supersede the previous 44px desktop Planning treatment: operational query and Planning controls are 36px from 768px; normal WorkspaceTabs use 36px tabs and a 46px outer surface. Phone controls retain 44px. Planning's desktop Adjust is a 23px visual command in the requested #7c9b8d with white text; other primary actions retain the OMS green. View commands share #e7f1eb / #084b37. This applies through the existing shared owners, including Daily Records and Insights; Packaging's approved compact filter composition is preserved. SAP Fiori's compact/cozy distinction is a category reference, not a copied theme: https://www.sap.com/design-system/fiori-design-web/v1-136/foundations/visual/cozy-compact.

The worksheet fixes outlet tracks at 112px rather than distributing unused width between inputs. A 32px indexed lead column and 200px product identity remain frozen; the 136px read-only summary shows unknown values as a dash, never zero. Separate borders and opaque header cells establish stable vertical/horizontal stacking. Adjust opens the existing focus-managed ModalShell, with local trays/reason editing, Apply/Automatic/Cancel; cancelling leaves production unchanged. The unsaved-switch dialog uses a 448px maximum instead of 1024px. Settings uses two vertically stacked shared surfaces in the same form and removes the annotated paragraph. Insights date is capped at 168px, count joins the action group, and Received/Wastage/Rate toggle numeric sorting with aria-sort, stable name ties and unknown values last. Only the two needed aggregate lists cross the server/client boundary.

Source verification: `01.SERI BAKO ALL KUIH ORDER.xlsx`, coded V2 sheets and matching explicit original yield column, confirms SC01/SC02/SC15/SC16 = 16, SC07 = 28, and SC03–SC06/SC08–SC14 = 32. PJS10's previously empty configuration was populated for these 16 products through the normal Manager Settings action, recorded by its audit, with demand basis manual, minima unfilled, automation disabled. Existing 2026-10-05 PJS10 v1 was found in draft with zero entered allocation/production values; normal Recalculate refreshed its yield snapshots. No new plan, formal order, approval, dispatch or inventory transaction was created. Alma and other products have no confirmed kitchen-specific source in this workbook and are not inferred. The workbook's variable daily allocations are not minimums or new demand orders. Database schema remains reviewed through 330; permission-warning closure, wider cold/tail latency and historical Packaging closing provenance remain separately tracked.

Strict TypeScript, lint, 1,406 regressions and 85 isolated PostgreSQL checks pass. Final v9.2.86 deployment CPtQ5g5r5s8jtDHkhakozG112hsY (8559a57a) is READY and aliased to the formal domain, with sin1 independently inspected. Formal responsive and interaction evidence, including the final row-divider follow-up deployment, is recorded in docs/qa/OMS_PRODUCTION_REWORK_2026-10-04.md.

## v9.2.85 (deployed) — measured outlet reporting performance

Migration 330 is applied: Daily Records resolves the original authorized branch predicate once per statement; child lines inherit the same parent SELECT RLS via a set. No persistent permission cache, changed company/outlet access, write policies, operational values or stock posting. Live rollback comparison across eight active role categories returned identical parent/line/report results. Same Owner, date and 30-day Packaging EXPLAIN ANALYZE: 3,277.739ms before, 151.633ms after (95.4% reduction); this is database execution time, not full browser latency. Migration 325 remains pending and unrelated Advisor findings are not claimed cleared.

Packaging uses request-scoped React cache deduplication only, keeping fresh RLS across requests; local chart series are memoized and grouped in one pass. Insights cost and report reads run independently in parallel. Shared IntentPrefetchLink warms opted-in Planning/Daily Records/Insights tabs only on pointer or keyboard intent, with duplicate warming suppressed; no eager viewport loading of every report. Successful daily save/post/void and Planning writes invalidate Insights and Packaging route data. Forecast results continue to be persisted in plan versions; no new materialized inventory or historical confirmations are introduced. Cross-request report TTL caching is deliberately not enabled without a verified permission/freshness version key. Source convention follows Next.js request/route caching and PostgreSQL statement-level RLS semantics.

Vercel functions are configured in sin1 to colocate with the confirmed ap-southeast-1 database; build location is not used as runtime-region evidence. Deployment 2Fj2GWKnfE47gAiEAWqLgEYbghpq (af6ec8d9) is READY and aliased to https://system.seribako.com.my; inspect independently confirms serverless functions in sin1. Authenticated Packaging and Insights show v9.2.85 and load their reports without browser errors. Browser reload-to-visible observations include automation overhead and are not a precise end-to-end benchmark. Isolated scope tests cover company A/B, outlet, routed kitchen, missing assignment/identity, denied permission, immediate scope changes and orphan/anonymous denial. Final test/build counts and screenshots belong to docs/qa/OMS_PRODUCTION_REWORK_2026-10-04.md.

## v9.2.84 (deployed) — compact Planning and explicit query actions

Current release is v9.2.84; final deployment 6uZJm6wU86VskGmYcA3X79BFR2ke (commit 265580f6) completed and aliased to https://system.seribako.com.my. The scoped control-density follow-up is independently verified on the formal page: 44px controls, 200px product column and 136px system summary. v9.2.83 procurement fixes remain included. v9.2.82 also deployed successfully (AxE6dgNLNZYeBPdwapb5TTg9aEuz); its UI acceptance was superseded by the approved layout rework. This version reuses WorkspaceGrid, WorkspaceTabs, FilterBar, Table, SelectControl, Input, Button and ModalShell. No new visual foundation or decorative motion.

Planning and Insights use the backward-compatible FilterBar actions slot; fields precede a right-aligned submit action. Planning scopes 44px controls to its workspace and portal actions. Product identity (200px) and calculated summary (136px) precede outlet quantities (112px) and kitchen retention (96px). ResizeObserver groups outlets using actual container width; full overview scrolls within the worksheet. At <768px the shared responsive-field owner disables the hidden matrix and provides one-outlet cards; at 768–1023px the rail stays in More to preserve editing width; landscape tablets use the existing split rail. Search, category and group changes retain parent-owned unsaved inputs. Existing consumers retain the 1280px responsive-field default. Date/kitchen/version and workspace-tab navigation use the shared confirmation modal for save/discard/cancel.

Automatic trays = ceil((approved outlet demand + independent event quantity)/yield); retention allocates surplus and never manufactures demand. Manual override is explicit and reasoned, with Restore automatic. Migration 329 adds nullable tray_mode, recomputes automatic drafts in SQL, validates review snapshots and preserves legacy NULL modes, old clients and approved versions. Event Details and Products & Quantities are separate visible shared surfaces in one form; Scheduled Events moves to the right rail and below the form on portrait/mobile. Destination/date supply resolution is permission-gated and company-scoped; missing/conflicting effective primary routes block confirmation. Saving rechecks the route. Corporate events require explicit kitchen selection.

Repository migrations reviewed through `329`; applied Production migrations include 324, 326, 327 and the independent Goods Receiving fix 328. Migration 329 is applied with its function definitions and preserved ACLs independently verified; all 52 historical product rows keep NULL mode and unchanged quantities. 325 remains pending explicit permission approval. No local Supabase, fabricated Production orders, approvals, dispatches or inventory writes. Strict TypeScript, lint, 1,404 regressions and 85 isolated PostgreSQL checks pass; Hosted build succeeded. Authenticated Planning and Insights at 390/820/1180/1440px have no root horizontal overflow; screenshot evidence is recorded in the QA ledger. Final Events and shared-consumer acceptance remain pending after the session expired again. Login was restored for the completed checks. Initial read-only checks verified search/overview preserve zero, unsaved switching exposes all three choices, Cancel restores focus to View plan, and test values were discarded without saving. Permissions warnings, 30-day Packaging query performance and verified closing-stock provenance remain open in the QA ledger.

## v9.2.82 (deployed; acceptance superseded) — actionable plan review groups

The existing Plan checks console composes shared ConsoleSection/Button with native disclosure groups for Settings, quantities, Manager reasons and production balance. Exact product/outlet messages remain accessible, and the current-date/kitchen Settings link is shown only when configuration is incomplete. Unsaved edits never display Ready for review. Review and database gates are unchanged; no CSS, motion, permission or database changes. The business composition lives in production-planning-review-checks.tsx; generic components retain their existing ownership. Production remains v9.2.81 with 324, 326 and 327 applied, 325 pending. Formal v9.2.82 verification is not yet complete.

## v9.2.81 (deployed) — partial manual drafts / migration 327 applied

Draft save preserves unknown allocation quantities and tray counts as NULL, separately from explicit zero; submit/release remain blocked until quantities, minimums, yields and whole-tray balance are complete. Invalid numeric ranges and fractional trays are rejected at the action and database boundaries. The transactional function preserves its permission checks, locking, idempotency, audit and strict review rules. Manual-only generation skips unusable eight-week history; mixed same-day plans retain full food-record completeness checks. No grant or RLS policy change. Production is v9.2.81 with migrations 324, 326 and 327 applied; 325 remains unapproved. Guarded migration 327 applied independently after live function/source comparison, preserving ACLs, SECURITY DEFINER and owner. The old function reproduced the failure; 63 isolated PostgreSQL flow checks and 1,387 regressions pass. No local Supabase or production operational UAT writes. Deployment 8ZTxPzEZnK9tbjGiQJpb18TWrhPq completed successfully and is aliased to https://system.seribako.com.my. Authenticated Owner Planning reports v9.2.81; unknown quantities remain blank and review stays blocked. At 390/820/1180/1440px the document has no root horizontal overflow. No operational records were written.

## v9.2.80 (deployed) — selected-period Packaging reads

Packaging requests only the selected 7/30-day report once; outlet/product filters remain local. A period change performs server navigation, preserves client filter identity, and shows shared loading states instead of treating an unrequested month as missing or zero. Failures use ErrorState with the shared RetryButton, preserving the workspace URL. Latest closing stock remains independently returned by the existing report RPC, including records older than the selected period. No RLS, grant or inventory change. Deployment 2zJb5RgYqK5DR4haWDXcBwBGtrwS succeeded and is aliased to https://system.seribako.com.my. Database 324 and 326 are applied; 325 remains pending. Strict TypeScript, lint, hosted build and 1,385 regressions passed.

## 2026-10-04 current verified release — v9.2.79 / database 324 + 326 (325 pending)

Deployment `6DUNX69vZnWaH7RBRZAuisokn4WX` succeeded and the formal alias is https://system.seribako.com.my. Commit `0103a2f9` passed strict TypeScript, lint, hosted build and 1,381 regressions. Owner-authenticated checks verified the corrected Plan phone drawer, product-order guidance and focus restoration, and Packaging at 390/820/1180/1440px without root overflow. The phone inline filter card is 130px high with no empty primary row. Earlier release evidence below is historical; the larger QA goal remains open, including database performance/permissions, provenance and complete workflow/a11y acceptance.

## Database eligibility follow-up — migration 326 applied independently

Repository migrations reviewed through `326`; production ledger includes 324 and 326; 325 remains unapproved.

A disposable PostgreSQL fixture reproduced expired-but-active staff reading and configuring Planning through the legacy helpers. Migration 326 aligns planning_manager, planning_branch_access and planning_require_manager with the existing current_staff_id eligibility gate; Malaysia employment end dates remain inclusive. It changes no ACL, policy declaration or operational quantity. The fixture verifies ended/inactive/anonymous denial, eligible current-day/open-ended staff, and unchanged ACLs, SECURITY DEFINER flags and ownership. The production-planning integration suite passes 52 checks with 326. Migration 326 was applied in a guarded transaction and independently read back. Original function hashes matched preflight; ACLs, SECURITY DEFINER flags and owners were unchanged. The authenticated Owner still opens the editable draft. Production is application v9.2.79 with 324 and 326 applied; 325 remains unapproved. Future approved db push must include the earlier 325 with --include-all; do not assume a contiguous applied-through version.


## 2026-10-04 verified production authority — v9.2.78 / database 324

Deployment `D2xa7BFBHrLG57s2d9n8SHNypRhB` succeeded and is aliased to https://system.seribako.com.my. Owner-authenticated production checks covered Plan, Settings, Events, Daily Records, Insights, the canonical DO list and Packaging at 390/820/1180/1440px without root overflow. Phone Plan actions opened successfully; Escape closed the drawer and restored trigger focus. Strict TypeScript, lint, hosted build and 1,377 regressions passed. These are surface checks, not complete workflow or WCAG certification. See docs/qa/OMS_PRODUCTION_REWORK_2026-10-04.md for evidence and unclosed gates. Database remains 324; prepared 325 and the live packaging RLS experiment are pending specific permission authorization.

## v9.2.79 (deployed) — provenance and shared phone filters

Candidate removes the blank primary row from shared inline phone filters, keeps unconfirmed packaging usage blank, and orders review checks by the displayed product/outlet sequence. Actual component render tests distinguish explicit zero from absent confirmation and preserve zero result counts. No database policy, grant, quantity or inventory change is included. This candidate was deployed and verified as recorded in the current release authority above.

## Historical v9.2.78 candidate — actionable validation

Event quantity validation opens the product section, shows the shared inline error and focuses its first quantity input before any action call. Native invalid quantities also reveal the section. Shared action errors classify schema-cache diagnostics as unavailable and keep internal table names in server logs. Six added server-action tests cover invalid/no-write boundaries, role denial, explicit zero minima, empty recipients and truthful unavailable-mail feedback. Production remains v9.2.77 until deployment is verified in the QA ledger.

## Historical verified release — v9.2.77

Application deployment `HDzwJWpTrajQF5ErPL2p1vP57ciE` completed and aliased to https://system.seribako.com.my. Hosted production build, strict TypeScript, lint and 1,359 regressions passed. The production login screen independently reports v9.2.77. Authenticated workflow and remaining device acceptance are pending; database remains migration 324, with 325 prepared and unapproved. Historical candidate and acceptance entries below are retained as dated evidence, not overall closure.

## 2026-10-04 operational module component ownership

Daily Records, Insights and Delivery Orders share WorkspaceTabs; Planning uses the same tabs for Plan, Settings and Events. WorkspaceGrid owns responsive geometry, FilterBar owns list queries, SelectControl owns choices, Table/OperationalListRow own desktop/touch data, ModalShell owns focus and dialog layers, and system-states owns skeleton/empty/error states. Feature components compose these owners. Attendance remains a shared-navigation regression target.

New operational surfaces reuse existing color, motion and spacing tokens. Validate 390/820/1180/1440 widths, keyboard and focus restoration, reduced motion, 44px touch targets and WCAG 2.2 AA contrast. Only bounded data regions may scroll horizontally. Do not call a shipped layout accepted without live viewport evidence.

# Seri Bako Living Design System

This is an evolving product contract, not a frozen visual specification. `DESIGN.md` defines the workspace architecture; this document defines how that architecture adapts as the product matures. When research, usability evidence, and product-owner approval support a better pattern, update this contract instead of preserving a weaker legacy rule.

## v8.64.16 authoritative data-state contract

Operational totals must carry provenance for the exact value being displayed.
Metadata from a neighbouring field is never accepted as a proxy. Collection
pages apply database filters and pagination before hydrating child rows; an OMS
list must not scan full history to render one page. Unique database constraints
remain the final concurrency authority and duplicate user actions converge on
the winning record.

## v8.64.15 annotation close-out contract

Repeated visual feedback is treated as a shared-system defect when the same
pattern appears on more than one route. The owner is fixed before any route
exception is considered:

1. **Canvas** — one `WorkspaceGrid` width contract (`contained`, `wide`, or
   explicit `full`) and one centered gutter rule for tablet and desktop.
2. **Shell** — one device matrix for phone, touch tablet, and desktop; iPadOS
   desktop-mode reporting cannot select the desktop shell merely because the
   CSS viewport crosses `xl`.
3. **Toolbar** — one `UnifiedListHeader` geometry and one control height/track
   rule. Route filters provide fields only.
4. **Surface** — query and content are sibling surfaces; nested cards are
   flattened at the shared layer.
5. **Action** — one primary action location per viewport, with no duplicate
   Save/Submit/Review button in the content stream.
6. **State** — verified zero, unavailable, empty-success, and loading are
   distinct semantic states and copy.
7. **Density** — repeated rows use compact scan patterns; artificial minimum
   heights and decorative empty boxes are prohibited.

Every annotation fix must name its category, change the shared owner, add or
update a contract test, and be checked at 390, 820, 1180, and 1440px. A route
specific CSS override is allowed only when it is a documented semantic variant.

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
- Panel radius: `12px`; control radius: `8px`; tiny status indicators may use a pill only when their semantic shape is intentional. These values are defined once in `globals.css`; later design layers consume them without redefining them.
- A component and its siblings must use the same radius. Screen-edge rails and full-width mobile action bars remain square at the viewport edge.
- Shadows indicate elevation or sticky separation only. Default panels use one restrained card shadow, never stacked glow effects.
- Radius is tokenized, never improvised: panels use `12px`, controls use `8px`, compact chips use `999px`, and viewport-edge surfaces use `0`. A single component may not mix multiple panel/control radii.
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

The unversioned foundation above is authoritative. Versioned sections below are historical implementation evidence and may explain why a rule changed, but they cannot override the foundation. Promote a rule into the foundation only after evidence from representative phone, tablet, and desktop routes demonstrates a real usability or density improvement.
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

## v9.2.76 acceptance refinements

ModalShell restores focus to its captured trigger when an explicit triggerRef is absent. FilterBar and UnifiedListHeader accept a semantic resultLabel, preserving records as their default. Delivery-order operational actions compose WorkspaceGrid and ConsoleSection; controlled correction uses DestructiveActionDialog. The printable DO table is a semantic print variant with shared tokens and bounded 20-line A4 pages, rather than a second application design system. Authenticated responsive evidence and remaining activation dependencies live in docs/qa/OMS_FEATURE_CLOSURE_2026-10-04.md.

## v9.2.77 candidate ownership

PlanningEvents and PlanningProductRules are business compositions of Table, OperationalList, OperationalListRow, Badge, Input and SelectControl. Desktop and phone show the same controlled data with the established breakpoint contract. The product finder stays local and never submits the parent settings form. No new CSS system or motion primitives are introduced. Routine notes are concise; detailed forecast inputs remain in optional evidence. These are candidate changes until rendered acceptance is recorded.

### Shared mobile action validation — v9.2.78

Right Console submits an external page form exactly once with its real submitter before unmounting the drawer. Native validation and the page form own error focus; internal drawer forms and prevented button actions retain their existing behavior. Esc closes the drawer and restores the More actions trigger. Inert phone checks covered invalid event, valid event, bulk minimum Enter and settings save. React hook/component review found no added network reads, dependencies, motion system or duplicated business state.

Plan checks now identify the product/outlet and required correction instead of a generic issue count. Shared domain checks distinguish missing from zero, manual adjustment reasons, confirmed-event quantities, minimum/reduction reasons, configured yields, whole trays, retention and surplus/shortfall. Database authorization, current-route/configuration checks and approval remain authoritative; these client checks do not replace them. Default forecast settings stay in Settings rather than repeating in the action rail.

## Production documents and period context (v9.2.87)

All outlet columns are shown by default, with optional grouping and an internal scroll region. Product identity remains frozen left; kitchen retention is pinned right, with surplus canvas width assigned to an empty spacer. Settings outlet selector is bounded at 18rem; schedule and automation text share centre alignment. Product supply period uses the shared focus-managed modal and settings Save action.

PDF export has its own A4 landscape layout, repeated table headers, page numbers, understated green typography, alternating rows and explicit Pending values. Browser chrome is excluded. Reports label inclusive current/previous ranges, distinguish percentage points from percentage change, and visibly identify partial coverage. Historical rail labels the completed historical date and the 30-day outstanding-record window.

## Asset workflow density, 16 October 2026

WorkspaceTabs owns the shared 44px outer navigation row. Shared `details.sb-work-surface` owns closed disclosure geometry: no vertical outer padding plus a 42px summary inside its 1px border, for 44px total. Open sections grow with their content. This corrects the system-wide padding/min-height accumulation without shrinking form content or changing the 1024px desktop control breakpoint. Desktop inputs remain 36px, touch controls remain 44px. Two-action confirmation footers use equal columns.

Asset maintenance uses a 4:6 master/detail split from 1024px and stacks below it. The desktop queue fills the same height as the detail/history/attachment stack and scrolls internally. Inspection rows show identity, quantity and current state; explicit result choices and optional physical counts expand on demand. A separate general repair form is above the inspection form. No submission implicitly submits the other form.
