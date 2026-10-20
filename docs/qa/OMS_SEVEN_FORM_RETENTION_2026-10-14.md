# Seven form backend rejection checks

Scope: isolated synthetic localhost:3190 only. No production, deployment, Library upload, or valid business writes. Each probe deliberately supplies an input rejected before business mutation. Browser native checks are bypassed only for that invalid field so the real server action executes; native validation alone does not count.

## Reproduced and fixed

- Supplier Item and UOM Conversion create previously threw schema errors into the route error boundary, losing input. Create/update now return schema-preflight errors and preserve all submitted fields using action state. Authorization stays before validation. Mutation-stage failures retain their original behavior; safe retry after ambiguous partial writes is not claimed.
- Stock Wastage previously redirected to a new blank form on schema rejection. It now returns schema-preflight errors and retains header fields, selected lines, quantities, batch and reason fields. Numbering/RPC failures still use the original handling; no general mutation-retry guarantee is added.

## Validation

- Two runtime regression tests exercise the real schemas and actions: master-data create/update errors occur before database access; permission rejection still throws; invalid wastage date does not reach numbering or RPC.
- Changed-file ESLint and TypeScript passed before the combined build. The existing branch-default source contract was updated to require both retained failed-submit selection and the original initial-branch fallback; all five related tests passed.
- Browser script: `scripts/integration/verify-seven-form-rejections-local.cjs`. Each case requires two actual server POST responses, visible rejection feedback and retention of a changed input for both attempts. It intentionally never submits valid business data.
- After the coordinated build, all **7 of 7** cases passed: Supplier Item, UOM Conversion, Stock Wastage, Stock Transfer, Stock Count, Outlet Daily Record and Asset Transfer. Each passed two rejected submissions, for **14 actual backend POST responses**, 12 HTTP 200 action responses plus two Stock Count HTTP 303 validation redirects, all with visible errors and retained values. Supplier Item also retained MOQ, lead time, conversion ratio and valid-from date.
- Evidence: `docs/qa/evidence/2026-10-14/seven-form-backend-retention.json` and the seven adjacent `backend-retained-*.png`. These are synthetic evidence, not real operational acceptance.

## Boundary / remaining

The seven cases cover rejected backend input and the ability to edit/retry another rejected input. They do not certify success-path mutations, post-write network ambiguity, populated line combinations at scale, or physical mobile devices. Those dimensions must remain explicitly separate from this scoped result.
