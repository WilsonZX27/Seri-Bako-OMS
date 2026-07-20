# Wilson SQL Editor runbook — Full Go-Live reset

Script: [go_live_full_reset.sql](go_live_full_reset.sql)  
SHA-256: `4428DFFDC198B869CFFB99F443AC386756112882F16E59904AE477D9C1488535`

1. Obtain Wilson’s final Production GO and capture a fresh database backup plus attachment inventory.
2. Review the preflight notices: the seven preserved Staff/Auth identities, configuration counts, before-counts, and storage-path inventory. Stop if any item is wrong.
3. Run the script once in the Production SQL Editor. It uses one database transaction and rolls back on any error.
4. After commit, delete only the inventoried accessible Storage objects. Record inaccessible paths separately; do not call them deleted.
5. Save the SQL Editor output with the backup reference and the storage-deletion log as the execution manifest.

The script does not use `reset_new_system_data.sql`, deploy code, alter RLS/roles/schema, or run automatically.
