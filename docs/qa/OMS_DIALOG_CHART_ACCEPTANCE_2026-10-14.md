# Dialog and chart acceptance supplement — 2026-10-14

Scope: isolated localhost3190 browser contexts, Synthetic Release Review only. No deployment, production data, user Chrome, or external upload. Existing 123-route captures are evidence of specified states only.

## Inventory counts

The existing route matrix has **123 routes × 9 state categories = 1,107 cells**. **544 have substantive recorded runtime evidence; 563 remain incomplete or partial**. The latter includes 15 native-validity-only error cells and 24 editable-input-only long-content cells, not verified backend/long-layout coverage. This is an evidence inventory, not a claim that all 563 states are applicable or defective.

| State | Incomplete / partial cells |
| --- | ---: |
| Expanded custom / applicability unclassified | 94 |
| Loading | 118 |
| Empty | 109 |
| Error | 121 (106 untested + 15 native-only) |
| Long content | 121 (97 untested + 24 input-only) |

Default, narrow320/390, tablet820 and native200% each have 123 recorded captures. They are historical coverage, not newly rerun after this patch. The JSON inventory enumerates every pending route/state and **37 source files containing custom/native dialog instances**, with transitive route ownership. Shared implementations do not prove every conditional dialog instance.

## New synthetic populated chart evidence

`planning-history-states.json`: **7/7 passed**: production evidence at1440/320/720 CSS pixels plus held loading/recovery, network failure/retry, controlled empty history and a deliberately long unbroken product label. The 720 case is a narrow-layout check, not native zoom. Real DB history contains five completed records, four provided wastage observations, one deliberately missing wastage flag, and gaps across56 days. Keyboard Home/End/Arrow selection, pointer selection, metric switching, missing points and parent Escape passed. Raster screenshots were visually inspected at320 and SVG viewBox matches rendered size after ResizeObserver settles.

`additional-dialog-states.json`: asset maintenance and exception charts pass **6/6 cases** atdesktop1440, phone320 and native200%; includes actual null gaps, accessible previews and pointer/keyboard selection.

Seed creates one2026-11-01 draft and five2026-10 history records after asserting the company name and identity ownership. It does not update existing records or alter forecast business policy. `chart-fixture.json` records identities and dates. Seed is intentionally one-shot: repeated insertion fails rather than overwriting.

## Defects fixed and verified on the rebuilt local server

1. Production adjustment input autofocus ran before ModalShell captured its trigger. Escape closed the dialog but lost focus at all3 sizes. Removed local `autoFocus`; ModalShell still focuses the first field and can now capture the trigger.
2. List create-FAB mode hid both the secondary action trigger and its sheet. PR/Outlet Daily also explicitly hide the full mobile rail while using a page-header FAB, so the compact secondary trigger must be independent of that full-rail flag. PR/Outlet Daily/Stock Count exports were unreachable atphone320 and native200%. Added a compact More actions button beside the existing FAB; the existing sheet omits the primary creation action. Parent sheet no longer consumes keyboard events belonging to a nested dialog.

Four additional regression tests exercise primary removal/export preservation and actual nested Escape handler ownership, real keyboard/loading visibility and list pages whose full mobile rail is hidden. Existing mobile/FAB/tablet tests pass. Final rebuilt browser run: **31/31 cases passed**, comprising18dialog cases,6asset chart cases and7planning chart cases. `additional-dialog-states.json` checks six dialog owners (supply period, global search, production adjustment, PR export, Outlet Daily export and Stock Count export) atdesktop1440/phone320/native200%. Keyboard containment/inert background, Escape, trigger focus return and horizontal bounds passed. Native browser chrome/BODY focus is allowed only while outside page controls remain inert. Final screenshots were visually inspected; no product UI preview attributes were introduced.

3. A deliberately long unbroken product label overflowed the planning evidence dialog at320. Added minimum-width/wrapping constraints to its title and kept Close fixed-size.

## Remaining scope that this supplement does not close

- Per-instance states for the37 dialog source files listed below, beyond explicitly listed runtime evidence. Submission failure retention is owned by main/form workers; no blanket success is claimed here.
- Packaging-specific cases are now closed by the 12-case supplement below. Other report owners and unexercised business dialog contents remain separate.
- Route matrix563 pending/partial cells need applicability classification and targeted per-owner fixtures; this supplement does not silently promote them through shared-component reuse.
- Physical iOS/Android keyboard/viewport and printer behavior require devices. All other items above remain locally possible; no additional human approval is technically required.

