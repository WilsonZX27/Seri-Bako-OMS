# Asset tablet follow-up — local candidate, not deployed

## Production baseline
- Verified Vercel Production Ready: `dpl_BVbizhshSVoZckbPGZCPBv7ABfRU`.
- SHA `c54fbd00e9d785be2a8178c38cfbbe5c8ba87736`, version `9.2.163`, domain `system.seribako.com.my`.
- User promoted 163; no repeat deployment performed.

## New five comments
1. Overview metrics: 3 columns / 2 rows below 1280; 6 columns desktop. Scoped override defeats legacy generic `dl` rules.
2. Checklist: date + location + count in one compact row.
3. Maintenance: one responsive form, same 44px controls / 70px tablet card; removed simultaneous desktop/mobile forms on this page.
4. Maintenance metrics: four columns, existing shortcut links retained.
5. Transfers: status visible inline and count aligned right; no mostly-empty filter drawer row.

## Interaction defects found and fixed while validating
- Existing compact inline controls lacked an Apply action and did not auto-submit. Added `compactAutoSubmit` opt-in, default false, enabled only for Asset Checklist/Maintenance/Transfers.
- Existing inline hidden context was duplicated. Within the new opt-in only, render it once so `view` remains a string and filtering stays on the intended tab.
- Date-bearing maintenance bookmarks need three controls: tablet one row, phone two rows. Checked 390 and 820.
- Actual local browser GET transitions verified: Checklist location -> `view=checklist`; Transfers approved -> `view=transfers`; Maintenance Resolved -> `view=maintenance`; Outstanding shortcut restores status and page 1 / clears ticket. Native keyboard date change also navigated to `date=2026-09-29&location=&view=checklist`. Browser fill alone did not dispatch the React date change, so it was not counted as a successful interaction. These execute real UI event handlers with synthetic query fixtures; they are not production business writes or real DB result verification.

## Validation
- 25 final rendered cases: five Asset tabs x 390/768/820/1024/1440. Actual viewport widths match requested widths; exactly one query form each; no document horizontal overflow.
- 10 additional local ODR/Delivery Orders cases, same widths, no document overflow.
- Final screenshots and measured controls: `/tmp/oms-asset-tablet-followup-evidence/`; `metrics-final.json` is authoritative (initial captures were before hydration and superseded).
- Full tests: 2125 pass, zero fail (includes two new contract tests).
- Typecheck, ESLint, Next production build pass. Build uses explicit synthetic localhost Supabase public values for compilation, not production credentials / connectivity.
- `git diff --check` clean.

## 163 production read-only acceptance
Captured five widths for Assets, Registration, Transfer detail, Maintenance, Delivery Orders, Checklist, Overview, Daily Records under `/tmp/oms163-production-evidence/`.
Confirmed desktop Condition/Check columns, Remarks optional, candidate ID preview, Register New Asset breadcrumb, transfer PR-like rail / no main Action history / no optional action note, maintenance Outstanding default and compact history, DO View width 64px, ODR desktop four visible filters.
The new tablet issues are still present in production 163; the local fix is not claimed as deployed.
No asset registration, dispatch, maintenance save, numbering allocation, or other production write was performed. Production success toast / Register another asset cannot be re-executed without writing; previous isolated synthetic coverage remains the evidence for those states. Real role-specific write acceptance remains outstanding.

## Shared impact
`annotation21.module.css` is imported only by Asset Management page. No global CSS changed. `FilterBar` forwards the opt-in; `UnifiedListHeader` default is false, so other consumers retain prior behavior. No new hook, effect, dependency, data request, or permission change. The complete source consumer inventory is below; only Asset's non-assets list tabs set the new option.

- `src/app/(app)/reports/procurement-variance/page.tsx`
- `src/app/(app)/reports/recipe-costing/page.tsx`
- `src/app/(app)/purchase-returns/page.tsx`
- `src/app/(app)/stock-transactions/page.tsx`
- `src/app/(app)/reports/product-margin/page.tsx`
- `src/app/(app)/stock-transfers/page.tsx`
- `src/app/(app)/reports/costing-readiness/page.tsx`
- `src/app/(app)/documents/page.tsx`
- `src/app/(app)/purchase-requests/page.tsx`
- `src/app/(app)/administration/master-data-cleanup/page.tsx`
- `src/app/(app)/reports/demand-trends/page.tsx`
- `src/app/(app)/production/jobs/page.tsx`
- `src/app/(app)/stock-wastage/page.tsx`
- `src/app/(app)/stock-counts/page.tsx`
- `src/app/(app)/outlet-daily-records/page.tsx`
- `src/app/(app)/stock-card/page.tsx`
- `src/app/(app)/low-stock/page.tsx`
- `src/app/(app)/goods-receivings/page.tsx`
- `src/app/(app)/purchase-orders/page.tsx`
- `src/app/(app)/outlet-daily-records/delivery-orders/page.tsx`
- `src/app/(app)/supplier-invoices/aging/page.tsx`
- `src/app/(app)/production/variance/page.tsx`
- `src/app/(app)/asset-management/page.tsx`
- `src/app/(app)/people/ro/page.tsx`
- `src/app/(app)/outlet-daily-records/insights/page.tsx`
- `src/app/(app)/supplier-invoices/page.tsx`
- `src/components/attendance/attendance-review-filters.tsx`
- `src/components/ui/filter-bar.tsx`
- `src/components/production-planning-workspace.tsx`
- `src/components/stock-balance-workspace.tsx`
- `src/components/master-data-filters.tsx`
- `src/components/outlet-packaging-report.tsx`

## Boundaries and remaining dependencies
- Candidate not committed, pushed, version-bumped, or deployed. New-five release authorization is separate from the completed 163 promotion; no production change made in this follow-up.
- Paused login patch and undecided basket atomicity work remain excluded.
- No claim that synthetic fixtures verify production data filtering or real role writes.
