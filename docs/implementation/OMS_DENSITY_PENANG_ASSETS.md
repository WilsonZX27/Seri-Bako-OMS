# OMS density, Penang and assets implementation

## Delivery gates

1. Existing page density: preserve recorded values and nulls, remove stockout entry, compact desktop details, expand mobile details on demand, protect unknown stockout observations from automatic decreases. Run regression and authenticated responsive acceptance before release.
2. Penang: obtain chef-confirmed production unit, batch yield, shelf life, overnight handling and separate minimum display quantities for Gurney and Queensbay. Keep manager-confirmed orders and cross-day manual demand. Create a dated operational draft only after those inputs are confirmed.
3. Assets: snapshot, resolve source exceptions, import rehearsal, table and attachment reconciliation, freeze legacy writes, final delta, then switch. An export or deployment does not satisfy cutover.

## Source preparation

`scripts/assets/prepare-legacy-snapshot.py` reads the eight business sheets, excludes Users, Role Permissions and Settings, preserves source fields and dates, and produces deterministic source-row keys and a SHA-256 manifest. Blank asset quantities remain unknown and require resolution before transfers. A missing related asset or parent is an explicit issue. URLs remain unverified until their files have been read and checked.

Snapshots and reconciliation outputs contain operational data and must remain outside Git. Do not publish the source workbook, historical authors, identifiers or attachments in release notes.

The 8 October export has 445 unique asset IDs, known quantities totaling 2,080, 152 multi-quantity rows and 31 blank quantities. There are 15 maintenance requests, 335 maintenance updates, 21,904 audit rows and two attachment records. Empty transfer sheets are empty business datasets; their headers do not count as transfers. The six nonblank URL references still require attachment verification.

## Forecast data semantics

`quantity-proxy-v3` distinguishes an explicitly observed absence of stockout from an unknown observation. Existing `stockout=false` does not establish an observation. Unknown observations retain the latest comparable received quantity as the automatic reduction floor. True historical stockouts retain protection. Saved older plans keep their original version and evidence; viewing history does not recalculate them.

The quantity proxy is not POS sales, and its floor is not a forced order quantity. Managers can confirm a different order. Measure wastage against complete, comparable outlet/product/business-day cohorts, with units, numerator, denominator and missing data exposed. Do not use a universal 20% target to force reductions.

## Pending business inputs

The original Penang workbook is no longer present at its previously supplied Downloads path. Retain the existing reviewed calculation and the confirmed 816→16 correction. The chef confirmation workbook contains the 44 active OMS food products available on 9 October, read from the current company catalogue. Business inputs remain blank; the reviewed 16-piece references are labelled for chef confirmation. No template quantities have been copied into outlet minimums.

## Regression evidence

After the first density and forecasting changes, strict TypeScript and lint pass; all 1,422 existing and updated regression tests pass. v9.2.95 is deployed. The real daily record and fully loaded Settings pass root-overflow checks at 390/430/820/1143/1440; Settings unsaved-navigation protection displays Save, Discard and Cancel. The local asset rehearsal verifies source fields, IDs, relations, quantities and repeat imports. Page/request performance baselines, remaining authenticated interaction checks, attachment reconciliation, real concurrent database checks and production cutover remain required. These checks do not establish business readiness.

## Operating days

The owner confirmed daily operation for operating outlets and kitchens. Temporary closures are dated manager registrations with reasons and previous-decision history. Event is inactive unless a dated activity is registered. Past dates cannot be retroactively closed through this workflow. Calendar decisions use Kuala Lumpur business dates and the same company/location access checks as other asset operations. Local database checks cover defaults, closure/reopening, Event activation, repeated submissions, history and permission denial.

## Asset development continuation — 8 October

The private delta planner compares original IDs and business fields across reviewed source snapshots. Changes include expected prior fingerprints. Removed source rows and reused spreadsheet row keys with changed historical identities require explicit reconciliation; no rows are silently deleted. Batch metadata alone does not count as a business change. Comparison of the current snapshot with itself produces no changes. This is a review manifest, not a production importer or cutover approval.