## Dialog source ownership inventory

- `src/components/purchase-request-line-resolution-form.tsx` — `/purchase-requests/[id]`
- `src/components/stock-count-line-recovery.tsx` — `/stock-counts/[id]`, `/stock-counts/new`
- `src/components/production-planning-workspace.tsx` — `/production/planning`
- `src/components/bulk-phase-one-delete.tsx` — `/purchase-requests`
- `src/components/outlet-daily-export-dialog.tsx` — `/outlet-daily-records`
- `src/components/purchase-order-export-dialog.tsx` — `/purchase-orders`
- `src/components/purchase-request-line-recovery.tsx` — `/purchase-requests/[id]`
- `src/components/bulk-selection.tsx` — `/branches`, `/purchase-requests`
- `src/components/add-purchase-request-line-dialog.tsx` — `/purchase-requests/[id]`
- `src/components/production-planning-allocation-table.tsx` — `/production/planning`
- `src/components/stock-count-form.tsx` — `/stock-counts/[id]`, `/stock-counts/new`
- `src/components/session-timeout-provider.tsx` — shared/global or no direct page owner in historical matrix
- `src/components/stock-count-void-dialog.tsx` — `/stock-counts/[id]`
- `src/components/stock-count-scope-actions.tsx` — `/stock-counts/[id]`
- `src/components/asset-unsaved-guard.tsx` — `/asset-management/assets/[id]`, `/asset-management/assets/new`, `/asset-management/locations/[id]`, `/asset-management/maintenance/[id]`, `/asset-management/maintenance/new`, `/asset-management`, `/asset-management/transfers/[id]`, `/asset-management/transfers/new`
- `src/components/purchase-request-export-dialog.tsx` — `/purchase-requests`
- `src/components/document-action-bar.tsx` — `/goods-receivings/[id]`, `/production/jobs/[id]`, `/purchase-orders/[id]`, `/purchase-requests/[id]`, `/purchase-returns/[id]`, `/stock-counts/[id]`, `/stock-transfers/[id]`, `/stock-wastage/[id]`, `/supplier-invoices/[id]`
- `src/components/production-planning-product-rules.tsx` — `/production/planning`
- `src/components/stock-count-export-dialog.tsx` — `/stock-counts`
- `src/components/attendance/actual-attendance-panel.tsx` — `/attendance/review`
- `src/components/attendance/comp-time-correction-form.tsx` — `/people/[id]`
- `src/components/attendance/people-workbook-export.tsx` — `/attendance/review`
- `src/components/attendance/review-actions.tsx` — `/attendance/review`
- `src/components/attendance/employee-attendance-summary.tsx` — `/attendance/review`
- `src/components/attendance/ot-ro-actions.tsx` — `/attendance/review`
- `src/components/attendance/schedule-planner.tsx` — `/attendance/schedule`
- `src/components/attendance/schedule-workbook-import.tsx` — `/attendance/schedule`
- `src/components/ui/date-range-picker.tsx` — `/outlet-daily-records/insights`
- `src/components/ui/danger-confirm-form.tsx` — `/branches/[id]`, `/goods-receivings/[id]`, `/items/[id]`, `/production/jobs/[id]`, `/products/[id]`, `/purchase-orders/[id]`, `/purchase-requests/[id]`, `/purchase-returns/[id]`, `/recipes/[id]`, `/staffs/[id]`, `/stock-counts/[id]`, `/stock-transfers/[id]`, `/stock-wastage/[id]`, `/supplier-items/[id]`, `/suppliers/[id]`, `/uom-conversions/[id]`
- `src/components/ui/destructive-action-dialog.tsx` — `/account`, `/company`, `/documents/[id]`, `/goods-receivings/[id]`, `/outlet-daily-records/[id]`, `/production/delivery-orders/[id]`, `/production/jobs/[id]`, `/purchase-orders/[id]`, `/purchase-requests/[id]`, `/purchase-returns/[id]`, `/recipes/[id]`, `/stock-counts/[id]`, `/stock-transactions/[id]`, `/stock-transfers/[id]`, `/stock-wastage/[id]`, `/supplier-invoices/[id]`, `/supplier-items`, `/uom-conversions`
- `src/components/ui/confirm-action-form.tsx` — `/production/jobs/[id]`, `/purchase-orders/[id]`, `/purchase-requests/[id]`, `/stock-counts/[id]`, `/supplier-invoices/[id]`
- `src/components/ui/reject-action-form.tsx` — `/purchase-requests/[id]`
- `src/components/ui/native-dialog.tsx` — `/attendance/review`
- `src/components/search/global-search.tsx` — shared/global or no direct page owner in historical matrix
- `src/components/documents/receiving-post-guard.tsx` — `/goods-receivings/[id]`
- `src/components/documents/attachment-required-action.tsx` — `/purchase-orders/[id]`
- `src/components/documents/attachment-remove-action.tsx` — `/documents/[id]`, `/goods-receivings/[id]`, `/outlet-compliance/[branchId]`, `/outlet-daily-records/[id]`, `/production/jobs/[id]`, `/purchase-orders/[id]`, `/purchase-requests/[id]`, `/purchase-returns/[id]`, `/recipes/[id]`, `/stock-counts/[id]`, `/stock-transactions/[id]`, `/stock-transfers/[id]`, `/stock-wastage/[id]`, `/supplier-invoices/[id]`

