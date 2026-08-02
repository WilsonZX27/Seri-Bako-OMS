# Full-system audit matrix

## v8.10.0 release note

Unposted Purchase Requests and Purchase Orders now use dedicated atomic cancel
RPCs. They leave active lists after cancellation while retaining documents and
activity logs. Sent/received/posted records remain protected. Migration 120 is
forward-only and must be applied to Production before this behavior is live.

This is the living audit map for the Seri Bako OMS. It is intentionally explicit:
every route is checked at 390px phone, 820px tablet portrait, and 1440px desktop
before a release is called closed.

## Audit gates

| Gate | Required evidence | Current state |
| --- | --- | --- |
| Shell | `dvh`, safe-area bars, no page-level horizontal overflow | Static scan passed; Dashboard verified at 390×844, 820×1180, and 1440×900: scrollWidth exactly matched viewport in all three, `Owner Workdesk` rendered, and mobile/tablet bottom navigation stayed within the viewport |
| Mutation feedback | Every business form uses `SubmitButton`, `DocumentActionForm`, or an equivalent pending/disabled control | Static contract passes for all audited mutation entry points |
| Data failure honesty | Query errors render an explicit unavailable/error state, never a fabricated zero | Dashboard, Inventory, Stock Balance and operation enrichments hardened |
| Idempotency | Create/post/cancel actions use a server key or locked atomic transition | Stock Count and operation create paths covered; Transfer dispatch/receive/reject now lock rows and use reservation/receipt idempotency |
| Date display | User-visible date-only values use the shared `dd/mm/yyyy` formatter; native inputs retain ISO values | Static contract passes across operations, procurement and Transfer list/detail routes; visual sweep pending |
| Touch target | Phone and tablet actions/steppers are at least 48px where task-critical | Stock Count stepper contract passes; route sweep pending |
| Production safety | No migration, database mutation, push, or deploy is performed by this audit | Locked |

## Route and workflow coverage

### Public URL verification (2026-08-01)

The production browser check uses public paths only; Next.js route-group
segments are never part of the URL. `/stock-counts`, `/stock-counts/new`,
`/purchase-requests/new`, and `/supplier-items/new` were requested as their
literal public paths. The authenticated Chrome recheck reached
`/supplier-items/new` directly and rendered `New Supplier Item` at 390×844,
820×1180, and 1440×900 with `scrollWidth` equal to the viewport and no alert.

The same check rendered `/suppliers` at all three viewports (`Suppliers`, no
horizontal overflow, no alert) and rendered `/recipes` at 390×844 (`Recipe /
BOM`, no horizontal overflow, no alert). The remaining routes in this sweep
are intentionally not inferred from a partial run and remain pending.
`/staffs/new`, the approved tablet split-panel reference, also rendered `New
Staff` at all three viewports with no horizontal overflow or alert.
`/administration` rendered `Administration` at all three viewports with no
horizontal overflow or alert.
`/documents` rendered `Documents Register` at all three viewports with no
horizontal overflow or alert. `/stock-balance` rendered `Stock Balance` at
390×844, 820×1180, and 1440×900 with no horizontal overflow or alert after a
dedicated recheck.

`/stock-transactions` rendered `Movement Ledger` at all three viewports with
no horizontal overflow or alert.
`/purchase-orders` rendered `Purchase Orders` and `/goods-receivings` rendered
`Goods Receiving` at 390×844, 820×1180, and 1440×900; both had no horizontal
overflow or alert.
`/purchase-requests` rendered `Purchase Requests` at all three viewports with
no horizontal overflow or alert.

### Foundation and access

`/account`, `/change-password`, `/set-password`, `/setup`, `/staffs`,
`/staffs/new`, `/staffs/[id]`, `/roles`, `/companies`, `/branches`,
`/branches/new`, `/branches/[id]`, `/document-sequences`, and their create/edit
routes. Check tenant scope, permission denial, form pending state, recovery/error
copy, date metadata, and mobile action-bar clearance.

### Master data

