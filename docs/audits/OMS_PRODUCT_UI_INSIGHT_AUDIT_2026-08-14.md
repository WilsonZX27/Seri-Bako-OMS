# Seri Bako OMS — Product UI and Operational Insight Audit

**Date:** 14 August 2026  
**Scope:** current Dashboard, operational analytics/report surfaces, existing chart implementation, responsive evidence, design governance, and the user's annotation-to-Codex workflow.  
**Constraint:** this audit does not change workflow states, permissions, inventory posting, approval rules, calculations, or other business logic.

## Closure status — 15 August 2026

This section is the current disposition; the detailed findings below remain as the original audit evidence.

| Finding | Status | Implemented evidence |
| --- | --- | --- |
| Attention total can understate unavailable data | Closed | The server now owns an explicit attention summary and withholds the total when any contributing source is unavailable. |
| Command-surface contrast | Closed | The surface uses one tested semantic green and stronger inverse text. |
| Wastage chart accessible dataset | Closed | The shared interactive chart exposes hover, touch, keyboard, description, and a readable data alternative. |
| Current responsive proof is stale | Closed | A fresh six-role matrix covers 390×844, 820×1180, and 1440×900. Dedicated partial-data and long-label stress fixtures cover the same three viewports, with horizontal-overflow diagnostics and 21 current evidence screenshots in total. |
| Product/design/schema baselines are stale | Closed | Current release and migration authority are explicit; later design sections are marked forward/unreleased. |
| Full Dashboard hydration for a clock | Closed | Dashboard composition is server-rendered and the non-source freshness clock was removed. |
| Reports lack decision-specific charts | Closed for phase 1 | Demand, rankings, AP aging, and cash-flow windows now use interactive direct-label charts while retaining detailed data views. |
| Procurement variance concentration | Closed | The filtered report now exposes status concentration and the six largest absolute RM price differences, with signed direction, hover/touch/keyboard previews, and the existing table/list as detail authority. |
| Inventory daily movement | Closed | Inventory now compares bounded posted inbound/outbound entry counts by MYT calendar date, preserves zero days, avoids mixed-UOM quantity totals, and provides hover/touch/keyboard preview plus exact ledger drill-through. |
| Equal metrics obscure priority | Improved | Exception tiles now identify actionable, clear, unavailable, activity, and snapshot states instead of presenting every count as equivalent urgency. |
| Decorative command surface | Closed | Decorative grid, layered gradient, and wide shadow were removed. |
| Raw color and duplicate overrides | Improved in touched scope | The command surface has one semantic owner; unrelated legacy CSS was not globally rewritten. |
| Mock role contradiction | Closed | The supported mock owner fixture now has a coherent staff-role state without changing production checks. |
| Data freshness context | Resolved without invention | No source-owned refresh timestamp exists. The UI no longer presents render time as freshness; the metric dictionary records request-time semantics. |
| Tiny uppercase cadence | Closed in Dashboard ordinary labels | Welcome, quick actions, and metric labels use readable sentence case; uppercase remains reserved for status semantics. |
| Ambiguous empty states | Closed in audited panels | Clear, unavailable, and up-to-date states now have distinct copy. |

Metric definitions and drill-through contracts are maintained in `docs/analytics/METRIC_DICTIONARY.md`.

## Executive verdict

The application has a strong operational foundation: role-aware actions, bounded read models, explicit unavailable states, shared responsive primitives, and 534 passing contract tests. It is no longer an unstable MVP shell.

The next quality gap is not “more cards” or “more KPIs.” It is the **decision layer** between a number and the action a user should take. Current screens often answer “how many?” but not “is it getting better, where is the problem, how urgent is it, and what should I open next?”

The recommended direction is:

1. Keep the home Dashboard exception-first and role-aware.
2. Add the first trustworthy charts to existing reports before loading historical analytics onto the home route.
3. Require every chart to have a defined business question, reliable denominator, unavailable state, accessible data alternative, and drill-through destination.
4. Consolidate the versioned design history so future Codex sessions can identify the current rules without guessing.

## Evidence reviewed

