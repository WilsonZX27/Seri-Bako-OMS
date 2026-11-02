# KG stock counts — local implementation, 16 October 2026

KG implementation status: local, uncommitted, not pushed or deployed. Migration 361 has only run in an isolated local database. No production KG quantities, ledger, costs, UOMs or historical records were changed. The separately authorized Five Spice count-scope configuration is complete in production, as documented below.

## Usable count workflow

ANCHOR BUTTER (BWYHOLDI00026) and GOLDEN BLENDX (BWYHOLDI00022) accept independent measured KG with up to four decimal places. New inputs start blank, never from historical CTN quantities. Existing legacy draft quantities are preserved; new KG lines have null base physical quantities. Optional packaging evidence records whole packs per purchase unit, net KG per pack, description and provenance. Unknown factors remain null and do not prevent saving evidence. Providing a ratio does not resolve the historical ledger or change purchase/base UOMs.

For a mixed count, “Post N verified items” requires explicit confirmation listing the BWY items that will remain pending review. The atomic operation snapshots their formal source lines into stable review records, preserves all measurement versions, separates those lines from the formal posting scope, and posts only the verified normal lines through the existing posting engine. A failed posting rolls back separation and ledger changes together. Repeated requests do not duplicate stock movements. Counts containing only weight-review items stay draft.

List, detail, summary and workbook export identify pending weight reviews and distinguish verified-scope posting from completion of every item. Pending reviews have a separate panel for versioned KG and packaging supplements; these writes do not change stock or close the review. Reversing the verified posting is also distinguished from pending review. There is no silent skip or automatic historical conversion.

The legacy posting route rejects configured BWY formal lines and directs users to explicit separation. A deletion guard prevents removing captured weight evidence through an older line-removal flow. Normal items can therefore proceed without waiting for historical BWY reconciliation.

## Schema and release boundary

Migration 361 creates three RLS tables: item configuration, stable review identities/source snapshots, and append-only measurement versions. It adds a security-invoker latest-measurement view, secured draft-save RPC, explicit verified-line posting RPC, pending-review supplement RPC, posting guards and a captured-line deletion guard. Measurement identities reference stable reviews rather than deleted formal lines. Client writes go through permission-checked RPCs; backup includes all three company-scoped tables.

Only the two named BWY codes in company 3b104582-f8cb-4a4d-867f-b99e5ffc6486 are configured. The protection is company-wide, including counts outside PJS10. Existing posting implementation is retained behind the wrapper. No historical conversions or balance corrections are included.

Remote main was checked at 7959c0cfeeb7448eee1faf76400ad002b80c6c6b, with migrations through 360. No numbering conflict existed at this check; recheck before integration. Apply the schema before deploying matching application queries. This report does not authorize release.

## Verification

- Strict TypeScript, including noUnusedLocals and noUnusedParameters: passed.
- Scoped ESLint and git diff whitespace check: passed.
- Stock-count and backup tests: 74/74 passed.
- Latest tightened migration applied to a fresh isolated Docker database oms_kg_acl_20261016, cloned from oms_release_rehearsal_20261015. SQL fixtures run inside BEGIN/ROLLBACK; production was not used.
- SQL coverage: exact fractional KG, unknown ratio, explicit 4 × 2.5 KG evidence, immutable versions, replay, invalid factor/evidence/unit/precision, identity/RLS checks, verified normal-line posting with unchanged BWY balance, synthetic posting failure with full separation rollback, replay without duplicate movement, pending-review supplement without stock mutation, all-KG counts staying draft, and scope-only KG eligibility without stock writes.
- Chromium at 390, 768 and 1440 px: actual form and application CSS; blank KG, 5.125 preserved through blur/save, optional packaging, hidden-row FormData, local-storage recovery, explicit posting confirmation, and actual review supplement panel. No horizontal overflow or page errors. Mobile review and desktop form screenshots were visually inspected.
- Browser navigation/save boundaries are mocked; SQL is tested separately. This is component integration plus database verification, not an authenticated full-app end-to-end test.

Reproducible fixtures: scripts/qa/stock-count-kg-browser-build.cjs, scripts/qa/stock-count-kg-browser-run.cjs and tests/sql/stock-count-kg-local.sql. Use Node 22, existing dependencies, and compile src/app/globals.css to /tmp/oms-kg-browser/styles.css before browser execution. Evidence copies are in the sibling outputs/oms-stock-count-kg-evidence-20261016 directory. The untracked node_modules symlink is a local dependency aid and must not be committed.

