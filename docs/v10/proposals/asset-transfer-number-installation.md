# Review-only installation, activation and rollback

This candidate is separate from Import commit 14a886c7 and the current 17-item integration. The first c85ac3b3 draft is superseded; do not install its SQL alone.

## Prerequisites

Before any installation, use only an already authorised read-only connection to capture exact installed definitions/ACL/RLS for document_sequences, document_sequence_periods, asset_transfers, asset_transfer_batches, asset_transfer_register and transfer creation/advance RPCs. Compare them to the source hashes in full-rpc-results.json. No authorised production connection was established for this task, so this preflight remains open; no credentials were obtained.

The local complete-RPC suite loads repository337/339/357/376 and the reviewed batch proposal verbatim, plus exact repository sequence-table DDL. Identity/catalog tables and auth helpers are synthetic. Its dynamic results are meaningful for that source contract and do not prove installed-schema equivalence.

Recheck migration ledger, pending proposals, object-name collisions and actual default ACLs. This checkout has numbered migrations through377 and named review proposals378 (asset settings) and379 (AutoCount). This feature intentionally has no assigned migration number; do not assume380 is free or reuse378/379. The new object names do not otherwise occur in the checked source tree. Production/pending parallel work may differ.

Verify no supported API path forces `SET CONSTRAINTS ... IMMEDIATE`. Both numbering triggers must remain deferred until normal commit. Do not force them immediate: that can take the company numbering lock before a batch's asset locks and restore the original deadlock risk. This candidate supports the existing normal RPC commit path and same-actor combined transactions, not arbitrary database clients that override deferral. Fail deployment preflight if that contract cannot be established.

## Exact SQL changes

The SQL is wrapped in BEGIN/ROLLBACK for review. Only a separately approved migration may persist it.

- Adds asset_transfer_numbers: company/document primary key, case-insensitive company/number uniqueness, RLS, authenticated SELECT constrained by existing parent transfer/batch RLS and assets.view. No authenticated write privileges. service_role receives SELECT only, for audit/backup; no ledger INSERT/UPDATE/DELETE.
- Adds asset_transfer_numbering_activation: empty company gate table, enabled NOT NULL DEFAULTfalse, RLS and no authenticated/anon/PUBLIC privileges. service_role receives SELECT only. No gate rows or sequence settings are inserted by installation.
- Adds assign_asset_transfer_number: SECURITY DEFINER with fixed search_path; no direct EXECUTE for authenticated, anon, PUBLIC or service_role. Trigger requires matching current company, assets.transfer, gate=true and valid active asset_transfer sequence.
- Adds two AFTER INSERT CONSTRAINT triggers, DEFERRABLE INITIALLY DEFERRED, one on asset_transfers and one on asset_transfer_batches. At commit, the single trigger reads the final persisted batch_id and skips batch members; the batch trigger numbers its surviving header. Neither relies on residual app.asset_batch_transition state. Both allocate only after the business RPC has acquired its asset locks.
- Adds two authenticated-only SECURITY INVOKER read RPCs: get_asset_transfer_numbers(uuid[]) and get_numbered_asset_transfer_register(integer,text,text). Direct EXECUTE is revoked from PUBLIC/anon/service_role. Existing parent RLS and company scope apply. The register joins the actual legacy source_id and converts only the paged records to JSON.
- Uses the existing document_sequence_periods counter for document_type asset_transfer / period_start1970-01-01, and updates that type's document_sequences summary. No generic next_document_number replacement, existing RPC/view replacement, existing table-column change, global renumbering, history rewrite or automatic backfill.

Numbers become visible only after successful transaction commit. A failure at deferred allocation rolls back the entire request. Existing app/API callers receive the same UUID; after commit, the candidate UI reads the business number. Old app versions can continue using UUID/source references.

## Default off and explicit company activation

Installation is disabled even if an existing asset_transfer sequence is active: the separately created activation table is empty and the trigger returns before allocating.

A separately approved activation must establish BOTH conditions for the verified company:

1. Review document_sequences type asset_transfer with an explicitly approved prefix (AT versus AST is pending), approved padding, reset_frequency never, a verified continuation next_number, active status and no deletion. Do not guess a company UUID or sequence continuation. Inspect existing source IDs/ledger first; existing AT-like source IDs are skipped case-insensitively during allocation. Leave other document types untouched.
2. Explicitly set that company's asset_transfer_numbering_activation.enabled=true. Gate ownership/write permission remains with the separately approved SQL operation, not the user-facing API.

Do not reset an existing counter or backfill historical records. Preserve generated numbers after rejection or completion. The current transfer API has rejection, not a new cancel/delete action; cancelling an uncommitted transaction leaves no request, number or counter change.

Full application release requires app+reviewed SQL together. With SQL absent, ordinary list/detail reads retain legacy fallback; an explicit number search reports that the database update is unavailable. New searches accept business numbers, legacy source IDs and UUIDs; routes/actions continue using UUIDs.