An isolated PostgreSQL 18.4 instance with synthetic data verifies distinct backend connections and four observed lock waits: over-reservation rejection, duplicate receipt rejection, serialized opposite-direction receipts and rejection of stale concurrent maintenance updates. Holding quantities are conserved. The instance is stopped and its temporary data removed after the run. These checks supplement PGlite and do not prove production migration compatibility. Transfer operations serialize per company/asset before holding locks; multi-asset checklist locks follow asset ID order. Maintenance updates use client keys and expected statuses.

Overview maintenance counts drill into the matching status, preserved through pagination. Asset register rows link to full detail rather than repeating source-field disclosure controls. Asset register and checklist queries fetch only ID/code/name fields; full source fields remain in the asset detail.

Remaining release gates: authenticated asset UI and real Storage integration acceptance, legacy attachment reconciliation, reviewed target-database compatibility and recovery acceptance, then source freeze, final delta and formal cutover. Native upload/verification and the staging/delta/recovery runner are now implemented locally; this does not establish their production readiness. Deferred Drive access remains respected. No new asset tables, permissions or business records have been applied to Production.

Native master registration/editing is implemented locally with separate current details and immutable imported fields. A thirteenth table retains each master change and its author. The database rejects invalid metadata, stale edits, repeated-key changes and case-insensitive duplicate asset IDs. Quantity changes remain outside metadata editing. Local database tests cover unknown initial quantity, preserved source fields, permission denial and repeat submissions; real UI acceptance remains outstanding.

Continuation verification: all 1,429 regression tests, strict TypeScript, lint and the production build pass. The current thirteen-table private import rehearsal verifies original fields, identities, relationships, per-location quantities, repeat imports and exact inactive-ledger recovery. Synthetic PostgreSQL checks now cover seven observed lock waits, including attachment reservation, plus transactional staging/delta/recovery. Imported maintenance attachments have explicit maintenance and location parents; sharing an asset does not expose another outlet's maintenance photos.

Local component fixtures pass root-overflow checks at 390/430/820/1143/1440 for attachment entry and compact master history. At 390 the sticky master save button remains visible above the mobile navigation offset. Stay retains unsaved fields and Discard navigates away. These fixtures use no-op actions and synthetic records; they do not verify authenticated saving, real uploads or browser Back protection. Browser Back protection remains an open acceptance item. These are local implementation checks, not production asset activation. The confirmed daily operating rule and dated exceptions remain in effect.

## Legacy attachment reference reconciliation

The offline attachment reconciler now covers every original URL field, rather than counting attachment-table rows alone. It canonicalizes file aliases without network access, verifies supplied local file bytes against reviewed hash/type/size, preserves typed maintenance/location relationships and requires dated, complete folder inventories. Inventories omitting a linked file or introducing an unimported file block copying. Evidence is bound to the reviewed export SHA256 and cannot mark cutover ready. Running against the actual private export without any authorized file evidence reports six unresolved references, zero locally verified files and zero reviewed folders; no remote source or storage was accessed. Synthetic tests cover alias resolution, missing evidence, changed exports, duplicate evidence, byte/type mismatch and omitted/unmapped folder files.

## Application attachment chain verification

Tests now execute the actual upload action and download route with controlled authentication, RPC and Storage dependencies. They verify write-once uploads, a lost upload response recovered only by matching stored bytes, corrupt/missing objects refusing verification, session/permission/access changes refusing privileged finalization, verified retries avoiding Storage writes, and maintenance operators limited to contextual photos. The actual download route requires a valid verification timestamp and SHA256 before requesting a 60-second signed URL; redirects are private/no-store. Pending, missing, malformed and foreign-company paths never reach signing. These are application boundary tests; they supplement SQL permission/concurrency tests and do not establish live Auth/Storage or authenticated browser integration.

## Attachment history completeness

Asset/maintenance details now show an exact-count latest-five attachment preview. Full registers fetch 50 records with deterministic created-time/ID ordering, explicit company and asset/maintenance filters, and parent visibility checked before lookup. Actual query-function tests cover page 21 reaching row 1000+, inaccessible parents, missing counts and invalid page requests. Synthetic component fixtures pass root-overflow checks at 390/430/820/1143/1440 with a long filename. This does not prove authenticated hosted query behavior. All 1,443 regression tests, lint, strict types and the production build pass; asset migration 337 remains local and cutover gates are unchanged.

