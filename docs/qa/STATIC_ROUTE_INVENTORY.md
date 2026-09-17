# Static Route Inventory — Sprint 7.21.5

Inventory date: 2026-07-18. All routes below are discovered from `src/app/(app)`.

| Route group | Module | Real data | Navigation | Protected | Status / recommendation |
|---|---|---:|---:|---:|---|
| `/dashboard`, `/activity`, `/account`, `/quick-tools` | Workspace | yes | yes | yes | Keep |
| `/daily-operations` | Operations hub | no writes | indirect | yes | Keep as a link hub; balanced three-column layout |
| `/procurement`, `/purchase-requests/**`, `/purchase-orders/**`, `/goods-receivings/**`, `/purchase-returns/**`, `/supplier-invoices/**`, `/suppliers/**`, `/supplier-items/**` | Procurement | yes | yes | yes | Keep |
| `/inventory`, `/items/**`, `/products/**`, `/recipes/**`, `/stock-*`, `/low-stock`, `/opening-stock/import` | Inventory / production master data | yes | yes | yes | Keep |
| `/outlet-daily-records/**`, `/production/**` | Outlet / production | yes | yes | yes | Keep |
| `/reports`, `/reports/demand-trends`, `/reports/costing-readiness`, `/reports/recipe-costing`, `/reports/product-margin`, `/reports/procurement-variance` | Reports | yes | yes | yes | Keep |
| `/company`, `/branches/**`, `/staffs/**`, `/roles/**`, `/document-sequences/**` | Administration | yes | yes | yes | Keep |
| `/imports`, `/imports/[entity]`, `/administration/imports` | Imports | yes | yes | yes | `/administration/imports` redirects to `/imports` |
| `/data-onboarding` | Legacy onboarding | mixed / mutating | no | yes | Hide; redirect to `/imports`; retain route for old links only |
| `/administration`, `/settings`, `/settings/backups` | Administration / compatibility / backup | yes | yes | yes | `/settings` redirects to the canonical `/administration` hub; backup remains owner-only |
| `/documents/**` | Documents | yes | indirect | yes | Keep |

Dynamic `/**` entries cover list, new, edit, and detail pages found under the matching route directories. No route was deleted in this sprint.

Current routing note (2026-09-17): `/people` is the canonical employee directory. The legacy `/staffs` list redirects there while preserving filters; `/staffs/new` and `/staffs/[id]` remain the privileged account-and-access administration surfaces. Historical route inventories below retain their original sprint evidence and should not be read as permission to reintroduce a second employee list.

## Detailed Routes Needing Review

| Route | Reason for review | Classification in Sprint 7.21.5 | Proposed next action after pilot |
|---|---|---|---|
| `/daily-operations` | Static link hub overlaps Dashboard and the Operations sidebar. | Keep | Review usage after pilot; consolidate only if it proves redundant. |
| `/data-onboarding` | Earlier setup/readiness page included maintenance actions and duplicated the Import workspace. | Hide | Keep the compatibility redirect to `/imports`; remove later only after old links are no longer used. |
| `/administration/imports` | Duplicate import entry point. | Hide | Keep the compatibility redirect to `/imports`; remove later only after navigation and bookmarks are clean. |
| `/settings` | Legacy hub duplicated the Administration information architecture. | Redirect | Redirect to `/administration`; retain the URL for bookmarks and compatibility. |
| `/settings/backups` | Owner-only operational export, not a general settings feature. | Improve | Keep owner-only; validate backup retention and restore procedures before commercial go-live. |
| `/quick-tools` | Older convenience hub may overlap sidebar navigation. | Improve | Measure use during pilot before consolidating it. |
| `/procurement/purchase-requests` | Compatibility route alongside `/purchase-requests`. | Hide | Keep the redirect for compatibility; remove later after confirming no external links use it. |
| `/stock-balances` | Compatibility route alongside `/stock-balance`. | Hide | Keep the redirect for compatibility; remove later after confirming no external links use it. |

No route was deleted in Sprint 7.21.5. No unfinished route is exposed in primary navigation. `/settings` redirects to `/administration`; `/data-onboarding` and `/administration/imports` redirect to `/imports`; compatibility routes remain available until bookmarks can be retired safely.
