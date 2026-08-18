# Seri Bako OMS — Closure Addendum

**Date:** 2026-08-19 (Asia/Kuala_Lumpur)  
**Branch:** `codex/uiux-round2`  
**Commit:** `29b6766` (`docs: record closure verification addendum`)

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

## Verification receipt

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run typecheck:strict` | PASS | strict no-unused checks |
| `npm run lint` | PASS | `src` lint |
| `npm run test:contract` | PASS | 759 passed, 0 failed |
| `npm run build` | PASS | 75/75 static pages |
| local Supabase migration 167 | PASS | RPC replacement applied to local database |
| `p0-browser-comments.spec.js` | 5 passed, 1 skipped | 820/1180 tablet filters, dashboard, UOM/PO, AP/outlet/production, Low Stock passed; Manager Review skipped because local fixture has 0 records |
| Git push | PASS | `origin/codex/uiux-round2` at `29b6766` |

## Deployment receipt

The exact commit has a successful Vercel Preview deployment:

- GitHub deployment: `5968639090`
- Preview URL: `https://seri-bako-oms-official-lma097ni0-seribako.vercel.app`
- Preview status: `success`
- Commit check: `Vercel Preview Comments` = `success`

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

The current item workflow is intentionally not “fixed” by a page-local shortcut.
The data dependency is real:

`item master → supplier item → branch supplier-item mapping`

`SupplierItemForm` already owns purchase UOM, conversion, cost, MOQ, lead time,
preferred supplier, and branch mappings. `createItem` currently owns only the item
master row. Combining these writes without an atomic server contract would create
partial records (an item with no usable branch mapping, or a mapping pointing at a
failed item). The safe product direction is a single progressive-disclosure screen
backed by one transactional RPC/action, with optional sourcing defaults and an
explicit branch scope. That design is queued as P1; it is not represented as closed
until the atomic write, rollback behavior, permissions, and real-role E2E fixture
are implemented and verified.

## Final closure direction

1. Promote the reviewed application revision and verify the linked Supabase migration ceiling on the same receipt.
2. Run six roles × 390/430/820/1024/1440/2560 with disposable, known fixtures and capture screenshots plus authorization outcomes.
3. Keep the design system central: query geometry belongs to `UnifiedListHeader`/`FilterBar`/`design-system-v2.css`; controls belong to shared UI components; pages only provide data and semantics.
4. Make the first monetizable decision loop measurable: low-stock signal → buyer action → approved PO → receipt → accepted/rejected/fulfilled outcome, with MYR exposure, owner, due time, UOM and freshness visible.
5. Add supplier performance and UOM conversion ledgers only after their source grain, effective date, confidence and drill-through are defined.

The product's US$100k case is therefore not “more pages.” It is a trusted branch-operations decision system: every number has a source and confidence, every exception has an owner and next action, and every recommendation can be measured against its outcome.
