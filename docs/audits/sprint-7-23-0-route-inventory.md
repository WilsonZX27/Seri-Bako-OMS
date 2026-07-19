# Sprint 7.23.0 route inventory

Audit date: 2026-07-18

Baseline: `f60921c7cc89aa3be305f20e459456b9d94322a2` — v0.2.34 / Sprint 7.22.1

Mode: read-only evidence gathering; no routes were deleted or changed.

## Counting method

The source tree contains 109 `src/app/**/page.*` files. The production App Router manifest contains 110 page entries because it also includes the framework `/_not-found` page. It also contains 10 route-handler entries, which are APIs rather than user pages.

The build message `Generating static pages (86)` is a build-work counter, not a count of 86 public static pages. In the final route table only `/_not-found` and `/icon.svg` are emitted as static (`○`); user-facing pages are dynamic (`ƒ`). The 110-page classification below is mutually exclusive.

## Exact counts

| Classification | Count |
|---|---:|
| Canonical active | 6 |
| Role-restricted active | 66 |
| Redirect/compatibility alias | 5 |
| Duplicate implementation | 1 |
| Orphaned/no navigation entry | 6 |
| Obsolete/dead | 0 |
| Dynamic business route | 25 |
| Framework-generated, not a real user page | 1 |
| **Total page entries** | **110** |

There are 25 parameterized business pages and 24 create/edit/import pages. “Dynamic business route” is used as the primary class for parameterized pages even when the page is also role-restricted.

## Complete inventory

| Route | Primary classification |
|---|---|
| `/` | redirect/compatibility alias |
| `/access-status` | canonical active |
| `/change-password` | canonical active |
| `/forgot-password` | canonical active |
| `/login` | canonical active |
| `/set-password` | canonical active |
| `/_not-found` | framework-generated |
| `/account` | canonical active |
| `/activity` | role-restricted active |
| `/administration` | role-restricted active |
| `/administration/imports` | redirect/compatibility alias |
| `/administration/master-data-cleanup` | role-restricted active |
| `/branches` | role-restricted active |
| `/branches/[id]` | dynamic business route |
| `/branches/new` | role-restricted active |
| `/company` | role-restricted active |
| `/daily-operations` | role-restricted active |
| `/dashboard` | role-restricted active |
| `/data-onboarding` | duplicate implementation |
| `/documents` | role-restricted active |
| `/documents/[id]` | dynamic business route |
| `/document-sequences` | orphaned/no navigation entry |
| `/document-sequences/[id]` | dynamic business route |
| `/document-sequences/new` | orphaned/no navigation entry |
| `/goods-receivings` | role-restricted active |
| `/goods-receivings/[id]` | dynamic business route |
| `/goods-receivings/new` | role-restricted active |
| `/imports` | role-restricted active |
| `/imports/[entity]` | dynamic business route |
| `/inventory` | role-restricted active |
| `/items` | role-restricted active |
| `/items/[id]` | dynamic business route |
| `/items/new` | role-restricted active |
| Legacy Branch / Outlet compatibility aliases | redirect aliases retired in Sprint 7.23.5 |
| `/low-stock` | role-restricted active |
| `/opening-stock/import` | role-restricted active |
| `/outlet-daily-records` | role-restricted active |
| `/outlet-daily-records/[id]` | dynamic business route |
| `/outlet-daily-records/new` | role-restricted active |
| `/procurement` | role-restricted active |
| `/procurement/purchase-requests` | redirect/compatibility alias |
| `/production` | role-restricted active |
| `/production/jobs` | role-restricted active |
| `/production/jobs/[id]` | dynamic business route |
| `/production/jobs/new` | role-restricted active |
| `/production/planning` | role-restricted active |
| `/production/variance` | role-restricted active |
| `/products` | role-restricted active |
| `/products/[id]` | dynamic business route |
| `/products/new` | role-restricted active |
| `/purchase-orders` | role-restricted active |
| `/purchase-orders/[id]` | dynamic business route |
| `/purchase-orders/new` | role-restricted active |
| `/purchase-requests` | role-restricted active |
| `/purchase-requests/[id]` | dynamic business route |
| `/purchase-requests/new` | role-restricted active |
| `/purchase-returns` | role-restricted active |
| `/purchase-returns/[id]` | dynamic business route |
| `/purchase-returns/new` | role-restricted active |
| `/quick-tools` | orphaned/no navigation entry |
| `/recipes` | role-restricted active |
| `/recipes/[id]` | dynamic business route |
| `/recipes/[id]/edit` | dynamic business route |
| `/recipes/new` | role-restricted active |
| `/reports` | role-restricted active |
| `/reports/costing-readiness` | role-restricted active |
| `/reports/demand-trends` | role-restricted active |
| `/reports/procurement-variance` | role-restricted active |
| `/reports/product-margin` | role-restricted active |
| `/reports/recipe-costing` | role-restricted active |
| `/roles` | role-restricted active |
| `/roles/[id]` | dynamic business route |
| `/roles/new` | role-restricted active |
| `/settings` | redirect/compatibility alias |
| `/settings/backups` | role-restricted active |
| `/setup` | orphaned/no navigation entry |
| `/staffs` | role-restricted active |
| `/staffs/[id]` | dynamic business route |
| `/staffs/new` | role-restricted active |
| `/stock-balance` | role-restricted active |
| `/stock-balances` | redirect/compatibility alias |
| `/stock-card` | role-restricted active |
| `/stock-counts` | role-restricted active |
| `/stock-counts/[id]` | dynamic business route |
| `/stock-counts/new` | role-restricted active |
| `/stock-transactions` | role-restricted active |
| `/stock-transactions/[id]` | dynamic business route |
| `/stock-transactions/new` | role-restricted active |
| `/stock-transfers` | role-restricted active |
| `/stock-transfers/[id]` | dynamic business route |
| `/stock-transfers/new` | role-restricted active |
| `/stock-wastage` | role-restricted active |
| `/stock-wastage/[id]` | dynamic business route |
| `/stock-wastage/new` | role-restricted active |
| `/supplier-invoices` | role-restricted active |
| `/supplier-invoices/[id]` | dynamic business route |
| `/supplier-invoices/aging` | role-restricted active |
| `/supplier-invoices/cash-flow` | role-restricted active |
| `/supplier-invoices/new` | role-restricted active |
| `/supplier-items` | role-restricted active |
| `/supplier-items/[id]` | dynamic business route |
| `/supplier-items/new` | role-restricted active |
| `/suppliers` | role-restricted active |
| `/suppliers/[id]` | dynamic business route |
| `/suppliers/new` | role-restricted active |
| `/uom-conversions` | orphaned/no navigation entry |
| `/uom-conversions/[id]` | dynamic business route |
| `/uom-conversions/new` | orphaned/no navigation entry |

