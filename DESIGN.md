# Seri Bako OMS responsive design standard

> **Release authority:** the currently released application is `v8.39.0`, as
> defined by `src/lib/app-version.ts`. A versioned section above that number is
> an accepted forward design contract or unreleased implementation note—not
> evidence that the application itself has been released at that version.
> `docs/DESIGN_SYSTEM.md` owns the current visual principles; this file retains
> versioned implementation history and workspace rules.

> **Precedence:** `docs/DESIGN_SYSTEM.md` is the living visual and interaction contract. When a historical release note or an older rule in this file conflicts with that contract, the living contract wins. Update both documents when a new pattern is accepted; do not preserve a visibly weaker rule for compatibility.

This document is the implementation contract for every customer-facing route, form, record workspace, table, panel, dialog, and mobile action bar. It applies to new work and to refactoring of existing UI.

## v8.39.0 — Stock Balance Procurement Density

- Stock Balance uses the same balanced query geometry as the other operational lists; search, branch, status, and the submit action no longer use page-specific width caps.
- The desktop PR basket keeps its persisted branch/supplier/UOM behavior while reducing duplicated summary copy and compacting preview steppers, UOM controls, and removal actions. Mobile touch targets remain unchanged.

## v8.38.0 — AP Aging Query Surface Refinement

- AP Aging now uses the shared balanced FilterBar. Search, supplier, aging bucket, More filters, and the submit action keep the same operational geometry as the other list workspaces.
- Status and date-range controls remain in the anchored More filters panel, while the invoice table stays a separate content surface. Active filters are counted consistently and all controls expose stable accessible names.

## v8.37.9 — Operational Filter Surface Consistency

- Production Planning uses the shared filter surface directly instead of wrapping it in a second card. Planning, Stock Counts, and Production Jobs use the balanced query geometry so search, branch/status controls, More filters, and the submit action do not drift between operational lists.
- Planning filter controls expose explicit accessible names, and the page keeps one query surface across desktop, tablet, and phone layouts.

## v8.37.8 — Report Filter and Chart Accessibility Refinement

- Report filter surfaces use one balanced desktop geometry across Demand Trend, Product Margin, Recipe Costing, Costing Readiness, and Procurement Variance; query, select, More Filters, and submit controls remain one scannable decision row.
- Shared interactive line charts retain hover, touch, and keyboard previews while exposing an accessible point-by-point data list to assistive technology.

## v8.37.7 — Trusted Receiving and Stock Count Source Guard

- Outlet Daily receiving totals distinguish verified quantities from database-default zeros. Missing lines or unproven legacy zeros render as unavailable, and demand trends exclude those records from reliable totals.
- Stock Count seed balances fail closed when the source query is unavailable; form submissions reject incomplete quantity fields instead of silently defaulting them to zero.
- User-provided stock-take workbooks are treated as import evidence only after item-code and quantity completeness checks. Blank inventory columns cannot become physical counts.

## v8.37.5 — Report Surface and Empty-State Refinement

- Demand Trend uses the shared filter surface directly; no extra card wraps the query surface.
- Empty daily and ranking insights remain explicit, compact, and trustworthy when no reliable outlet data exists. A missing or incomplete source is not rendered as a zero chart.
- Keyboard-focused ranking previews stay selected when the pointer leaves the row, while transient mouse previews still dismiss naturally.

## v8.37.4 — Report Preview Interaction Refinement

- Shared report previews now distinguish transient mouse hover from committed touch/click or keyboard selection. Moving away from a ranked row or signal no longer leaves a stale preview open, while drill-through remains available after an intentional selection.
- Line-chart previews expose the active point index and announce updates through the live region, preserving the same hover, drag, touch, keyboard, and drill-through contract across report families.
- AP Aging and Production Variance now use the same focus, pointer, Escape, and preview relationship as ranking charts, so the report hierarchy remains compact at rest and predictable on phones.

## v8.37.3 — Operational UI Closure Round 2

- Stock Count removes the duplicate custom progress panel and keeps the canonical Draft → Posted workflow in the shared document header. Phone lines use a proven two-column count-card layout with full item names, leading ordinal markers, compact controls, and a desktop/tablet scan-friendly list.
- Purchase Order lines expose a real selectable purchase UOM, avoid repeating the item code beneath the selector, and restore the outer work surface. Purchase Return reasons use a controlled dropdown with notes shown only for Other.
- Outlet Daily completion keeps outlet labels pinned during wider-workspace scrolling, moves coverage into the contextual rail, and treats auxiliary read failures as unavailable instead of rendering misleading zero totals. AP Aging and Cash Flow now separate query/content surfaces and remove duplicated financial context.
- Shared filter overlays anchor to the trigger edge on tablet/desktop, avoiding detached panels; all changes preserve server-side authority, touch targets, and existing document workflows.

## v8.36.96 — Unified Mobile Create Actions and Report Detail Links

- All mobile create commands use the same circular floating action geometry, icon size, elevation, and safe-area offset; the obsolete inline list-toolbar create slot is removed so a page cannot drift into a second `+` pattern.
- Demand Trend keeps the chart preview focused on exact values and exposes accessible daily drill-through links in the full-detail table/list, carrying the selected outlet and status scope into Outlet Daily Records.
- The Outlet Daily chart touch regression now scrolls the analytical panel into view before sampling it, preserving the task-first phone order while still verifying tap preview behavior.

## v8.36.95 — PR Basket Persistence and Shared Mobile Actions

- Outlet Daily Records uses the shared PageHeader create action on phones, so its floating `+` matches Purchase Requests and other operational workspaces.
- Missing outlet-days in the completion preview expose a direct create link with the selected branch and date; the new-record form accepts those scoped values while rejecting future dates.
- Stock Balance keeps the PR basket in device-local storage scoped to the visible branch set. The browser copy is recoverable convenience state only; server-side branch and supplier validation remains authoritative when a PR is created.

## v8.36.94 — Outlet List First on Mobile

- Outlet Daily Records keeps its completion matrix and wastage trend, but the mobile reading order is task-first: filter, record list, then secondary insights.
- Desktop retains the insight-first layout because the wider workspace can show the bounded analytics without burying the record queue.
- The responsive contract covers both the list-first phone order and the existing matrix/chart detail surfaces; no data or status semantics change.

## v8.36.93 — Consistent Wastage Workflow

- New Stock Wastage uses the same DocumentWorkspace shell as Stock Count, Stock Transfer, Goods Receiving, and Purchase Returns.
- Mobile users see the current Draft status and `Step 1 of 2` workflow context before entering lines.
- Wastage validation, evidence guidance, and the primary action remain available through the shared mobile action surface and desktop side panel.
- The responsive workflow audit now includes Stock Wastage creation, preventing this long-form path from drifting away from the shared document contract.

## v8.36.92 — Drill-Through Variance Rankings

- Procurement Variance price rankings keep the active report filters and add the ranked item code to the drill-through URL.
- Every ranked price anomaly now exposes an `Open` action so preview and review form one complete path from signal to source list.
- The ranking prompt explicitly tells operators that `Open` narrows the detail list to the selected item.

## v8.36.91 — Honest Margin Empty States

- Product Margin distinguishes an empty product master from a filtered-out result on both the desktop table and mobile decision list.
- Margin reporting never claims readiness when there are no active products; the empty state points operators to the correct setup action instead.
- The mobile report preserves one shared title and description for both responsive renderings, preventing desktop/mobile semantic drift.

## v8.36.90 — Runtime-Honest Workspaces

- Optional reporting enhancements degrade to an explicit unavailable state when a database capability is missing or temporarily unavailable; expected capability gaps remain observable as warnings without presenting a healthy workspace as a browser error.
- The static workspace audit captures page errors and console errors in addition to geometry, overflow, and filter alignment, covering all canonical routes at mobile, tablet, and desktop reference widths.
- Recipe Costing empty states distinguish “no active recipes” from “no recipes match these filters,” so the page never claims readiness while also showing an empty result.
- Low Stock list rows provide stable React keys for trailing actions, eliminating repeated-key warnings during client rendering.
- A clean runtime gate now verifies 69 canonical routes at `390px`, `820px`, and `1440px` widths after each release slice.

## v8.36.89 — Stable Mobile Workspaces

- Outlet Daily Records keeps its phone create command inside the filter toolbar. The action remains visible without floating over branch names, quantities, empty-state guidance, pagination, or the persistent bottom navigation.
- The shared Unified List Header exposes a reusable phone end-action slot so dense operational workspaces can opt out of a floating action without creating a page-specific toolbar.
- Authenticated workspace content no longer fades from zero opacity during streamed navigation. Headers, context, and working data remain immediately legible while explicit loading and interaction feedback continue to communicate change.
- Browser regression coverage verifies that the Outlet Daily create command is toolbar-owned, non-fixed, and contained within the mobile filter surface.

## v8.36.88 — Readable Dense Reports

- Ten-column decision reports do not switch to a technical table merely because the viewport reached `xl`; the available main canvas must also be wide enough after the navigation and report guidance rail are present.
- Procurement Variance, Product Margin, and Recipe Costing keep their complete Operational List through 1440px and switch to the dense table at `2xl`, where all decision columns and the final status/action remain readable together.
- The shared Table and Operational List primitives now support a `2xl` handoff. No report field is removed, compressed into unreadable text, or hidden behind an apparently clipped table edge.