`/items`, `/items/new`, `/items/[id]`, `/products`, `/products/new`,
`/products/[id]`, `/suppliers`, `/suppliers/new`, `/suppliers/[id]`,
`/supplier-items`, `/supplier-items/new`, `/supplier-items/[id]`,
`/uom-conversions`, `/uom-conversions/new`, `/uom-conversions/[id]`,
`/recipes`, `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit`, and packaging
or mapping subroutes. Check long names, controlled UOMs, archive/restore feedback,
duplicate prevention, and branch/company filtering.

### Procurement and receiving

`/purchase-requests`, `/purchase-requests/new`, `/purchase-requests/[id]`,
`/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/[id]`,
`/goods-receivings`, `/goods-receivings/new`, `/goods-receivings/[id]`,
`/purchase-returns`, `/purchase-returns/new`, `/supplier-invoices`,
`/supplier-invoices/new`, `/supplier-invoices/[id]`, and aging/cash-flow reports.
Check explicit Approve/Reject visibility, Kitchen branch scope, pending labels,
activity-log failure honesty, and no silent empty-success fallback.

### Inventory operations

`/stock-counts`, `/stock-counts/new`, `/stock-counts/[id]`, `/stock-balance`,
`/stock-card`, `/stock-transactions`, `/stock-transactions/new`, `/stock-wastage`,
`/stock-wastage/new`, `/stock-transfers`, `/stock-transfers/new`,
`/stock-transfers/[id]`, and operation detail routes. Check read-model error states,
ledger provenance, date formatting, mobile density, and action idempotency.

### Production and reporting

`/production/jobs`, `/production/jobs/new`, `/production/jobs/[id]`,
`/production/planning`, `/production/variance`, `/reports/*`,
`/outlet-daily-records`, `/outlet-daily-records/new`, and daily-record details.
Check line-entry wrapping, loading/error/empty states, sticky action clearance,
and report filter ordering.

## Mutation feedback contract

1. The first activation disables the submitting control synchronously.
2. The control exposes `aria-busy="true"` and a contextual pending label with a
   spinner while the action is running.
3. Server validation, permission, conflict, and dependency failures return an
   explicit error state; they are never rendered as success or as an empty list.
4. Successful terminal actions revalidate the affected list/detail/read model and
   leave the user on a truthful state.
5. Repeated clicks, refreshes, and concurrent requests cannot create duplicate
   ledger movements or duplicate business records.

## Current blockers

- Stock Transfer reservation → partial receive → release is present in the
  migration 115 and action/UI layer. Disposable local Supabase validation has
  passed; production application remains a separate migration decision.
- Authenticated Chrome for Testing is available and currently contains live
  production tabs. A route-runner correction was required after an early scan
  accidentally emitted the Next route-group segment `/(app)`; that result was
  discarded. The corrected runner only targets public URLs such as
  `/purchase-requests/new` and `/supplier-items/new`. Full automated navigation
  remains intermittent when the production origin does not answer from the
  runner network, so existing authenticated tabs are used for visual evidence.
- Historical contract gate at the time of this note: 445 passed, 0 failed. The inventory contract now
  explicitly asserts dispatch/receive semantics and rejects app calls to the
  removed all-or-nothing `post_stock_transfer_atomic` action.
