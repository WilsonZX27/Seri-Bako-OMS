# Carryover real concurrency and build — 2026-11-04 MYT

Runtime candidate: `0f2db804275304c90eeb63628071a471bf5b7a61`. No production SQL, data or deployment changes.

## Environment

Docker Desktop was initially stopped. After starting it, the sandbox denied socket access; normal elevated review allowed local Docker access. A new dedicated container `oms-carryover-concurrency-20261104` used the already cached official Supabase PostgreSQL 17.6.1.143 image, fresh /tmp PGDATA, **network none, no host mounts or published ports**. Existing task databases were not used or altered. Docker's other configured auto-start containers were left alone.

Fictional schema and identity/permission helpers match the prior full-chain fixture. All six actual save function bodies were previously verified against live read-only hashes. Two independent `docker exec psql` processes connected as `authenticated` for saves; observation used local postgres. This is real PostgreSQL concurrency, not two promises sharing one PGlite connection.

Reproducible fixture generator: `tests/fixtures/odr-carryover-concurrency-bootstrap.py`. Its output exactly matched the SQL used for this run. Runner: `tests/fixtures/odr-carryover-concurrency.py`. Run only inside the named newly initialized isolated container; never a production URL. Container was stopped after testing and retained for inspection.

## Five passing scenarios

Each scenario observed A's open transaction and B's actual Lock wait with a nonempty pg_blocking_pids list before releasing A. Assertions inspect stored Usage, Wastage and notes afterward.

1. New payload commits, old payload through checked wrapper waits: stale revision rejected, new wastage preserved.
2. Old payload commits, new payload through checked wrapper waits: stale revision rejected, history preserved.
3. New payload rolls back, old checked save waits: old save succeeds after rollback; discarded new waste does not leak.
4. New save commits, old direct v92 save waits: old save succeeds but preserves the newly stored wastage and historical notes/Usage instead of sending hidden zero into storage.
5. Old direct v92 save commits, new checked save waits: new stale revision rejected; history preserved.

Old direct RPC has no optimistic expected-revision argument; unchanged legacy semantics allow a later write to ordinary received/tomorrow fields. This test does not claim that endpoint rejects every stale ordinary-field edit. The carryover compatibility normalizer protects the new waste fields and historical Usage specifically.

## Build and release

`npm run build` succeeded on the candidate using local placeholder Supabase configuration. No live build credentials or database calls used for validation. Existing fonteditor-core import warning remains nonfatal.

Together with earlier 28 full-chain assertions, 19 wrapper assertions and 71 shared-surface tests, the specifically requested concurrency gap is now closed in isolation. The earlier Docker-unavailable and untested-two-connection statements are superseded by this record.

Still needed before execution: specific SQL installation authorization and compatible application rollout approval under the existing review process, recheck current production hashes/ACL/ledger immediately before installation, and authenticated Preview visual/interaction acceptance. Black blur flicker and remaining original workbook date recognition are not established fixed by these tests. No release attempted.

Install/pause hashes are unchanged from the compatibility revision in `odr-carryover-install-review-20261104.md`. Keep pause SQL and new confirmation column; do not restore the legacy zeroing function. Lock-timeout failure should abort, with read-only inspection before retry. Old clients may continue compatible saves; they must refresh to edit new wastage or if they try to change historical Usage.