## v8.36.87 — Accessible Report Filters

- Every Reports select filter exposes a stable purpose-specific accessible name rather than relying on the currently selected option to imply its meaning.
- Recipe Costing uses the shared `Input` control for search, bringing its focus treatment, control height, and semantics in line with Product Margin and Procurement Variance.
- The change is interaction-neutral: query parameter names, filter values, result ordering, layout geometry, and report calculations remain unchanged.

## v8.36.86 — Progressive Demand Detail

- Demand Trend keeps summary metrics, the interactive daily chart, and preview-first rankings as the primary report layer. All four raw data collections use one consistent collapsed detail disclosure beneath that layer.
- Each disclosure names its dataset and exact row count, remains keyboard operable with a 44px minimum summary target, and reveals the same complete desktop table or narrow-workspace list on demand.
- Collapsing Outlet Comparison and Daily detail reduces initial mobile density without removing the accessible data authority that supports chart previews and trust review.

## v8.36.85 — Complete Mobile Product Margin

- Product Margin phone and tablet rows retain the desktop margin band alongside status, price, estimated cost, signed margin, margin percentage, recipe confidence, and next review action.
- The compact trailing meta owns only the short margin band. The longer next action moves into the full-width detail hierarchy so it cannot squeeze or truncate the product identity.
- Unavailable price, cost, margin, or confidence remains explicit and never appears as a valid zero; the row destination still follows the status-aware review path.

## v8.36.84 — Complete Mobile Recipe Costing

- Recipe Costing phone and tablet rows preserve the complete decision authority of the desktop table: lifecycle, confidence, line count, missing cost, UOM mismatch, ingredient cost, output, cost per output, warning, and next action.
- Cost per output is promoted beside confidence while line count remains compact metadata. Cost gaps and UOM mismatches stay together in the detail hierarchy instead of competing in one unbroken trailing label.
- Missing ingredient cost, output, or cost per output remains explicitly incomplete or unavailable; mobile compaction never converts an absent value to zero.

## v8.36.83 — Preview-first Outlet Completion

- Every Outlet Daily completion cell is a selection control. Hover, touch, click, and keyboard focus reveal the same authoritative outlet-day status without navigating away.
- Existing records open only through the persistent `Open daily record` action in the preview region, matching the system-wide preview-before-open contract and preventing accidental phone navigation.
- Missing outlet-days remain previewable but expose no false record action. The seven-day matrix, compact phone summary, and complete record authority remain unchanged.

## v8.36.82 — Drillable Costing Distributions

- Product Margin readiness and Recipe Costing confidence distributions retain preview-first pointer, touch, and keyboard behavior while adding one explicit Open action.
- Open preserves the current report scope and replaces only the selected authoritative `status` or `confidence` filter before returning to the same complete detail list.
- Existing search, lifecycle status, margin-band, recipe-link, and cost-gap filters remain intact; the distribution never opens a decorative or unsupported query parameter.

## v8.36.81 — Drillable Demand Product Rankings

- Demand Trend product rankings retain their hover, first-touch, and keyboard preview while adding one explicit Open action in the persistent preview region.
- Open preserves the resolved period, branch, and reliable-record status before applying the selected product to the same report and full detail tables.
- Daily movement remains preview-only because the report has no authoritative single-date filter; the existing Daily detail remains its complete source instead of introducing a decorative URL parameter.

## v8.36.80 — Drillable Procurement Variance Insights

- Procurement Variance follows the shared report hierarchy: scope filters, filtered status metrics, preview-first rankings, then complete technical and phone detail.
- Status ranking previews expose an explicit Open action that preserves the current search and date range while applying the selected comparison status to the same detail authority.
- PO-to-GRN price rankings use the documented warning rule of more than RM 0.01 or 2%; small absolute differences that exceed the percentage threshold are no longer omitted from the insight.

## v8.36.79 — Scope-consistent Costing Readiness

- Costing Readiness follows the shared report hierarchy: severity and module filters, scoped preview-first module ranking, then the complete issue detail.
- The insight total and severity breakdown are derived from the same severity-scoped module population as the ranking; a filtered chart can no longer pair scoped bars with global totals.
- The readiness badge is explicitly labeled Overall because it remains the global data-readiness judgement, while the adjacent counts and ranking describe the selected severity scope.

## v8.36.78 — Filter-first Recipe Costing Insights

- Recipe Costing now follows one report hierarchy: scope filters, preview-first confidence and cost rankings, then the complete desktop table and phone list.
- Rankings live inside the same workspace and contextual-rail boundary as their defining filters, so a filtered cost view no longer appears visually detached from its scope.
- The page source is decompressed into maintainable semantic sections without changing cost authority, confidence rules, empty states, recipe links, or read-only behavior.

## v8.36.77 — Filter-first Product Margin Insights

- Product Margin keeps its filter scope, preview-first readiness distribution, margin ranking, and complete detail list inside one report workspace.
- Filters precede the derived charts, matching the established Demand Trend hierarchy and preventing a filtered ranking from appearing visually detached from the controls that define it.
- The ranking no longer spans outside the standard content and contextual-rail boundary; mobile and wide layouts now inherit one consistent workspace width and spacing contract.

## v8.36.76 — Mobile-first Outlet Completion

- Outlet Daily Records presents completion insight as a compact phone summary before the dense seven-day matrix, keeping complete, in-progress, and missing outlet-days visible without dropping users into a spreadsheet-like surface.
- The phone matrix is available through one explicit, accessible disclosure and remains fully visible by default from tablet upward; its exact preview and record links are unchanged.
- A primary filter moved into the shared mobile drawer is no longer represented by an empty layout node. Outlet Daily therefore exposes one complete Filter action and record count with no clipped date-control remnant.

## v8.36.75 — Complete Staff Directory Reads

- The Staff directory treats roles, role assignments, branch assignments, and branch names as one identity-read boundary rather than optional decoration.
- Any failed relationship read now enters the existing page error boundary instead of presenting a real staff member with a misleading blank role or default branch.
- A source contract guards all four auxiliary query errors so future directory changes cannot silently regress to incomplete-success rendering.

## v8.36.74 — Trustworthy Global Navigation

- Global navigation remains a stable information architecture, not a second live reporting surface; queue authority stays in bounded workspaces and the Dashboard.
- The retired ten-query sidebar count path and its dormant badge plumbing are removed so a read failure cannot be reintroduced as a misleading zero badge.
- Navigation rendering no longer carries unused count state, while permission, grouping, attention metadata, and role-specific destinations remain unchanged.

## v8.36.73 — Keyboard-Safe Mobile Filters

- Every shared mobile Filter trigger now identifies its dialog relationship and reports whether the filter sheet is expanded.
- Opening the filter sheet moves focus into the modal; Tab and Shift+Tab remain inside its available controls, while Escape closes it conventionally.
- Closing by Escape, backdrop, or the close control restores focus to the originating Filter trigger so keyboard users retain their place in the list workflow.

## v8.36.72 — Accessible Loading Motion

- Continuous skeleton and spinner motion honors the operating system's reduced-motion preference through one global contract; loading feedback never depends on animation alone.
- AP Aging and Cash Flow Forecast skeletons expose a named, atomic polite status while their report data is busy, matching the shared workspace loading behavior.
- Motion and finance-loading semantics are source-contract tested so a future page-specific skeleton cannot silently remove the accessibility guarantees.

## v8.36.71 — Contained Outlet Daily Mobile Matrix

- Outlet Daily Records keeps its seven-day completion matrix inside the phone viewport; all seven days fit without moving the page or hiding the outlet context.
- Horizontal matrix navigation is reserved for wider workspaces, where pinned outlet labels remain useful and the scrollport is independently contained.
- The phone query surface uses one complete Filter trigger: date, branch, and status live together in the filter drawer instead of rendering a clipped date field beside the action.

## v8.36.70 — Verified Semantic Contrast

- Semantic status foreground/background pairs are numerically guarded at WCAG AA 4.5:1 or better rather than accepted by visual inspection alone.
- Procurement Variance's 10px stage labels use the verified muted-text token instead of the decorative soft-text token that measured only 3.13:1 on white.
- The desktop sidebar release footer moves from 3.78:1 translucent white to a clearly readable 6.92:1 while preserving the existing hierarchy.

## v8.36.69 — Truthful Local Error Boundaries

- Document and procurement detail boundaries distinguish a confirmed missing-record signal from a failed read; infrastructure failures are never described as deletion or access loss.
- Retryable detail failures expose Retry, a safe collection escape, and an opaque support reference through one shared component with touch-safe actions.
- Production, finance-report, and authentication boundaries now pair retry with a contextual escape path and preserve the same phone touch contract.

## v8.36.68 — Recoverable System Errors

- Root, workspace, and application-shell error boundaries expose a semantic page heading, alert region, safe retry path, and Dashboard escape instead of leaving users on a dead-end error screen.
- Recovery controls keep at least a 44px touch target with visible keyboard focus; workspace buttons may return to compact desktop height only at the wide-shell breakpoint.
- Opaque error references remain visible for support without exposing the underlying exception, and the root global fallback stays self-contained when the design system itself cannot load.

## v8.36.67 — Readable Reports Directory

