# Seri Bako OMS — Closure Addendum

**Date:** 2026-08-19 (Asia/Kuala_Lumpur)  
**Branch:** `codex/uiux-round2`  
**Commit:** `35bfdf5` (`feat: clarify item sourcing readiness`)
**Latest code revision under review:** `35bfdf5`; this commit includes the shared tablet fix follow-up, item sourcing readiness read model, and local E2E env parser hardening.

## What was actually fixed

### Shared tablet filters

The blank tablet filter controls were a shared `SelectControl` defect, not a page-by-page CSS defect. Radix Select was receiving a server `defaultValue` while its open state was controlled; after hydration, the trigger could remain visually empty. The component now keeps the uncontrolled/default path in internal state and passes a stable selected value to the shared root. This fixes every consumer through one authority.

The follow-up tablet regression was also shared, not page-specific: the query
header calculated grid tracks from filters alone while the Search/result group
was placed into the final two tracks. On three- and four-control forms this
could overlap the last filter or remove the intended breathing space. The
shared header now reserves those two action tracks and keeps filters left,
Search plus count right. Contract coverage was updated so a route cannot
silently reintroduce the overlap.

### Low Stock healthy-empty state

`getLowStockItems` treated a successful zero-row summary as an unavailable read and threw a blocking page error. The query now distinguishes:

- successful empty summary: valid “Stock levels are healthy” state;
- null/missing summary payload: unavailable and fail-closed;
- summary error with failed fallback: unavailable and recoverable error.

This prevents a normal zero-result business state from becoming an opaque application error.

### Browser evidence contract

The dashboard tablet assertion now checks that the desktop action rail is hidden to users, rather than requiring the desktop-only node to be removed from the DOM. The Manager Review role test explicitly skips when the disposable local fixture contains no Manager Review PR; it does not convert missing test data into a false product failure.

### Inline daily-record validation

The daily-record save RPC now includes the affected product name and stable code
when wastage exceeds received without a remark (`167_inline_outlet_daily_validation_context.sql`).
The form extracts that code, opens the affected line's details, scrolls it into view,
focuses the remark input, and renders the correction hint inline. This closes the
specific “error but no way forward” path shown in the audit screenshot without
depending on a floating toast alone.

### Item creation boundary

Item creation now uses one progressive-disclosure form for the item master plus
optional default supplier terms and branch availability. The server action calls
`create_operational_item` (`168_atomic_operational_item_creation.sql`), which is
tenant-scoped, permission-gated, and atomic: an item can remain `master_only`,
become `supplier_ready`, or become `branch_ready` in one transaction. Supplier
item code/name are not duplicated as user-owned identity; migration 154 keeps the
Item Master authoritative. The existing supplier-item and branch-mapping screens
remain available for later correction and bulk maintenance.

The item detail workspace now also reads a bounded sourcing summary and exposes
one readiness state plus one next action. This is intentionally read-only: it
does not pretend that editing the item master also edits supplier terms or branch
relationships. The existing mapping form remains the write authority until a
transactional update contract is proven.

### Shared action-rail navigation race

The shared `RightConsoleMount` now assigns each mounted route a unique symbol owner.
An outgoing route cleanup can only clear the content it owns, so a late cleanup from
the previous page cannot erase the next page's desktop/tablet action rail and leave
the user with the generic `Workspace Context` panel. The administration master-data
E2E now passes 2/2 after repeated cross-route navigation.

### Branch enum search

Branch search no longer applies `ilike` to the PostgreSQL `branch_type` enum. Code and
name remain fuzzy text searches; recognized branch types use an exact enum comparison.
This removes the `operator does not exist: branch_type ~~* unknown` failure that made
the branch directory render a false unavailable state.

### Shared table density and form accessibility

Action-led tables now use one shared density contract: the Action header and its
action cell stay at a 40px column, while only those tables opt into fixed layout.
This prevents the table algorithm from expanding a compact action column to 64px
and avoids page-specific width overrides. The shared Field primitive now preserves
generated label associations, and the PR request branch, item combobox, and quantity
controls expose explicit accessible names as a defensive fallback for custom controls.
The release-gate assertions now verify the real filtered-state contract and ignore
CSS-hidden controls rather than treating them as visible accessibility failures.

