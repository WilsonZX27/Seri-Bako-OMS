# Sprint 7.29.1 Stock Count migration 110 local validation

Date: 2026-07-29  
Environment: disposable Supabase Local only  
Result: PASS locally; remote state not assessed

## Isolation and migration boundary

- Project identifier: `seri-bako-stock-count-110-validation`
- API: `http://127.0.0.1:55321`
- PostgreSQL: `127.0.0.1:55322`
- Baseline: 107 canonical migrations, 001 through 109
- Migration 110 SHA-256:
  `7BF665D96CD018362090775C89275656C5152EDAA7BC55748E0DDA11DAE530A5`
- Migration 110 was applied with `migration up --local` and recorded.
- Migration 111 was absent from the disposable directory and migration history.
- The linked remote project was not contacted or modified.

## Permission canonicalization

Repository audit found no RLS policy, PostgreSQL function, view, or direct page
dependency on `stock_balances.view`. It was only an application compatibility
alias. Database authorization now uses canonical permission
`stock_balance.read`; the legacy application request resolves one-way to that
canonical permission.

Migration 110 grants eight canonical permissions to every active, non-deleted
tenant Kitchen role. It raises on a missing Kitchen role, missing permission
row, or incomplete role-permission pair count. Two separate tenant Kitchen
roles both received 8/8 grants in this validation.

## Database scenarios

All records belong to disposable company
`00000000-0000-4000-8000-000000000001`.

| Scenario | Stock Count | Branch | Final status | Posting reference | Transaction | Lines | Balance | Result |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| Save draft | `00000000-0000-4000-8000-000000001001` | `00000000-0000-4000-8000-000000000011` | draft | — | — | 0 | 10→10 | PASS |
| Non-zero variance | `00000000-0000-4000-8000-000000001002` | assigned | posted | `SC-QA-SC110-NONZERO` | `2080145f-ffb3-4e29-b349-2b53bf4bf6d1` | 1 | 10→11 | PASS |
| Zero variance | `00000000-0000-4000-8000-000000001003` | assigned | posted | `SC-QA-SC110-ZERO` | — | 0 | 10→10 | PASS |
| Legacy submitted | `00000000-0000-4000-8000-000000001004` | assigned | posted | `SC-QA-SC110-SUBMITTED` | `d7948e2d-db59-4c98-adba-a58575bc3946` | 1 | 10→11 | PASS |
| Legacy reviewed | `00000000-0000-4000-8000-000000001005` | assigned | posted | `SC-QA-SC110-REVIEWED` | `0dbe8a21-66e7-4c7f-9d52-a905d111f2c1` | 1 | 10→11 | PASS |
| Legacy approved | `00000000-0000-4000-8000-000000001006` | assigned | posted | `SC-QA-SC110-APPROVED` | `1d7a4eda-640c-4e69-8f30-7fa500805bce` | 1 | 10→11 | PASS |
| Repeated posting | `00000000-0000-4000-8000-000000001007` | assigned | posted | `SC-QA-SC110-REPEAT` | `1cf96e7e-0303-4808-ad87-bc9823efbc4e` | 1 | 10→11 once | PASS |
| Concurrent posting | `00000000-0000-4000-8000-000000001008` | assigned | posted | `SC-QA-SC110-CONCURRENT` | `1fa73682-28c4-455f-839f-c93d7d3ad3cc` | 1 | 10→11 once | PASS |
| Snapshot stale | `00000000-0000-4000-8000-000000001009` | assigned | draft | — | — | 0 | external 10→11 only | PASS |
| Unassigned branch | `00000000-0000-4000-8000-000000001010` | `00000000-0000-4000-8000-000000000012` | draft | — | — | 0 | unchanged | PASS |

The two concurrent sessions returned `already_posted=false` and
`already_posted=true` respectively.

## Read-only verification

- Required RPCs and schema columns: present
- Migration 110 recorded: true
- Migration 111 absent: true
- Every tested tenant Kitchen role: 8/8 canonical grants
- Posted non-zero counts without transaction: 0
- Duplicate posting references: 0
- Stock transaction/count branch mismatches: 0
- Stock Balance/posted ledger mismatches: 0

## Static verification

- TypeScript: pass
- ESLint: pass
- Stock Count and permission contracts: 18/18 pass
- Full contracts: 387/389 pass
- Production build: pass

The two remaining failures are pre-existing Purchase Request contracts and are
outside this scope.

## Release decision

Migration 110 is ready for production-runbook preparation from the local
Stock Count perspective. Production execution is not authorized by this
report. The user reported an accidental push of all migrations; because remote
access was prohibited, remote migration history and migration 111 must be
audited separately before any release action.