## Legacy Storage copy worker

Implemented a reviewed-plan, write-once copy worker using separately authorized local files only. Preparation and finalization are service-only and bind the exact inactive export, original attachment identity/URL, asset and maintenance/location parents. The worker rechecks local bytes, downloads and verifies the stored object, then appends a durable private receipt. Original authors/timestamps remain immutable and no activation occurs. Synthetic worker tests cover lost upload replies, corrupt or missing stored content, local changes, source mismatch, finalization failure and journal failure. PostgreSQL 18.4 now demonstrates eight observed lock waits: concurrent legacy verification cannot replace the first content hash, consistent retry succeeds, and the batch remains rehearsal. The full private source rehearsal still passes exact fields/identities/relations/quantities, repeated import and complete inactive recovery. No actual legacy file was fetched or copied and no production schema was applied.

## Transfer operational trace

Implemented dedicated transfer detail with request provenance, in-transit quantity, contextual lifecycle actions, optional notes and paged status history. The application derives approval/dispatch from source access and receipt from destination access; SQL still enforces both role and location. Incoming destination SQL tests verify asset/history visibility before a holding exists and confirm that receipt alone increases holdings; repeated receipt fails. Transfer notes have a 2,000-character server/SQL bound without silent truncation. Actual query tests cover parent visibility, company scope, transfer association and deterministic pagination. A synthetic destination-only component fixture shows Confirm receipt and passes 390/430/820/1143/1440 overflow checks, with 48px phone/44px tablet controls. These are local checks; actual hosted login/submission remains unverified. All 1,449 regression tests, strict types, lint and production build pass. No production asset migration or cutover occurred.

## Authorized production staging and application release

On 8 October the owner authorized direct migration into the existing OMS Supabase project. Migration 337 was applied alone and all thirteen asset tables verified with RLS. The reviewed source was fully staged in guarded transactions, each with durable full-prefix recovery files and complete typed-row reconciliation. Independent readback matched source totals and all preexisting permissions, role grants and migration history. The batch remains rehearsal with zero live batches; original attachment bytes remain unverified. V9.2.96 is now deployed, with authenticated post-deployment acceptance awaiting restored OMS login. This supersedes earlier local-only and mandatory-independent-environment statements; source freeze/final delta and formal cutover are still pending.

### Authenticated v9.2.96 acceptance follow-up

Real Owner navigation confirmed the deployed inactive asset entry and existing Procurement, Inventory, Production Jobs, Attendance, Insights, Packaging and posted Queensbay record. Asset entry, date-range dialog and posted daily record had no root overflow at 390/430/820/1143/1440. Production SQL/RLS assertions for eight existing role representatives passed and rolled back, including exact accessible holdings/location counts, inactive denial, direct-write denial and sampled checklist/all imported maintenance visibility. Both successful transactions reported zero live batches. This verifies scoped database policies and read-only app smoke coverage; live browser mutation/Storage workflows, final source freeze/delta, attachment verification and cutover are still pending. No production test business records were created.

### Asset read-policy performance release 338

A real hosted Owner-identity EXPLAIN measurement found the initial asset overview taking 24.9 seconds. Migration 338 now reuses existing RLS-filtered accessible location/asset sets in six SELECT policies, preserving company/live/read gates and leaving writes/grants unchanged. Full Owner overview output matched in rollback rehearsal; eight actual role representatives passed complete checklist/maintenance scope checks both before release and after application. Independent readback confirmed the exact migration source, 13 RLS-enabled asset tables, 445 unchanged assets and 0 live batches. Post-release overview execution was 1.19 seconds in one measurement; register 4.21 ms and checklist 39.52 ms exclude network/browser time. All 1,457 regressions and local complete-row before/after policy acceptance passed. Application remains v9.2.96; only the database read-policy patch was released. Attachments, final freeze/delta, positive live workflow/Storage acceptance and formal cutover remain outstanding.