## Archived deliverables

Evidence JSON plus representative synthetic screenshots are copied into `docs/qa/evidence/2026-10-14/`. Reproducible probes: `scripts/integration/verify-additional-dialog-states-local.cjs`, `verify-planning-chart-local.cjs`; synthetic-only seed: `seed-chart-browser-local.cjs`. Targeted existing/new mobile regression tests and scoped ESLint passed. Full-suite/build gates are owned by the main integration task. No commit, push or deployment was performed by this worker.


## Packaging follow-up: 12/12 verified after rebuild

`packaging-chart-states.json` records nine cases at1440/320/720 CSS pixels (populated keyboard/pointer, populated→empty→populated, long unbroken outlet names) plus three cases at390 (held period-loading then recovery preserving outlet, RPC error then Retry, whole empty report). All12 passed on the rebuilt app. The720 case is responsive width, not native zoom. Phone320 screenshot was visually inspected. Long labels previously clipped at all3 widths; wrapping and minimum-width constraints were added only to the three affected outlet-label locations in `outlet-packaging-report.tsx`. Existing Packaging regression suite passed5/5.

These are real app render/navigation tests with a test-only read transport fixture on localhost3191. The preload intercepts only the local58321 `get_outlet_packaging_report` RPC and supplies synthetic rows; it performs no database seed/write and does not prove SQL aggregation accuracy. Other traffic retains its normal owner. Server3190 was untouched. Reproduction: `packaging-ui-server.cjs`, `packaging-read-fixture-preload.cjs`, `verify-packaging-chart-local.cjs`; fixture and screenshots archived beside the resultJSON. The earlier31-case acceptance is preserved; this adds12 (43 total explicitly exercised cases in this supplement), not a fresh rerun of all31.

## Bounded owner classification

`state-owner-classification.json` supplements, without rewriting, the historical matrix. Seven pure compatibility redirects have no independent expanded/loading/empty/error/long-content view (35 content cells N/A); `/activity` and `/reports` have no local expandable content (2 more N/A). Routing and shared shell remain separately applicable. This leaves116 independent page owners;563 historical pending cells must not be interpreted as563 distinct tests.

The37 dialog-source records are retained for traceability: six named dialog owners have runtime contract evidence above; `native-dialog` is a shared primitive, not another business content scenario. Other conditional contents are not granted success by sharing ModalShell. The28 fallback source owners are listed once each; generic layout loading/error reuse does not establish route-specific fetch/retry behavior.

Historical chart owner families initially lacking populated runtime evidence (now closed by OMS_BUSINESS_CHARTS_2026-10-14.md and OMS_COSTING_CHARTS_2026-10-14.md): (1) Outlet Daily wastage, (2) Demand trend/ranking, (3) Inventory movement, (4) Procurement variance, (5) Production variance signal, (6) Costing readiness, (7) Recipe costing/product margin, (8) Stock Count variance. Reconcile main-thread report-specific evidence before scheduling additional work. For these, focus on bespoke data transforms, selected detail/links, empty transitions and data-derived labels; do not repeat shared keyboard mechanics per route. No new universal pass claim is made.


## Remaining document dialog batch: 10/10 verified

`remaining-dialog-owners.json` records five real dialog branches at1440 and320: Stock Count Add Item, Replace Item, Remove Line, Retire Item, and Purchase Order Export. Checks include unmatched item search and disabled Add, required reason validity, long editable reason retention, unchecked/checked destructive confirmation gate, eight keyboard Tab steps contained in each dialog, Escape, horizontal bounds, and simulated export503 retaining the dates/dialog. No business submission occurred; blocked mutation count is0. The phone320 remove confirmation screenshot was visually inspected. This is10 new cases (53 explicit cases across this supplement), not submission/backend coverage or native200% coverage for these new owners.

