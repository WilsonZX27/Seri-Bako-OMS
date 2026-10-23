# 9.2.135 — UI-only hotfix Preview

Base: Production source `2d89524c77869a03a94f6b6821b7bb4d7cc543c4`.

- Move existing Inventory overview and action sections before the movement chart.
- Fill the final Dashboard finance row with the existing Due soon tile.
- No query, permission, role, database, migration or business-state changes.

Independent Preview candidate; Production promotion requires a separate decision.
Rollback reference: current Production deployment `dpl_ECf4TPgezkaP4KiRbzvv68ifbWEf`. Rollback operation has not been exercised.

Validation: Node 22.23.4; 11/11 targeted tests, typecheck, scoped ESLint and synthetic-config Next build passed. Hosted build and actual three-viewport acceptance remain pending.