- Every Reports directory entry is one full-width, touch-friendly navigation target rather than a narrow repeated Open button.
- Report titles and purpose descriptions remain readable on phones instead of being truncated before users can judge which report they need.
- Each row exposes a report-specific accessible name and a conventional trailing direction cue without adding nested card layers.

## v8.36.66 — Trustworthy Production Report Failures

- Production Planning and Production Variance isolate report-query failures inside their own page context instead of falling through to the generic application error boundary.
- Failed reads are logged through the redacting server logger and render an explicit retry action; they are never presented as zero suggestions, balanced variance, or a successful empty report.
- Unavailable states repeat the read-only boundary so users know no production or inventory records were changed.

## v8.36.65 — Contained Outlet Daily Mobile Workspace

- Outlet Daily Records keeps the 7-day completion matrix inside its own horizontal scrollport, so dragging dates cannot move or widen the page.
- The phone date/filter/result row retains its full card width after matrix interaction instead of collapsing the date picker to a sliver.
- The page workspace clips accidental document-level horizontal overflow while preserving the matrix's intentional local swipe interaction.

## v8.36.64 — Resilient Demand Reporting

- Demand Trend Lite now records report failures through the redacting server logger and preserves the report shell with an explicit retryable unavailable state.
- An incomplete demand-trend source is never rendered as zero coverage, an empty chart, or a trustworthy empty result.
- Reports summary now distinguishes reports visible to the current role from catalogue entries hidden by access, replacing the duplicate `Available` / `Total Listed` counters.

## v8.36.63 — Truthful Workspace Updates

- Workspace Updates now distinguishes a verified empty pending-action or notification queue from a source that could not be read or validated.
- Document approvals, workflow actions, production permissions and queues, notification scope, recipients, and linked-record validation expose one combined availability contract with redacted server observability.
- An unavailable source renders a compact warning instead of `No pending actions` or `No new notifications`.
- The top bar no longer claims `No recent activity` without loading the activity feed; it provides a direct `Open full activity log` entry instead.
- Outlet Daily Records no longer lets the legacy date-first width rule constrain the entire unified phone row; its date, Filter action, and result count now retain the same stable geometry as other operational lists.

## v8.36.62 — Readable Mobile Filter Summary

- Date-first mobile filters now render an explicit `Any date` or formatted selected date above the native date picker, avoiding browser-dependent blank controls.
- The native date input remains the full accessible interaction target, with a shared visible focus treatment around the rendered date control.
- Result count stays beside the date and Filter controls on phones instead of creating a sparse second row.

## v8.36.61 — Trustworthy Invoice Detail Reads

- Supplier Invoice detail now settles document activity, draft GRN sources, and AP Aging independently, with redacted logs and explicit unavailable states.
- An unverified attachment state disables Finance approval instead of incorrectly asking for another attachment; the warning remains visible on phone and wider workspaces.
- A failed draft-source read preserves the authoritative invoice summary and matching lines in read-only mode, while suppressing save actions that require a complete eligible-GRN catalogue.
- AP Aging failure is shown as unavailable rather than silently removing payment attention; the invoice balance remains the payment authority.
- Costing Readiness, Procurement Variance, Product Margin, Recipe Costing, and Master Data Cleanup retain their existing unavailable UI while now recording redacted failure context.

## v8.36.60 — Trustworthy PR Detail Reads

- Purchase Request detail now settles linked orders, item labels, supplier labels, supplier routes, branch labels, document activity, and deletion preview independently, with redacted logs for every failed source.
- Draft editing is available only when the complete item, supplier-route, and branch directories are present; otherwise the authoritative request lines remain visible in an explicit read-only state.
- Missing label directories render unavailable references instead of false `No supplier suggested`, missing branch, or raw-ID-as-name states.
- Linked PO and document activity panels distinguish successful empty results from unavailable reads, including a phone-visible activity warning.

## v8.36.59 — Resilient PO Export Directory

- Purchase Orders now isolates the branch directory used only by workbook export from the primary paginated order queue and PO summary.
- A failed export-directory read is logged through the redacting server logger and renders a disabled, explicit `Export unavailable` state while order search, review, navigation, and creation remain usable.
- Export remains permission-gated and cannot open with an incomplete branch catalogue.

## v8.36.58 — Truthful Stock Count Reads

- Stock Counts now preserves independent unavailable states for the paginated queue, summary totals, branch directory, workbook export, and variance insight.
- A failed count queue renders a retry-safe unavailable message without false empty-state copy or pagination; failed branch options disable the selector and export while preserving an existing URL branch scope.
- The base-table list fallback now rejects incomplete branch or line hydration instead of rendering missing branch names or false zero line and variance counts.
- Variance insight failures retain the existing explicit unavailable state and are recorded through the redacting server logger.

## v8.36.57 — Readable Mobile Date Filter

- Date-first mobile list filters now receive their date-control layout inside the phone breakpoint where the shared mobile header actually renders.
- An empty date filter shows the complete `Any date` affordance with its calendar icon instead of collapsing to an unexplained icon-only field.
- The date control, filter trigger, and result count retain a clear toolbar hierarchy without changing tablet or desktop list layouts.

## v8.36.56 — Truthful Secondary Reads

- Production Jobs no longer converts list or branch-directory failures into successful empty pages; its paginated queue, full-summary read, and branch filter now expose independent unavailable states.
- A failed production queue shows an explicit retry-safe unavailable message and suppresses false pagination, while a failed branch directory disables the selector and preserves any existing branch scope.
- Purchase Returns, Stock Transfers, and Stock Wastage isolate their secondary full-list summary reads so a failed aggregate cannot remove the current page or render false zero totals.

## v8.36.55 — Resilient Operational Summaries

- Goods Receiving, Purchase Requests, Purchase Orders, and Recipes now treat their paginated operational queues as primary data and their right-rail summaries as independently settled auxiliary reads.
- Summary failures are redacted in server logs and render a concise `Unavailable` status with queue-specific continuity guidance; they are never surfaced as zero totals or allowed to replace the usable queue.
- Existing filters, pagination, create actions, export actions, and row navigation remain available when only a summary read fails.

## v8.36.54 — Truthful Invoice Filters

- Supplier Invoice supplier-option reads now throw on either invoice or supplier query failure instead of returning a false empty supplier catalogue.
- The invoice queue is the primary authority; AP Summary and supplier-filter options are independently settled, logged through the redacting logger, and rendered as explicit `Unavailable` states.
- A temporarily unavailable supplier selector is disabled with a readable label while any existing URL supplier scope is preserved as a hidden value, preventing a subsequent search from silently widening the result set.

## v8.36.53 — Resilient Outlet Insights

- Outlet Daily Records now treats its operational record list as the primary authority and isolates the optional 7-day completion and 30-day wastage reads with settled promises.
- A failed insight is rendered as `Unavailable` with a retry explanation and a redacted server log; it is never converted into 0%, an empty chart, or a false no-record state.
- Successful empty reads retain their precise empty messages, preserving the Clear, Empty, and Unavailable distinction without removing operational actions.

## v8.36.52 — Readable Mobile Date Filters

- Empty native date controls on phone list filters now expose a persistent `Any date` label and calendar affordance instead of collapsing into an unexplained icon on iOS Safari.
- The shared date control remains a full-width, 44px native picker, becomes controlled after selection, and preserves automatic list submission without changing desktop query surfaces.
- Outlet Daily Records adopts this shared contract, keeping the date, Filter action, and result count understandable as one compact query surface.

## v8.36.51 — Consistent Chart Touch Targets

- Every chart selector, compact tab, status cell, and preview action that changes or opens exact chart context has a 44px minimum target below wide desktop. Wide desktop may use a compact 32–36px target where pointer precision and surrounding density justify it.
- Stock Count variance tabs, Outlet completion cells, Production variance secondary signals, Dashboard comparison Open, Outlet completion Open, and Inventory movement drill-through now follow this shared contract.
- An intentionally horizontal matrix may keep compact 36px cells at `sm` and above, but phone cells remain 44px in both axes. Increasing the target must not remove the pinned identity column or the explicit swipe instruction.
- Production supply signals use semantic danger and warning tokens instead of framework-specific rose and amber utilities. Signal meaning remains driven by the documented thresholds, not by a decorative palette.

## v8.36.50 — Touch-ready Chart Inspection

- A chart dataset must not be available only through a pointer tooltip or a permanently hidden table. If the surrounding page does not already expose the same complete rows, provide a keyboard-operable Daily data disclosure with a phone list and a wide table.
- Outlet wastage now exposes date, received quantity, wastage quantity, and wastage rate to sighted and assistive-technology users. Date links filter Outlet Daily Records to the selected date while retaining the active branch scope.
- Shared interactive ranking rows and Dashboard role-comparison rows use a 44px minimum target on phone and tablet input surfaces, then return to a compact 36px minimum at wide desktop. Hover, touch, focus, preview, and drill-through behavior remain identical.
- Touch target corrections belong in the shared interactive primitive when the same row pattern serves multiple reports. Do not compensate with page-specific padding that lets sibling reports drift.

## v8.36.49 — Responsive Chart Data