## Verification receipt

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run typecheck:strict` | PASS | strict no-unused checks |
| `npm run lint` | PASS | `src` lint |
| `npm run test:contract` | PASS | 765 passed, 0 failed |
| `node --test tests/item-creation-atomic-contract.test.js` | PASS | 2 passed, 0 failed |
| `node --test tests/filter-layout-authority-contract.test.js tests/workspace-canvas-authority-contract.test.js tests/cross-platform-shell-contract.test.js` | PASS | 21 passed, 0 failed; shared tablet filter geometry |
| `release-mobile-ux-7-5.spec.js` targeted mobile shell | PASS | 1/1 after aligning local fixture env parsing; full viewport/role run was not claimed because the dev-server chain exceeded the bounded run window |
| `npm run build` | PASS | 75/75 static pages |
| Preview runtime reachability | PASS | Latest preview `/login` returned HTTP 200; unauthenticated `/items/new` returned HTTP 302 to Vercel SSO, so the protected form was not exposed |
| Supabase migration 167 | PASS | Applied to local and linked databases; CLI emitted a non-blocking pg-delta certificate-cache warning after applying |
| Supabase migration 168 | LOCAL PASS / LINKED UNVERIFIED | Local schema is applied; linked status checks hit a Supabase login-role transport error and a full `--include-all` push was blocked because pending migration scope could not be proven |
| `administration-master-data-ux.spec.js` | PASS | 2/2; cross-route right-rail content stayed present after the ownership fix |
| `release-gate-7-23-5-7.spec.js` | PASS | shared visual/accessibility gate 1/1 plus logout 1/1; Action column measured at 40px |
| `release-mobile-ux-7-5.spec.js` | PASS | 7/7; phone FAB/document action, unified filter drawer, empty states, desktop rail and 768–1023 split-rail contract |
| `role-workspaces-7-23-5-6.spec.js` | PASS | 6 role workspaces plus release-gate suite: 8/8 passed in the same local fixture run |
| `p0-browser-comments.spec.js` | PASS | 6/6 local tests passed after giving the two intentionally long cross-route viewport chains an explicit 120-second budget; no assertion failure remained |
| Git push | PASS | `origin/codex/uiux-round2` at `35bfdf5` |

## Deployment receipt

The verified functional revision has a successful Vercel Preview deployment:

- GitHub deployment: `5970396704`
- Preview URL: `https://seri-bako-oms-official-3rt339isu-seribako.vercel.app`
- Preview status: `success`
- Commit: `2e67cae`

The later revisions after the functional preview receipt are pushed
after the functional revision. The receipt above is therefore historical evidence
for the functional code path, not proof that the current branch revision is live.
Production promotion remains blocked until a current deployment receipt, linked
migration status, and the owner-approved production promotion are captured.

The custom production domain has **not** been promoted to this revision. The latest
production deployment receipt still points to commit `b49a601` (`fix: backfill
deterministic item suppliers`), deployment `5966903953`. The production login
endpoint is reachable and reports `v8.64.55`, but that is availability evidence,
not proof that the current branch revision is live. Promotion remains an explicit
owner decision after the post-deploy matrix below passes.

The unrelated working-tree changes were intentionally not staged: `next-env.d.ts`, `supabase/.temp/cli-latest`, and `tests/e2e/helpers.js`. The local Playwright server parser is part of the current stability change.

## What is not proven yet

- The custom production domain has not been promoted to this commit; local and branch evidence are not production evidence.
- The Manager Review authorization path still needs a resource-sufficient run with a seeded Manager Review PR. The test is intentionally skipped when that fixture is absent.
- No claim is made that every historical annotation or every browser viewport is closed solely from this run. The shared CSS/component ownership is improved, but a post-deploy 390/820/1440 matrix remains a release gate.
- The responsive release suite now encodes the current architecture instead of the retired “mobile bar/table everywhere” contract: phone create FAB or document action, phone operational lists/empty states, tablet split rails, and desktop-only right console. This is test-contract closure, not production deployment proof.

## Remaining P1 design boundary: item creation

The current item workflow is no longer split for new item creation. The data
dependency remains real for existing records and corrections:

`item master → supplier item → branch supplier-item mapping`

`SupplierItemForm` still owns correction and bulk-maintenance fields. The new
`createItem` path now delegates the first creation to one transactional RPC with
optional sourcing defaults and explicit branch scope. The remaining proof gate is
real-role E2E coverage for owner/purchasing/kitchen plus rollback and 390/820/1440
viewport evidence; the dependency graph remains in
`docs/operations/ITEM_CREATION_REFACTOR_PLAN.md`.

## Final closure direction

1. Read the canonical productisation plan in
   [`US100K_PRODUCTIZATION_PLAN_2026-08-19.md`](./US100K_PRODUCTIZATION_PLAN_2026-08-19.md)
   before adding more UI scope.
2. Promote the reviewed application revision and verify the linked Supabase migration ceiling on the same receipt.
3. Run six roles × 390/430/820/1024/1440/2560 with disposable, known fixtures and capture screenshots plus authorization outcomes.
4. Keep the design system central: query geometry belongs to `UnifiedListHeader`/`FilterBar`/`design-system-v2.css`; controls belong to shared UI components; pages only provide data and semantics.
5. Make the first monetizable decision loop measurable: low-stock signal → buyer action → approved PO → receipt → accepted/rejected/fulfilled outcome, with MYR exposure, owner, due time, UOM and freshness visible.
6. Add supplier performance and UOM conversion ledgers only after their source grain, effective date, confidence and drill-through are defined.

The product's US$100k case is therefore not “more pages.” It is a trusted branch-operations decision system: every number has a source and confidence, every exception has an owner and next action, and every recommendation can be measured against its outcome.
