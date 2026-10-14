# Business chart follow-up — 2026-10-14

**26/26 cases passed** across the six remaining non-cost chart families. Tests run actual localhost routes against a new isolated Synthetic Release Review branch, three products, an ingredient, seven completed outlet records, two read-model posted count fixtures, two stock entries and linked draft PO/GRN lines. Existing fixtures were not modified. The synthetic posted count rows intentionally have no posting ledger: they establish read-model variance, not stock posting or reversal correctness.

## Exact checks

18 populated cases cover1440/320/720 widths:

- Demand: each completed date has300 received,42 leftover,15 wastage and243 estimated movement;5% wastage. Under-supply product ranks first by movement; selected product/outlet filters remain in the detail URL.
- Outlet wastage: weighted period rate5%, per-date previews and branch/date record links.
- Production signal: one under, one over, one balanced row, with matching filter URLs. These are demand signals, not production output reconciliation.
- Inventory: selected fixture date shows one inbound and one outbound entry (not12 and3 quantities), with same-date directional ledger URLs.
- Procurement: linked draft PO10 versus GRN13/8 yields ranked+RM3 and-RM2, including-20% direction. Both missing invoices remain explicit; no missing price is silently treated as zero.
- Stock Count: two above-tolerance occurrences, one shortage and one overage; latest+12% and count detail URL, branch/date drill-through.

Five additional cases switch to an isolated empty branch or no-match search, then restore populated results. Three inventory cases on a separate read-only test instance verify empty RPC response, failed RPC with successful real base-table fallback, and failed RPC plus failed fallback displaying explicit unavailability before reload recovery. Only these three inventory response cases use injected transport data; the18 populated route cases use real local queries. No business submissions occurred.

The date window follows Kuala Lumpur business date, which can differ from the fixture SQL UTC current_date; assertions use exact fixture dates and do not assume seven populated days in every current-period query.

## Fixed defect

Demand daily rows omitted `completed_records`, so a real300-received date said0 completed records in its preview. The query now counts distinct participating record IDs per date. A runtime test proves multiple products do not inflate the count, drafts are excluded, and product filtering narrows it. The rebuilt real route displays1 completed record per fixture date.

Probe corrections were not application changes: hidden desktop empty-state copies are excluded from mobile locators; ranking hydration is awaited; viewport screenshots replace element screenshots whose scroll stabilization conflicted with focused previews. Only failed probes were rerun. Final JSON has23/23 route cases plus3/3 recovery cases. The320px Stock Count screenshot was visually inspected.

## Reproduction and evidence

- `seed-business-charts-local.cjs`, `verify-business-charts-local.cjs` under `scripts/integration/`.
- `inventory-read-fixture-preload.cjs`, `verify-inventory-chart-recovery-local.cjs` restrict failures to local58321 read calls; standalone3191 uses the existing test server wrapper.
- Evidence and synthetic identifiers: [business-charts](evidence/2026-10-14/business-charts/business-chart-states.json), [inventory recovery](evidence/2026-10-14/business-charts/inventory-chart-recovery.json).

This closes the named chart-owner follow-up, not every historical route-state combination. No production access, deployment or external upload.