- A chart's exact-data disclosure must be responsive independently of the chart. Phone users receive a complete vertical list or definition list; a wide comparison table may remain at `sm` or above when its columns fit without horizontal navigation.
- Inventory daily movement and Stock Count variance no longer force 24–25rem technical tables into phone disclosures. Each daily phone row preserves the date and all three exact measures from the corresponding wide table.
- A date that has an authoritative filtered detail destination is a touch-sized link in both responsive modes. Visual compaction must not remove drill-through, and the phone list and wide table must map from the same source collection.
- Avoid `overflow-x-auto` as the default response to a narrow chart dataset. Horizontal scrolling remains valid only where the horizontal relationship itself is the task, such as an outlet-by-date matrix with a pinned identity column.

## v8.36.48 — Semantic Operational Surfaces

- Ordinary workspace backgrounds, alternating rows, controls, and missing-state cells use the shared surface tokens. Operational components must not hard-code white or a framework gray when the meaning is an ordinary, raised, or muted application surface.
- Dark operational-green states use `--sb-text-inverse` for foreground contrast. Literal white opacity remains valid only for intentional layered content on a known dark background, such as the Dashboard Operational Pulse.
- Stock Count setup, long-entry workspace, toolbar, row striping, quantity editor, and adjusted-only control now share the same semantic surface and border authority. The workflow remains visually coherent across theme variants without changing count behavior.
- Outlet completion missing cells and Stock Count variance view tabs follow the same contract, with regression tests preventing local hard-coded surface colors from returning.

## v8.36.47 — Responsive Import Review

- Import Review retains the editable spreadsheet grid at tablet and desktop widths. Phones use a vertical row editor with every dynamic import header rendered as a visible field label; users never need horizontal table navigation to correct a row.
- Desktop cells and phone fields share the same `rows`, `updateCell`, remove action, and validation-message authority. Supplier resolution, required-field errors, and duplicate-row errors cannot diverge by viewport.
- Server-rejected row-level issues keep the wide audit table and add a complete phone definition list. Every submitted key/value and the server message remain readable without truncating the evidence needed for correction.

## v8.36.46 — Pinned Outlet Completion Context

- The seven-day Outlet completion matrix retains its compact horizontal date comparison, but pins the Outlet column while dates scroll. Users must never lose the row identity needed to interpret status cells on phones or narrow tablets.
- Column and row headers expose explicit table scope. The scroll region references a visible phone instruction, remains keyboard focusable, and uses contained horizontal overscroll without weakening hover, touch, focus, preview, or record-opening behavior.
- Sticky row headers use the ordinary surface and semantic border tokens; the matrix does not invent a floating card, duplicate outlet label, or alternate mobile dataset.

## v8.36.45 — Unified Costing Report Surfaces

- Recipe Costing, Costing Readiness, and Procurement Variance complete the report-family convergence to sibling query and result surfaces. Together with Product Margin, Production Variance, and Master Data Cleanup, all six guarded high-density workspaces use one structural contract.
- Filter overlays remain owned by the shared `FilterBar`; the result card alone owns table/list clipping, dividers, and empty states. A visual flattening selector is not a substitute for correct DOM hierarchy.
- Every result card retains its wide audit table and a complete narrow-workspace OperationalList or decision list, so structural cleanup cannot hide costing confidence, variance context, next actions, or unavailable states.

## v8.36.44 — Separated Report Query Surfaces

- Product Margin, Production Variance, and Master Data Cleanup render query controls and results as sibling surfaces. A filter form must never inherit the border, clipping, or empty-state boundary of the result card.
- The result surface retains the wide technical table and the complete narrow-workspace list. Separating the query surface must not remove decision fields, empty-state guidance, or record links.
- The shared `FilterBar` remains the sole owner of phone drawer and wider inline-filter behavior; report pages do not create a second card around it.

## v8.36.43 — Responsive Branch Selection

- Branches retains the complete technical table at wide desktop and uses a continuous OperationalList below 1280px. The compact row preserves code, name, type, lifecycle status, phone, email, and address.
- Bulk archive/restore remains available in the compact directory. Phone users can select individual branches or all visible branches without opening the record; the existing confirmation and history-preserving server actions remain authoritative.
- Selection is shown only to users with update permission. Create permission alone must not expose a selection control that cannot perform an action.
- Phone selection controls use a 44px label hit target while retaining a compact 16px checkbox mark. Every row checkbox has a branch-specific accessible name and sits outside the row link, avoiding nested interactive controls.

## v8.36.42 — Trusted Operational Pulse

- Dashboard attention total and visible breakdown share one source authority: pending approvals, low stock, stock counts due, wastage requiring review, and overdue payables for permitted roles. Receiving activity and recent-request snapshots are context, not attention-total constituents.
- Pending approvals use an exact RLS-scoped count while retaining only the five oldest records for display. Query failure is unavailable and makes the total unavailable; a bounded display array must never be presented as the complete count.
- Pulse signals use compact, keyboard-visible links with a two-column phone layout and four- or five-column wider layout. An odd final phone signal spans the row rather than leaving an accidental blank cell.
- Owner and Manager do not receive a second comparison chart that repeats the Pulse exception sources. Finance, Kitchen, and Purchasing retain role-specific comparison only where it adds distinct decision context.

## v8.36.41 — Costing Report Rankings

- Product Margin adds filtered-population readiness distribution and a top-five ready-margin comparison. Absolute RM size determines visual rank while the direct label and preview preserve the signed margin; the report remains explicitly non-prescriptive.
- Recipe Costing adds confidence distribution and a top-five usable cost-per-output comparison. Low-confidence rows are excluded from numeric cost ranking and remain explicitly incomplete rather than zero.
- Both surfaces reuse the shared preview-before-open ranking contract: hover, first touch, and keyboard focus reveal exact values without navigation; linked records open only through the persistent Open action.
- Rankings are capped at five records so phone users receive scan value without duplicating the full operational list. The existing table and phone list remain the complete detail authority.

## v8.36.40 — Guided Stock Count Workspace

- The phone Stock Count editor opens with an explicit `Step 1 of 2` orientation band, current Draft status, and the consequence boundary that draft saves do not change stock while posting is final.
- Long desktop count sessions retain a sticky semantic column header beneath the document workflow header. Stronger row separators and restrained zebra striping preserve the relationship between item, variance, and physical quantity without creating nested cards.
- Sticky document headers use a stronger elevation token so workflow status remains visually anchored above scrolling operational content.

## v8.36.39 — Responsive Administration Lists

- Master Data Cleanup, Staffs, and Document Sequences use the same shared OperationalList contract as mature operational directories below 1280px; wide technical tables remain available on desktop.
- Cleanup issue rows retain severity, module, record, issue type, and the exact manual next action. A phone list must not reduce the report to severity and title alone.
- Staff rows retain both staff lifecycle status and authentication state, plus staff code, role, email, and default branch.
- Document sequence rows retain preview number, reset cycle, current period, next cursor, and status. The cursor remains explicitly distinct from an operational record count.

## v8.36.38 — Responsive Inventory Details

- Recipe availability, Stock Transfer, and Stock Wastage details use full audit tables only at wide desktop widths; narrow workspaces retain every decision field in continuous summaries.
- Recipe lines lead with required quantity and preserve current stock, shortage, suggested action, status, and cost. Unknown stock and unavailable shortage calculations remain explicit trust states.
- Transfer lines distinguish requested, physically received, and remaining quantities. Wastage lines preserve reason, batch, expiry, and remarks beside the stock-out quantity.
- A Movement Ledger detail contains exactly one authoritative movement, so it uses a semantic movement summary rather than a six-column single-row table. Direction, quantity, branch, unit cost, and value remain explicit.

## v8.36.37 — Responsive Posted Operations

- Posted Production Job and Stock Count details retain their wide audit tables at desktop widths and use complete reconciliation summaries below 1280px.
- Ingredient consumption leads with actual quantity and line cost, then retains required quantity, available stock, variance, and unit cost. Unknown availability and unrecorded actuals remain explicit trust states rather than zero.
- Production output leads with actual output and line cost while preserving planned quantity and unit cost.
- Posted count lines lead with physical quantity and variance. High variance is compared against the count's saved tolerance and remains visibly exceptional; a missing remark is disclosed instead of implied to be complete.

## v8.36.36 — Responsive Payables Reports

- AP Aging and Cash Flow Forecast retain full financial audit tables only where all columns fit. Phone, tablet, and narrow-laptop layouts use flat decision lists without horizontal table navigation.
- Payable rows lead with outstanding exposure and risk state, then retain supplier reference, due date, original total, amount paid, workflow status, bucket, and alert authority.
- Supplier exposure summaries lead with total outstanding and retain invoice count, overdue exposure, oldest due date, and maximum days overdue. Selecting a row applies the same supplier filter.
- Missing due dates and overdue balances remain explicit exceptions; compact presentation must never turn missing authority into a neutral zero or omit the report's MYR-only limitation.

## v8.36.35 — Responsive Procurement Detail

- Purchase Return and read-only Supplier Invoice details use full audit tables only at widths where every reconciliation column fits. Narrow workspaces use flat line summaries rather than horizontal table navigation or cards nested inside cards.
- Return summaries lead with the quantity and value being returned, then retain received, previously returned, returnable, and unit-cost authority in one scan path.
- Invoice matching summaries lead with this invoice quantity and line total, retain PO/GRN provenance and ordered/received/previously invoiced quantities, and expose quantity or price variance as an exception instead of hiding it.
- Payment history follows the same responsive contract: wide audit table, narrow chronological list, and an explicit empty state.

## v8.36.34 — Responsive Receiving Detail