- Production migration 113 state is not inferred or modified by this audit.
- The production build compiles and passes TypeScript/Lint, but static prerender cannot finish without isolated `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values. The E2E runner fails closed until an isolated `TEST_BASE_URL` or local fixture server is supplied.
- The next read-only interaction pass was fail-closed: the authorized Chrome session redirected `/purchase-orders/new` to `/login` at all three viewports. No button or mutation result was inferred from that unauthenticated state; the interaction gate remains pending until a valid session is available again.
- A later authenticated pass loaded `/purchase-orders/new` at all three viewports with `New Purchase Order`, `Create PO`, `Save Draft`, and `More`. The DOM contains desktop right-rail actions plus the shared mobile action clone; these are breakpoint-controlled variants, not an instruction to add three visible action rows. No change was made without a visible-duplicate proof.
- Follow-up static pass on `StockCountForm` confirms the default sort is `code`, the user-selected sort is persisted in `localStorage`, and draft snapshots remain on-device while autosave retries or reports a non-retryable failure. The autosave status is exposed as `Saving…`, `Saved`, `Recovered unsaved changes`, or `Save failed — changes kept locally`.
- On 2026-08-01 the Chrome CDP endpoint was unavailable (`127.0.0.1:9222`), so the planned read-only interaction pass for `/goods-receivings/new`, `/purchase-requests/new`, and `/stock-counts/new` was not counted as complete. No production mutation was attempted.
- Shared worktree safety remains active: another session still owns the linked Git index lock and has many uncommitted files. This audit did not stage, commit, push, reset, delete the lock, or overwrite those changes.
- Authenticated Chrome read-only evidence (2026-08-01, 390×844 / 820×1180 / 1440×900): `/stock-counts/new` rendered `Stock Count` with `Save draft` and no alert/overflow; `/goods-receivings/new` rendered `Goods Receiving` with `Save receiving draft` and no alert/overflow; `/purchase-requests/new` rendered `Purchase Request` with `Add line`, `Submit PR`, and breakpoint-appropriate `More options`/`Save Draft` actions and no alert/overflow. No mutation controls were activated.
- The earlier CDP-unavailable note is superseded for this session: the authenticated endpoint is currently reachable and the `/staffs/new` read-only checks above were completed successfully. It remains true that no production mutation was attempted.
- Source inspection confirms Stock Count detail already composes `Save draft` and `Confirm & Post Count` in one shared `DocumentActionBar` and one two-column mobile primary action; autosave status remains inside the count setup surface. No additional layout change was made without a visual defect.
- Legacy route scan found no runtime route files or navigation links for `/settings`, `/settings/backups`, `/data-onboarding`, `/daily-operations`, `/quick-tools`, `/roles/new`, or `/roles/[id]`; matches are historical documentation only.
- `/staffs/new` read-only required-field check (authenticated Chrome, 2026-08-01): `Full Name` and `Email` are the only initially invalid required identity fields; `Role` and `Default Branch` are populated and valid, with six role options and twelve branch options. No visible alert or horizontal overflow was present. The check did not submit the form, so it does not assert server-side invite success.
- Contract gate rerun after the read-only audit: **447 passed, 0 failed** (`npm.cmd run test:contract`, 2026-08-01).
- Staff create form pre-submit probe (read-only): after filling synthetic local values for Full Name and Email, native form validity was `true`; serialized payload included `role_id`, `default_branch_id`, `accessible_branch_ids`, `auth_setup_method=temporary_password`, and an intentionally blank optional temporary password. No submit was performed. If production still returns “Review the required fields”, the remaining fault is server-side validation/auth/duplicate-email/RLS rather than browser required-field validity.
- Stock Card source verification: mobile Movement Summary is `grid-cols-4` (expanding to `xl:grid-cols-8`) with compact metric padding and truncated labels; movement history uses the shared `OperationalListRow` and `formatDateOnly`. This closes the earlier oversized one-metric-per-row annotation at the source level.
- Recipe create source verification: generated `recipe_no` and `version` are hidden inputs; finished product is a controlled select that supplies the product code/name; Yield UOM is a controlled select; System status (Version/Status/Approval) is rendered in the shared tablet action panel. This closes the corresponding `/recipes/new` annotations at source level.
- Shared Filter Bar verification: controls use a 2.125rem compact height; search is first, useful filters follow, submit/result summary remain aligned, complex filters move into `More filters`, and the open mobile dialog hides the bottom navigation. Related contracts passed 8/8.
- A later read-only attempt to visually open `/recipes/new` through the existing staff tab was fail-closed: the tab redirected to `/login?redirectedFrom=%2Frecipes%2Fnew` at all three viewport sizes. No recipe UI or mutation result was inferred from this unauthenticated state; source/contracts remain the only evidence for this route until the session is re-authenticated.
- Read-only report contracts rerun: **23/23 passed** for Costing Readiness, Demand Trend Lite, Procurement Variance, Production Planning Lite, and Production Variance. These remain source/contract evidence only until the Chrome session is re-authenticated for visual review.
- Current contract gate (2026-08-01): **447 passed, 0 failed** via `npm.cmd run test:contract`. The two additional passing contracts cover Stock Transfer reservation/partial receiving and Stock Count cancellation atomicity.
- Current Chrome state (2026-08-01): CDP is reachable, but all authenticated application tabs are now at `/login` or `/access-status?reason=idle-timeout`. No visual pass is claimed from those unauthenticated pages; re-authentication is required before the remaining page-by-page interaction gate can close.
- Regression checks after the audit continuation: `npm.cmd run typecheck` passed and `npm.cmd run lint` passed. No source release version was changed because this pass added only audit evidence and did not introduce a UI batch.
- Strict TypeScript regression (`npm.cmd run typecheck:strict`, including unused locals/parameters) also passed on 2026-08-01.
- Runtime residue scan on 2026-08-01 found no retired-route references (`/settings`, `/data-onboarding`, `/daily-operations`, `/quick-tools`, `/roles/new`, `/roles/[id]`, or `/(app)`) in `src`; console output is limited to the redacting observability logger and no direct `alert()` calls remain.
- Production entry-point scan on 2026-08-01 confirms the Production hub links to `/production/jobs`, `/production/planning`, `/production/variance`, `/recipes`, and `/stock-wastage`; the Production Jobs right rail repeats the planning and variance links, and both report routes have explicit permission entries. The earlier “no entry” annotation is therefore closed at source level; visual confirmation remains part of the authenticated Chrome pass.
- Release metadata check on 2026-08-01: `package.json` and `src/lib/app-version.ts` both report `7.87.0 — Staff Access Default Branch Submission Fix`; no version bump is warranted without a new UI batch.
- Authenticated Chrome read-only audit on 2026-08-02: `/production/jobs` had no horizontal overflow at 390, 820, or 1440px. At the 820px tablet split, the right-rail `New Production Job` action and the mobile FAB were both visible in the deployed build; source remediation now marks the split workspace and suppresses mobile FAB/action-bar variants for 768-1279px. The contract gate and source checks pass; deployed visual follow-up remains pending until this batch is previewed.
- Authenticated Chrome route scan on 2026-08-02: `/staffs/new` and `/account` rendered their expected headings at 390/820/1440px with no horizontal overflow. Multiple action labels in DOM are breakpoint-controlled variants (desktop rail, mobile action surface, and phone navigation); no mutation was triggered.
- Authenticated Chrome route scan on 2026-08-02: `/recipes/new`, `/purchase-orders/new`, and `/goods-receivings/new` rendered expected headings and their intended create/draft controls at phone and tablet widths with no horizontal overflow. The scan was read-only; disabled receiving draft actions remained disabled until required source data is selected.
- Release metadata update: `package.json`, `package-lock.json`, and `src/lib/app-version.ts` now report `7.88.0 — Tablet Split Action Deduplication`.
- 2026-08-03: v8.08.0 unified unposted deletion semantics across Goods Receiving, Purchase Return, Production Job, Stock Transfer, Stock Wastage, and Stock Count. Existing cancel permissions now soft-delete cancelled unposted rows after their atomic transition; transfer reservations are released by the existing transition before the row is hidden from active work. Posted/ledger-impacting records remain protected. Contract suite: 458/458; TypeScript and lint passed. Migration 119 is pushed but not yet applied to Production.
| 2026-08-03 | v8.09.0 | Stock Count draft destructive action | Replaced duplicate Cancel + Delete controls with one explicit Cancel & remove draft action; cancel still uses the atomic soft-delete RPC and redirects away from autosave editor | TypeScript/lint/tests pending in this batch | Production migration 118 must be applied before live cancel removes active work | Notion update blocked: destination authorization unverified |
