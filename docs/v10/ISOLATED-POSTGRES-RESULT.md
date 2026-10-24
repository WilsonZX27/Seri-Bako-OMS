> Latest checkpoint: see `LOCAL-INTEGRATION-VALIDATION.md`. Current35 isolated SQL/action groups and1818 frozen source tests passed; final synthetic-config build and four-width local readonly after-screenshots passed. Earlier investigation/checkpoint text below is historical, not a current Docker/build blocker. No deployment or full JWT/interactive acceptance.

# Isolated PostgreSQL proposal validation — 24 October 2026

## Target proof before SQL

Supported reviewed execution created only `oms-ui-scratch-20261024`, containerb20c8c084f79a43a82e2fc55ddf827e9908ba2f0af893e556b58bab5903ad127, cachedSupabasePostgreSQL17 image80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453. Inspect asserted networknone, noports, nobinds, nomounts, readonlyroot andtestlabel. Data in /scratch tmpfs only. No real credentials or existingdatabase contacted.

## Scope

Minimal tables model actual columns/constraints used by existing337transferfunctions,357locationregistration andlocalnumbering/batchproposals. Actual proposal functions executed. Auth, permission and branch helpers are explicit synthetic adapters; this is not full Supabase JWT/RLS or application integration. Fresh `oms_final` database was used for final rerun.

## Eighteen passed groups

1. Concurrent distinct numbering, imported-code collision skip, audit identity.
2. Concurrent same-key retry creates one asset/holding/audit; changed payload rejected.
3. Explicit rollback restores asset/sequence counts.
4. Downstream audit failure rolls back allocation, asset and holding.
5. Synthetic tenant/branch/asset-only allocator permission boundaries reject.
6. Manual historical ID retry does not consume sequence.
7. Two-line transfer and exact retry return same batch; changed payload rejected.
8. Null/empty/duplicate input rejection; invalid second item rolls back header/first item.
9. Concurrent same-key batch creates one header/two lines.
10. Concurrent reservations cannot overbook holding.
11. Membership guard and synthetic tenant/branch/approval denial leave state unchanged.
12. All-line approval/dispatch updates stock and per-line audit.
13. Unknown second destination count rolls back first receipt, states and audit.
14. Full receipt succeeds once; repeat receipt cannot double stock.
15. Representative view/RLS hides foreign tenant/inaccessible branch.
16. Historical single-item transfer remains in register.
17. Same UUID in different case rejected before header insert.
18. Reverse-order/case-varied concurrent batches finish with canonical UUID lock ordering.

## Defects found and corrected in review-only SQL

Untracked375 null JSON-array guard was fixed before tests. Actual SQL then exposed another defect: same UUID with uppercase/lowercase text produced two accepted lines. Before evidence records2lines; proposal now deduplicates and sorts castUUID values. Final16-group rerun plus2case regressions passed in freshdatabase. No active migration/sourceoriginal was changed.

## Evidence / cleanup

/tmp/oms38-db-tests contains isolation.json, base-final.sql, run-final.py, run-final.log, uuid-case-before.log, uuid-case-final.py/log, final-results.json, hashes andserver/cleanuplogs. Bundle /tmp/oms38-isolated-postgres-evidence.tar.gz. All synthetic. Containerstop/remove succeeded; no global Docker settings, image cleanup or othercontainer modifications.

## What is not implemented

AutomaticID frontend/RPCmode and sequenceconfiguration are not integrated. Multiasset form, query/detail/approvaldispatchreceive application wiring are not integrated. New allocator permission and batchschema/RLS/RPC need review. Real roles, JWT, deployedschema, actual data, end-to-end business save and full application regression remain unverified. No remote SQL or deployment. Keep online139 unchanged; no overall greenlight.