- Goods Receiving detail uses a desktop audit table only where its ten columns fit. Phone, portrait-tablet, and narrow laptop workspaces use a continuous line summary instead of horizontal table navigation.
- The compact receiving line keeps the decision hierarchy intact: received quantity leads; ordered, previously received, and pending quantities provide reconciliation context; rejection, batch/expiry, unit cost, and stock value remain available without repetition.
- Rejected quantity is shown as an exception and explicitly states that it is excluded from stock. Zero rejection does not consume permanent phone space.
- Responsive verification must prove both modes: the summary below 1280px and the full audit table at a wide desktop breakpoint.

## v8.36.33 — Oriented Stock Count

- A new Stock Count keeps Draft status and workflow position visible on phones. Compactness must not remove the operator's current state or next-stage context.
- Dense count rows stack below item identity until the viewport is wide enough for the full Item / Variance / Count ledger; breakpoint choice must account for the side rail's effect on usable content width.
- Long count sessions expose visible and adjusted totals plus row position. Subtle alternating surfaces and a semantic adjusted state improve scanning without turning each line into a card.
- Document workspace headers use one shared, restrained elevation so sticky context remains visibly separate from scrolling content.
- Dashboard attention leads with a single plain-language exception total, then uses the queue cells as its breakdown. Supporting descriptions collapse on phones to preserve first-screen action density.

## v8.36.32 — Branch-Scoped PR Basket

- A Low Stock purchase-request basket is scoped to exactly one branch. “All branches” is a review state, not an editable procurement scope.
- Changing the basket branch clears unsaved selections and quantities so hidden lines from another branch cannot enter the request.
- On phones, unselected low-stock lines retain current and suggested quantities for the purchasing decision, while the editable request quantity appears only after selection.
- Disabled selection, concise branch guidance, and polite selected-count feedback expose the same constraint before submission instead of failing late.

## v8.36.31 — Flat Invoice Matching

- Supplier Invoice is one form surface. Eligible GRNs are flat internal sections, never `erp-surface` cards nested inside the form surface.
- On phones, an unchecked receiving line exposes only selection and item identity. Invoice quantity, invoice price, receiving references, and variance appear only after selection.
- Selection feedback distinguishes the empty requirement from the selected-line count and announces changes politely to assistive technology.
- A loopback-only, explicit Supplier Invoice fixture may create an idempotent supplier → branch mapping → PO → posted GRN chain for browser evidence. Ordinary local E2E and every remote environment remain unaffected.

## v8.36.30 — Selected Stock Lines Only

- Stock Transfer and Stock Wastage item selection is authoritative: unchecked item IDs must never enter an action payload, even when dormant form values remain mounted.
- Unselected inventory rows show only the checkbox, item identity, code, and UOM. Quantity, availability, reason, batch, and remarks progressively disclose only after selection.
- The item summary states selected and visible counts separately. Search visibility must not change which items are selected.
- Dynamic-detail audits include the actual 820px tablet and 1180px laptop review widths. Coverage reports distinguish populated records from routes whose fixture has no data.

## v8.36.29 — Responsive Audit Reliability

- When Playwright starts the isolated local application, that exact local address is the sole audit target. A stale environment URL must not redirect evidence collection to another dev session or release.
- Interactive-bound checks include every visible or operable control. A headless form mirror may be excluded only when it is explicitly hidden, or both pointer-inert and unfocusable.
- The canonical static-workspace audit covers 69 Owner workspaces at 320px, 820px, and 1180px, including list filters, empty states, report surfaces, and operational entry forms.

## v8.36.28 — Costing Readiness Concentration

- Costing Readiness compares issue concentration across Items, Supplier items, Recipes, and Products using server-owned issue counts. It never converts issue count into financial exposure.
- Global readiness and totals remain unfiltered; the module comparison follows the selected severity while intentionally ignoring the current module so users can compare and switch modules.
- Ranking selection previews severity composition without navigation. The explicit Open action preserves severity and applies the selected module to the existing issue list.
- A zero ranking value renders zero filled width. Minimum visible bar width applies only to positive values; visual marks must never imply that zero is non-zero.

## v8.36.27 — Canonical List Filter Authority

- Shared list query cards have one responsive geometry owner. Retired 9rem, 7rem, and generic 8rem override layers must not be reintroduced around the canonical contract.
- Portrait and compact tablets use one deliberate two-row grammar: the query spans row one; filters and the stable result/action group occupy row two. Controls remain 44px high and labels stay on one line.
- Query and content cards are sibling surfaces. Legacy outer containers are flattened by the shared layer so a filter card cannot appear inside another visual card.
- Opening Select or More filters closes the other desktop overlay; route CSS must not own overlay coexistence.

## v8.36.26 — Exception-First Dashboard Priority

- Dashboard comparison signals use a stable semantic order: critical exceptions, follow-up, activity, then snapshots. Source order resolves ties; count magnitude never invents urgency.
- Zero and unavailable values remain distinct trust states: zero is Clear, while a failed or absent source is Unavailable.
- The secondary Dashboard column is a single ordered layout owner. Exceptions precede routine operational activity, followed by finance obligations and informational alerts.

### Operational relationship ownership

- Central Kitchen to outlet supply routes are managed in Administration > Branches / Outlets, never as frontend constants.
- An outlet has exactly one active Primary Central Kitchen; a Central Kitchen may supply multiple outlets.
- Outlet detail uses one Central Kitchen selector. Central Kitchen detail uses a responsive outlet checklist and identifies assignments owned by another kitchen before transfer.
- Route changes are atomic, permission-checked, tenant-scoped, and auditable. The relationship editor is a sibling work surface, not a card nested inside Identity.

### Dense editable row alignment

- A dense editable list must use the exact same column template, horizontal gutter, and gap for its header and every data row. Inner controls may fill their assigned column but must not introduce a second `max-width` or end-alignment rule that visually detaches them from the column heading.
- Stock Count uses an elastic Item column, a stable Variance column, and a bounded Count column. Quantity stepper and UOM remain inside that Count column at desktop and tablet widths; phone rows may stack the Count control beneath the item context.

## v8.36.25 — Report Preview Drill-through Consistency

- AP Aging buckets, Cash Flow due windows, and Production Variance signals now follow the same preview-before-open contract as ranking charts.
- Chart marks are list/button selection controls with `aria-pressed`; they expose a labeled live preview region and never navigate on first touch.
- The preview owns the equivalent filtered-report URL through one explicit, keyboard-reachable Open action. Escape clears keyboard selection.

## v8.36.24 — Ranking Preview Before Open

- Ranking bars are selection controls, never navigation links. Hover, focus, click, and first touch reveal the same exact preview without leaving the report.
- A linked ranking exposes a separate `Open` action inside the persistent preview. This action carries the authoritative detail URL and remains keyboard reachable after row selection.
- Ranking semantics use a real list of buttons plus a labeled live preview region; Escape clears keyboard selection.

## v8.36.23 — Shared Surface Style Authority

- Shared work and command surfaces now have one design-layer-scoped visual owner.
- Removed late, high-specificity command-surface overrides and duplicate base surface declarations.
- Added a regression contract that prevents unscoped or `!important` command-surface ownership from returning.

## v8.36.22 — Responsive Detail Parity

- A default `Table mobileHidden` appears at `xl`; every hand-written compact replacement for that table must therefore remain visible through `xl:hidden`. Hiding the replacement at `md` or `lg` creates an unsupported tablet interval and is a release blocker.
- Purchase Request detail, Purchase Order detail, Roles, and Production Variance now preserve their complete detail authority at phone and tablet widths, then switch once to the technical table at desktop width.
- A repository contract scans application TSX for this mismatched manual-list pattern. Shared `OperationalList` remains the preferred implementation because it already owns the matching breakpoint.

## v8.36.21 — Role-Aware Dashboard Signals

- Each non-outlet Dashboard role receives exactly one compact comparison built only from bounded counters already loaded for that role. Outlet Staff retains its single completion task and receives no executive KPI chart.
- Bars compare counts of records or items only. They never mix currency, quantity, percentage, or truncated recent-list length; a failed source remains Unavailable rather than becoming zero.
- Hover, focus, and touch select the same exact preview. Drill-through is a separate explicit Open action so the first touch does not navigate unexpectedly. The snapshot is labeled request-time because no source-owned refresh timestamp exists.

## v8.36.20 — Production Variance Signal Distribution

- Production variance uses a zero-baseline diverging comparison of under- and over-supply product-outlet row counts. Bar length never compares received, movement, leftover, or wastage quantities across unlike products or UOMs.
- The visual reuses the established conservative signal formula and the current period, outlet, and product scope. Selecting a direction opens that exact signal filter; Balanced and Review manually remain explicit states.
- Hover, touch, and keyboard focus expose the same count and definition. The existing table and phone list remain the numeric detail authority, and the surface continues to state that it does not compare posted production output.

## v8.36.19 — Stock Count Variance Insight

- Stock Count variance insight uses posted lines from the last 30 Kuala Lumpur calendar dates and each count's saved `tolerance_percent`. The list fallback, detail, trend, and rankings must share that same above-tolerance definition.
- Daily and ranked views count high-variance occurrences by shortage/overage direction. They never sum `variance_qty` across items or unlike UOMs. Item preview may show the latest signed quantity only with its source UOM and Stock Count.
- Daily Trend, Repeat Items, and Branches share one compact tabbed surface. Hover, touch, and keyboard focus expose exact values; ranking rows and daily data link to the equivalent Stock Count authority. RPC failure is unavailable, never a valid zero.

