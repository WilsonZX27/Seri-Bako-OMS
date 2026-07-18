# Sprint 7.23.0 commercial UX audit

Audit date: 2026-07-18

Baseline: `f60921c7cc89aa3be305f20e459456b9d94322a2` — v0.2.34 / Sprint 7.22.1

Decision scope: evidence sufficiency for commercial UX consolidation; the approved operational pilot is not re-gated here.

## Executive assessment

The application is a recognizable, coherent operational ERP rather than a generic generated dashboard. Seri Bako green/gold branding, square action hierarchy, document workspaces, stable access/error states, and whole-page overflow containment are solid foundations. The principal commercial UX risks are information density, 1024px layout pressure, undersized mobile controls, identifier/status clipping, permission-aware navigation gaps, and fragmentation among list/filter/table patterns.

No P0 UX blocker or critical browser console/runtime error was found in the current route probes. The evidence is complete enough to begin a scoped consolidation sprint without altering the verified PR → PO → GRN workflow.

## Audit score

| Dimension | Score | Evidence |
|---|---:|---|
| Accessibility readiness | 2/4 | Visible focus treatment exists, but many mobile controls are below 44px and semantic/contrast checks remain incomplete |
| Performance/readiness | 3/4 | Production build passed; shared JS is about 102 kB; loading/error states are present; no current-run critical console errors |
| Responsive behavior | 2/4 | No whole-page horizontal overflow in sampled routes, but 1024px is cramped and data-heavy mobile screens rely heavily on internal scrolling |
| Theming/system consistency | 2/4 | Strong base tokens and branding; raw palette, radius, and one-off typography utilities bypass the contract |
| Anti-pattern resistance | 3/4 | Product feels purpose-built; some hub/card nesting, generic right rails, and repeated list shells remain |
| **Total** | **12/20 — Acceptable** | Suitable for consolidation, not for claiming finished commercial polish |

## Current-run coverage

Screenshots are stored locally at `test-results/sprint-7-23-0/screenshots/` and intentionally remain outside Git because they contain Production operational context. The ordered set contains 69 files across 68 sequence identifiers; sequence 059 has an Admin landing recapture:

- 001–034: desktop, 1440px, covering Dashboard, Operations, Procurement, Inventory, Production, Finance/AP, Reports, Activity, Administration, auth/access and hub states.
- 035–044: tablet, 1024px, covering Dashboard, PR/PO/GRN documents, Inventory, Production, Reports and Administration.
- 045–058: mobile, 390px, covering Dashboard, PR create/list/detail, PO/GRN, Items, Stock Balance, Production, Outlet records, Administration, Company and not-found.
- 059–064: role-specific authenticated landing/navigation evidence.
- 065–068: Supabase API/Postgres/Security Advisor and Vercel log evidence.

The browser probe produced no critical console-error entries on the audited routes. Authentication secrets were loaded only from the ignored local test environment and are not present in these documents.

## Role-based page coverage

“Checked” is the current-run authenticated route-probe count. It is not a count of permissions and it does not imply a write action was executed.

| Role | Checked | Allowed/stable | Redirected | Record-level denied | Intended task completion |
|---|---:|---:|---:|---:|---|
| Owner / Super Admin | 34 | 32 | 0 | 0; plus 2 explanatory-state pages | Full administration, procurement, inventory and document review available |
| Admin | 32 | 28 | 4 | 0 | Broad operations/admin available; backup link disagrees with owner-only server enforcement |
| Manager | 29 | 24 | 4 | 1 | Branch-scoped review remains intact; out-of-branch PR denial is stable |
| Finance | 29 | 22 | 7 | 0 | PR/PO/AP review and reporting routes available; no dashboard navigation |
| Purchasing | 33 | 26 | 7 | 0 | Procurement, master-data and import work available |
| Kitchen | 29 | 23 | 6 | 0 | PR creation/submission and relevant operational reads available |
| Outlet Staff | 15 | 5 | 10 | 0 | Dashboard/outlet-entry scope is narrow and stable |

