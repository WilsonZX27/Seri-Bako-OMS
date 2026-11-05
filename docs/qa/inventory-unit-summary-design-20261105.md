# Inventory purchase / consumption summary — review only

## Requirement and scope
2026-11-05 parent requested readonly Production investigation and isolated database design, no installation or business writes. Current Preview guard 0ac2bf1 suppresses unreliable purchase quantities. No production/runtime code is changed by this candidate.

## Live evidence
Supabase nnvdsaftiwpqkekjfrgc main Production SQL editor, existing authorized session. SELECT-only queries confirmed get_inventory_dashboard_summary(text): owner postgres, SECURITY INVOKER, search_path public, ACL postgres/authenticated/service_role execute (no PUBLIC/anon). Body MD5 ad502b414d2f54f9b7325a5d3d6de1cf exactly matches the function body in migration 138. Both top_purchased and top_consumed group by item_name, order quantity descending, limit five. inventory_daily_summary RLS true.
Seri Bako Malaysia 3b104582-f8cb-4a4d-867f-b99e5ffc6486, current_date minus 30 days, purchase/production_usage: units CAN, KG, LITRE, NOS, PACK, PCS, PKT, ROLL; duplicate names spanning different item IDs in this sample: zero. Mixed-unit comparison is actual; same-name collision is a demonstrated structural risk, not a claimed live occurrence. SQL editor used administrative visibility for metadata/sample counts, not impersonated application roles. No writes to business tables.

## Proposed candidate
sql-candidates/inventory_item_unit_summary.REVIEW.sql replaces only the existing function, retaining all unrelated CTEs and JSON keys. Adds item_id, item_code, base_unit, movement_count to each entry; keeps name/qty for old consumers. Group by immutable item ID and unit (plus display identity), independently for purchases and production usage. Proposed top-five order is movement count descending then item ID, with explicit aggregate order. This measures activity frequency, NOT comparable quantity or monetary spend. UI must label this clearly; user acceptance of ranking semantics remains pending. No grant, policy, trigger, table, ledger or history change. No migration number reserved.

## Historical limitation
Daily summary stores base quantities but no historical UOM snapshot. Candidate uses current items.base_unit as the ledger does. If a base unit was changed after posting, historical unit meaning cannot be reconstructed from this model. Do not guess conversions or rewrite history. Before installation, inspect existing item-unit mutation protections/audit and affected historical records; if consistency cannot be established, keep guard and expose units as unknown rather than assert historical quantities are proven.

## Isolated verification
Run NODE_PATH=/private/tmp/oms-odr-summary-isolated/node_modules node tests/fixtures/inventory-unit-summary-isolated.cjs.
15 PostgreSQL/PGlite assertions pass against full function: duplicate names split by ID, KG/LITRE retained, fractional quantities, sums across dates, frequency order despite larger incompatible quantity, consumption separate from wastage, zero/excluded old dates, branch/company exclusion, empty visibility, data unchanged, invoker/RLS preserved, and owner/config/ACL unchanged by CREATE OR REPLACE. Branch helper and policies are fixture models, not a claim of real-role authorization acceptance. Real schema plan/performance and complete policy dependency validation remain pending.

## Installation and rollback prerequisites
1. Re-read live body hash, owner/ACL/config, schema fields and permission helper/policies; stop on drift. Confirm immutable base-unit history and agree ranking metric.
2. Update clients to consume new fields, show item/unit and explicit frequency ordering; preserve safe fallback for old RPC. Validate mixed-unit, old/new payload, permissions and period filters.
3. Obtain explicit approval to replace the Production RPC (read results change; no data writes or broadened grants). Current authorization covers design/tests only.
4. Transactional replacement with short lock/statement timeouts; before/after metadata and data digests; no re-running migration 138 or its backfill. Verify under legitimate scoped roles and measure read plan.
5. Rollback requires reviewed saved previous function definition only, preserving ACL/RLS; retain UI guard so old name-only quantities are not displayed. No historical data rollback.

No installation, deployment, Production setting change or business mutation performed.