- `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, current migrations through `147`, and current worktree app version `8.36.14`.
- Dashboard UI and query composition in `src/components/dashboard-workspace.tsx` and `src/server/queries/dashboard.ts`.
- Demand Trend Lite, Procurement Variance, AP Aging, Cash Flow Forecast, Inventory, Outlet Daily, and the existing Wastage chart.
- Current responsive screenshots and a fresh isolated mock-mode runtime inspection of `/dashboard`.
- Impeccable local detector on the Dashboard/report/chart/shared-style scope: **0 automated findings**.
- `npm test`: **534 passed, 0 failed**.
- `npm run typecheck:strict`: **passed**.
- `npm run lint`: **passed**.

The fresh runtime check proved the current Dashboard uses `Operational pulse`; older screenshots that show `Your operating picture` and `Where work is accumulating` are historical evidence only.

## Audit health score

| # | Dimension | Score | Key finding |
| --- | --- | ---: | --- |
| 1 | Accessibility | 2/4 | Core semantics and focus patterns are strong, but the current command-surface text has verified contrast failures and the existing SVG trend lacks a full non-visual data alternative. |
| 2 | Performance | 3/4 | Dashboard reads are bounded and pre-aggregated; the full Dashboard is nevertheless a hydrated client component that re-renders every minute for one live timestamp. |
| 3 | Responsive design | 3/4 | Shared phone/tablet/desktop contracts are extensive, but the newest Dashboard source does not yet have a fresh six-role, three-viewport visual matrix. |
| 4 | Theming | 3/4 | Semantic tokens are established; later CSS overrides and raw color values still create drift and make contrast harder to prove. |
| 5 | Anti-patterns | 2/4 | The product is restrained overall, but the current attention hero combines the hero-metric template, decorative grid texture, and a bordered wide-shadow surface. |
| **Total** |  | **13/20** | **Acceptable — strong engineering foundation, but the insight and trust layer needs a focused closure.** |

### Finding count

- P0 Blocking: 0
- P1 Major: 5
- P2 Minor: 6
- P3 Polish: 2

## Anti-pattern verdict

**Does it look generically AI-generated? Partly, on the Dashboard command surface.**

The broader OMS does not look like an AI demo. Its tables, forms, role actions, and dense operational surfaces are credible. The current Dashboard hero is the exception:

- a large “Needs attention” number supported by four smaller metrics;
- a decorative two-axis grid overlay;
- a 1px border paired with a 32px shadow blur;
- repeated equal metric tiles where comparison or prioritisation would be more useful.

This does not require an aesthetic reset. It requires replacing decorative hierarchy with operational hierarchy.

## Detailed findings

### [P1] The Dashboard attention total can understate unavailable finance data

**Location:** `src/components/dashboard-workspace.tsx:136-139`  
**Category:** Data honesty / accessibility  
**Impact:** `attentionCount` includes overdue payables, but `attentionCountUnavailable` does not include `payablesAttentionUnavailable`. If AP attention fails, the hero can still display a smaller numeric total as if it were complete. This violates the product rule that unavailable reads must not become a misleading zero or successful total.  
**Recommendation:** define completeness per contributing metric. Display a complete total only when all included sources are available; otherwise show “Partial data” and identify the unavailable source. Do not silently omit a domain.  
**Suggested command:** `$impeccable harden dashboard attention summary`

### [P1] Dashboard command-surface secondary text fails contrast on parts of the actual gradient

**Location:** `src/components/dashboard-workspace.tsx:266-303`, `src/app/design-system-v2.css:888-893`  
**Category:** Accessibility  
**Impact:** 10px labels use `white/55` and `white/60` on a gradient that reaches `#0b6a51`. Verified contrast is approximately 3.14:1 and 3.42:1 at that end of the gradient, below WCAG AA's 4.5:1 requirement for normal text. `white/65` is approximately 3.77:1 there.  
**Standard:** WCAG 2.2, 1.4.3 Contrast (Minimum).  
**Recommendation:** use an opaque inverse-text token that passes against every point in the gradient, or flatten the surface to one tested color. Increase tiny labels to the established compact-body size where space permits.  
**Suggested command:** `$impeccable audit dashboard contrast`

### [P1] The existing Wastage chart does not provide an equivalent accessible dataset