Detailed navigation and route-probe summaries are in `test-results/sprint-7-23-0/page-matrix.json`.

### Denied behavior

- Unauthorized page access converged to a stable permitted route or explanatory state; no redirect-limit loop was observed.
- Manager record-level branch isolation produced a stable denial instead of exposing the record.
- Owner-only backup enforcement remained server-side effective, but Admin could discover the link. This is a navigation defect, not an authorization bypass.
- No forbidden business transition was executed in this read-only sprint.

## Responsive findings

### Desktop — 1440px

What works:

- Stable sidebar/topbar shell and strong green/gold identity.
- Document detail workspaces remain understandable at a glance.
- Primary/secondary/danger buttons are visually distinct.
- Empty, access-status, loading and not-found states render as intentional pages.

Risks:

- Long PR numbers, SKUs and item/supplier labels wrap across multiple lines and make row scanning unreliable.
- Status content can be clipped at the right edge of dense procurement tables.
- Stock Balance uses ambiguous labels such as “C” and a generic “IMG” placeholder.
- Reports and Activity use dense vertical lists with a comparatively generic or empty right rail.
- Administration hub descriptions truncate and some hub layouts feel like cards inside a larger card surface.

### Tablet — 1024px

At exactly 1024px the desktop sidebar remains open and consumes about 236px, leaving a narrow center workspace. Dense tables survive through internal horizontal scrolling, but task focus and comparison suffer. The main page did not produce whole-window overflow in sampled routes.

### Mobile — 390px

Whole-page containment is effective, but touch sizing is not. DOM geometry probes found sub-44px controls on most sampled pages: 14/35 on Dashboard, 15/20 on PR list, 20/22 on PR create, 20/27 on Items, 24/25 on Production Jobs, and 14/15 on Outlet records. Tables progressively hide columns or scroll internally, but Outlet empty-state text can clip inside its table region. PR/PO/GRN documents remain readable, which is a strong foundation.

## Findings by priority

### P0

None found.

### P1

1. **Tablet workspace compression.** The 1024px breakpoint retains the full desktop sidebar and makes the center pane too narrow for operational tables and document review.
2. **Mobile touch targets.** A large proportion of primary filters, buttons and compact controls are below the 44px usability target.
3. **Admin backup navigation mismatch.** Admin can see a backup destination that is owner-only on the server, causing unnecessary redirects and database error noise.
4. **Identifier and status legibility.** Critical document numbers, SKUs and statuses wrap or clip in high-density procurement/inventory lists.
5. **Security hardening review required.** Advisor findings around SECURITY DEFINER execution and permissive RLS policies need function-by-function validation before a later controlled change; this is not a proven workflow exploit.

### P2

1. Filter/list implementations are fragmented across `.sb-list-filters`, `MasterDataFilters`, ad hoc controls and candidate unused shared filter components.
2. Table containment, progressive columns and mobile alternatives are implemented inconsistently.
3. Stock terminology is inconsistent across sidebar, breadcrumb and page heading; “C” is ambiguous.
4. Administration cards are not consistently permission-filtered.
5. Six routes are orphan candidates and one route contains a duplicate unreachable implementation.
6. Reports/Activity/hub layouts spend substantial width on low-value generic rails or nested card framing.
7. Raw semantic palette classes, large radius utilities and 47 one-off `text-[Npx]` values weaken the visual contract.
8. `--sb-muted` is referenced by some classes but is not defined alongside the canonical `--sb-surface-muted` token.
9. Dashboard metrics are useful snapshots but lack decision-oriented trends and stage aging.
10. Mobile Outlet empty-state content can clip within the data region.
11. Label association, keyboard order, zoom behavior and color contrast need instrumented verification before any accessibility claim.

### P3

1. Empty-state tone is broadly good but still varies between “No … found” and “No … yet”.
2. Generic “IMG” placeholders communicate implementation rather than task meaning.
3. Some hubs expose implementation taxonomy rather than the user’s next task.
4. Eight unreferenced component files and one static image asset are cleanup candidates, subject to runtime/import verification.

