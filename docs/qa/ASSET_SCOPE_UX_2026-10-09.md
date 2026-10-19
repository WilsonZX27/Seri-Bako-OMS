# Asset scope and interface verification — 9 October 2026

## Release and database

Current formal version: **v9.2.102**. The authoritative deployment log is oms-asset-102-deploy.log; hosted build compilation, type/lint checks and formal alias assignment succeeded. Full regression: **1,464 passed**.

Migration 339 is applied to project nnvdsaftiwpqkekjfrgc after explicit owner authorization. The paired interface v9.2.98 was promoted as dpl_8Nergf2V4zx62ZJkGBEDjEr3sBm1. Subsequent tablet action fixes are tracked below; the migration is not rerun for presentation changes.

All 13 business-table row counts and canonical row fingerprints match the frozen source ledger. The final batch remains live. The permission migration changed policies, functions, grants and asset role permissions; it did not change business rows. Eight existing-role JWT identities passed live read-only assertions for assigned locations, full check and maintenance history, management-only overview/maintenance, raw source-column denial, private Storage and direct-write denial. These are SQL identity checks, not eight browser logins. Both original photographs opened through the formal OMS attachment routes after migration.

## Actual browser evidence

| Screen | 390 | 430 | 820 | 1143 | 1440 |
| --- | --- | --- | --- | --- | --- |
| Overview | No root overflow | No root overflow | No root overflow | No root overflow | No root overflow; right Console visible |
| Assets | Compact rows | Compact rows | Table | Table | Table |
| Maintenance | Compact queue | Compact queue | Table | Table | Table |
| ALMA inspection | 73 assets; fixed submit | 73 assets; fixed submit | 73 assets; action gap found | 73 assets; action gap found | 73 assets; right Console |

Every measured viewport width equals its requested width. The two overview SVG plots measured 200px each. Actual ALMA filtering returned 73 records, and name sorting worked against hosted PostgREST. Unknown quantities remain Unknown; recorded zeros remain zero. Inspection mode loads all 73 holdings rather than silently limiting to 50.

Jakel inspection draft interactions verified bulk selection (27/27), Undo, exception expansion and automatic exception selection, and the unsaved-change dialog with discard. No checklist or synthetic asset was submitted to Production. Auto-review rejected a proposed invalid-note submission because it could still persist an actual inspection. Payload and lifecycle writes were verified in isolated tests instead.

## Tablet correction

v9.2.99 added a sticky submit toolbar. Actual scrolling showed the surface ancestor prevented that toolbar from remaining visible. This is a failed intermediate verification, not accepted evidence. v9.2.100 replaces it with a fixed toolbar above the primary navigation at 768–1279px and reserves 96px at the form tail. v9.2.100 is deployed. Actual scrolled screens at 820 and 1143px confirm the submit toolbar remains inside the viewport, above rather than over the primary navigation. At 1143px it measured y=790–860 in a 932px viewport. The later v9.2.101 also reorganizes the Daily Checklist management list with filters first, compact status rows, explicit Inspect links and collapsed historical inspections; the live ALMA filter returned only that location with 0/73 progress. The shared Table reserved icon-only width for a header named Action, clipping text inspection links; v9.2.102 uses a normal Inspection column and is deployed to the formal domain. Final actual-width screenshots at 390/430/820/1143/1440 show no root overflow; visible table widths equal scroll widths (738px at 820, 990px at 1143, 810px at 1440), with fully visible Inspect links. Phone checklist was rechecked in the final release. Temporary viewport overrides were reset.

## Regression and limits

Latest full working-tree regression: 1,464 passed, zero failed, skipped or cancelled. Hosted build type/lint validation is a separate check. User visual approval, independent staff browser sessions, keyboard overlap and actual business submissions are not claimed. Penang confirmed yield/product data remains separate from this asset release.

Private screenshots and SQL receipts: outputs/asset-migration-private/2026-10-09/rework-339/. The earlier incorrectly sized checklist captures are excluded. Temporary viewport overrides are reset after verification.
