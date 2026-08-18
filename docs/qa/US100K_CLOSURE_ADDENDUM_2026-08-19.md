# Seri Bako OMS — Closure Addendum

**Date:** 2026-08-19 (Asia/Kuala_Lumpur)  
**Branch:** `codex/uiux-round2`  
**Commit:** `219042c` (`fix: guard shared console ownership and enum branch search`)
**Latest code revision under review:** `219042c` (`fix: guard shared console ownership and enum branch search`)

## What was actually fixed

### Shared tablet filters

The blank tablet filter controls were a shared `SelectControl` defect, not a page-by-page CSS defect. Radix Select was receiving a server `defaultValue` while its open state was controlled; after hydration, the trigger could remain visually empty. The component now keeps the uncontrolled/default path in internal state and passes a stable selected value to the shared root. This fixes every consumer through one authority.

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

## Verification receipt

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run typecheck:strict` | PASS | strict no-unused checks |
| `npm run lint` | PASS | `src` lint |
| `npm run test:contract` | PASS | 764 passed, 0 failed |
| `node --test tests/item-creation-atomic-contract.test.js` | PASS | 2 passed, 0 failed |
| `npm run build` | PASS | 75/75 static pages |
| Preview runtime reachability | PASS | `/login` returned HTTP 200; unauthenticated `/items/new` returned HTTP 302 to Vercel SSO, so the protected form was not exposed |
| Supabase migration 167 | PASS | Applied to local and linked databases; CLI emitted a non-blocking pg-delta certificate-cache warning after applying |
| Supabase migration 168 | LOCAL PASS / LINKED UNVERIFIED | Local schema is applied; linked status checks hit a Supabase login-role transport error and a full `--include-all` push was blocked because pending migration scope could not be proven |
| `administration-master-data-ux.spec.js` | PASS | 2/2; cross-route right-rail content stayed present after the ownership fix |
| `p0-browser-comments.spec.js` | PASS on isolated rerun | Full 8-test cold run was 7 passed plus 1 long-chain timeout; the isolated AP/outlet/production test reran 1/1 in 23.2s; no assertion failure remained |
| Git push | PASS | `origin/codex/uiux-round2` at `219042c` |

## Deployment receipt

The previous application revision has a successful Vercel Preview deployment:

- GitHub deployment: `5969508656`
- Preview URL: `https://seri-bako-oms-official-jiagztysw-seribako.vercel.app`
- Preview status: `success`
- Commit: `994a66c`

The latest verified fix commit `219042c` is pushed, but its new Vercel deployment
receipt has not yet been captured. Production promotion remains blocked until that
preview is built and the post-deploy matrix passes.

The custom production domain has **not** been promoted to this revision. The latest
production deployment receipt still points to commit `b49a601` (`fix: backfill
deterministic item suppliers`), deployment `5966903953`. The production login
endpoint is reachable and reports `v8.64.55`, but that is availability evidence,
not proof that the current branch revision is live. Promotion remains an explicit
owner decision after the post-deploy matrix below passes.

The three pre-existing unrelated working-tree changes were intentionally not staged: `next-env.d.ts`, `scripts/playwright-local-server.mjs`, and `supabase/.temp/cli-latest`.

## What is not proven yet

- The custom production domain has not been promoted to this commit; local and branch evidence are not production evidence.
- The Manager Review authorization path still needs a resource-sufficient run with a seeded Manager Review PR. The test is intentionally skipped when that fixture is absent.
- No claim is made that every historical annotation or every browser viewport is closed solely from this run. The shared CSS/component ownership is improved, but a post-deploy 390/820/1440 matrix remains a release gate.

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

1. Promote the reviewed application revision and verify the linked Supabase migration ceiling on the same receipt.
2. Run six roles × 390/430/820/1024/1440/2560 with disposable, known fixtures and capture screenshots plus authorization outcomes.
3. Keep the design system central: query geometry belongs to `UnifiedListHeader`/`FilterBar`/`design-system-v2.css`; controls belong to shared UI components; pages only provide data and semantics.
4. Make the first monetizable decision loop measurable: low-stock signal → buyer action → approved PO → receipt → accepted/rejected/fulfilled outcome, with MYR exposure, owner, due time, UOM and freshness visible.
5. Add supplier performance and UOM conversion ledgers only after their source grain, effective date, confidence and drill-through are defined.

The product's US$100k case is therefore not “more pages.” It is a trusted branch-operations decision system: every number has a source and confidence, every exception has an owner and next action, and every recommendation can be measured against its outcome.
