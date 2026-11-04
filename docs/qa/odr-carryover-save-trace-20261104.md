# Next-day food: write/read/summary trace — 2026-11-04

User batch 13 #2 requests Qty Sent / Received / Wastage / Tomorrow. No production mutation is authorized by this investigation.

## Confirmed source behavior

- DailyProductLine labels food_carryover consumption Usage and sends usage_qty. It sends a hidden wastage_qty=0 and no reason for this category.
- extractOutletDailyPayload preserves separate usage_qty, wastage_qty and saleable_next_day_qty. Missing input and explicit zero have different provenance.
- Migration 363's tracking wrapper validates consumption, requires Usage before evening_completed, then overwrites non-food_daily wastage with zero and clears its reason. Migration 370 renames this wrapper save_outlet_daily_record_before_saleable_stock and adds independent tomorrow counts.
- Historical wastage_provided for carryover describes whether Usage was supplied, not independent wastage confirmation. It cannot be reused to assert that historical wastage zero was entered by an operator.
- addTrendLine sums wastage_qty separately but uses usage_qty for carryover movement. Wastage valuation uses wastage_qty and excludes packaging. Renaming a UI heading or moving usage into wastage would change reported history.
- Base validation in migration 321 requires a reason for positive food wastage. Any carryover waste editor must retain reason and Other-comment validation.

## Isolated evidence

`tests/fixtures/odr-carryover-normalization-repro.cjs` extracts the actual normalization block from migration 363 and runs it in PGlite. Eight assertions pass: positive carryover wastage becomes zero, reason becomes null, usage/tomorrow/note remain unchanged, daily-food wastage stays intact, carryover completion requires Usage, packaging completion requires balance.

This is an exact block reproduction, not full RPC authorization, current Production function-body verification, or user acceptance.

## Required implementation boundary

Await user's choice whether future Usage entry remains required or historical-only. Continue unrelated UI fixes independently. Both choices must preserve historical usage, notes, zero and unknown values without bulk backfill.

A complete candidate requires independent carryover-wastage provenance, compatibility for old clients (do not turn their hidden default zero into a confirmed waste count), guarded replacement of the installed private tracking wrapper, matching UI/payload/query types, and atomic failure/permission/concurrency tests. The public wrapper chain, ACL and installed body must be read and compared before any installation. No SQL candidate has been installed or represented as ready by this trace.

Do not release a Wastage editor while the old normalizer still discards it. Do not derive usage or sales from sent minus waste minus tomorrow: opening stock is not established by these fields.

## User decision and local implementation

User confirmed: stop future Usage entry; preserve historical Usage read-only. Supersedes the pending decision above.

- Form now shows Qty Sent / Received / Wastage / Tomorrow; historical Usage is text only, including zero. Positive historical wastage remains visible; legacy zero is not silently certified as an independent waste count.
- Candidate SQL adds independent carryover_wastage_provided and changes only the private tracking wrapper after checking its exact old body. No grants, public-wrapper changes, historical conversion, or business-row backfill.
- Database ignores submitted carryover Usage and uses the existing row under the existing record lock; new rows retain NULL. Existing public/base authorization and posted protections remain delegated.
- Old-client carryover edits fail before saving. New server action checks the additive column before RPC submission. Install atomically before deploying this app; failure leaves the current installed app unchanged.
- Existing sums already use wastage_qty and preserve historical usage_qty separately. No inferred sales/usage or opening-stock arithmetic is introduced.
- 14 isolated wrapper assertions passed; base authorization and locking are stubbed, so these are propagation/atomicity assertions, not real RLS or concurrency acceptance. 10 related regression tests, TypeScript and targeted lint passed.
- SQL NOT installed. Live current private-function body/ACL drift check, full-chain RPC tests and authenticated visual/save verification remain release gates. Do not claim Production fixed.
- Once new waste exists, reverting to the old normalizer would zero it. Rollback must retain this DB guard and disable writes/use a compatible read-only app; do not restore the old SQL function.

Local production-mode build passed (placeholder local Supabase configuration; no live data). A subsequent help-text correction clarifies food wastage versus packaging usage and beverage sales; rendered Preview remains pending.

Compatibility/full-chain follow-up supersedes blanket old-client rejection: old Usage unchanged permits saving with stored wastage/notes preserved; changed Usage is rejected with refresh guidance. See [installation review](odr-carryover-install-review-20261104.md) for current hashes, 28 full-chain/19 wrapper assertions and concurrency limits.