## Historical correction — separate future decision

Read-only production evidence on 16 October: ANCHOR has 12 posted CTN-labelled counts and 3 count adjustments, with PJS10 ledger 5 CTN. GOLDEN has 25 posted counts, 2 drafts and 6 count adjustments, with ledger 1 CTN. The user confirms the entered physical numbers were KG. Both recorded valuation baselines were zero; that does not establish that correction is harmless.

Preserve original counts, movements, cost fields and purchase units. A newly supplied package ratio must not be multiplied into old numbers that already represented measured weight. Future reconciliation should export source evidence, establish packaging provenance/effective dates, and produce a quantity and valuation preview. If historical evidence cannot support reconstruction, propose a fresh physical-count cutover with traceable forward adjustments and links to original records.

Minimal future business decision: after reviewing the quantified correction preview, approve whether a fresh measured physical count may become the cutover baseline while preserving the old ledger and recording forward corrections. This is not required for normal items to continue posting. No historical correction or review-closing action is implemented or authorized here; pending evidence remains visible until that separate audited process exists.

## Five Spice Powder — authorized production scope change completed

QUIKGROC00114 and ORIENTAL00080 remain distinct KG SKUs. Both were already active with base/purchase KG and conversion 1. ORIENTAL already had active PJS10 count scope. Added only QUIKGROC count scope plus an activity log, using a bounded transaction with exact company/branch/item/unit checks and row locks. No supplier mapping was required for count eligibility.

New scope id: 4b716f7d-058a-42c3-914b-0453931ce063. Branch: ae64b7fc-adc8-4a58-ad48-91f078270eaf. QUIKGROC item: 0986cbc8-a752-4860-8b97-2ddce3c99446. Audit id: 468fd2e2-f36c-42dd-8b2f-0b3d82169447; authorization reference: Sentinel_7f035fa7d5108191999fe45a3fcd824f.

Readback confirms both are eligible for newly created PJS10 counts. Existing drafts are unchanged. Master items, supplier items and purchase mappings compare unchanged. ORIENTAL ledger remains 3.6 KG; QUIKGROC has no inventory history and its physical-count input starts blank. User reference weights 1.790 KG and 0.590 KG were not written to inventory or count records. Screenshot pixels were unavailable to the Mac executor; these conclusions were independently verified from database records.

## Final pre-release review

### Fresh source and check results

Remote main was freshly read with git ls-remote and is still 7959c0cfeeb7448eee1faf76400ad002b80c6c6b. The matching local origin/main tree ends at 360_schedule_import_support_destinations.sql; 361 currently has no main-branch collision. Other unpublished branches were not checked. Integration must recheck immediately before applying a migration.

Strict TypeScript was rerun with --noEmit --incremental false --noUnusedLocals --noUnusedParameters; scoped ESLint was rerun on all ten changed/new TS/TSX implementation files. Both completed successfully. The test batch was rerun after the SQL read-policy narrowing and remains 74/74 passed. TypeScript/application code has not changed since the successful strict and lint checks.

The weight-only SQL case saves a 1.79 KG count and deliberately calls post_stock_count_verified_lines. It asserts the explicit “Only weight reviews remain” rejection and unchanged draft status. This prevents a zero-line posted document. The browser fixture checks mixed-count confirmation and supplementary evidence, not a logged-in Kitchen user's complete production journey. The SQL Kitchen update test is conditional on existing stock_count.update permission; it does not prove every deployed Kitchen role currently has that permission.

### Persistent authorization changes in 361

361 DOES introduce persistent database grants and new callable capabilities; it must not be described as having no permission impact. It does NOT add role assignments, change role_permissions, grant stock_count.post to Kitchen, disable RLS, or grant direct authenticated DML on evidence tables.

- Authenticated users receive SELECT on three new tables through company/branch/stock-count permission RLS and on a security-invoker latest view. The item configuration read is company-scoped; review and measurement reads additionally check branch scope.
- service_role receives SELECT on the three new tables for backup. It retains its pre-existing RLS-bypass nature, so backup callers must keep company filtering. 361 grants it no new direct evidence writes or RPC execution.
- Authenticated EXECUTE is granted for draft saving, verified-line posting and pending-review supplementation, plus the replacement existing posting wrapper. SECURITY DEFINER routines have fixed search_path and explicit active actor, existing permission, company, branch and document-state checks.
- This is a functional capability extension: stock_count.update holders can append evidence to separated pending reviews even when their parent count is posted or voided. They cannot rewrite prior versions, close the review or mutate its stock through that RPC. stock_count.post remains necessary to separate and post verified lines.
- Direct execution of the renamed original posting function and trigger functions is revoked from public, anon, authenticated and service_role. No evidence-table client INSERT/UPDATE/DELETE grants are introduced.