**Location:** `src/components/outlet-daily-wastage-chart.tsx:36-45`  
**Category:** Accessibility / data visualisation  
**Impact:** the SVG has an overall `aria-label`, while individual values live only in SVG `<title>` nodes on circles. Keyboard and screen-reader users cannot reliably inspect each date/value pair. A trend statement alone is not equivalent to the plotted data.  
**Standard:** WCAG 2.2, 1.1.1 Non-text Content and 1.3.1 Info and Relationships.  
**Recommendation:** pair every chart with a visually compact, screen-reader-readable table or list; expose chart description, period, unit, sample/coverage warning, and each point. Never rely on hover alone.  
**Suggested command:** `$impeccable harden outlet wastage chart`

### [P1] Current visual proof is stale for the latest Dashboard structure

**Location:** `test-results/` Dashboard screenshots versus current Dashboard source  
**Category:** Responsive design / release evidence  
**Impact:** the newest stored role screenshots still show the retired `Your operating picture / Signals` composition. They cannot prove that the current `Operational pulse` layout avoids clipping, contrast, duplicated actions, or low-information empty states across roles.  
**Recommendation:** create a fresh matrix for all six roles at 390×844, 820×1180, and 1440×900, including non-zero, zero, partial-data, and long-label states.  
**Suggested command:** `$impeccable audit dashboard`

### [P1] Product/design/schema baselines are internally stale

**Location:** `PRODUCT.md:5`, `PRODUCT.md:164`, `DESIGN.md`, `docs/SCHEMA_RELATIONSHIP_MAP_2026-07-23.md`  
**Category:** Governance / future-agent reliability  
**Impact:** `PRODUCT.md` still declares an audit baseline around `v7.87.0` and an integration baseline through migration `113`, while the current worktree application is `8.36.14` and migrations reach `147`. `DESIGN.md` contains `v8.37.0` and `v8.38.0` sections alongside a lower released version and a long append-only history. A future Codex session can obey the wrong “latest” rule.  
**Recommendation:** separate the canonical current contract from release history. Update the current application/migration ceiling and explicitly mark planned/unreleased sections. Refresh the schema relationship map after verifying migrations 128–147.  
**Suggested command:** `$impeccable document`

### [P2] The entire Dashboard hydrates and re-renders for one live timestamp

**Location:** `src/components/dashboard-workspace.tsx:1,118-123,226`  
**Category:** Performance  
**Impact:** a minute timer updates the parent component, causing the complete workdesk tree to re-render even though the changing value is only an `sr-only` timestamp. The current page also sends the full Dashboard component to the client.  
**Recommendation:** isolate the clock into a tiny client leaf or remove the periodic live region if it does not help a user task; leave the dashboard composition server-rendered where possible.  
**Suggested command:** `$impeccable optimize dashboard`

### [P2] Existing reports contain trustworthy series but still present mostly scalar strips and tables

**Location:** Demand Trend Lite `page.tsx:29-33`; AP Aging `page.tsx:46-57`; Cash Flow Forecast `page.tsx:36-56`; Procurement Variance `page.tsx:26`  
**Category:** Information architecture / insight  
**Impact:** users must mentally compare rows to see direction, concentration, and urgency. Daily trend rows, aging buckets, due windows, supplier exposure, and variance categories already exist, so the lack of graphs is an interface gap rather than a missing business model.  
**Recommendation:** add a small number of decision-specific charts above the existing tables. The table remains the detailed and accessible source.  
**Suggested command:** `$impeccable shape operational analytics`

### [P2] Equal metric tiles over-emphasise counts and under-emphasise priority

**Location:** `src/components/dashboard-workspace.tsx:278-305,340-373,383-431`  
**Category:** Visual hierarchy / cognitive load  
**Impact:** a count of 1 critical issue can look weaker than a count of 20 routine items, and three equal tiles imply equal priority. Users still have to decide what matters.  
**Recommendation:** order by urgency and age, show reason/threshold, and reserve charts for change or distribution. Keep a number only when the number itself drives an action.  
**Suggested command:** `$impeccable distill dashboard`

### [P2] Command-surface decoration conflicts with the loaded design-quality rules

