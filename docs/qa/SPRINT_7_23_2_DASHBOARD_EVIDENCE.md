# Sprint 7.23.2 Dashboard Evidence

Date: 2026-07-19

Environment: disposable local Supabase, local production build

Production mutation: none

## Six-role matrix

| Role | Terminal route | Scope shown | Primary dashboard content | Restricted probe | Result |
| --- | --- | --- | --- | --- | --- |
| Super Admin / Owner | `/dashboard` | Company-wide | approvals, operational exceptions, payables and cash obligations | owner controls retained | Pass |
| Finance | `/dashboard` | Company-wide | Finance/Manager reviews, operational pipeline, AP and cash obligations | owner backup denied | Pass |
| Manager | `/dashboard` | Assigned branches | Manager Review, receiving, production, outlet and stock exceptions | AP Aging and owner backup denied | Pass |
| Purchasing | `/dashboard` | Company-wide permitted data | purchasing queue, PO/supplier/document readiness | AP Aging and owner backup denied | Pass |
| Kitchen | `/dashboard` | Assigned Central Kitchen | PR progress, receiving, raw-material and production tasks | AP Aging and owner backup denied | Pass |
| Outlet Staff | `/dashboard` | Assigned outlet | one next daily-record task and completion state | AP Aging and owner backup denied | Pass |

All six roles were checked at 1024px and 390px. The run produced 12 ordered screenshots in `test-results/sprint-7-23-2`, found no horizontal overflow, and found no critical hydration, Server Component, TypeError, ReferenceError, or uncaught console error. Verification created only disposable local auth/staff identities; it created no business documents, stock movements, suppliers, items, or finance records.

## Migration 072 evidence

- Disposable reset applied migrations 001–072 successfully.
- Finance received the enumerated read-level operational grants, explicit item/supplier view permissions, and `pr.manager_approve` fallback.
- `purchase_request_self_approval_guard` exists exactly once.
- Finance owner-control grant count remained zero.
- Migration 072 changes permission metadata only and does not modify business rows.

## Validation

- Typecheck: passed.
- Lint: passed with zero warnings.
- Contract/unit: 114/114 passed.
- Production build: passed; 88 static-generation entries completed.
- Authenticated dashboard Playwright: 6/6 passed.
- Direct restricted-route probes: passed.