### Actual Kitchen behavior after a future approved release

A Kitchen user with the existing create/update permissions and branch access can enter measured KG, leave unknown package factors blank, and save a draft. Posting requires existing stock_count.post permission; this migration does not provide it. A permitted poster explicitly confirms the two pending weight items before verified normal lines post. Kitchen can see pending reviews within existing read scope and supplement them only with update permission. BWY balances and CTN purchase/base units stay unchanged. Weight-only documents remain draft. A packaging ratio alone never clears the historical hold. The application must be deployed together with the schema; existing role configuration must be verified separately before promising that every Kitchen staff member can use every action.

### Rollback and recovery boundaries

No production KG migration is applied yet, so abandoning this local candidate requires no production rollback. There is no destructive down migration. A non-destructive pause/resume procedure has now been implemented and rehearsed; see the recovery verification addendum below.

If released, prefer a forward fix. For an emergency, first suspend KG-specific draft/separation/supplement writes, preserve and export all three new tables plus linked counts and audit logs, and keep the posting/deletion guards. Do not drop the tables, delete the configuration rows, or restore unrestricted legacy posting while captured/pending evidence exists. Rolling back only application code can hide pending reviews and make KG drafts uneditable in the old UI; therefore it is not a complete safe business rollback. Retain a compatible read-only review view or explicitly suspend the affected counts while preparing the fix.

After successful verified-line posting, use the established authorized stock-count reversal workflow for the posted normal lines if a business reversal is required. Do not reinsert BWY lines into an already posted count or synthesize movements from the captured snapshots. KG evidence remains pending and versioned. A failed verified-line posting already rolls back separation and ledger changes atomically, as tested.

Only if no production evidence or affected posting has ever been written could a separately reviewed reverse migration restore the original posting function and ACLs and remove new objects. Such a migration must inventory dependencies, preserve backups and be rehearsed first; it is not supplied or authorized in this candidate.

### Authorization evidence

No new, explicit KG production rollout authorization is present in this child-thread continuation. The latest direct user message is exactly: “好的”. It acknowledged ongoing local verification and is not treated as permission to push, apply 361 or deploy. Earlier visible messages such as “推送”, “允许” and “合并成main” concern earlier OMS work and do not establish approval for this new KG migration. The current delegated instruction is exactly: “暂不推送或部署。” No push, merge, production migration or deployment was performed in this review.

Review timestamp (UTC): 2026-10-16T10:31:59.880960+00:00

## Recovery verification addendum — local only

Release status remains local/unreleased: no production change, push, deployment, new role, or new business permission was introduced. The previously identified post-only read extension has been removed and the narrower policy tested against a freshly migrated isolated database. Release authorization is still not present.

### Tested non-destructive emergency procedure

Operator artifacts:
- scripts/ops/pause-stock-count-kg.sql
- scripts/ops/resume-stock-count-kg.sql
- tests/sql/stock-count-kg-recovery.sql (included by stock-count-kg-local.sql)

After approval, run the pause script as the database migration owner using psql -X --single-transaction -v ON_ERROR_STOP=1 -f scripts/ops/pause-stock-count-kg.sql against the explicitly verified target. The single transaction is essential: all revocations and protective triggers become effective together. Retain the current application/read-only review panel; this procedure does not require a downgrade to the old UI. It revokes EXECUTE from PUBLIC, anon, authenticated and service_role on save_stock_count_kg_draft, post_stock_count_verified_lines and save_stock_count_weight_review. Trigger guards additionally reject INSERT/UPDATE/DELETE on both measurement evidence and review snapshots. Existing SELECT policies, source snapshots, measurement versions, configuration, ledger, original posting wrapper/status guard and captured-line deletion guard remain intact. Ordinary non-KG posting is not revoked.

The pause is effective for operations after its transaction commits; review any requests completed before it acquired its table locks. The current UI may still show a save/post button, but its request fails without writing. Hiding buttons alone is not relied upon. An older UI's legacy posting call remains rejected for counts containing configured KG lines, and direct status changes remain rejected by the posting trigger. A privileged database owner can always deliberately disable protections; this is operational containment, not protection against a malicious database owner.