## v8.36.18 — Outlet Completion Matrix

- Outlet Daily Records shows a bounded seven-day outlet-by-day completion matrix using record headers only. It reuses the existing Outlet Daily permission and branch scope and does not read product lines for completion state.
- Missing, Draft, Morning Recorded, Evening Completed, Reviewed, and Void remain authoritative distinct states. The UI may group Draft and Morning Recorded as “In progress,” but it must not infer lateness without an approved deadline source.
- Hover, touch, and keyboard focus expose the same outlet-day preview. Existing records open through the persistent preview action; the compact matrix may scroll internally on narrow screens but must not cause document-level horizontal overflow.

## v8.36.17 — Inventory Daily Movement Insight

- Inventory shows one bounded daily comparison of posted inbound and outbound ledger-entry counts for 7 days, 30 days, or the current month. It reads `inventory_daily_summary` through a maximum-31-row RPC and never scans the raw ledger from the page.
- Quantities from different item UOMs are never added together. The chart and preview consistently say “entries,” preserve zero days, and use the Kuala Lumpur report date.
- Hover, touch, and left/right keyboard navigation expose the same date-level values. Each selected date drills to the equivalent inbound or outbound Movement Ledger filter, and an expandable numeric table remains the complete accessible alternative.
- The activity period is controlled once and also scopes the existing production-usage and purchased-item summaries; adjacent cards do not repeat the same filter.

## v8.36.16 — Procurement Variance Insight Layer

- Procurement Variance answers two decisions before the detail table: where review work is concentrated and which linked price differences are largest.
- Status distribution uses the current filtered line population. Price ranking uses the absolute RM difference only for ordering while preserving the signed amount and percentage in the direct label and preview.
- Hover, touch, and keyboard focus expose the same source-document context. Existing technical table and phone comparison rows remain the accessible/detail authority; charts never infer unlinked records or mutate procurement data.

## v8.36.15 — Unified Tablet Filter Surfaces

- Search-first list workspaces use one tablet grammar: the query spans row one; compact filters remain left-aligned on row two; result count and Search/Reset remain a stable right-aligned group.
- The query surface and record surface are siblings. A tablet main-list wrapper must not add another border, background, radius, or shadow around them.
- Opening a Select filter closes More filters; opening More filters closes any Select popover. Only one filter overlay may remain visible.
- Purchase Requests, Goods Receiving, Stock Counts, Stock Card, and Outlet Daily Records are the reference comparison set for filter alignment and surface nesting.

## v8.37.0 - Browser-Native Mobile Canvas

- Phone and tablet routes use document-level scrolling so Safari and Chromium can collapse their browser chrome naturally. A fixed `100dvh` shell with the page trapped inside an `overflow-y-auto` main region is desktop-only.
- The ordinary browser experience must already fill the available canvas and respect `viewport-fit=cover`, the top safe area, and the bottom navigation/action safe area. Installing the OMS is an optional enhancement, never a prerequisite for a usable full-height mobile workspace.
- Desktop at `>=1280px` retains the fixed-height three-region workbench and its independently scrolling central canvas/right console.
- A full-screen sheet or takeover is reserved for focused selection, filtering, or inspection. It must not be used merely to hide weak page composition.
- Movement Ledger and comparable history routes must query a bounded server page. They may not read an entire ledger view and paginate or aggregate it in application memory.

## v8.35.0 - Compact Document Context Closure

- New document headers do not repeat `New [document]` inside the content area; the shared top bar/breadcrumb owns the route title while the document header prioritizes status, branch scope, and workflow context.
- Phone workflow context is a small inline disclosure with a subtle divider, not a full-width nested card. The complete step list remains available through the Workflow sheet.
- Goods Receiving's no-selection state shares one continuous setup surface with its empty state; it must not render a second floating card before a purchase order is selected.

## v8.34.0 - Migration Version Collision Repair

- Supabase migration filenames must have unique numeric versions. A duplicate numeric prefix is a release blocker because `schema_migrations` rejects the later migration and leaves subsequent database changes unapplied.
- When a duplicate is discovered after earlier migrations have already applied, renumber only the unapplied migration to a new forward-only version; never rewrite an already-applied migration.

## v8.33.0 - Compact Mobile Workflow Disclosure

- The shared phone workflow context is an inline-width disclosure, not a full-width banner. Its Step/Workflow trigger stays compact, centered, and bounded by the content width while the full step list remains available in the modal sheet.
- The disclosure keeps status/branch context as the primary header hierarchy and must not add a second tall card or force a document page to scroll just to reach the first field.

## v8.32.0 - Honest Stock Count Removal States

- An unposted Stock Count remains removable when the actor has `stock_count.update` or `stock_count.cancel`; the UI must not imply that it is immutable.
- If removal is unavailable only because of permissions, explain the permission boundary. Reserve the immutable warning for counts that have actually posted to the ledger.

## v8.31.0 - Stock Count Mobile Editing Closure

- Stock Count autosave waits 12 seconds after the latest edit before writing a draft; local recovery remains immediate and visibility/online transitions still flush safely.
- Mobile quantity steppers use a compact 36px control while desktop keeps the 40px control; labels and keyboard focus remain explicit.

## v8.30.0 - Deliberate Mobile Row Opening

- Mobile operational list rows use a deliberate double tap to open a record, reducing accidental navigation while users scroll through dense data.
- Keyboard users retain single-action Enter/Space activation, and explicit action links/buttons inside a row are never intercepted by the row gesture.

## v8.29.0 - Continuous Goods Receiving Surface

- Goods Receiving setup and its no-selection state must read as one continuous surface on phone, tablet, and desktop; do not leave a second floating card separated by a vertical gap when the user has not selected a PO.
- The selected-PO receiving lines remain a separate working surface because they contain the editable operational grid and its own heading.

## v8.28.0 - Current Stock Count Workflow Summary

- Stock Count uses one current workflow: Draft → Confirm & Post. The list summary must show Total, Draft, Posted, and Cancelled; it must not present the retired approval-chain label `In review` as a live state.
- Legacy submitted/reviewed/approved rows remain readable and are counted under Draft for operational triage, but they are not promoted into filters or new workflow actions.

## v8.27.0 - Bounded Autosave Recovery

- Stock Count autosave writes the local recovery snapshot immediately, then waits for the deliberate idle window before sending a server write.
- Retryable server failures are retried at most three times per edit revision. After that, the form stops retrying and keeps the local snapshot for manual Save draft recovery.
- A successful save resets the retry budget; a new edit revision gets its own bounded retry budget.

## v8.26.0 - Unposted Deletion Policy

- Every operational document must offer one clear destructive exit while it is still unposted: `Delete draft` / `Delete unposted …`.
- Delete and cancel are soft-removal operations for unposted work: the row, document, and activity history remain auditable, while `deleted_at` removes it from active queues.
- Posted or ledger-impacting records remain immutable and must use a correction/return workflow.
- Stock Count cancellation is reasserted by migration 124 so older deployments cannot resurrect cancelled autosave drafts in active lists.

## v8.25.0 - Local Visual Audit Environment

- Local multi-viewport audits may load a user-provided environment file through `TEST_ENV_FILE`; credentials stay outside the worktree and are never copied into source control.
- A visual audit is only considered passed when the authenticated fixture initializes successfully. Skipped tests caused by missing local data are reported as unverified, not as passing.

## v8.24.0 - Dashboard Hierarchy Closure

- Dashboard panels reuse the flat shared surface and compact heading scale; KPI icons are square interior tiles, not status pills.
- Dashboard action hierarchy stays readable across phone, tablet, and desktop without oversized page titles or decorative panel shadows.

## v8.23.0 - Shared Shell Elevation Cue

- Persistent mobile action bars and create FABs may use a restrained directional shadow so users can distinguish fixed controls from scrolling content.
- Shared rails and workspace surfaces remain neutral and flat: no decorative gradients, oversized radii, or blur overlays. Interior controls stay at the 2px compact radius.

## v8.22.0 - Unposted Purchase Request Removal

- Purchase Requests may be removed from active work while they are still unposted: Draft, Manager Review, Purchasing Review, Finance Review, and Ready to Convert.
- The action is a single `Delete unposted request` control. It soft-deletes the active row, marks the linked document cancelled, and records the original workflow state in activity history.
- Posted or converted records remain immutable because they may have supplier, stock, or accounting impact. Their correction path is cancellation/return/correction, not physical deletion.

## v8.21.0 - Unposted Removal Route Guard

- Removing an unposted operational record accepts either its edit permission or its cancellation permission. Users must not be trapped by an autosave-created draft merely because their role can cancel but not edit it.
- Posted or ledger-impacting records remain immutable; deletion preserves the audit boundary and must route users to a correction workflow instead.
- Once an unposted record is removed from active work, its operational detail route must no longer reopen it from a stale URL; history remains available through the audit/activity surfaces.

## v8.20.0 - Unposted Delete Permission Alignment

## v8.19.0 - Deliberate Stock Count Autosave Window

- Stock Count server autosave waits for **6 seconds of idle time** after an edit. The local recovery snapshot still writes immediately, so a longer server debounce reduces disruptive draft writes without sacrificing recoverability after refresh, logout, or network interruption.

