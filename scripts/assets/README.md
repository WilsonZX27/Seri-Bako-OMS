# Private asset migration tools

These tools preserve original IDs, fields, relationships and unknown quantities. Source exports, prepared payloads, deltas and recovery files contain private business data and must stay outside the repository. Do not pass database passwords on the command line or print environment files.

`prepare-legacy-snapshot.py` reads the source workbook without importing legacy users/passwords. `build-import.py` maps original locations to the reviewed OMS company/branch catalogue. Missing locations or relationships fail preparation. `plan-import-delta.mjs` compares two prepared snapshots and refuses automatic deletion or reuse of historical row identities.

`run-import.mjs` defaults to offline review. No database connection is made without `--execute`:

```sh
node scripts/assets/run-import.mjs --action stage --company COMPANY_UUID --payload /private/path/import.json
node scripts/assets/run-import.mjs --action delta --company COMPANY_UUID --previous /private/path/previous.json --payload /private/path/final.json
node scripts/assets/run-import.mjs --action restore --company COMPANY_UUID --recovery /private/path/recovery.json
```

For a reviewed write, supply `--execute --expect-file-sha256 REVIEWED_FILE_HASH`. Stage/delta also require `--recovery-output /private/path/new-recovery.json`. Set `OMS_ASSET_DATABASE_URL` and `PG_MODULE` in the process environment; the latter points to the installed official `pg` runtime. This tool never takes a database URL from general OMS configuration. Remote connections verify TLS certificates; URL options that override TLS are refused. Do not disable certificate verification.

Apply and verify migration 337 independently first. Do not run a blanket migration push: earlier migrations may have separate release gates. Before executing, confirm the target database and the explicit company against the reviewed release record.

The runner uses a company import lock, serializable transaction and batch row locks. Existing records must exactly match the reviewed snapshot; divergent records do not get ignored with `ON CONFLICT DO NOTHING`. A delta is applied only to an inactive ledger that matches the previous snapshot. Every imported master points to the final batch, while older batches remain superseded. A sequential replay adds no records and does not overwrite recovery evidence. Concurrent operators can receive a serialization failure and must inspect the current state before retrying.

Every change saves a private recovery snapshot with a complete before-state and expected after-state fingerprint. The file is created with mode 0600, cannot replace an existing file, and is flushed before commit. A filesystem failure rolls back the database transaction. A commit failure can leave a recovery file for a transaction that never committed; the restore guard checks the actual ledger fingerprint and will refuse it.

Recovery is deliberately limited to **unactivated staging**. It validates the backup fingerprint and exact current after-state before removing/reinstating company asset rows. It refuses altered backups, later changes and verified/live batches. It does not restore company, staff, procurement, inventory, production or other modules. Storage objects are not deleted. Once live business operations have begun, use a separately reviewed recovery plan that preserves subsequent operations; this staging tool must not erase them.

New backups use version 2 and include the complete after-state. After finalized legacy attachment copying, use `run-import.mjs --action checkpoint --company REVIEWED_COMPANY_UUID --recovery PRIVATE_VERSION_2_BACKUP` first without execute to review its file hash. Execute with `--execute --expect-file-sha256 REVIEWED_HASH --recovery-output NEW_PRIVATE_BACKUP` and the same dedicated database configuration. This performs no ledger writes. It checks the full current ledger against the original after-state, allowing only previously null Storage path/hash/verification time to become a finalized legacy path, valid hash and timestamp with an existing private Storage object. Original attachment fields, all other rows and already verified files must remain identical. Actual byte verification remains the copy worker's responsibility; a checkpoint alone is not attachment acceptance. It saves a new durable recovery file with the original before-state and exact current fingerprint. Use that new file for staging restoration. Old version 1 backups still restore exact unchanged staging but cannot create this checkpoint. Missing objects, unrelated edits and writer failures stop checkpoint creation; neither activation nor Storage deletion occurs.

There is no activation command. Formal cutover still requires the final source freeze/export, all legacy attachment references resolved and copied/verified, authenticated UI and role/branch acceptance, integration regression, a release record and a recovery decision. A successful stage or rehearsal does not authorize or prove cutover.

Local checks use an isolated PGlite or PostgreSQL runtime, never a production URL:

