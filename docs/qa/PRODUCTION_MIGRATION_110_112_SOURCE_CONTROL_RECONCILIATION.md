# Production migration 110-112 source-control reconciliation

This record reconciles the repository with the production migration audit. It
does not authorize a migration, application deployment, or Central Kitchen
Purchase Request feature launch.

## Required order

1. `110_sprint_7_29_1_stock_count_posting_integrity`
2. `111_central_kitchen_purchase_request_atomic`
3. `112_restrict_central_kitchen_pr_rpc_acl`

The repository must retain these files as immutable production history. Never
edit, replace, renumber, rerun, or repair them after production execution. Any
future correction must use a new forward-only migration.

## Evidence matrix

| Version | Production history | Production schema effect | Source statement comparison |
| --- | --- | --- | --- |
| 110 | Recorded once; expected name observed | Stock Count posting columns, indexes, constraints, draft RPC, posting RPC, eight canonical Kitchen permission grants, and integrity invariants were observed | **HISTORY CONTENT MISMATCH.** Production and fresh local both contain 21 statements, but the normalized aggregate fingerprints differ. Only statement ordinal 10 differs. |
| 111 | Recorded once; expected name observed | `purchase_request_stock_holds`, its indexes and constraints, and `create_central_kitchen_purchase_request_atomic(jsonb)` exist | **EXACT HISTORY MATCH.** Statement count, raw character count, raw fingerprint, and normalized fingerprint all match fresh local CLI history. |
| 112 | Recorded once as `restrict_central_kitchen_pr_rpc_acl`; one history statement | `anon` execute is absent and `authenticated` execute remains present for `create_central_kitchen_purchase_request_atomic(jsonb)` | **HISTORY CONTENT MISMATCH.** Production stores the full migration as one history statement; fresh Supabase CLI execution parses it into four statements. Statement count and normalized aggregate fingerprint therefore differ. |

The production fingerprints were collected through Dashboard SQL Editor using
`BEGIN TRANSACTION READ ONLY` and `ROLLBACK`. The fresh local history was
created only by Supabase CLI execution of checksum-verified canonical files.
No history row was inserted or repaired manually in the disposable database.
Statement text was never returned by the fingerprint queries.

## Statement fingerprint reconciliation

| Version | Side | Statements | Raw characters | Raw MD5 | Normalized MD5 | Classification |
| --- | --- | ---: | ---: | --- | --- | --- |
| 110 | Production | 21 | 13,929 | `f7c92978e5266b4643e0243984b8172d` | `312ae0324d01bcd2536209d46e820d48` | Content mismatch |
| 110 | Fresh local CLI | 21 | 15,690 | `70d8ae5e64e9205c72da40cb64f87aa9` | `a77e5f91128d59c6da352ac56a540a2b` | Content mismatch |
| 111 | Production | 4 | 6,118 | `2c9198810e2fbbfafcc6a71f6ecaba31` | `a9e85e2bd8eaedf92965af8fe13c5a69` | Exact match |
| 111 | Fresh local CLI | 4 | 6,118 | `2c9198810e2fbbfafcc6a71f6ecaba31` | `a9e85e2bd8eaedf92965af8fe13c5a69` | Exact match |
| 112 | Production | 1 | 1,203 | `3738e81fce9b76652aa116322ee98bc7` | `87e63de4430a5a6c9f3c168b779de639` | Content mismatch |
| 112 | Fresh local CLI | 4 | 1,192 | `edcfaf388885655fb5755cf58bd9b1ca` | `73b82e17ced2ed1f4f66e24bf746900f` | Content mismatch |

Migration 110 differs only at statement ordinal 10:

| Side | Ordinal | Raw length | Raw MD5 | Normalized MD5 |
| --- | ---: | ---: | --- | --- |
| Production | 10 | 705 | `0b4bc856c0d7d6aab0f62b8ff6a5ffab` | `67a442d980c108d6b47df971815b6152` |
| Fresh local CLI | 10 | 2,466 | `b803c2dc86fbfea3bd29781b555d53c6` | `f608a05000346f7521c95da03e1d707f` |

Migration 112 production history has one statement with raw length 1,203,
whereas fresh local CLI history has four statements with lengths 457, 103, 105,
and 527. This is not a formatting-only difference under the agreed comparison
rules because the statement count and normalized fingerprint differ.

Consequently, migrations 110 and 112 are **not eligible for staging as exact
production-history reconstructions**. Preserve the canonical files and
production history unchanged. Do not rewrite either side to manufacture a
match. A separately authorized reconciliation decision is required.

## Production facts

- Migration 111 objects exist in production.
- Migration 111 currently has no stock-hold business data: zero hold rows, zero
  Purchase Requests using holds, and zero matching activity-log entries were
  observed.
- The Central Kitchen Purchase Request feature has not received formal
  enablement authorization. Object presence is not feature-launch approval.
- Migration 112 revoked anonymous execution of the Central Kitchen Purchase
  Request RPC.
- Migration 112 retained execution for `authenticated`.
- No migration 113 or later was recorded at audit time.

## Repository hygiene

Exclude all disposable or sensitive artifacts from staging, including:

- `supabase/.temp/`
- local Supabase volumes and generated state
- `.env*`, credentials, keys, tokens, connection strings, and passwords
- SQL Editor exports and production audit-result exports
- ad-hoc comparison scripts and uploaded data extracts

The application footer and `package.json` version remain unchanged because this
is database-history reconciliation, not an application release.

## Commit boundary

The intended commits are:

1. `v7.29.1: finalize Stock Count integrity workflow`
2. `fix(db): restrict Central Kitchen PR RPC execution`

Both proposed commits remain blocked from staging migration history: migration
110 and migration 112 fail normalized history reconciliation. Migration 111 is
an exact match, but staging eligibility requires all three versions to pass.

## Safety declaration

This reconciliation document was prepared without connecting to or modifying
the production database. It did not rerun a migration, alter migration history,
change Purchasing or Purchase Request/Purchase Order business logic, push,
deploy, or update the application version.
