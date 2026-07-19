# Sprint 7.23.1 role, route, and IA evidence

## Decision summary

The application now has one fixed six-role model: Super Admin / Owner, Finance, Manager, Purchasing, Kitchen, and Outlet Staff. Navigation, Administration cards, breadcrumbs, route guards, and default landing routes derive from `src/lib/information-architecture.ts`. Fixed roles and document sequences are owner-only, read-only surfaces.

The existing database identifiers `admin_review`, `pr.admin_review`, `has_admin_staff_assignment`, and `bootstrap_first_admin` remain only as compatibility contracts. User-facing workflow vocabulary is Purchasing Review. The setup RPC remains live, so `/setup` is retained as bootstrap-only and has no normal navigation entry.

## Route decision ledger

| Decision | Routes | Result |
| --- | --- | --- |
| Kept canonical | `/administration`, `/administration/backups`, `/imports`, `/roles`, `/document-sequences`, `/uom-conversions` | Permission-aware canonical surfaces. Backup, roles, and sequences are Owner-only. UOM Conversions is integrated under Inventory master data. |
| Redirected | `/settings`, `/settings/backups`, `/administration/imports`, `/data-onboarding`, `/procurement/purchase-requests`, `/stock-balances` | Historical bookmarks converge on the canonical destination. |
| Role-aware redirect | `/quick-tools`, `/daily-operations` | The old card hub no longer renders; the user lands on the first permitted IA route. |
| Usable create/edit surface removed | `/roles/new`, `/roles/[id]`, `/document-sequences/new`, `/document-sequences/[id]` | Compatibility routes redirect to their read-only list. |
| Retained protected bootstrap | `/setup` | Required by the live first-owner bootstrap RPC; absent from navigation. |

The production build still lists redirect and parameterized routes. These are compatibility endpoints or real record workflows, not duplicate static pages. Source inventory contains 110 `page.tsx` files; the build manifest contains 121 app paths, including 7 API routes and framework entries. The build prerendered 88 static page payloads.

## Six-role access matrix

| Role | Default landing | Scope | Administration | Direct denial evidence |
| --- | --- | --- | --- | --- |
| Super Admin / Owner | `/dashboard` | Company-wide | All owner controls, including backup, roles, and sequences | Fixed-role create/edit aliases return to read-only lists. |
| Finance | `/supplier-invoices` | Company-wide | No Administration navigation or backup | Backup probe converges to Supplier Invoices. |
| Manager | `/dashboard` | Assigned branches | None | Cash Flow probe converges to Dashboard. |
| Purchasing | `/purchase-requests` | Company-wide | Master Data Cleanup and Imports only | Backup probe converges to Purchase Requests. |
| Kitchen | `/production/jobs` | Assigned Central Kitchen branch | None | Administration probe converges to Production Jobs. |
| Outlet Staff | `/outlet-daily-records` | Assigned outlet | None | Administration probe converges to Outlet Daily Records. |

Disposable-local scope evidence confirmed company-wide role assignments for Owner, Finance, and Purchasing; one Central Kitchen scope for Kitchen; one outlet scope for Outlet Staff; and an assigned-branch scope for Manager. The default Branch / Outlet remained context only. No business document was created or changed during browser verification.

## Migration 071 safety

- Remote history was inspected read-only and ended at migration 070; migration 071 was not applied remotely.
- No active Viewer assignment was found in the remote pre-check. Legacy Admin assignments exist and have a deterministic conversion to Purchasing; no staff identity is embedded in the migration.
- Migration 071 aborts if an active Viewer needs an unproven Kitchen/Outlet decision or if active staff exist without an active Owner.
- It ensures the six roles, converts legacy Admin/Operations Admin assignments to Purchasing, converts legacy Kitchen Staff assignments to Kitchen, grants Purchasing the existing Purchasing Review permission, removes legacy-role permission rows, and archives legacy role rows.
- It does not delete staff, business documents, inventory, or financial records. Replacement assignments are inserted or merged before obsolete assignment rows are removed.
- Rollback is forward-only: restore archived legacy roles and assignments from the pre-application backup, then reverse compatibility function definitions. Do not attempt rollback after new six-role assignments are used without an explicit assignment map.
- SHA-256: `879A5A37164383CBDB7C1D4121F76F9350F8B89718AC93E62127817BF86468E9`.

## Verification evidence

- Disposable database reset through migrations 001-071: passed.
- Local post-check: exactly six active role codes; migration 071 recorded once; Purchasing has Purchasing Review; no active Viewer assignment.
- Authenticated Chrome checks: all six defaults passed; canonical/compatibility redirects converged; owner-only backup stayed hidden and denied; Purchasing saw only its two authorized Administration cards; no redirect loop or application-generated critical console error was observed.
- Contract tests: 111/111 passed.
- TypeScript typecheck: passed.
- Lint: passed after removing all new warnings.
- Production build: passed.
- Repository search: obsolete role credentials and active E2E role cases were removed or converted to Purchasing; internal database compatibility names remain documented intentionally.

## Deferred scope

Sprint 7.23.2 should consolidate commercial page shells, filters, tables, forms, empty states, and responsive behavior using the canonical IA. It should not rename verified database workflow states unless a separately tested migration changes the RPC contract.
