# Inventory first-load failure diagnostic enhancement

Base `9faeb0e`. Local implementation/tests only. No production/browser action, provider query, deployment, timeout/retry/permission/data/configuration change. No new quota blocker occurred.

## Evidence checked and unresolved cause

Existing source and `docs/qa/product-uom-preview-20261105.md:33-35` show InventoryPage waits on dashboard summary, daily movement and permission map concurrently under a12s inventoryReadDeadline. A rejection or aggregate deadline reaches RecordDetailError; retry refresh/reset performs another server read. boundedInventoryInsight already retries returned transient errors at350/900ms, up to3 attempts; thrown errors propagate. The deadline does not cancel outstanding work. Retry succeeding cannot distinguish RPC, network, permission, fallback or deadline causes.

Existing Supabase timing logs only slow fetch-to-header samples with relation/method/status; aggregate latency windows are process-local. Existing optional inventory warnings do not provide one common workspace attempt or a snapshot of which of its three dependencies remained pending. No runtime log matching the actual failed request/digest was available in local evidence; denied Vercel endpoints were not retried. No causal claim is made.

## Minimum scoped change

- New `src/server/observability/inventory-read.ts` wraps only the three Inventory workspace reads and the existing deadline aggregate.
- Emits one event per attempt after aggregate settlement/rejection, behind the existing RELIABILITY_OBSERVATION_ENABLED flag. Success event is named settled, because fulfilled promises can legitimately contain explicit unavailable/fallback states; it does not declare the business data healthy.
- Fixed source `inventory.workspace`, random operationId, total duration, and summary/movement/permissions status (pending/fulfilled/rejected) plus completed duration. Deadline snapshot captures pending dependencies; later completion cannot mutate that emitted snapshot or produce duplicate events.
- Error category is a fixed timeout/abort class or allowlisted SQL/PostgREST/HTTP-like code; unknown errors become read_failed. No raw errors/messages/stacks, URLs, request IDs from users, tokens, cookies, identities, company/branch IDs, filters, periods, values or records are passed to the new logs.
- Logger type gains a narrow readStates field. Existing general logger behavior is unchanged. Each retry/new render receives its own unrelated random operationId; no cross-user/session identifier is added.
- Original values/rejected objects, existing error boundary,12s deadline, retry delays, fallback behavior, permission checks and parallel start are preserved. Diagnostic logger or malformed diagnostic metadata failure cannot replace the original result/error.

## Verification

21/21 tests pass across new inventory-read-diagnostics, existing deadline, dashboard, purchase-unit render and retry contracts. Diagnostics fixtures cover successful-but-unavailable payload (not logged), raw sensitive error suppression, pending timeout and immutable late-settlement snapshot, separate retry IDs, allowlisted codes, disabled observation, logging failure and throwing metadata. Existing page render fixture received only a stub for the new observability dependency; its business assertions remain unchanged. Focused ESLint, full TypeScript and diff whitespace checks pass.

## Rollout and authorization

This local code/test work is already within the delegated authorization and needs no additional user permission. Nothing was deployed or enabled remotely. Normal source review/release authorization remains owned by the main thread; no payment, provider setting or new logging integration is required. Effective hosted observation flag and log access are unverified. If disabled, the new events will not emit; this patch does not change that flag.

After an authorized release, use event timestamp and operationId to inspect one failed attempt's stage snapshot and a subsequent settled attempt. This is not automatic linkage to Next's client-visible error digest, SQL execution timing, RPC attempt count or cold-start proof. A pending stage at deadline identifies where waiting occurred, not why; its existing sanitized RPC timing/log evidence is still needed before any corrective timeout/query/config change.

## Integration review on 9faeb0e

No raw exception object is forwarded to the new warning/info calls: only fixed messages and explicit primitive state/classification fields. Existing logger context is serialized directly, so this explicit allowlist (rather than general logger redaction) is the relevant protection. Completed state objects are replaced rather than mutated, preserving the shallow emitted snapshot when late promises settle. Original rejection identity and returned values remain intact. No authorization, authenticated client, query/RLS, deadline or retry change. The three existing reads still start concurrently.

Important flag behavior: `reliabilityFlags.observation` defaults true unless `RELIABILITY_OBSERVATION_ENABLED` equals `false`. Deployment may therefore add one event per Inventory workspace attempt without an environment edit. This is deliberate sanitized operational logging, not proof of the effective hosted flag. Log-volume/retention/cost impact was not measured. Operation IDs are random per attempt and are not tied to client-visible Next digests or user identities.

38 tests pass across diagnostics, deadline, dashboard, unit guards, retry, performance paths and permission-helper equivalence. Runtime lint passed. Logs: `/tmp/oms-inventory-diagnostics-integrated.log`, `/tmp/oms-inventory-diagnostics-build.log`. Intermittent initial-load root cause remains unknown; no provider log read or browser use occurred.

Full Next build including TypeScript completed with exit 0; existing build warnings remain. Vercel Ready, effective hosted flag and real incident event capture remain unverified.
