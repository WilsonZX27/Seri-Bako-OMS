> Latest checkpoint: see `LOCAL-INTEGRATION-VALIDATION.md`. Current35 isolated SQL/action groups and1818 frozen source tests passed; final synthetic-config build and four-width local readonly after-screenshots passed. Earlier investigation/checkpoint text below is historical, not a current Docker/build blocker. No deployment or full JWT/interactive acceptance.

# Asset feature boundary — local proposal only

Source reviewed on139 plus localDaily/UI candidate. No remote schema introspection or writes performed.

## Automatic Asset ID (O16/N11)
Current create_asset_master in migration337 takes mandatory p_code, checks assets.manage and asset_location_access, locks company+client_key and compares the original create payload for retries; inserts asset, holdings and audit in one transaction. next_document_number exists in077 and is replaced in127. Therefore changing only frontend asset_code is insufficient.

Minimal proposed transaction: validate existing tenant/location/manage constraints and payload; lock idempotency key; resolve an existing matching request before allocating; allocate the configured Asset document sequence inside the same transaction; insert asset/holding/audit with generated code; return existing asset on exact retry. Preserve historical imported IDs and edit read-only code. Reject changed-payload key reuse. Never page-load allocation, max+1 or client-side generation. Confirm exact document-type configuration and latest deployed function signatures before a reviewed migration. No new grants proposed.

Isolated SQL validation required: simultaneous distinct requests get distinct IDs; same-key concurrent retry creates one asset/holding/audit and does not consume another sequence; differing payload rejects; validation or later insert rollback leaves no partial records; cross-company/location/permission denial; imported IDs and edit path unchanged. No local database fixture is currently established, so concurrency is not claimed tested.

## Multi-asset transfer (O5/N10)
Current schema337 asset_transfers has one asset_id per request. request_asset_transfer reserves one asset quantity after tenant/location permission checks; advance_asset_transfer transitions one transfer and applies holding effects with audit. No verified batch375 source exists in this candidate. Do not invent missing migration from older workcopies.

Minimal proposed batch header+item schema and atomic RPC must preserve existing per-item availability/reservations, deterministic row locking, tenant/from/to scope, actor permissions and transition audit. Details: From/To/date/reason; Items: legal multi-select, quantities/removal. Batch approval/dispatch/receipt must handle every line or fail atomically; existing single-item historical requests remain valid. No checkbox-only frontend or parallel nontransactional requests presented as one successful batch.

Required isolated tests: duplicate item rejection/coalescing explicit contract, concurrent reservations, stale inventory, double dispatch/receive, idempotent same-key retry, changed payload rejection, partial failure rollback, cross-tenant/location denials, historical single-item compatibility. Schema and RPC changes require a separate reviewed migration decision; none written/executed or deployed here.

## Further inspection / review-only proposal
Allocator127 accepts text document type, but its permission allowlist excludes assets.manage and it checks documents/stock collisions only. Review-only SQL in proposals/asset-numbering-review-only.sql adds exacttype asset + assets.manage eligibility, asset collision check, and allocation after existing company/client-key lock/retry comparison. All existing non-asset permission predicates remain. It does not seed a sequence, add grants or affect import/edit. Generated versus manual mode is recorded to prevent same-key payload reinterpretation. Wrapped in rollback, outside migrations, not executed. This is a scoped permission-contract change requiring review, not a claim of unchanged effective allocator access.

Attempted harmless docker info failed: permission denied connecting to unix:///Users/seribako/.docker/run/docker.sock. No bypass or Docker startup attempted. No existing psql observed. Static proposal tests do not prove PostgreSQL lock/rollback behavior. Need an authorised isolated PostgreSQL test environment before implementing the runtime frontend/RPC switch or claiming concurrency correctness.

## Recovered375 source and isolated proposal
Original workspace /Users/seribako/Documents/ChatGPT/Seri Bako OMS (Mac)/supabase/migrations/375_asset_transfer_batches.sql is untracked (gitstatus??, no pathcommit). Its secondhistoricalworkcopy is byte-identical SHA2566628b525b853f6c556bdd0c698a092fc92e4c68ba3a3ec401c1712c39f47d29a. It is not present in139 ancestry. Copy retained only under docs/v10/proposals/asset-transfer-batch-review-only.sql, wrappedrollback, no active migration.

Recovered design: company/clientkey batchheader; FK-linked existingtransferlines; single-line transitionguard; scope-limited RLS; batchrequest reuses request_asset_transfer in stableassetorder; batchadvance reuses advance_asset_transfer for everyline before updatingheader; security-invoker register includes historicalsingletransfers. Dependencies337and357exist in139 source, but deployedDBstate not verified. New table/grants/RPC are a reviewedschema/accessboundary, not a UI-only change.

Concrete defect in untracked375: jsonb_typeof(NULL)<>array evaluatesNULL, so null-lines can escape size checks and create emptyheader. Proposal uses IS DISTINCT FROM array to reject null as well as othernonarrays. Statictests cover guard and source ordering; no claim actualSQLexecution/locks/RLS. Need isolatedPostgres to test concurrentreservations/idempotency/partialrollback/tenant&branchdenials/historicalsinglecompatibility before runtimeintegration.

Database runtime checkpoint: postgres/initdb/pg_ctl/psql/supabase absent fromPATH; no HomebrewPostgresopt orPostgres.app; no installedPGlite/pg runtime. Project verify-local-schema uses Dockerexec/psql and checkscontainername/runningstate; it cannot establish syntheticdataisolation byitself. DockerCLIexists but socketaccessdenied. No tool route was retried/elevated; no SQL target provedisolated or SQLexecuted. Specific prerequisite is supportedaccess to a separately identified syntheticPostgres scratchinstance, notProductioncredentials or genericlogin.

Correction after project-local tooling check: Supabase CLI is absent only fromPATH, not from project dependencies; node_modules/.bin/supabase wrapper is installed. It resolves a platform binary and performs no installation in the inspected wrapper. No status/start command was executed because the projectlocal DB harness still depends on the alreadydenied Docker socket. NativePostgres executables remainabsent.