**Location:** `src/app/design-system-v2.css:312-330,888-893`  
**Category:** Anti-pattern / theming  
**Impact:** the decorative grid, wide shadow, border, and layered gradients add visual weight without adding operational meaning. The same surface also becomes harder to make contrast-safe.  
**Recommendation:** preserve Seri Bako green and the established radius, but use one tested surface treatment. Replace visual texture with content structure, not a new theme.  
**Suggested command:** `$impeccable quieter dashboard command surface`

### [P2] Raw color and duplicate override layers weaken token authority

**Location:** `src/app/design-system-v2.css`, especially the later `!important` command-surface override  
**Category:** Theming / maintainability  
**Impact:** the app has good semantic tokens, yet multiple raw gradients, shadows, and later overrides mean the rendered value is not always the value a component author expects. Contrast and responsive regressions become harder to reason about.  
**Recommendation:** migrate touched surfaces to semantic tokens and keep one final owner per component rule. Do not perform an indiscriminate global rewrite.  
**Suggested command:** `$impeccable extract dashboard surfaces`

### [P2] Mock mode produces a contradictory account state

**Location:** `src/app/(app)/layout.tsx:40-49`, `src/lib/mock-mode.ts`, and fresh runtime `/dashboard`  
**Category:** UX trust / test fidelity  
**Impact:** the fresh mock page identifies the user as `Super Admin / Owner` while simultaneously showing “Your account has no staff role assigned.” This makes screenshots and local review less trustworthy.  
**Recommendation:** give the mock profile a coherent `has_staff_role` state or suppress the warning only in the supported mock fixture. Production role checks must remain unchanged.  
**Suggested command:** `$impeccable harden mock dashboard state`

### [P2] The newest Dashboard lacks explicit insight freshness and comparison context

**Location:** Dashboard header and metric groups  
**Category:** Insight / operational trust  
**Impact:** users can see current counts but not the data period, last successful refresh, or comparison against a prior period/target. A live clock is not the same as data freshness.  
**Recommendation:** show “Data through …” and, only when supported, a comparison such as “vs previous 7 days.” Never infer freshness from render time.  
**Suggested command:** `$impeccable clarify dashboard data context`

### [P3] Repeated tiny uppercase labels create an overly templated cadence

**Location:** Dashboard `WELCOME`, `NEEDS ATTENTION`, metric labels, and other compact section markers  
**Category:** Typography / anti-pattern  
**Impact:** too many 10px tracked uppercase labels reduce scan speed and make the workdesk feel like a template.  
**Recommendation:** keep uppercase only for one stable system role, such as a true status or category label; use sentence case elsewhere.  
**Suggested command:** `$impeccable typeset dashboard`

### [P3] Some empty states confirm absence but do not close the loop

**Location:** Dashboard pending actions and pipeline panels  
**Category:** UX copy  
**Impact:** “No pending actions” is accurate, but the user may still need to know whether work is complete, data is unavailable, or there is another routine task.  
**Recommendation:** use concise state-specific copy: clear, unavailable, or not configured. Add a link only when there is a useful next step.  
**Suggested command:** `$impeccable clarify dashboard empty states`

## Positive findings to preserve

- The Dashboard is role-aware and uses one route rather than six divergent products.
- Most Dashboard counters come from bounded snapshots/read models instead of unbounded ledger scans.
- Optional reads generally degrade independently instead of blanking the entire page.
- Zero, empty, and unavailable states are already treated as different concepts in many modules.
- The application has strong phone/tablet/desktop contracts, safe-area handling, touch-target rules, and shared workspaces.
- Demand Trend Lite explicitly separates reliable completed data from incomplete/missing coverage.
- Cash Flow Forecast and AP Aging share one payable balance authority.
- The existing Wastage chart is dependency-free, responsive, and labels its formula and data population.
- 534 contract tests, strict typechecking, lint, and the local visual detector all pass.

## What established products consistently do

### 1. Make KPIs role- and feature-aware

NetSuite exposes KPIs based on role and enabled features, and its Order Management Dashboard combines a scorecard, alert/process monitoring, clickable numeric summaries, and optional trend views. Seri Bako should keep its existing role-aware composition and avoid a one-size-fits-all executive dashboard.

- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N595760.html
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_161727869331.html

### 2. Segment pending work by operational process and drill directly into it

Zoho Inventory separates pending Sales, Purchases, and Inventory actions; its counts navigate to filtered work lists. It also compares top-item performance to the previous selected period. Seri Bako already has drillable queues and should add comparison only where the underlying period is reliable.

- https://www.zoho.com/inventory/help/reports/dashboard.html

### 3. Organise warehouse attention by exception, queue, and overdue age

SAP's warehouse KPI and monitor patterns emphasise open work by queue/activity area, overdue-time buckets, blocked/incomplete work, alerts, and drill-down. This is more useful for Seri Bako than generic decorative gauges.

- https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/9832125c23154a179bfa1784cdc9577a/9576ccb7c6b44c16afc20c3df7a28101.html
- https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/9832125c23154a179bfa1784cdc9577a/51cdcb53ad377114e10000000a174cb4.html

### 4. Filter by the dimensions where an operational decision is made

Microsoft's Inventory Visibility dashboard focuses on location/product dimensions, on-hand/supply/demand, and out-of-stock/understock/overstock risk. Seri Bako should prioritise branch, item/product, status, and date; it should not add unsupported channel or sales dimensions.

- https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-visibility-dashboard

### 5. State latency and refuse a forecast when evidence is insufficient

Shopify documents exact inventory formulas, dates, latency, and returns `N/A` when a days-remaining forecast lacks a usable sales rate. Seri Bako's equivalent rule is stronger: do not turn incomplete Outlet Daily coverage into a confident demand or stock-days prediction.

- https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/inventory-reports
- https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/analytics-fields

## Recommended graph portfolio

### Phase 1 — high-confidence, existing report data only

These are the safest first implementations because the data already exists in each page result. They change presentation, not business rules.

| Surface | Business question | Recommended visual | Existing authority | Drill-through |
| --- | --- | --- | --- | --- |
| Demand Trend Lite | Is estimated outlet movement rising or falling, and is wastage moving with it? | Two aligned 7/30-day line charts: estimated movement and wastage rate. Keep coverage directly above. | `report.daily`, completed/reviewed Outlet Daily records only | Existing filtered daily/product/outlet tables |
| Demand Trend Lite | Which products/outlets contribute most? | Ranked horizontal bars for top movement and top wastage; direct labels, no legend-only encoding. | Existing `top_moving_products`, `top_wastage_products`, `outlets` | Existing product/outlet filters |
| AP Aging | Where is payable exposure concentrated by age? | Ordered horizontal aging bars: not due, today, 1–30, 31–60, 61–90, 90+, missing date. | Existing `report.buckets` | Existing bucket links |
| Cash Flow Forecast | When will payable pressure land? | Due-window columns for overdue, today, 1–7, 8–14, 15–30/current-period, plus a separate missing-date warning bar. | Existing forecast summary and rows | Existing period and invoice table |
| Procurement Variance | What kind of mismatch dominates? | Ranked status bars plus top absolute price-variance rows. | Existing linked PO/GRN/invoice comparison rows | Existing status filter and documents |

### Phase 2 — read-only summary extensions, approval required

| Surface | Business question | Recommended visual | Required work |
| --- | --- | --- | --- |
| Inventory | Are inbound and outbound movements changing by day? | Daily paired/stacked columns by movement direction/type. | Extend the bounded Inventory summary from `inventory_daily_summary`; never scan the raw ledger on the page. |
| Manager operations | Which outlet-days are incomplete or late? | Outlet × day completion heatmap with explicit missing/incomplete/reviewed states. | Add a bounded operational read model or reuse the existing reliable Outlet Daily query with a strict period. |
| Stock Count | Where are recurring physical variances? | Signed variance bars by branch/item and a small 30-day variance trend. | Define a read-only stock-count variance report; preserve posted count and adjustment authority. |
| Production planning | Where is received quantity misaligned with estimated outlet movement? | Diverging bars for over-/under-supply signals with coverage confidence. | Reuse the existing conservative variance semantics; do not label it production output until a reliable posted-output join exists. |

### Phase 3 — only after data-definition approval

