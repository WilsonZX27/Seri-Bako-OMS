# Node 22 failure triage and scoped recovery batch

Baseline: deployed `154ca2913ccf21baf2585024f355536ef01f19cf` / v9.2.129. Use the same official portable Node 22.23.4 and unchanged locked dependencies. The exact twenty rows, owners and evidence are in `failure-triage-20.csv`.

- Six failures are proven fixture import/result-shape faults: real product-order imports missing in Daily tests; CSS module imports missing in planning/filter SSR tests; maintenance fixture returns a snapshot object for table queries that require arrays.
- One stale count contract expects nine permission checks although the existing maintenance asset-name read correctly gates on `assets.view`; the actual list contains ten in one batch. No role grant or product permission code changes.
- Twelve source/layout/copy contracts no longer match current structure. They are not declared harmless or visually accepted. They remain open for semantic/rendered comparison rather than replacing regexes with whatever the current source says.
- One external-submit contract expects an old MutationObserver/30-second implementation. Investigating its actual safety requirement demonstrated a real subcase: while pending, unmounting a conditional FormPendingBridge never emits false, leaving the retained external button busy. This batch returns a scoped cleanup from the bridge effect. The cleanup does not confirm success/failure, retry, persist inputs or change the action. Its two isolated actual-callback tests fail before the change and pass after. The original obsolete mechanism assertion remains open; this is not a green-suite rewrite.

## Explicit accounting for the five-file patch

The prior independent worktree `/private/tmp/oms-ui-followup-audit-20261023` remains unchanged with its five modified test files. Its exact diff was saved and checked before applying to the current candidate (not copied wholesale). SHA-256: `1e750d8218243f75a0a1bd994ccb14a470740798e7a579d20b9e9313c1975830`.

Included: daily-tracking-groups, outlet-validation-recovery, performance-read-paths, production-planning-quantity-layout and unified-list-inline-render tests. Existing current source-loader fixes and all assertions are preserved. This provenance prevents double application or silent omission. The separate original dirty product workspace is untouched.

## Executed evidence and limits

37 focused checks passed under Node 22 after the fixture and pending-cleanup changes. The lifecycle tests execute the real transpiled component callbacks with isolated hooks/events; they are simulations, not browser layout or live save tests. Actual form results still require checking the real record before a user retries an uncertain save. Back/forward, tab restoration, overlay stacking, keyboard/focus and role/viewport rendering remain gates.

Live metrics have not become available: previous exact-scope runtime-log read returned 403; no CLI is installed; official connected documentation did not supply a usable scope schema to correct the metric query's 400 response. No denied read was retried unchanged, no credentials or logging destination changed, and no external code was installed. Permission/query-count fixtures are deterministic contracts, not evidence of live speed or slow SQL improvement.

## Final Node 22 comparison

9.2.129 baseline: 1,704 tests / 1,684 pass / 20 fail. 9.2.130 candidate: 1,719 / 1,706 / 13. Exact name comparison found no added failures and seven resolved originals. Previously unloadable module files now execute their contained tests, so the larger total is not a changed denominator hiding failures. The twelve remaining source/layout contracts plus the old external-submit implementation assertion remain failed and open. Typecheck and edited TypeScript ESLint passed.

The only product-runtime change is the bridge effect cleanup in `src/components/ui/submit-button.tsx`; it affects bridge-owning forms through the existing form ID event channel. No mutation call, action handler, server query, grant or cache policy changed. The synthetic hooks/events tests establish callback behavior, not full browser success. Original records must still establish uncertain save outcomes.
