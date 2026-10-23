# OMS v10 readiness programme

Status: preparation; **v10 is not accepted or complete**. Baseline is Preview `ae6bc16423842824a212f0054b52d78b4912badd` (READY). Current programme release candidate is **9.2.131**, preserving the existing numeric 9.2.x scheme. A future v10 version requires the gates below; no Production promotion is authorised by this plan.

## One source of truth

- Candidate: branch `codex/v10-readiness-20261023` in the existing `/private/tmp/oms-preview-acceptance-20261023` worktree. Historical branches/snapshots stay unchanged; they are evidence, not alternative release candidates.
- Baseline inventory: `route-ledger.csv`, `role-route-ledger.csv`, `coverage-plan.json`, `source-dependency-edges.csv`. Regenerate with Node 22: `node scripts/v10-readiness-inventory.cjs`. It is offline and reads source only. Do not overwrite accumulated cell evidence in `evidence-ledger.csv`.
- Package version is release authority; the lockfile root versions, `src/lib/app-version.ts`, current PRODUCT/DESIGN entries and one release note must match. `npm run release:check -- --base-ref <full verified deployed SHA>` must pass before every publication; prebuild rejects consistency drift.
- The separate five-test-file fixture patch remained outside 9.2.129; its reviewed hunks are explicitly integrated in 9.2.130, with provenance in FAILURE-TRIAGE-2026-10-23.md. The original worktree remains preserved. The original source at `/Users/seribako/Documents/Codex/2026-10-21/task/oms-ui-stabilization` is detached at `f701ac2065e1da9d568738bcafa126d32b9339ad` with 95 changed paths; it and all historical worktrees are preserved. No wholesale snapshot copying.

## Verified Phase 0 baseline

| Area | Evidence / boundary |
| --- | --- |
| Source | 131 page modules; 35 `/api` handlers plus 3 other handlers (`/auth/callback`, asset attachment read, stock export). 593 TypeScript modules and 3,088 resolved local import edges. Counts are enumeration, not completed page review. |
| Roles | Nine canonical codes from `src/lib/roles.ts`: super_admin, people_operations, finance, manager, purchasing, chef, kitchen, outlet_supervisor, outlet_staff. Shell role inclusion does not prove effective permission/RLS access. |
| Versions | Base package/lock/footer 9.2.128 while PRODUCT/DESIGN latest entry was 9.2.126. Multiple recent Preview commits shared one version. Phase 1 repairs this traceability gap. |
| Runtime | Declared Node 22.x; default host was 24.21.0. Official portable Node 22.23.4 downloaded to `/tmp/oms-v10-runtime`, matched official SHA-256, and used for the baseline tests/build. No system installation/configuration changes. |
| Dependencies | Locked and installed: Next 15.5.21; React/ReactDOM 19.1.0; TypeScript 5.9.3; Supabase JS 2.108.2; SSR 0.7.0. No dependency upgrade in this batch. |
| Baseline test gate | Node 22: 1,700 tests, 1,679 pass, 21 fail. These are known unresolved failures, not waived acceptance. Existing logs are `/tmp/oms-v10-node22-baseline-ae6bc164.log`. |
| Baseline compile | Node 22 build passed using a nonsecret synthetic URL on loopback discard port 9 and a fixture public key. No live database or production credentials. This proves compilation and gives bundle estimates; it does not prove data correctness or speed. |
| Browser | No Browser skill/DOM/screenshot interface is exposed. The user's Preview login does not grant this tool access. Voice-only screen capture was not used. Current authenticated rendered viewport/role coverage: 0 cells. |
| Observability | Vercel deployment metadata readable; runtime-log read returned 403; project/deployment-file reads 404; metric schema readable but one metric query returned 400. No logged-in latency/query baseline was obtained; no changes to observability settings. |

## Prioritised acceptance gates

