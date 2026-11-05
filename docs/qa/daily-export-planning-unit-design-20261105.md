# Daily exports and Planning historical unit trust — 2026-11-05

Scope independent of concurrent Dashboard / Demand Trends / Production Variance work. Base 1e3d2a8. No live export/download, business write, forecast recalculation, SQL or deployment.

## Actual output and intended use

- Daily CSV is one row per product/record, with raw recorded quantities, current catalogue selling_unit, sales and optional recipe-cost fields. It is not itself a mixed-product sum. Risk: a recipient may interpret current unit as historical. Keep column names/order/values; append selling_unit_basis, historical_unit (null), historical_unit_status (unverified). Unknown is not zero.
- Historical CSV/PDF is a blank entry form using historical product membership and current catalogue fields; it does not fill historical product quantities. CSV now appends unit_basis distinguishing current-entry template from historical-record template. Existing unit column remains current catalogue.
- PlanningEvidence displays eight weeks of raw per-product/outlet history and saved suggestion evidence. The heading previously attached current unit to the entire history. It now says recorded values / historical units unverified and separately identifies current catalogue unit. Raw history, selected date, gaps, explicit zero and saved suggestions remain unchanged.

## Implemented local compatibility protection

Runtime files: api/export/outlet-daily-records/route.ts; api/export/outlet-daily-form-template/route.ts; components/production-planning-evidence.tsx. No query scope, permission, arithmetic, mutations, automatic advice or saved-plan state changed. Extra CSV columns are appended; consumers requiring an exact column count still need acceptance testing. Keeping the old selling_unit cell is a compatibility choice and must not be mistaken for verified historical attribution.

## Planning safe calculation design — not implemented

1. Snapshot quantity units at the time of new authoritative Daily entry, employee baseline, minimum and plan allocation. Approval/version checks must bind these together. No backfill from today's catalogue.
2. Build evidence per product + outlet + immutable unit + date population. Unknown/changed units are excluded with an explicit reason, never converted implicitly. Rates require the same unit and recorded population.
3. No trusted history: ordinary history-based recommendation is manual/null. Existing tests prove the present forecast function already returns manual without eligible history. Employee-entered baseline can remain only when its own unit/current applicability is verified; do not manufacture history-driven adjustments, ceiling or surplus capacity from excluded samples.
4. Minimum estimation must return unavailable instead of overwriting draft values with floor 1 when unit provenance is absent. The current message's 'piece' assumption is not universal. This is a separate behavioral change; UI must retain current settings on failure.
5. Prior-day carryover deduction also needs matching verified units. Unknown carryover must request manual review, not silently subtract or assume zero. Preserve already saved plan/allocation/order snapshots; apply new rules to explicitly requested future generation/recalculation only, with audit and version guards.
6. Tests before activation: mixed/changed/missing units, same verified unit across dates, zero versus missing, employee baseline with/without valid unit, no trusted history, manual minimum preservation, carryover mismatch, event quantities, and unchanged saved plan after read-only evidence view.

## Historical PDF — open

PDF still labels products with current selling_unit. Proposed footer on every historical template page: 'Units shown are current catalogue units; historical units are unverified.' New-entry templates remain current units. PDF generator was not changed because this environment has no Poppler rendering tools; no visual acceptance claimed. This is a documented remaining gap, not fixed by the CSV change.

## Verification

29 Node tests pass: actual CSV row-expression execution, blank form expression execution, actual PlanningEvidence SSR, existing ordinary and employee forecast regressions. Tests preserve raw zero, decimal quantities, note, sales total, old unit field and append-only metadata; current versus historical template distinction; history calendar gaps and selection; manual/no-history and explicit employee baseline behavior.

TypeScript and focused runtime ESLint pass. No full build or authenticated updated Preview acceptance for this isolated follow-up. Forecast tests establish existing behavior; they do not claim the proposed unit filtering is implemented. Financial recipe cost attribution remains separate and unchanged.