Two probe failures were corrected without application changes: the first Add probe pressed Escape before measuring; a dynamic last-dialog locator selected the parent action sheet after the export modal closed. Final assertions use stable aria-labelledby identity. Two originally proposed menu actions are genuinely unreachable: `ItemCorrectionSuggestionDialog` and `BranchStockCountSettingDialog` have definitions but no imports/usages anywhere in src. Their expanded UI cases are N/A for current routes, not runtime-passed.

### Historical conditional prerequisites — closed by the follow-up below

- Stock Count Void: requires posted count, stock_count.cancel permission and preview_stock_count_void RPC fingerprint/ledger reversal preview. Existing inspected count is draft. The actual confirm/reverse transaction is not covered by these read-only dialog cases. A guarded local posted-count fixture can close this; no external business approval is intrinsically required.
- Legacy Stock Count review mode: requires submitted/reviewed/approved status plus revisionsAvailable and stock_count.post. Draft Replace/Remove is covered above; legacy proposal mode is not.
- PR line repair/Add Line: requires manager_review/admin_review, manager/purchasing permission and role, recoveryAvailable, canonical supplier, item/supplier mapping catalogs and branch. Inspected PR is draft. Requires a guarded local review-status fixture, not an arbitrary change to this shared draft.
- PR unresolved-line resolution additionally requires a matching unresolved line and purchasing preparation status.
- GRN missing-DO post guard requires draft+grn.post and absent delivery-order attachment. Inspected route did not expose the posting action. A controlled eligible receiving fixture is needed; backend post/attachment failure retention must remain separate from generic modal mechanics.
- Account Remove Picture requires an existing avatar; inspected synthetic account has none. Global session timeout modal requires controlled idle/session clock. Neither is an external blocker; both are still local fixture work if in acceptance scope.

These are precise fixture gaps, not verified failures, not requests for user approval, and not a claim that every local owner has been exhausted. Other parent-owned form/attendance evidence should be joined before scheduling duplicate coverage.


## Conditional document fixture follow-up

The earlier fixture gaps were progressed locally, without changing original fixtures. `seed-conditional-dialogs-local.cjs` asserts the Synthetic Release Review company and clones four documents: a posted Stock Count, legacy submitted Stock Count, admin_review PR plus one unresolved line, and draft GRN without DO attachment. IDs are in `conditional-dialog-fixture.json`. Posted count intentionally has zero adjustment ledger entries; the actual preview RPC returns its fingerprint and zero totals. This verifies the Void dialog/gates, not reversal transaction correctness.

`verify-conditional-dialogs-local.cjs` exercises eight dialog owners at1440/320: Void, legacy proposal, PR repair/remove, PR Add Line, unresolved match, missing-DO guard, avatar removal, and idle warning. Avatar uses a separate3191 server's guarded read-only staff response hook (synthetic company only), without changing stored avatar/account data. Idle uses Playwright clock to reach25-minute warning and verifies initial Stay focus and successful dismissal. PR match selects a mapped item and remains disabled until the confirmation checkbox. All business requests are blocked; no attempted business writes occurred.

Fourteen cases passed before the final GRN repair. The remaining two exposed real hidden-file-input overflow: shared visible Input dimensions combined with sr-only grew the modal scroll area32px. The owner now uses native input with existing label association, required/accept/onChange validation intact. AST regression+related tests5/5, scoped ESLint and strict TypeScript pass. Final two GRN rebuilt browser checks are recorded in the final evidence merge below when complete. This follow-up does not claim runtime server-error submissions or actual Void/post/match effects.


Final rebuilt GRN verification: **2/2 passed**, including file selection updating the associated visible label, required exception reason, long text, width bounds and Escape. Neither file upload nor posting was submitted. `conditional-grn-final.json` preserves this rerun; `conditional-dialog-merged.json` joins the14 previous passing conditional cases with these2, yielding **16/16**. Phone320 final GRN screenshot was visually inspected. Total explicit cases in this supplement are now **69** (31 +12 Packaging +10 document dialogs +16 conditional fixtures), not69 universal workflow or backend transaction approvals. No pending failures remain in these named batches. Broader unforced backend submission branches are outside these read-only dialog mechanics claims.

The subsequent business/costing reports add38 explicit cases, bringing the combined cumulative UI evidence to107. See the consolidated remaining-acceptance report for current scope and external acceptance boundaries.
