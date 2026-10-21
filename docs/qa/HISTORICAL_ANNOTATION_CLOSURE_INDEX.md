# Historical annotation closure index

This is an inventory for the active full-system closure, not a sign-off. A historical note marked “verified” proves that older build only. Current UI acceptance uses the present local candidate, relevant rendered state, breakpoint and interaction. Live-data and role-specific behavior that Mock cannot represent stays explicitly unverified; Vercel deployment is not required for local iteration or review.

| Source of owner feedback | Scope to recheck in current candidate | Current evidence |
| --- | --- | --- |
| `docs/ANNOTATION-REPAIR-LEDGER-2026-08-19.md` | Older numbered feedback across procurement, stock, dashboard, People, scheduling, tablet and mobile layouts | Historical implementation ledger; current-build visual and interaction recheck pending |
| `docs/uiux-final-audit.md` | Original route and component comments, including PR creation, Stock Balance basket, Low Stock, transfers and returns | Low Stock now has local Mock populated-list checks at 360/393/768/1180/1280/1440/1535/1536px, filter, basket, quantity and refresh persistence interactions. Stock Balance's 393px empty state and basket were also rechecked locally; populated rows and live role/data/submission remain unverified. Other routes retain historical Production evidence only. |
| `docs/qa/OWNER_FEEDBACK_2026-10-16.md` | Comments 1–33: asset actions, attendance, import/review, holiday scheduling, production planning, recipe/setup, PDF export | Planning comments 31–32 now have a local compact Show hidden control and 360/393/768/1180/1280/1440px Mock checks; save and real-data behavior remain open. Other comments still need current-build classification |
| `docs/qa/MOBILE_SYSTEM_REFINEMENT_2026-10-17.md` | Comments 1–18: shared mobile filters, sheets, pagination, asset checklist, maintenance, product/recipe, account menu | Prior local checks; current authenticated viewport recheck pending |
| `docs/qa/ASSET_RECIPE_FEEDBACK_2026-10-17.md` | Nine asset/recipe comments: inspection layout, maintenance history, costing caveat, selectors, mobile fields/actions | Asset registration has a local 360/768/1024/1280px field-width and picker check. Asset Maintenance's four peer metrics have 393px phone and 768px tablet Mock visual checks. The checklist's 12px copy, 16px phone title, long-name wrapping and selection feedback were rechecked at 393px with three Mock holdings, plus the 768px action rail. The nested empty-state card comment is now rechecked on current v9.2.126 at 1180×820: one parent surface, no border/shadow/radius on the message, complete two-line copy, no overflow; screenshot retained in the closure evidence folder. Populated maintenance history, saved inspection, other asset/recipe comments and authenticated role behavior remain open. |
| `docs/ui-refinement-review.md` | Recent PR 11px metadata and FAB, asset 12px copy/metric cards, Attendance restoration, Daily filters, navigation dots, notifications, 36px desktop/44px touch controls | Local v9.2.126 retains the recorded PR 11px phone/12px tablet metadata checks, verifies shared table header contrast at 4.89:1 without changing the 10px size or geometry, and aligns collapsed/expanded navigation dots to the same 8px right inset. Prior local checks cover PR long name/full amount/date and search/filter/reset/detail navigation; asset checklist and metrics; Daily filters; notification icon/action styling; Attendance entry routes; and Supplier Invoice controls/filter behavior. This index does not yet have one current-build evidence row for every source annotation. Real outlet/employee/invoice fixtures and other role/live-data checks remain open. |
| `docs/qa/2026-10-21-closure.md` | Current PR and Daily breakpoint fixes, phone Daily create entry, screenshot reliability, role-matrix gap | Local v9.2.124 measurements; live data and role-matrix gaps remain explicitly open |

## Latest browser annotation batch: 20-comment reconciliation

These are the annotations supplied on 2026-10-21 across Purchase Requests, Dashboard, Asset Management, Goods Receiving, Stock Counts, Production Planning, Workspace Updates and the tablet navigation. “Verified” means the cited local view or interaction was checked on this candidate; it does not imply Production or non-Owner acceptance.

