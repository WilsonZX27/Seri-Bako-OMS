> Latest checkpoint: see `LOCAL-INTEGRATION-VALIDATION.md`. Current35 isolated SQL/action groups and1818 frozen source tests passed; final synthetic-config build and four-width local readonly after-screenshots passed. Earlier investigation/checkpoint text below is historical, not a current Docker/build blocker. No deployment or full JWT/interactive acceptance.

# Asset features v1 — local application candidate

Base: 9.2.139 `dc3b822245d3cb1c4e9f599690c4b91250853638`. No commit, push, deployment, real sequence allocation or remote SQL. Existing UI work and localhost3210 remain intact.

## Implemented locally

Automatic ID: registration reads an explicit version1 database capability. Only a supported, configured Asset sequence enables read-only “Assigned on registration”; the create action rechecks capability and sends blank `p_code` with the same client key. Manual historical IDs, unknown versus zero quantities, original edit IDs, validations and error feedback remain. Allocation happens inside the proposed create transaction, never on page load. No sequence configuration is seeded.

Multiasset: source-scoped Request details + Assets list; multi-selection, per-line quantities/removal, one local search retaining selected payload; one atomic request RPC, stable client key and request date. Register includes batch headers and historical singles. Batch detail contains every line, request date and paginated per-line history. Approval/rejection/dispatch/receipt use the batch RPC; historical singles retain their RPC. Partial visible line sets fail closed. Related queries use the authenticated client, explicit company filters and existing RLS; source access is checked before holdings. Metadata loads in100-ID chunks. No admin query was added.

## Database prerequisite (not enabled against139)

Review/install order, subject to separate schema/access approval:
1. `proposals/asset-numbering-review-only.sql`: replacement allocator/create transaction. Scoped new `assets.manage` eligibility for the `asset` allocator is a permission-contract change requiring review; no role assignment or grant was executed.
2. `proposals/asset-transfer-batch-review-only.sql`: batch header, membership guard, RLS, RPCs and invoker register. New table/function privileges require review.
3. `proposals/asset-feature-capabilities-v1-review-only.sql`: version1 readiness RPC, installed only after both contracts. Read-only metadata; no allocation. Automatic mode additionally requires the active company Asset sequence. No public/anon execution.

These are versioned review proposals outside active migrations and wrapped in rollback. They must not be executed as deployment scripts. Package an approved migration only after target schema reconciliation; do not infer deployed schema from repository files. Missing readiness RPC returns legacy mode only for known missing-function codes; permission/network/malformed responses remain errors. Mock mode stays legacy, rather than pretending SQL integration exists.

## Checks actually performed

Node22.23.4. Asset plus affected annotation tests78/78; final complete source suite1817/1817 (1813 top-level tests plus nested cases),0fail. Product typecheck, touched-file lint and diff whitespace passed. Logs: `/tmp/oms38-application-targeted-v1.log`, `/tmp/oms38-application-integration-full-v1.log`.

New tests execute actual action/parser/query/component code with explicit synthetic DB/auth adapters: old capability fallback/error separation, auto/manual payloads, key reuse, failed outcomes, canonical UUID duplicates, quantity/date/line limits, one whole-batch RPC, lifecycle routing, company/source checks, inaccessible header, partial-line rejection, pagination, selected-line persistence during search, removal, pending lock and error presentation. Existing legacy test harnesses now explicitly model the pre-feature DB; assertions were retained. Two old “no submit button anywhere” assertions now distinguish the source GET “Load assets” button from the one shared legacy search action.

Existing18 PostgreSQL groups prove representative transaction proposals, concurrency, idempotency, rollback and synthetic boundaries. They do not prove full application JWT/RLS or actual HTTP-to-database behavior. Scratch container was removed after preserving evidence. No unchanged database rerun was started.

## Remaining gates / estimate

Not complete: actual new-form/detail four-viewport browser review; full isolated Supabase JWT/RLS and application-to-DB wiring; reviewed schema/allocator contract and target sequence configuration; controlled release/build with legitimate environment. No new build was claimed: this checkout has no authorised build configuration for the required Supabase public environment, and no credentials were copied.

Therefore a whole-feature or all38 completion clock time cannot responsibly be promised. The next bounded deliverable is a browser-reviewed local candidate and a reviewed migration plan; its duration depends on those concrete runtime/schema gates. Do not turn1817tests into a claim of deployment or feature acceptance.

Rollback planning must preserve created batch/audit data: do not drop tables or erase sequence history. Retain compatible batch reads/whole-document transitions when reverting new-entry UI. Old139 alone is not an adequate operational rollback after real batches exist; that path must be rehearsed before any release.

Final source review also removed the batch-view total's single-line integer narrowing (`sum(quantity)::bigint`), with a static regression. The existing18database groups predate this projection change and the new capability RPC; those additions still need PostgreSQL/full-integration validation. This is not hidden by the application suite result.
