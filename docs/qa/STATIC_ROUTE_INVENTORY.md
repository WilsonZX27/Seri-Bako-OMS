# Static Route Inventory — Sprint 7.21.1

Inventory date: 2026-07-17. All routes below are discovered from `src/app/(app)`.

| Route group | Module | Real data | Navigation | Protected | Status / recommendation |
|---|---|---:|---:|---:|---|
| `/dashboard`, `/activity`, `/account`, `/quick-tools` | Workspace | yes | yes | yes | Keep |
| `/daily-operations` | Operations hub | no writes | indirect | yes | Keep as a link hub; balanced three-column layout |
| `/procurement`, `/purchase-requests/**`, `/purchase-orders/**`, `/goods-receivings/**`, `/purchase-returns/**`, `/supplier-invoices/**`, `/suppliers/**`, `/supplier-items/**` | Procurement | yes | yes | yes | Keep |
| `/inventory`, `/items/**`, `/products/**`, `/recipes/**`, `/stock-*`, `/low-stock`, `/opening-stock/import` | Inventory / production master data | yes | yes | yes | Keep |
| `/outlet-daily-records/**`, `/production/**` | Outlet / production | yes | yes | yes | Keep |
| `/reports`, `/reports/demand-trends`, `/reports/costing-readiness`, `/reports/recipe-costing`, `/reports/product-margin`, `/reports/procurement-variance` | Reports | yes | yes | yes | Keep |
| `/company`, `/branches/**`, `/locations/**`, `/staffs/**`, `/roles/**`, `/document-sequences/**` | Administration | yes | yes | yes | Keep |
| `/imports`, `/imports/[entity]`, `/administration/imports` | Imports | yes | yes | yes | `/administration/imports` redirects to `/imports` |
| `/data-onboarding` | Legacy onboarding | mixed / mutating | no | yes | Redirect to `/imports`; retain route for old links only |
| `/settings`, `/settings/backups` | Settings / backup | mixed | no | yes | Keep only live Company, Staff, Roles, and owner Backup links; review remaining route later |
| `/documents/**` | Documents | yes | indirect | yes | Keep |

Dynamic `/**` entries cover list, new, edit, scan, and detail pages found under the matching route directories. No route was deleted in this sprint.

## Detailed Routes Needing Review

| Route | Reason for review | Current action in Sprint 7.21.1 | Proposed next action after pilot |
|---|---|---|---|
| `/daily-operations` | Static link hub overlaps Dashboard and the Operations sidebar. | Keep | Review usage after pilot; consolidate only if it proves redundant. |
| `/data-onboarding` | Earlier setup/readiness page included maintenance actions and duplicated the Import workspace. | Redirect | Keep the compatibility redirect to `/imports`; remove only after old links are no longer used. |
| `/administration/imports` | Duplicate import entry point. | Redirect | Keep the compatibility redirect to `/imports`; remove only after navigation and bookmarks are clean. |
| `/settings` | Legacy hub previously displayed disabled placeholder cards. | Keep | Retain live Company, Staff, Roles, and owner Backup links; review whether a dedicated settings hub is still needed. |
| `/settings/backups` | Owner-only operational export, not a general settings feature. | Owner-only | Keep owner-only; review backup retention and restore procedures after pilot. |
| `/quick-tools` | Older convenience hub may overlap sidebar navigation. | Review later | Measure use during pilot before consolidating it. |
| `/procurement/purchase-requests` | Compatibility route alongside `/purchase-requests`. | Review later | Confirm redirect/usage before removing or documenting a canonical route. |
| `/stock-balances` | Compatibility route alongside `/stock-balance`. | Review later | Confirm redirect/usage before removing or documenting a canonical route. |

No route was deleted in Sprint 7.21.1. `/data-onboarding` redirects to `/imports`, and `/administration/imports` redirects to `/imports`. Settings keeps only live links; disabled placeholder cards were removed.