- Days of stock remaining.
- ABC/usage-value classification.
- Supplier on-time or quality score.
- Demand forecast or replenishment suggestion.
- Margin trend.

These require definitions or source data that are incomplete or intentionally out of scope. They must not be presented as “smart insights” by guessing.

## Dashboard direction

The recommended direction is **exception-first home, analytics-first reports**.

- Home Dashboard: current state, age/urgency, role action, and at most one small trusted comparison per role.
- Report pages: trend, distribution, ranking, filters, and detailed table.
- Detail pages: explanation, source records, timeline, and corrective action.

This preserves the existing test and performance principle that the Dashboard must not perform heavy operational-trend computation on the initial request.

### Role-specific home emphasis

| Role | Primary question | Home emphasis |
| --- | --- | --- |
| Owner | What cross-functional risk requires intervention? | Exception composition, oldest/critical item, AP exposure, outlet completion; links to reports. |
| Finance | What must be reviewed or paid, and when? | Approval queue, overdue/missing-date AP, due-window micro chart after approval. |
| Manager | Which branches or workflows are late or unreliable? | Outlet completion, stock count compliance, wastage/low-stock exceptions. |
| Purchasing | What needs sourcing, conversion, ordering, or receiving follow-up? | PR/PO/GRN queue age and variance; no finance-only exposure. |
| Kitchen | What must be requested, received, counted, or produced today? | Immediate task queue and ingredient/receiving exceptions; no unsupported forecast. |
| Outlet Staff | Is today's record complete and what is the next action? | One completion task, recent personal/outlet wastage context, and no executive KPI grid. |

## Chart interaction contract

Every new chart must satisfy all of these rules:

1. State the business question in the title or description.
2. Show period, timezone/report date, unit, and data population.
3. Distinguish zero, unavailable, missing, incomplete, and not applicable.
4. Show coverage/confidence when the denominator can be incomplete.
5. Use direct labels where possible; never require color alone.
6. Provide a keyboard/screen-reader-readable data table or list.
7. Make a bar/point click apply the same documented filter to the detail table or queue.
8. Preserve the filtered table as the source of detail and export.
9. Avoid doughnuts for operational comparisons, gauges without a trusted target, dual axes with unrelated units, and decorative sparklines without labels.
10. Keep phone charts vertically readable; do not shrink desktop charts into illegible miniatures.
11. Use shared semantic colors: neutral baseline, Seri Bako green for normal/selected, warning/danger only for defined exceptions.
12. Prefer lightweight shared SVG primitives initially; add a chart dependency only if interaction/accessibility requirements justify its bundle and maintenance cost.

## Documentation closure plan

Before a broad UI iteration, create a single current source of truth:

1. `DESIGN.md`: current rules only, with an explicit released-version header.
2. `docs/releases/`: historical version notes moved out of the canonical design contract.
3. `docs/analytics/METRIC_DICTIONARY.md`: name, formula, grain, filters, permission, source, freshness, unavailable rule, and drill-through for every KPI/chart.
4. `docs/qa/ANNOTATION_INTAKE.md`: the annotation severity and reproduction protocol below.
5. Refresh the schema relationship map against migrations `128–147`; do not infer relationships from the July filename alone.

No historical note should be deleted until its current rule has been classified as canonical, superseded, release history, or obsolete.

## How to annotate UI problems for Codex

### Annotation classification

Use one label at the beginning of each annotation:

- `GLITCH`: clipping, overlap, duplicate controls, broken alignment, overflow, wrong z-index, unreachable action, inconsistent control geometry, or misleading unavailable/zero state.
- `USABILITY`: too many steps, unclear next action, weak hierarchy, difficult scanning, or confusing copy.
- `INSIGHT`: a decision is hard because comparison, trend, distribution, threshold, coverage, or drill-through is missing.
- `PRODUCT CHOICE`: a new KPI, graph, workflow, automation, permission, status, or data definition is being proposed.

`GLITCH` can normally be fixed directly after reproduction. `PRODUCT CHOICE` must be planned and approved before implementation.

### Minimum useful annotation

Include:

- route;
- role;
- viewport/device;
- screenshot with the target circled or numbered;
- what you expected;
- what actually happened;
- whether it blocks the task or is visual polish;
- sample state: zero, non-zero, long text, error, unavailable, or loading.

### Prompt for an obvious UI glitch

```text
Use $impeccable to investigate this UI annotation as a symptom, not as an automatic implementation specification.

Type: GLITCH
Route: [route]
Role: [role]
Viewport: [width × height / device]
Annotation: [number or screenshot description]
Expected: [what should happen]
Actual: [what happens]
Severity: [blocks task / major friction / polish]

First read PRODUCT.md, DESIGN.md, the owning shared component, and relevant contract/E2E tests. Reproduce the issue at 390px, 820px, and 1440px where applicable. Trace whether the defect belongs to a shared component and list affected consumers.

Do not change business logic, workflow states, permissions, calculations, data ownership, or Supabase write behavior. If the defect is an obvious geometry/accessibility inconsistency within the current design contract, fix the shared owner directly. If the solution changes information architecture, data semantics, or a shared pattern with material trade-offs, stop after giving me the evidence, two options, and your recommendation.

After implementation: update the canonical design rule only if it changed, increment the patch version, run contract tests, strict typecheck, lint, and verify phone/tablet/desktop in the browser. Report exact evidence and remaining limits.
```

### Prompt for graphs, KPIs, or a product-level change

```text
Use $impeccable shape. Study established OMS/WMS/SaaS patterns from official sources before proposing a solution.

Type: PRODUCT CHOICE / INSIGHT
User decision I cannot make today: [question]
Role(s): [roles]
Route(s): [routes]
Operational decision to improve: [what the user should decide faster]
Current trusted data: [known source/report]
Known data limitations: [coverage, missing fields, latency]

Read PRODUCT.md, DESIGN.md, ARCHITECTURE.md, the current schema/migrations, and relevant tests. Preserve current business logic and role/branch boundaries. Do not invent a metric, forecast, threshold, or denominator.

Compare at least three established products and extract proven interaction patterns, not their visual theme. For each proposal provide: business question, role, formula, grain, source, filter dimensions, zero/unavailable/incomplete behavior, chart type, accessible table alternative, drill-through destination, responsive behavior, performance/read-model impact, and the exact approval needed.

Give me a recommended option plus one conservative alternative. Do not implement until I choose. After I approve, implement the smallest complete vertical slice, update the metric dictionary/design docs, and verify all supported roles and three viewports.
```

## Recommended implementation waves

### Wave 0 — trust and authority

- Fix the partial attention-total semantics.
- Fix command-surface contrast.
- Correct mock role-state fidelity.
- Consolidate current design/product/migration baselines.
- Add the metric dictionary template.

### Wave 1 — first complete chart system

- Build shared accessible `TrendChart`, `RankedBarChart`, and `DistributionBars` primitives.
- Convert the existing Wastage chart to the shared accessible contract.
- Add Demand Trend daily trend and ranked product/outlet charts.
- Add AP Aging and Cash Flow distribution charts.
- Keep existing tables as the accessible/detail authority.

### Wave 2 — operational insight expansion

- Bounded Inventory daily movement is complete through `inventory_daily_summary`; no raw-ledger page scan or mixed-UOM total was introduced.
- Add outlet completion heatmap and stock-count variance report.
- Procurement variance concentration and Inventory daily movement are complete; continue with outlet completion and Stock Count variance read models.
- Add at most one trusted micro chart per Dashboard role.

### Wave 3 — hardening and personalisation

- Saved report filters/favourites only if repeated use proves a need.
- Export parity between chart filters and tables.
- Performance budgets and current role × viewport visual regression.
- Manual screen-reader, keyboard, zoom, and high-text-size acceptance.

## Decision required before implementation

Choose the first implementation track:

1. **Analytics-first (recommended):** Demand Trend + AP Aging/Cash Flow charts, then Dashboard micro charts.
2. **Dashboard-first:** redesign the attention hierarchy and add role micro charts first; requires new bounded summary work earlier.
3. **UI-closure first:** fix contrast, stale docs, mock-state fidelity, and current role/viewport proof before any new graph.

Regardless of the choice, Wave 0 data honesty and documentation authority should not be skipped.