## v8.18.0 - Compact Stock Count Steppers

- Stock Count phone quantity steppers use a compact 40px control geometry so the item title, code, variance, and quantity remain visible together. The buttons retain explicit accessible labels and keyboard focus treatment; this is a compact control adjustment, not a removal of the quantity affordance.

## v8.17.0 - Search-First Filter Ordering

- On phone filter rows, Search follows the useful dropdown controls and the result summary comes last. A multi-filter row must never read as search + Search while its filters wrap invisibly below; compact one-filter rows retain their intentional inline arrangement.

## v8.15.1 - Global Unposted Deletion Contract

- Every operational document detail must expose one explicit Delete draft/Delete unposted action before posting. The action may call an audited cancellation RPC, but it must set `deleted_at`, preserve the audit trail, release eligible reservations, and remove the row from active work.
- Posted or ledger-impacting records remain immutable; their destructive affordance must explain the boundary and point to correction.

## v8.15.0 - Direct Draft Deletion

- Stock Count drafts expose the dedicated audited **Delete draft** action directly. They do not route the user's discard intent through a visible Cancel action, so an autosave-created draft can be removed immediately and cannot remain as active work after redirect.
- Posted counts remain immutable and retain their audit history. The delete control explains the ledger boundary instead of acting as a dead end.

## v8.11.0 — Unposted Cancellation Consistency (superseded by v8.13.0 wording)

- **One destructive exit for unposted work:** Goods Receiving, Purchase Return, Production Job, Stock Transfer, Stock Wastage, Purchase Request, Purchase Order, and Stock Count drafts/unposted records use an explicit `Delete draft` or `Delete unposted …` action. The action performs the permission-aware atomic transition, releases any applicable reservation, sets `deleted_at`, keeps the audit/document history, and returns to the module list.
- The underlying transition may still use a cancellation status for audit semantics, but the UI must describe the user's intent: removing unposted work. Posted, received, completed, or ledger-impacting records remain protected and explain the correction path instead.
- **Cancellation must not leave active work:** a cancelled unposted record may remain in audit/history tables, but it must not remain in active list queries or reopen in an autosave editor after redirect.

## v8.12.0 — Deliberate Stock Count Autosave

- Stock Count writes wait for **6 seconds of idle time** after an edit, so rapid physical entry does not create a draft on every small interaction. The local recovery snapshot is written immediately and remains the source of truth while the server save is pending or retrying.

## v8.10.0 — Remove Unposted Procurement Work

- **Global cancellation rule:** Draft/unposted Purchase Requests and Purchase Orders expose one clear destructive exit: **Delete draft/Delete unposted order**. The atomic cancel RPC runs the existing state/permission workflow, removes the record from active work with `deleted_at`, and preserves the document/activity audit trail.
- **External commitment boundary:** Sent, partially received, received, converted, and posted records remain visible and auditable; cancellation never erases supplier or ledger history.

## v8.09.0 — Clarify Draft Count Removal

- Stock Count drafts expose one destructive exit: **Delete draft**. It soft-deletes the unposted count, retains the document/activity audit trail, and returns to the list so autosave cannot resurrect it.
- Posted counts remain immutable. Their delete affordance explains the audit boundary and offers correction guidance instead of a dead-end action.

## v8.08.0 — Remove Unposted Work Safely

- **Unposted work deletion rule:** Draft/unposted Goods Receivings, Purchase Returns, Production Jobs, Stock Transfers, Stock Wastage, and Stock Counts may be deleted by the existing cancel permission. The action is transactional: release any reservation, retain document/activity history, set `deleted_at`, and remove the record from active work lists.
- **Posted record protection:** Records that have posted ledger movements remain immutable. They show a clear correction/return workflow instead of a misleading delete action.
- **After deletion:** Redirect to the module list so autosave/editor state cannot resurrect a cancelled record.

## v8.07.0 — Compact Dashboard Action Labels

- Stock Counts remain deletable while unposted; posted counts remain the immutable audit boundary.
- Cancelling a draft immediately returns the user to the Stock Counts list so the autosave editor cannot remain mounted and recreate stale work.
- Cancellation soft-deletes the unposted count from active work while retaining the document activity log; posted inventory history is never deleted.
- Dashboard payables actions use an explicitly compact label scale so secondary links do not compete with the metric hierarchy.

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

The OMS uses one continuous high-density ledger language across phone, tablet, and desktop. Responsive layout changes information density and placement; it must not change semantic color meaning or interaction vocabulary. Current geometry, elevation, and density tokens are defined by `docs/DESIGN_SYSTEM.md`; older square-surface rules below are historical defaults, not authority for new work.

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

- Every list workspace uses two sibling surfaces at every viewport: a query/filter card and a separate content card. Never nest the content table inside the query card.
- Desktop and tablet query controls are 44px high. Search may be wider; date, select, More filters, and the primary Search/Reset action use shared control dimensions. Records stay beside the right-aligned action.
- Phone list headers keep the primary search/date control with the green Filter action. Secondary filters live directly in the shared sheet; never add another nested More filters disclosure inside that sheet.
- Dense operational tables may stack closely related values in one column (for example Wastage over Wastage %) and render timestamps as date over time.
- Role dashboards do not repeat bottom-navigation destinations as a second mobile quick-action group. Sparse role content expands across the available workspace instead of leaving an artificial empty column.
- Right-console action buttons are 44px high and center-aligned. Page-specific action alignment overrides are not allowed.

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

- **Supply ownership is explicit:** Outlet access and operational rollups derive from a dated Central Kitchen → Outlet route, never from branch-name guesses in application code. A route must stay within one company and link a `central_kitchen` source to an `outlet` destination.
- **Qty Sent is never inferred as fact:** A new daily record leaves Qty Sent unknown until an authorized Kitchen or Office actor confirms it. Outlet Received may create a separately stored estimate for reconciliation, but must never prefill or overwrite formal Qty Sent. Every persisted sent value carries provenance and a confirmation flag.

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
- Phone document workflow status is a compact secondary disclosure, not a full-width banner: use an inline-width container capped by the available content, keep its trigger at 32px, and open the full workflow only on request.
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

- Stock Count details keep Save draft and Confirm & Post as the primary action pair; the explicit Delete draft action remains inside collapsed More options to reduce accidental destructive actions and visual noise.
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
## v8.13.1 — Deletion rule alignment

- Every document detail surface must expose a clear `Delete draft` or `Delete unposted …` action while work has not posted inventory or accounting impact.
- This action removes the record from active work through the existing audited cancellation/removal RPC; it must not hard-delete activity history.
- Posted records remain immutable. Their destructive control explains the accounting boundary and points to a correction workflow instead of silently failing.
- Do not label an action `Cancel & remove` when the user intent is to discard an unposted draft; the visible label must say `Delete` and the pending state must say `Deleting`.
- A one-time forward-only backfill may set `deleted_at` on legacy rows already in a cancelled terminal state so they stop appearing in active lists; it must not delete rows or alter posted ledger data.

## v8.36.0 — Explicit Stock Count Cancellation

- Autosaved or manually saved Stock Counts that have not posted inventory expose an explicit, confirmation-protected `Cancel stock count` action in the shared More options area.
- Cancellation removes the count from active work while preserving its audit history; it does not create a ledger movement and does not replace the separate `Delete draft` control.
- Posted counts remain immutable. The primary action pair stays limited to `Save draft` and `Confirm & Post Count`; destructive actions remain secondary to reduce accidental taps.
# v8.37.6 — Completion Matrix and Filter Geometry Refinement

- Outlet Daily's seven-day matrix keeps a fixed identity column while the date cells scroll in a bounded work surface; tablet users receive an explicit horizontal-scroll cue and the document itself never widens.
- Report and date-first operational filter toolbars may opt into balanced tracks so query, filters, More filters, and the terminal action share one deliberate geometry without changing legacy compact list behavior.

# v8.38.0 — Phone Search Surface Evolution

- Phone list routes (`max-width: 639px`) use the shared `UnifiedListHeader`: one 44px search control, one icon filter trigger, and the result total. Search submits from its own form after the short debounce; it must never submit an unrelated form on the page.
- Phone-only filters open a full-viewport backdrop and bottom sheet above the mobile navigation. The backdrop owns `z-index: 100`, the sheet owns `z-index: 101`, and both include the safe-area inset. Reset and Apply remain visible while filter fields scroll.
- Tablet (`640px–1023px`) and desktop keep the practical inline filter controls and right action rail. They do not receive the phone drawer or its icon-only replacement unless a route explicitly documents a different task surface.
- This is a responsive presentation change only. Filter names, query parameters, authorization, Supabase data sources, and server-side pagination remain unchanged.
- A shared control may evolve when viewport evidence demonstrates a real comprehension or density defect. New rules supersede earlier historical notes; the newest section is authoritative for future implementation.
# Iterative polish, not aesthetic rollback