After incident resolution and approval, run the resume script with the same single-transaction invocation. It removes only emergency triggers/function and restores only the three authenticated EXECUTE grants that migration 361 already provided. It does not add roles, assign permissions, restore legacy bypass execution or change evidence/stock. This is a pause/resume mechanism, not a reversal of already posted verified inventory; business reversal still uses the established authorized workflow.

### Final local test evidence

The final combined fixture completed through ROLLBACK in fresh database oms_kg_acl_20261016. Latest evidence is outputs/oms-stock-count-kg-evidence-20261016/stock-count-kg-acl-tests.log and stock-count-kg-acl-migration.log; the earlier recovery log remains historical evidence. Assertions include:

1. An active foreign-company owner with stock-count permission cannot read the target company's KG configuration, snapshots or measurements and cannot save its draft, supplement its pending review or post its verified lines.
2. A same-company actor with all four stock-count permissions but access to branch A cannot read branch B evidence or save/post its count. A pending-review fixture temporarily placed in branch B also rejects supplementation. Own-branch reads succeed.
3. A same-company, own-branch actor without update/post receives explicit permission rejection for draft update, review supplement and verified posting.
4. Effective ACL checks confirm authenticated and service_role SELECT on the three new tables; anon cannot SELECT; none of those three client roles can INSERT/UPDATE/DELETE directly. Authenticated alone among those roles can execute the four public entry RPCs before pause; anon/service_role cannot, and authenticated cannot call the renamed original posting function.
5. Pause denies all three new write RPCs, while pending snapshots and latest KG evidence remain readable. Emergency triggers reject even privileged accidental evidence changes. The retained legacy wrapper and status trigger reject CTN posting of a KG count; the captured-line deletion guard rejects removing the protected formal line.
6. A symmetric before/after comparison verifies every saved review snapshot, measurement version and stock transaction remains identical during pause attempts. Resume restores evidence append, producing version 4 without erasing prior versions. All fixtures and temporary grants are rolled back.

No TypeScript or application runtime code changed in this follow-up. Prior strict TypeScript, scoped ESLint, 74 tests and browser results remain applicable; SQL recovery and ACL tests are additional evidence, not included in the 74 count.

### Final scope comparison after narrowing

The live effective policies in the isolated rehearsal database include both the legacy tenant stock-count-line policy and the later “stock count lines manage” policy. Together they allow formal-line SELECT to branch-scoped read/create/update holders. Thus update-only visibility is not newly expanded; checking only migration 081 would incorrectly suggest that it is.

The earlier post-only exception has now been removed from all three KG SELECT policies. Reviews and measurements require the same read/create/update alternatives as ordinary stock-count lines, the current staff company, the matching parent count company, and the existing company/branch access helper. The latest view remains security_invoker and cannot bypass those policies. The effective can_access_inventory_branch helper delegates directly to can_access_company_branch. The configuration table remains company-wide metadata without branch quantities, and now also requires read/create/update; it is narrower than the existing same-company item-master visibility. It does not expose another branch's evidence.

Verified post-only actors cannot read reviews, raw measurement versions, latest measurements or KG configuration. Each of read-only, create-only and update-only actors was tested separately: ordinary formal lines and new KG evidence remain readable in their own branch and unavailable in another branch. An authorized post-only RPC replay still succeeds through internal SECURITY DEFINER checks without granting any new direct evidence SELECT permission. Full normal-item posting and explicit pending-review separation also pass in the main fixture.

The grants now map existing stock-count capabilities onto the corresponding new resources without additional user-visible company, branch or post-only read scope. Persistent SELECT/EXECUTE grants still exist and are explicitly listed above; this is not a claim of zero schema/ACL change. No new permission code, role membership, staff grant, direct evidence DML, anonymous access or client bypass of the original posting checks is introduced. service_role SELECT is retained solely as the existing trusted backup resource extension, with the application's company filters; its pre-existing service-role trust/bypass boundary is unchanged.

Pending-review append remains new functionality under existing stock_count.update: it can append evidence when the parent is posted/voided but cannot edit historical versions, change inventory, or close the review. This is the previously disclosed feature behavior, not an additional direct read scope. No further user-visible read-scope expansion was identified in the tested identities.

Current artifacts stay local. No production migration, push or deployment was performed, and no new rollout authorization arrived. Historical reconciliation and any eventual review closure remain separate work.
