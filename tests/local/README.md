# Isolated commercial checks

`commercial-repair-isolated.py` accepts no production endpoint, key or project reference. It targets only `oms-unified-repair-20261029` and creates a fresh synthetic database inside that disposable container. PostgreSQL authorization helpers are deliberately synthetic: these checks validate the proposed functions' permission/branch/holding gates and concurrency, not current production RLS.

Use an already-installed official Supabase Postgres17 image with **no network, no exposed ports and tmpfs data**. Do not mount existing data. Start a disposable container named as above, using a synthetic password, then run from the source root:

    python3 tests/local/commercial-repair-isolated.py

The script removes the proposal's exact review-only guard only in its in-memory test input. It verifies append/idempotency, two company scopes, cross-location minimal flags, daily exceptions, eight-way concurrent writes, six-way same-key retries, reopen guards, retained legacy duplicates and exact synthetic function/ACL/config restoration. Results include the tested proposal SHA256. Stop/remove the owned disposable container afterwards.

This is not an installer. Production activation requires fresh exact definitions, ACL/trigger/dependency drift checks, a scoped restoration package and explicit release approval. Never run the proposal or the synthetic schema against a hosted database.