| Comment | Surface / concern | Owning source | Current status and evidence |
|---:|---|---|---|
| 1 | Navigation dots duplicate and misalign | `workspace-sidebar.tsx`, `nav-items.ts` | **Partial:** collapsed groups summarize visible child attention; expanded groups show child dots. Right inset is now 8px to match child links. 11 related tests pass. Desktop visual dot coordinates and live clearing by role remain unverified. |
| 2–3 | Production Planning tabs too large; retain 36px and fit frame | `production-planning-workspace.tsx`, `design-system-v2.css` | **Verified locally:** tab is 36px on desktop; outer surface is 46px. 1440px measurement is recorded in the current closure; touch layouts retain larger targets. |
| 4 | Remove Assets by location block on phone | Asset Management overview | **Verified locally:** chart is absent at 393px; other page content stays. |
| 5 | Asset query buttons too small | Asset query controls, `design-system-v2.css` | **Verified locally:** the two icon controls have touch-size targets on phone and consistent 36px desktop size. |
| 6 | No card inside the inspection card | Asset checklist empty state | **Verified at marked geometry:** one parent surface at 1180×820; empty copy has no border, shadow or radius. Current screenshot is in `outputs/qa/2026-10-21-closure/asset-checklist-empty-1180-after.jpg`. |
| 7 | Avoid an empty filter card on Transfers | Asset Transfers toolbar | **Verified locally:** status control and count remain inline; no empty filter surface is shown at 393px. |
| 8–9 | Tablet/phone filters should stay inline when they fit | Asset Transfers and Stock Counts query bars | **Verified for current samples:** Transfers status/count stays inline at 393px; Stock Counts keeps all four filter fields inline through 1180px, including 360px. Further annotated routes with multiple filters need their own fit check. |
| 10 | Remove the visible “Filter” word on phone PR | Purchase Requests filter trigger | **Verified locally:** icon-only trigger at phone width, with accessible naming retained. |
| 11 | Goods Receiving toolbar must not compress into a second line | Goods Receiving query bar | **Verified locally:** search, submit, filter entry and count stay in the reviewed compact row; 360–1440px sweep had no page overflow. |
| 12 | Asset bottom actions should each use half width | Asset Overview mobile actions | **Verified locally:** two equal-width actions at 393px. |
| 13 | Mark as read should be icon-only and borderless | `top-bar-activity-menu.tsx` | **Partial:** current source uses a borderless Check icon with accessible name and 44px coarse-pointer target. Current screenshot and actual mark/read refresh are still unverified. |
| 14 | Portrait tablet Dashboard actions belong in the right rail | Dashboard / right console | **Verified locally:** 820×1180 evidence records the right-rail action placement. Role-specific actions remain unverified. |
| 15 | Landscape tablet Dashboard needs a right panel | Dashboard / right console | **Verified on current candidate:** at 1180×820, three 262×36px actions appear in the right rail; document width remains 1180px. Screenshot: `outputs/qa/2026-10-21-closure/dashboard-1180-right-panel-after.jpg`. |
| 16 | Carry the same compact record design to suitable tablet/phone surfaces | Purchase Requests compact record rows | **Verified locally:** long supplier, full amount/date and byline layout across the recorded phone, tablet and compact desktop widths. Current Production-like data remains unverified. |
| 17 | Goods Receiving workspace must align with its right summary rail | Goods Receiving list workspace | **Verified locally:** toolbar and empty state align to the same main-column origin at 1180×820; no horizontal overflow. |
| 18 | Landscape More navigation is too long | Mobile navigation drawer | **Verified locally:** 1180×820 landscape uses a centered, bounded, scrollable two-column picker; phone retains its full-height navigation pattern. |
| 19 | Stock Count filters should use available tablet space | Stock Counts query bar | **Verified locally on v9.2.126:** all fields inline from 360 through 1180px; reset clears search; 1280/1440 keep desktop toolbar. Populated rows remain unverified. |
| 20 | PR table headers should wrap without `/` | Purchase Requests table header | **Source verified:** “PR number / Priority” and “Location / Requested by” are two-line labels without slash characters. A current-candidate 1440px after screenshot is still needed for visual sign-off. |

This reconciles the latest 20-comment batch but does not close older source ledgers, all routes, roles, data states or full-system performance.

## Acceptance gate

For each route/component, record page and role, data fixture or live read scope, widths 360/393/768/1180/1280/1440 plus the relevant 1279/1280, 1399/1400 and 1535/1536 switches, screenshot pixel dimensions, interaction result, overflow/truncation, touch and keyboard access, loading/empty/error state, and time to usable content. Record an unavailable fixture or expired session as **unverified**. A route-level no-overflow check does not prove every component.

The current static Owner sweep covered 91 routes at 393px and 1280px only. Dynamic routes, other roles, full interaction flows, and the pending Kitchen/Chef migration boundary remain outside that evidence. This index must be expanded when additional owner annotations are found; no older ledger is silently treated as closed. Local UI review can proceed without publishing each candidate to Vercel.

## Full closure quality contract

The goal is to close every owner annotation from the source inventories above against the current local candidate, in one consolidated review cycle. Historical “implemented” status and route-level no-overflow checks are leads, not acceptance evidence. Each annotation must be mapped to its owning token, shared component, route component or business description; unrelated production behavior must remain intact.