## Rollback

Disable the specific company's activation gate (`enabled=false`) through a separately approved operation. This stops new numbering even if the sequence remains active. Deactivating only that type's sequence is an additional stop if required. Existing UUID-based request RPCs continue working, and the ledger, numbers, history and counter remain intact.

Revert the candidate app if needed. Preserve both new tables and asset_transfer counter rows for audit and safe reactivation. Do not reset counters, remove/reassign numbers, delete history or drop the ledger as an automatic rollback. After all clients are reverted, separately review removal of the two triggers and three new functions. Backups/restores must explicitly include the new ledger and activation table; service_role is read-only on them, so a restore needs its own approved owner-level path.

## Verified and open

The full local RPC suite verifies idempotent single/batch retries, changed-payload rejection, rejected/received history preservation, same-transaction batch→single and advance→single numbering, quantity conservation, failed/explicitly rolled-back transactions, 12 concurrent single requests, 6 same-key concurrent batch calls, single/batch lock interaction, RLS/search, default-disabled gate, ACLs and deactivation with old API calls. Separate focused SQL tests cover24 concurrent allocations, collisions, growth beyond999 and counter rollback. Rendered source-template checks cover numbered list/single/batch labels and UUID links.

Open: exact installed-schema/ACL/ledger preflight; real authentication and full app browser/search acceptance; physical iPad; representative-volume query plans; full build; final numbered-migration/production approval. No production SQL install, activation, backfill, business write, push or deploy was performed.

## Frozen COMMIT installation artifact follow-up

`sql-candidates/383_asset_transfer_numbers.INSTALL-CANDIDATE.sql` is the actual atomic BEGIN/COMMIT candidate.383 remains proposed/unreserved. The original review-only ROLLBACK file is preserved unchanged. The installation file changes only the explanatory header and final transaction terminator; its schema, functions, ACLs and default-OFF behavior match the reviewed body.

Latest integration handoff9bf9d4e reports live read-only confirmation of ledger382 and batch-compatible tables/functions. This is supplied evidence, not a production operation by this task. Before actual installation, recheck383 remains free and match that target catalog to the recorded contract. Do not repeat380–382. Install AT schema candidate before deploying its matching app, verify empty activation/ledger and bounded ACLs, and record the assigned migration through the approved migration runner. The file does not itself edit the migration ledger. Enablement remains a separate company-specific approval; install performs no gate/sequence insertion, no activation or history backfill.

The targeted full RPC test now executes the installation file verbatim, with no transaction-token substitution, then verifies committed schema from a separate database command and an empty gate. It performs local-only simulated enablement, concurrency and gate-off data-preserving rollback. Existing boundaries (normal deferred commit, UUID compatibility, no forced IMMEDIATE) still apply. Production installation/activation/push is not authorised by this artifact.


## Preview UUID display follow-up (2026-11-03)

Display rule: prefer the persisted document_no without rewriting its prefix; otherwise retain a readable legacy source_id. Missing/blank numbers and UUID-shaped legacy references display `Unnumbered`. UUID primary keys, URLs, searches and request payloads remain unchanged. This is an honest missing-number state, not completion of numbering. Do not generate client row numbers or imply a label has been persisted.

AT versus AST remains undecided. Neither installation nor this display fix enables allocation or modifies historical records. Test fixtures containing AT/AST are examples, not a production configuration decision.

Enablement requires separately approved company, prefix, padding and verified continuation, then company gate activation. Only transfers committed after enablement receive a number; one batch parent gets one number and its lines share it. Existing unnumbered records remain unnumbered. Deactivation preserves all assigned numbers and counters. Changing the prefix later must not rewrite issued numbers and requires another reviewed configuration decision.

Historical backfill is NOT implemented or authorised. A separate proposal must enumerate eligible single transfers and batch parents per company (including explicit decisions for rejected/completed records), preserve readable legacy references and UUIDs, provide a stable ordering and exact dry-run mapping/count, check case-insensitive collisions, and coordinate with the same allocator lock/counter as concurrent new requests. It must be idempotent, preserve statuses/quantities/events, and state how far the counter advances. Backfill must not renumber existing ledger entries or allocate one number per batch line. Once identifiers are issued, prefer disabling future allocation over deleting mappings or reusing numbers. No automatic historical allocation is part of this candidate.

Available saved integration evidence describes Preview520 and local-only combined57fb, with AT tables absent at the recorded preflight. That historical evidence cannot establish the current Preview revision or current gate state. Verify deployed revision and read-only schema/gate/ledger before attributing a particular Preview row to absent code, absent schema, gate OFF, or legacy data. This worker has not accessed a current authenticated Preview or production connection.

## Format decision superseded (2026-11-04)

The earlier AT-versus-AST pending text is superseded by confirmed AT-001 (AT prefix, minimum3 digits, never reset). See [decision and activation candidate](asset-transfer-at-format-20261104.md). Only the format is approved; real company activation, continuation review and historical backfill are not authorised.