- A UI closure pass preserves the established visual language: intentional panel radii, restrained depth, quiet motion, and decorative brand details remain valid. Do not remove them merely to make a screen flatter or more minimal.
- Fix structural defects first: duplicated containers, broken alignment, wasted height, wrapping context, inconsistent control geometry, hidden actions, and responsive overflow.
- Reduce card nesting only when two surfaces communicate the same hierarchy. A meaningful action rail, section surface, or elevated mobile action bar may retain its own surface treatment.
- Reuse an existing shared pattern before adding page-specific styling. When a recurring pattern is corrected, update its owning shared component or token and verify every known consumer.
- Mature product patterns are references, not replacement themes. Adopt proven information architecture and interaction behavior without importing a new aesthetic, motion system, radius scale, icon set, or business workflow.
- User annotations are problem evidence, not automatic implementation specifications. Preserve their intent, test the proposed solution against permissions, data semantics, accessibility, and all supported breakpoints, then record the final rule.
# Release version discipline

- Every completed product/UI closure increments the application patch version.
- Keep `package.json`, the root package entry in `package-lock.json`, and `src/lib/app-version.ts` synchronized.
- Navigation and authentication footers display only the concise `vX.Y.Z`; release titles belong in release notes, not narrow rails.
# v8.36.3 — Shared List Surfaces and Role-Aware Daily Entry

- Every operational list separates its query controls from its result content. The query card may contain two internal rows on compact tablets; the table, operational rows, pagination, and empty state belong to a separate content card.
- At `640px+`, search is the only elastic field. Filter controls, More filters, and the terminal Search/Reset action share a 44px height and an 8rem width. The result count sits immediately left of the far-right action.
- At phone widths, `UnifiedListHeader` remains one 44px search plus a green Filter trigger and a visible result count. The list or empty state starts on a separate surface below it.
- Outlet Daily exposes one primary action determined by capability and workflow state: kitchen confirms Qty Sent; outlet entry completes Received/Wastage. Save Draft and privileged stage-only actions remain secondary.
- Outlet Daily reserves a conditional desktop detail column for wastage reason and remarks. On tablet, those two controls share the row beginning under Qty Sent. Remarks remain collapsed behind the comment affordance until requested.
- New-document mobile context is sticky and becomes denser after scrolling. It keeps status, date, location, and workflow orientation without repeating those values in the collapsed Record setup summary.
- The current visual language remains authoritative: 12px panels, 8px controls, restrained shadows, and existing motion. Structural convergence is not permission for an aesthetic reset.

# v8.36.4 — Procurement List Surface Convergence

- Purchase Orders, Goods Receiving, Purchase Returns, Supplier Invoices, Suppliers, Purchase Requests, Production Jobs, and Outlet Daily Records use the same two-surface list structure: one independent query card followed by one independent content card.
- `UnifiedListHeader` owns phone, tablet, and desktop geometry. Search remains elastic; filters and the terminal Search/Reset action use the shared 8rem width at `640px+`; every visible query control renders at 44px high.
- Result count remains immediately left of the far-right Search/Reset action. Query controls never inherit table overflow or appear vertically attached to table headers.
- `MasterDataFilters` delegates its responsive presentation to `UnifiedListHeader`; master-data routes must not maintain a parallel desktop filter implementation.

# v8.36.5 — Unified List Surface Contract

- Every record list uses two sibling surfaces: one query card and one content card. Never nest the query card inside the table/content card.
- Desktop query controls are 44px high. Filters and actions use a consistent 8rem width; search may be wider but is capped at 250px when desktop space permits.
- Query inputs, selects, status controls, and More Filters use a white surface. The primary Search/Reset action remains Seri Bako green.
- On mobile Outlet Daily creation, the sticky context header carries status and workflow only. Record setup owns the live location and date summary so the same context is not repeated twice.

# v8.36.7 — Compact Document Editing Contract

- New-document phone headers show the document title and status without repeating branch or date. Location and date belong to the collapsible details/setup surface immediately below the header.
- Mobile workflow triggers use the concise `Step X of N ›` label. The sheet title and accessible label carry the word “workflow”; the compact trigger does not repeat it.
- Repeating item editors use one numbered item-search row followed by one aligned quantity, UOM, and comment row. Controls share one height and the established 8px control radius.
- Stock Count setup reuses the collapsible document-details pattern. Its closed summary exposes branch and date; its expanded content keeps date/autosave cards and settings readable as two rows on compact tablets.
- Mobile document action rails use explicit grid slots. Status text may shrink and wrap by phrase, but action buttons never force status words into vertical single-character columns. Rails retain safe-area padding and the established elevated shadow.

# v8.36.9 — Tablet Stock Count Control Recovery

- Dense quantity steppers must allow the numeric input to shrink inside its grid column while preserving both 40px decrement and increment controls. A minimum input width must never clip either action.
- Fixed document action rails are phone-only (`<768px`). Tablet and desktop layouts use their contextual right-side primary action and must not render a duplicate bottom action rail.

# v8.36.10 — Responsive Contract Closure

- Stock Count regression coverage includes the exact 820px portrait-tablet viewport in addition to phone, compact tablet, and desktop widths.
- Tablet verification checks rendered behavior rather than DOM absence: the phone action rail may remain mounted but must be hidden, while both stepper actions remain visible and inside the viewport.
- Shared UI contract tests assert durable interaction semantics and explicit data ownership instead of brittle Tailwind class ordering. Outlet Daily must keep its three quantity inputs aligned, default a newly activated wastage reason to `unsold`, and expose remarks through the labeled comment action.

# v8.36.13 — Tablet Work-Surface and Form Surface Closure

- A route with contextual actions uses the shared tablet split by default. At `768px–1279px`, its query controls may wrap as complete groups when the right rail reduces usable width; search keeps a readable 12rem minimum and must never collapse to icon width.
- Routes use one `FilterBar`/`UnifiedListHeader` instance across phone, tablet, and desktop. Do not render parallel hidden mobile and desktop filter trees.
- New purchase returns, supplier invoices, recipes, stock transfers, and wastage records keep one explicit outer work surface. Inner sections communicate a distinct task only; they do not recreate a card around the same form.
- Collapsible setup surfaces expose one Expand/Hide control and keep all setup fields together. A second hidden “more details” disclosure inside the setup is not allowed.
- Line-level remarks use a message action on the item title row and render the remarks field only after activation. Availability/read-only metric blocks use the shared control radius.
- Purchase Request CSV export opens a selection dialog. User-selectable columns are restricted by a server-side allowlist before the database query is built.

# v8.36.14 — Evidence-Driven Responsive Release Gate

- Every customer-facing static workspace is audited at phone (390×844), portrait tablet (820×1180), landscape tablet (1180×820), and desktop (1440×900) before a UI release. Dynamic record routes use seeded IDs in their separate route audit; a skipped or stale-fixture route is unverified, never a pass.
- The release gate rejects document-level horizontal overflow, interactive controls outside the viewport, ordinary labels collapsed into narrow vertical single-character columns, fixed action rails separated from the viewport bottom by a duplicated safe-area inset, and floating controls whose background becomes transparent because a design token is undefined.
- Repeating mobile item editors use explicit named grid regions. Item search owns the first row; quantity, UOM, and the comment action share the second row. A broad selector may not replace a component's grid template or reset its child placement.
- Screenshot evidence must come from a clean `.next-playwright` cache and a clean evidence directory. Old screenshots or a reused build cannot be accepted as current verification.
- New features must pass the existing responsive route matrix before they are considered complete. A feature change does not authorize weakening, hiding, or removing an established responsive contract.
## v8.37.0 — Progressive Report Preview Surfaces

- AP Aging and Production Variance now use the same progressive preview behavior as the other report charts: the exact-value surface is announced accessibly but does not reserve visual height until a bucket or signal is selected.

## v8.37.1 — Progressive Inventory Movement Preview

- Inventory Daily Movement now keeps its exact-date detail collapsed until a date is hovered, focused, or tapped. The chart remains compact at rest, while keyboard, pointer, touch, and same-date ledger drill-through behavior stay available after selection.

## v8.37.2 — Report Preview Surface Consistency

- Report previews now share the same token-based control radius, soft border, and muted surface when selected. This keeps Production Variance, Inventory Movement, Aging, ranking, and line-chart previews visually aligned without changing their data or drill-through behavior.

## v8.36.99 — AP Aging Mobile Empty-State Hardening

- AP Aging Supplier Exposure now renders an explicit mobile empty state when no supplier has an open positive payable balance; an empty mobile list is no longer mistaken for a hidden or unavailable report.

## v8.36.98 — Report Preview and Mobile Density Refinement

- Ranking previews now show an explicit ordinal, keep their progressive preview closed until a row is hovered, focused, or tapped, and retain the same keyboard and touch drill-through behavior.
- Demand Trend metrics use the shared two-column phone strip, three-column tablet strip, and six-column desktop strip; Product Margin mobile rows combine supporting values into two compact lines.

## v8.36.97 — Operational UI Density and Shared Surface Convergence

- Dashboard attention copy uses a compact product type scale and role charts no longer repeat the same low-stock exception already present in Operational Pulse and Exceptions.
- Outlet Daily completion previews are interaction-first: the matrix is compact at rest and exact record detail appears on hover, focus, click, or touch. Coverage remains available as a concise disclosure.
- Master-data action rails use one icon vocabulary, query controls share a deliberate desktop width, Stock Transactions places active filters directly below the query surface, and Low Stock no longer wraps the procurement queue in a duplicate outer card.
- PR basket controls are denser on tablet/desktop, tablet rails may claim a wider task column, and purchase UOM is selectable in both Stock Balance and Low Stock procurement flows.
- Unavailable Stock Count variance reads as unavailable rather than resembling a zero result.