For each annotated screen, review and record all applicable dimensions rather than checking only the marked control:

1. **Typography and hierarchy:** font size, weight, line height, truncation, wrapping and label/value hierarchy; small metadata must follow the explicit route rule, not a global shrink.
2. **Placement and alignment:** shared baselines, column edges, control order, table/header alignment, stable right-rail origin and fixed/mobile action clearance.
3. **Widths and density:** available canvas after the navigation and context rail, useful information per row, deliberate breakpoint changes, and no accidental second row or oversized empty surface.
4. **Spacing and grouping:** related values sit together; unrelated groups have clear separation; avoid nested cards, redundant containers, unexplained gaps and crowded controls.
5. **Descriptions and wording:** copy describes the actual record/state, its scope and next action. Empty, unavailable, loading, pending, zero and completed remain distinct; labels do not imply unsupported actions or outcomes.
6. **Color and iconography:** semantic colors use the product tokens and readable contrast; same-sized peer actions have consistent hit areas; icons have stable geometry, 16px visual size where specified, and distinguish their action meaning.
7. **Responsive behavior and access:** inspect phone, portrait tablet, landscape tablet and desktop; check 44px touch targets, keyboard focus/order, accessible names, scroll behavior and reduced-motion behavior where relevant.
8. **Function and speed:** exercise the route's actual search, filters, sort, disclosure, navigation and permitted action without mutating real business data. Measure route-to-usable time on the same warm local environment and report it separately from network/Preview latency; do not infer speed from a static screenshot.

The consolidated evidence set must include the source annotation or comment number, current source owner, before reference, current-candidate after capture at the relevant geometry, measured typography/spacing/width when the comment concerns geometry, interaction result, regression check, and an explicit status of **verified**, **unverified**, or **blocked with reason**. A screenshot of one route or one role cannot close another route, role, breakpoint or interaction. Use representative long names, multi-digit amounts, empty and multi-record states when the annotation concerns list density or wrapping.

## Consolidated execution order

1. Reconcile every comment in the linked ledgers, recent browser annotations and current review notes into a numbered route/component checklist; identify duplicate comments and retain each source reference.
2. Review shared shell and shared controls first (navigation, workspace rails, query/filter headers, tables, sheets, mobile actions, status/notification patterns). Fix shared root causes only where multiple annotations prove the same behavior.
3. Review annotated route groups in dependency order: Dashboard/navigation/notifications; procurement and receiving; inventory/assets; production/planning; attendance/People; reports and exports. Preserve business permissions, calculations, approval transitions and submission contracts.
4. Run the complete applicable viewport and interaction pass on the current local candidate; compare each row back to the original annotation and record evidence immediately.
5. Re-run type/lint/source quality checks and the relevant existing regression contracts, then audit the annotation checklist for any missing source, dimension, route or evidence before declaring closure.

The v9.2.126 batch is only a recent local slice of this process. Its static checks and viewport sweeps do not close the older sources, other roles, live data, all transactions, or end-to-end page speed. Keep this goal active until the checklist is reconciled and every required item has current evidence or a user-visible, explicit external blocker.

## Follow-up browser batch — 2026-10-21, comments 1–21

| Comments | Area | Current local status |
|---:|---|---|
| 1–3 | Purchase Requests alignment and spacing | PR phone toolbar/list checked at 430×932; tablet top alignment is source-corrected but awaits a viewport capture. |
| 4–5 | Asset card corners and filter height | Rounded list clipping and the two-column phone filter sheet checked at 430×932. |
| 6, 9, 13–14 | Shared phone toolbar and Stock Counts filters | Verified at 430×932. Tablet-inline mode is explicitly tablet-gated; Stock Counts phone uses the filter icon and dialog. |
| 7 | Stock Balance search | Exact annotated URL opens the normal empty state. Local Mock balances are empty; live row existence is not verifiable from this local preview. |
| 8 | Stock Balance Reset sizing | Reset now enters the compact secondary-action path. Annotated desktop geometry remains unverified. |
| 10–12 | PR row truncation and metadata | Verified at 430×932: supplier truncates, supplier/count/amount share one line, branch/requester/date share the next. |
| 15–16 | Goods Receiving alignment | Shared responsive mode wired; exact 1180px current-candidate visual check remains pending. |
| 17–19, 21 | Dashboard organization and pending row | Verified at 820×1180: action rail appears once, work metrics have two columns, and mock PR row shows Finance Review, supplier, 2 items and RM 12,345,619.60. |
| 20 | Portrait tablet navigation | CSS now uses two columns for both orientations from 640–1279px; tablet drawer capture remains pending. |

Evidence is limited to the cited local Mock screens; comments marked pending are not closed by source inspection alone.
