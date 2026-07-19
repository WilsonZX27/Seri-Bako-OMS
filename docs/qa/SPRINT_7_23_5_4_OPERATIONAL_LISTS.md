# v7.23.5.4 Operational Lists — Local Validation

Status: the scoped operational lists are consolidated on the existing OMS list pattern and are ready for one local commit.

## Scope verified

The audited list routes are Purchase Requests, Purchase Orders, Goods Receiving, Supplier Invoices, Purchase Returns, Items, Products, Suppliers, Supplier Items, Stock Balance, Movement Ledger, Stock Transfers, Stock Counts, Stock Wastage, Production Jobs, Outlet Daily Records, and Recipes.

- Desktop uses the canonical high-density table and permission-aware Right Console.
- Tablet keeps the table as a controlled data canvas without whole-page overflow.
- Mobile uses `OperationalList` rows without squeezed tables or generic `Page actions`.
- FilterBars have no nested vertical scrollbar. Shared OMS selects and genuine More Filters surfaces remain within the viewport and preserve Escape/focus return.
- Zero-result lists hide pagination and distinguish an empty dataset from filtered zero results.
- Product-driven views retain category, `display_order`, and natural product-code ordering.
- Recipes remain restricted to Owner and Finance.
- Breadcrumb prefetches target only real canonical workspaces; the obsolete `/operations` prefetch was removed.
- Footer displays exactly `v7.23.5.4`.

## Automated validation

| Check | Result |
|---|---|
| Typecheck | Passed |
| Lint | Passed, zero warnings |
| Production build | Passed; 89 page outputs generated |
| Contract tests | 146/146 passed |
| Authenticated role-boundary checks | 6/6 passed |
| Focused tablet hydration regression | Passed |
| Responsive operational-list suite | 6/6 viewport passes |
| Total targeted Playwright cases | 13/13 passed |

The responsive suite exercised all 17 routes at 1440, 1024, 768, 430, 390, and 360 pixels: 102 route/viewport combinations. It asserted the correct desktop/tablet/mobile representation, no whole-page horizontal overflow, no FilterBar vertical scrolling, bounded dropdowns and More Filters surfaces, no generic mobile action footer, and zero runtime or console errors.

The six authenticated roles were Owner, Finance, Manager, Purchasing, Kitchen, and Outlet Staff. Allowed list routes rendered normally and representative denied routes converged to a stable permitted destination without application errors.

## Boundary confirmation

No workflow, RLS policy, role semantic, database schema, migration, business record, remote Supabase project, deployment, or remote branch was changed. Existing disposable local auth identities were reused. Generated screenshots, traces, test output, local server logs, and credential files remain ignored and are not part of the commit candidate.