## Component and style inventory

| Measure | Count |
|---|---:|
| Shared UI component files | 25 |
| Total component files | 81 |
| Pages importing `Card` | 59 |
| Pages importing `Table` | 47 |
| Pages rendering `EmptyState` | 29 |
| Pages using `.sb-list-filters` | 24 |
| Pages using `MasterDataFilters` | 11 |
| Pages using raw `overflow-x-auto` | 37 |
| Tailwind palette utility occurrences | 169 |
| Large/pill radius utility occurrences | 50 |
| One-off pixel typography occurrences | 47 |
| Unreferenced component candidates | 8 |

Unreferenced candidates:

- `src/components/document-activity-panel.tsx`
- `src/components/ui/table-toolbar.tsx`
- `src/components/ui/stat-card.tsx`
- `src/components/ui/module-card.tsx`
- `src/components/ui/kpi-filter-strip.tsx`
- `src/components/ui/filter-bar.tsx`
- `src/components/ui/action-dropdown.tsx`
- `src/components/layout/mobile-bottom-nav.tsx`

These are candidates, not deletion instructions. Dynamic imports and future work must be checked before removal.

## Consolidation opportunities

1. One permission-aware application navigation model should drive sidebar groups, Administration cards, breadcrumbs and default-route resolution.
2. One list-page shell should define page header, filter density, reset behavior, result summary, loading/empty/error state and mobile action placement.
3. One table contract should define identifier cells, status cells, progressive disclosure, internal scrolling, sticky actions and mobile alternatives.
4. One form contract should standardize label/help/error association, input height, validation summary and sticky mobile submission.
5. Existing `PageHeader`, `DocumentWorkspace`, `EmptyState` and table primitives should be extended before new primitives are added.
6. Tokenize semantic status colors, radii and compact type sizes; resolve the undefined muted token reference.
7. Standardize operational vocabulary: Stock Balance, Movement Ledger, Goods Receiving, Administration and Imports.

## Dashboard recommendations tied to decisions

Limit the first consolidation to four compact, drillable charts:

1. **PR aging by approval stage, 14 days** — shows Manager/Admin/Finance where requests are stalling.
2. **Ordered vs received and on-time receipt trend, 30 days** — supports supplier follow-up and receiving capacity decisions.
3. **Low-stock and net movement trend by branch/top critical items** — supports reorder and inter-branch transfer decisions.
4. **AP due horizon: 7/14/30 days, overdue and missing due date** — supports Finance cash planning.

Later candidates are outlet demand vs production output and wastage by branch/item/reason. Charts should use real server-provided timestamps and drill into existing lists; no decorative charts are recommended.

## Accessibility boundary

This is a risk audit, not an accessibility certification. Screenshots and DOM geometry can identify touch-target and visible-label concerns, but cannot prove contrast ratios, keyboard order, screen-reader output, focus trapping, zoom reflow or error announcement. Sprint 7.23.4 should add automated axe checks plus manual keyboard, 200%/400% zoom and screen-reader spot checks.

## Recommended sequence

1. **Sprint 7.23.1 — IA and route consolidation:** permission-aware nav/cards/breadcrumbs, canonical vocabulary, alias/deprecation decisions. Preserve compatibility redirects.
2. **Sprint 7.23.2 — Shared operational patterns:** list/filter/table/form/empty-state consolidation, identifier cells, 1024px shell behavior and mobile touch targets.
3. **Sprint 7.23.3 — Decision dashboard:** implement the four evidence-backed operational charts with existing data only.
4. **Sprint 7.23.4 — Accessibility verification:** automated and manual semantic, keyboard, contrast, zoom and touch remediation.
5. **Sprint 7.23.5 — Security hardening gate:** function-by-function RPC grants/RLS review and controlled proposals; no policy changes without workflow regression tests.

No Figma board should be created until the route/IA scope is reviewed and approved.