| ID | Priority | Gate and owner | Evidence needed | Current status |
| --- | --- | --- | --- | --- |
| V10-01 | P0 | Session expiry and uncertain mutation outcomes — auth/session recovery + owning server action | Isolated 401/403/network tests, no replay, accessible recovery; live safe read-only expiry/re-entry; distinguish saved/failed/unknown outcome | Existing simulations; rendered verification blocked |
| V10-02 | P0 | Effective tenant/branch/role access — auth/permissions + module query | Actual nine-role contract matrix; expected denial and data isolation; no impersonation | Code-derived inventory; grants/runtime unresolved |
| V10-03 | P0 | Correct stock/payments/approvals after write — module action/query | Safe isolated fixture transaction evidence and read-after-write; no stale cross-user cache | No cache-policy changes; live mutations excluded |
| V10-04 | P1 | Release identity — package/app footer/docs | Increment above verified deployed version, coherent footer/lock/docs/notes, exact commit/deployment | Implemented in first batch; release pending checks |
| V10-05 | P1 | Remaining annotations — owning components | Each annotated state at matching viewport/version; no Mock substituted for live | Known source/behavior fixes retained; multi-asset transfer unresolved |
| V10-06 | P1 | Every-page usability and accessibility — route owners + shared shells | Loaded/empty/error/loading/long content and beginner task walkthrough; keyboard/focus/contrast; phone/tablet/desktop | 131 routes enumerated; current visual acceptance blocked |
| V10-07 | P1 | Performance baseline — server observability + frontend | Per route p50/p95, samples, navigation LCP/INP/CLS, cold/warm runs, DB call count/duration/waterfall, bundle bytes | Compile sizes captured; live timing unavailable |
| V10-08 | P1 | Cache correctness — cache owner + auth | Ownership/key/TTL/invalidation table and role/tenant isolation; mutation follow-up proof | Initial source map in PERFORMANCE-CACHE.md; no TTL optimisation |
| V10-09 | P1 | Test reliability — test owners | Resolve or explicitly gate all 21 baseline failures with source cause; Node 22 same environment | Open; no assertion weakening |
| V10-10 | P2 | Content/resource density — shared components and page family | One identity/status/action; concise help, consistent OMS names, useful assets, no repeated explanation | Design contract frozen; incremental source/render review planned |

## First bounded batch

Fix release traceability, persist the baseline/coverage/cache contract, and add a failure-enforcing release consistency check. This changes release metadata, documentation and local checks. It does not redesign pages, modify auth/business policy, add indexes, or optimise unmeasured queries. The next product batch must cite a reproducible defect and its owning component/query, with a scoped test and evidence gap.

Karpathy/Ponytail and UI UX Pro Max were discussed as inspiration. This plan adopts minimal diffs, explicit evidence, simple workflows, fewer abstractions and an audited accepted design. No named external tool/repository was installed or run, no external model backend was added, and no repository/data was uploaded to such a service. The existing TypeScript compiler supplies the local dependency graph.

## Definition of v10 readiness

Every applicable route/role/state cell must have exact source SHA, reproduction, owner, test/artifact and outcome. Excluded roles require evidence of correct denial. Source review, isolated fixtures, Mock rendering, live Preview, and Production evidence remain separate. No P0 defect or unknown save outcome may be hidden by a loading state or generic success message. Performance changes require measured before/after evidence on the same conditions. All remaining P1 exceptions must be explicit and approved before final v10 designation. A READY deployment alone never completes these gates.


## Current follow-up state — 9.2.130

The phase-0 baseline records above remain historical. The Node 22 follow-up explicitly integrates the original five-file fixture batch and fixes a demonstrated pending-bridge unmount subcase. Current full-suite debt is 13 failures (1,719 total / 1,706 pass), with no added failure versus 9.2.129. See `FAILURE-TRIAGE-2026-10-23.md` and `failure-triage-20.csv` for each result. Rendered acceptance and real performance measurements remain unfulfilled gates.

## Current semantic checks — 9.2.131

PR header/value/order checks now use real shared-component SSR and release documentation calls the actual release guard. Current Node 22 result: 1,721 total / 1,711 pass / 10 fail, no new failures. See `SEMANTIC-CONTRACTS-2026-10-23.md`. Product source differs only in displayed release metadata. The programme remains unaccepted until actual route/role/viewport/state gates pass.

## 9.2.132 semantic workspace checkpoint

Actual synthetic source execution identified and fixed People Operations AP-aging quick-action exposure. Node 22: 1748 / 1743 pass / 5 retained failures; zero added failure. Five original semantic contracts resolved, while their layout/focus/lifecycle parts remain explicitly pending. See `SEMANTIC-WORKSPACES-2026-10-23.md`. No live-role or performance acceptance is implied.
