# Recipe atomic write verification — 2026-10-14

Recipe creation, updates and version copies now use migration 355's `save_recipe_atomic` transaction. Header, complete ingredient replacement, document/revision, cost snapshot, activity and request ledger commit together. The previous multi-request write defect is fixed in the local implementation and verified against synthetic local data. Production has not been changed by this verification.

## Reproduced defect and repaired behavior

Before the fix, a scoped `recipe_lines` insert failure returned HTTP 500 after the header update and ingredient deletion had committed. The dedicated synthetic clone changed from one ingredient to zero and retained the new header note. The original source recipe was not modified. Evidence: [before failure](evidence/2026-10-14/recipe-partial-write-before.json).

After the fix, the same scoped insertion failure preserves the complete old header and ingredient rows. The browser retains the entered note and request key. After removing the trigger, the test allows a real successful transaction but replaces its success acknowledgement with the previous action error response. Retrying the same mounted form returns the committed recipe without another snapshot or ledger entry. This is a simulated lost success acknowledgement after commit, not an actual network outage. Evidence: [browser verification](evidence/2026-10-14/recipe-atomic-browser.json) and [retained form](evidence/2026-10-14/recipe-atomic-failure-retained.png).

## Transaction and concurrency coverage

The rolled-back SQL test injects failures at five insert stages — document revision, ingredient, cost snapshot, activity log and request ledger — for each of create, update and copy: **15 rollback cases**. Failed updates compare the complete recipe, ingredient, cost, document and revision snapshot. Create/copy checks include unchanged recipe, document, revision and audit counts. It also verifies completed-key replay, changed-input key rejection, stale update rejection, pending/approved/rejected workflow preservation, direct RPC missing-permission rejection, foreign-company product/recipe rejection, restricted ledger/anonymous RPC access, and active/archived update refusal. Nonzero numerical fixtures verify ingredient totals, 10% wastage-adjusted totals, cost per finished unit and a six-unit packaging cost against the input formulas at the database column precision. All test triggers are transaction-local and rolled back. Evidence: [SQL result](evidence/2026-10-14/recipe-atomic-sql.json); executable assertions are in `scripts/integration/verify-recipe-atomic-local.cjs`.

Concurrent tests verify:

- Two same-key creates return success but produce one recipe and one snapshot.
- Two updates using the same original timestamp yield one commit and one stale-input rejection, preserving ingredients.
- Two different copy requests produce consecutive versions, each with ingredients and exactly one snapshot. The copy source uses a dedicated synthetic product; the original source recipe remains unchanged.

Evidence: [concurrency result](evidence/2026-10-14/recipe-atomic-concurrency.json).

## Implementation boundaries

The RPC checks active staff, recipe permission, company ownership, active product/ingredient references and supported recipe state. A company-scoped transaction lock protects request replay, version allocation and snapshot allocation; updates additionally lock and compare the original timestamp. Draft-like editable workflows retain their existing status and approval state. Active/archived edits are rejected; version copy remains active-only, matching the existing UI.

Request keys and expected timestamps are initialized once per mounted form so an unrelated server-component refresh cannot silently advance the optimistic timestamp while preserving dirty inputs. RPC object errors become readable `Error` messages; thrown transport errors return retained-form errors. Repeating the same request after an uncertain commit is safe through the ledger. Reusing a completed key with different inputs is rejected instead of silently creating another record.

`tests/recipe-write-retry.test.js` passes both transport/error handling and mounted-token regression checks. The earlier targeted recipe/type/backup suite passed 15 tests. Root confirmed the final production build, 1,617 tests and lint passed. The final browser rerun on that build also passed: both request key and expected timestamp stayed unchanged through failure and lost acknowledgement, and retry advanced snapshots only once (1 to 2), with one ledger row. Root owns the remaining combined gate/checkpoint reporting.

## Limits

The guarantees cover writes through this RPC, not arbitrary direct database edits or unrelated recipe lifecycle operations. Numerical assertions cover nonzero ingredient costs, wastage, yield and packaging multiplication at database precision. SQL verification used synthetic local data, and the browser used an isolated context on localhost:3190. No live production records, deployment, push or external backup was involved.