## Redirect and compatibility rules

- `/` resolves through the authenticated default-route resolver.
- `/settings` redirects to `/administration`.
- `/administration/imports` redirects to `/imports`.
- `/procurement/purchase-requests` redirects to `/purchase-requests`.
- `/stock-balances` redirects to `/stock-balance`.
- `/data-onboarding` immediately redirects to `/imports`, but its file still contains an unreachable legacy onboarding implementation. This is the only confirmed duplicate implementation candidate.
- `/settings/backups` remains an active owner-only surface; it is not an alias.

## Navigation and information-architecture findings

1. **Administration/System Backup mismatch (P1).** Admin navigation can expose `/settings/backups` through `settings.manage`, while the page enforces Owner/Super Admin. Current-run non-owner probes generated stable redirects and expected Postgres `P0001 Owner / Super Admin access is required` events. Navigation and server authorization disagree.
2. **Breadcrumb-only hubs (P2).** `/procurement`, `/inventory`, `/daily-operations`, and `/administration` are useful parent destinations but are not direct sidebar items.
3. **Module ownership mismatch (P2).** Goods Receiving is grouped under Procurement in the sidebar but its breadcrumb parent is Daily Operations.
4. **Terminology drift (P2).** `/stock-transactions` is “Movement Ledger” in the sidebar, “Manual Stock Movement” in the breadcrumb, and “Stock Ledger” in the page heading.
5. **Orphan candidates (P2).** `/setup`, `/quick-tools`, `/document-sequences`, `/document-sequences/new`, `/uom-conversions`, and `/uom-conversions/new` have no normal navigation entry. Setup may still be a bootstrap-only route; none is classified dead without owner confirmation and usage evidence.
6. **No confirmed missing sidebar destinations.** Every visible current-run sidebar destination resolved. The principal defects are permission mismatch and taxonomy disagreement, not a missing file.
7. **Old Settings children are partly intentional.** The Settings hub is now a compatibility alias, but the backup surface remains under the old URL namespace. This preserves behavior but makes the Administration consolidation incomplete.

## Duplicate/deprecated candidates for Sprint 7.23.1 review

| Candidate | Evidence | Recommendation gate |
|---|---|---|
| `/data-onboarding` | Redirect plus unreachable legacy implementation | Remove unreachable implementation only after confirming no direct imports |
| `/settings` | Compatibility redirect | Keep alias; standardize child namespace separately |
| `/settings/backups` | Active page under legacy namespace | Decide canonical Administration URL and preserve redirect |
| `/administration/imports` | Alias to `/imports` | Keep compatibility alias until link telemetry is reviewed |
| `/procurement/purchase-requests` | Alias to canonical PR list | Keep compatibility alias |
| `/stock-balances` | Alias to singular canonical route | Keep compatibility alias |
| Six orphan candidates | No sidebar/top-nav entry | Confirm owner intent and production usage before any removal |

## Evidence sources

- `src/app/**/page.*`
- `.next/server/app-paths-manifest.json`
- production `npm run build` route output
- middleware, redirect helpers, navigation registries, breadcrumbs, and application links
- authenticated current-run route probes for all seven roles
