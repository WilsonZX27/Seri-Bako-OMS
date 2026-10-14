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
- Populated packaging chart, long outlet labels, all-empty chart after prior populated selection, and application-route error/load states outside the read-only history action.
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