```sh
PGLITE_MODULE=/private/runtime/pglite/dist/index.js node scripts/assets/test-import-ledger.mjs
PGLITE_MODULE=/private/runtime/pglite/dist/index.js node scripts/assets/rehearse-import.mjs /private/path/import.json /private/path/branches.json
EMBEDDED_POSTGRES_MODULE=/private/runtime/embedded-postgres/dist/index.js node scripts/assets/test-asset-concurrency.mjs
```

## Offline attachment reconciliation

`node scripts/assets/reconcile-attachments.mjs --snapshot PRIVATE_SNAPSHOT --payload PRIVATE_IMPORT --evidence PRIVATE_EVIDENCE --output NEW_PRIVATE_REPORT`

This command never fetches a URL and never writes to a database or Storage. It requires a reviewed evidence file bound to `source_sha256`:

```json
{
  "source_sha256": "reviewed export SHA256",
  "files": [{"source_url": "original file URL", "local_path": "/private/authorized/file.jpg", "sha256": "reviewed file SHA256", "mime_type": "image/jpeg"}],
  "folders": [{"source_url": "original folder URL", "reviewed_by": "reviewer", "reviewed_at": "2026-10-08T09:00:00+08:00", "file_urls": ["original file URL"]}]
}
```

Supply only separately authorized files and folder inventories. The tool resolves Drive file URL aliases without accessing Drive, verifies local bytes against the reviewed hash/type/10 MB limit, retains imported asset/maintenance/location parents, and requires every original reference to be accounted for. A folder inventory cannot omit a file explicitly associated with it or silently discard an unimported file. Unknown folder members require source reconciliation before continuing. Evidence cannot be reused after the export changes. Reports are created privately outside the repository without replacing an earlier report.

`ready_for_storage_copy` means only that local evidence reconciles; it does not prove a Storage copy or authorize activation. `ready_for_cutover` always remains false. Storage verification, actual role/branch tests and final cutover gates remain independent. With no authorized files or folder inventories, every unresolved reference remains listed.

## Copying reviewed legacy files into private Storage

First run the read-only plan:

`node scripts/assets/copy-legacy-attachments.mjs --snapshot PRIVATE_SNAPSHOT --payload PRIVATE_IMPORT --evidence PRIVATE_EVIDENCE --company REVIEWED_COMPANY_UUID`

No URL is fetched. The command re-runs complete offline reference reconciliation and prints the plan SHA256 and unresolved counts. Executing requires all references resolved, `--execute --expect-plan-sha256 REVIEWED_PLAN_HASH --output NEW_PRIVATE_RECEIPT.jsonl`, and dedicated `OMS_ASSET_SUPABASE_URL` / `OMS_ASSET_SERVICE_ROLE_KEY` environment variables. Do not paste credentials into chat or reuse an unreviewed target. Remote endpoints require HTTPS. Keep the receipt outside Git; the command refuses to replace an earlier receipt and proves it can create the private journal before uploading.

The worker prepares each destination through a service-only database function bound to the exact rehearsal export hash, original attachment ID/key/URL, asset, maintenance parent and location. Each file uses a deterministic write-once path; an existing file is never overwritten. Local bytes are rechecked before uploading and the actual Storage object is downloaded/hash-checked before database finalization. Finalization rechecks the inactive source batch and records only Storage path, content hash and verification time; original authors, timestamps and source fields remain unchanged. A repeat with the same bytes succeeds, whereas a different hash cannot replace a verified copy.

The receipt is an append-only JSON Lines journal: started, each verified attachment, then verified summary. Every record is flushed to disk. A failed receipt write prevents a successful completion result; uploaded/verified rows may already exist and must be reconciled by an idempotent retry into a new journal. It does not roll back Storage or delete files. A started/partial journal never proves completion. Copying does not change the import batch to verified/live and does not perform cutover. Ordinary authenticated users cannot invoke the legacy prepare/finalize functions. This workflow cannot run until separately authorized source files and reviewed folder inventories are supplied.

### Current read-policy performance verification

Migration 338 is the independently tested read-policy optimization over foundation 337. `test-asset-db.mjs` runs the original lifecycle checks and then compares complete visible rows and overview results before/after 338 across branch, company-wide, permissionless, foreign-tenant and inactive states. Production rollback EXPLAIN measurements and actual-role isolation evidence are recorded in `docs/implementation/ASSET_READINESS_AND_PERFORMANCE.md`; private SQL/result files stay outside Git. The original local benchmark numbers describe 337 with synthetic identity helpers and must not be presented as hosted request latency.
