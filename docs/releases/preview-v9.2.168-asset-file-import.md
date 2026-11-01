# v9.2.168 — Owner asset file import

Base production167 6c8f0822cdf183bc5a4b39ec1e0d0ce6c88bd588. Feature patch SHA256 dfe19c445f948c3413d3502916a0187ae908e8d9aec3f9a301bf75d2b5be3a9c; remaining diff is version/release documentation only.

CSV/XLSX <=5MB and100 rows; template/example/location catalog; stable location IDs; formula rejection; explicit confirmation; persistent row receipts and retry keys. Per-row atomic create_asset_master RPC reuses existing permissions and allocator. Not a whole-file rollback. No new database migration or grant. Existing assets never overwritten. Shared parser options default to prior callers' behavior; namespace-prefixed XML accepted. Owner-only assets.manage route, server actor/permission checks.

Local full tests, lint and build passed on worker Node24; integration reruns Node22.23.2. Local HTTP batch read uses fixture postgres role, not production RLS acceptance. Existing anonymous per-row mutation and lost-response concurrency evidence retained. Browser fixture CSV download and five-width result states passed. Authenticated Preview and genuine-role acceptance pending. No production import authorized or attempted.

Rollback application to167; preserve any successfully created assets, holdings, audit, request keys and allocated IDs. Do not delete successful rows to imitate whole-file rollback. Release requires explicit production approval after final candidate review.
