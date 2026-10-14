# Costing chart business-data verification — 2026-10-14

All **12 browser cases** and **3 runtime data/component tests** passed. These checks use the actual report routes on localhost:3190 and actual server query transformations, with dedicated synthetic local database records. No production data, deployment or application source changes were involved.

## Data and transformations

The fixture adds 11 products and 10 active recipes, including eight High-confidence recipes, one Medium-confidence recipe, one Low-confidence recipe, seven Ready product margins, two Cost-incomplete products, one Missing-price product and one Missing-recipe product. A long product name is repeated sufficiently to exercise wrapped preview/detail content. Its complete usable cost is RM31 and its price is RM1, giving a negative RM30 margin and -3000% margin. It must rank first by absolute magnitude while retaining the displayed negative sign.

The browser script reads the synthetic company's database rows and executes the real `buildRecipeCosting`, `buildProductMargin` and `buildCostingReadiness` functions before browser checks. It compares rendered confidence/status counts, top-five limits, the top cost/margin amounts and links against those transformed records. Low confidence and incomplete margins stay null rather than becoming zero. Readiness module counts are compared with the real severity-scoped summary, including modules with zero issues.

Runtime tests additionally invoke the actual insight component transformations. They check ranking order, negative margin direction, exclusion of incomplete estimates, confidence/status query parameters, module versus severity scope, and empty data behavior. Currency formatting is stubbed only in these component unit tests; the live browser independently verifies real rendered currency, including `-RM 30.00`.

## Browser coverage

Populated, long-label and drill-through checks pass at **320, 720 and 1440 px** for Recipe Costing, Product Margin and Costing Readiness: nine cases. Each verifies hydration, preview without immediate navigation, complete long-name availability where applicable, preserved filter parameters, exact destination after activating Open, and no document horizontal overflow. Long ranking labels can truncate in their rows, while the selected preview exposes the complete label.

Three additional 320 px empty-state cases pass. No matching recipe/product records suppress their charts and show an explicit empty state. Readiness with no information-level issues retains four honest zero-valued modules; all bar fills have zero width.

Cases use fresh pages to isolate pointer/scroll state. An initial combined screenshot-and-resize sequence changed hover targets during automated activation; a fresh isolated 720 px probe and the final independent-page run both passed the exact target. No application defect was confirmed from that test artifact.

## Deliverables

- `scripts/integration/seed-costing-chart-local.cjs` — guarded synthetic-only local fixture creation.
- `scripts/integration/costing-transform-loader.cjs` — executes actual TypeScript query transformations for verification.
- `scripts/integration/verify-costing-charts-local.cjs` — live report/browser assertions and evidence.
- `tests/costing-chart-data-behavior.test.js` — three passing runtime tests.
- [Browser results and transformed expectations](evidence/2026-10-14/costing-charts/costing-chart-browser.json).
- Screenshots and synthetic fixture identifiers: `docs/qa/evidence/2026-10-14/costing-charts/`.

No remaining blocker was found for these three chart families. This verification covers populated, empty, long-label, touch/keyboard preview and drill-through behavior; it does not claim new dedicated loading/outage tests for these routes.
