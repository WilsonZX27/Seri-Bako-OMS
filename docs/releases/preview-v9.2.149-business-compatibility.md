# v9.2.149 Business contract compatibility

Prepared with asset creation disabled. Existing single-asset operations and access/Chef fixes are preserved. Production includes only the minimal batch read/process, EL and repair compatibility; Preview retains its existing UI. Database activation and sequence initialization are separate guarded steps. No business data backfill, permissions expansion, real imports or inventory/payroll actions.

Production inherited20 baseline test failures with no new failures. Exact immutable source patch identities and isolated checks are recorded in /tmp/oms-prod148-compat-evidence/manifest.json.
