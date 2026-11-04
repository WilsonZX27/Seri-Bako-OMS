# Preview release checkpoint2026-11-04

Candidate f30b15eccd4bde68f254e066254c3b35a7747e2d pushed to codex/followup-integration-20261104;41 targeted tests and full build passed. Latest known Production baseline5fc88063c2d81f0b0ad68d560b69002f49789422 is historical evidence, not current live deployment verification. Diff117 files,+2552/-177, including source, tests, documents and SQL artifacts.

Scope: session-local idle logout; planning append missing without rewriting existing inputs; AT numbering candidate; RO/OT error classification and self-review explanation; seasonal availability/history and receipt summaries; next-day Wastage/history-preserving save compatibility; shared surface timing; procurement/stock technical tables; Low Stock and Stock Count UI; asset import entry and schedule import result visibility. SQL artifacts in Git are not automatically installed. Summary and carryover installers have separate recorded installation evidence; AT activation must not be inferred from this push. Preserve dedicated pause/rollback rules instead of restoring the old carryover normalizer.

New bounded read-only attempt: navigating existing fixed Preview alias to purchase-orders returned the login page; no PO/GR data was read this pass. Same tab retained for login. No inference about cause of session expiry or other browsers. Earlier authenticated readonly results remain documented in module records.

Remaining: new f30 deployment READY unverified through previously403-blocked Vercel access; current live Production SHA not reverified; original workbook/week matching; actual Low Stock populated row; intermittent black blur; live save/import/post intentionally not exercised. Latest asset-entry/result-footer/KG-copy changes require new deployment acceptance. No Production release, bypass, or business writes.

## Offline release classification
117-file scope =46 runtime files,31 docs/handoff,31 tests/fixtures,6 SQL candidates,3 scripts. File count alone is not a release gate.

| Group | Dependency and evidence | Remaining action |
|---|---|---|
| Daily Wastage/history/summaries | Summary functions and no-table carryover installer separately installed and read back;19 wrapper/28 chain/13 installer checks plus5 earlier real concurrency scenarios | Use compatible app; retain dedicated pause, never restore old waste-zeroing function |
| Planning missing products | Dedicated RPC and PJS10 Nov11 recovery were completed per session record; old module notes still describe pre-install state | Preserve48 rows/revision26 recovery; do not reappend or install from stale notes; current live catalog not reread in offline pass |
| AT numbering |383 schema exists; activation file explicitly requires target company and separate activation; no automatic migration | Keep current switch, do not claim numbering activated by app push |
| RO/OT | Error classification and self-review copy, no new approval grants | Original incident full cause remains unknown; no real approval required merely for visual release |
| Layout/imports/shared surfaces | PO/GR/stock tables, Low Stock, schedule and asset controls; tests and bounded Owner read-only checks | Latest3 UI patches need new Preview acceptance; original workbook needed for week matching; intermittent blur not reproduced |
| Session timeout | Local-session scope regression covered | Real dual-session expiry acceptance remains separate |

Changed23 test files expanded check: initially109/111 passed; two obsolete assertions still demanded fixed72px Daily tracks and xl-only details. Updated them to the later user-approved equal responsive tracks/container rule while retaining form fields/input dimensions checks.111/111 then passed. This is test-contract correction, no runtime change. Last full runtime build onf30b15e passed.

Concrete release checklist: (1) establish exact new Preview READY evidence without bypassing403; (2) restore same Owner session for remaining latest-patch/PO/GR checks; (3) verify current Production SHA before final diff/promotion review; (4) retain compatible app+DB pause rollback and installed SQL receipts; (5) keep AT activation and unknown business mapping outside this release. These are operational verification gaps, not evidence of a new crashing runtime bug. No deployment or production write performed in this pass.
