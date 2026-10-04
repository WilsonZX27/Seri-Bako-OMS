# Production Goods Receiving hotfix — 2026-10-04

Migration 328 is applied to the linked production Supabase project. No application redeployment is required.

Production logs showed three failed `/goods-receivings/new` submissions at 17:25, 17:39 and 17:45 Malaysia time. All reported `column reference "purchase_order_id" is ambiguous`. The live creation function declared a `purchase_order_id` variable and also referenced the unqualified column of the same name while validating Purchase Order lines.

`328_goods_receiving_column_disambiguation.sql` renames the payload variable to `v_purchase_order_id` and qualifies the Purchase Order line query with `pol`. The replacement was generated from the actual production definition, with its existing tenant, branch, quantity and idempotency behavior preserved. The migration transaction checks the original function MD5, preserves ACL/owner/security-definer/search-path settings, records migration 328 and reloads the PostgREST schema.

Migration SHA-256: `511989d441c3003cf75ac2d8083e1b7cd9101eae722c4bbaecacf21315509288`.
Original live definition MD5: `97f4066fb0cde714a31081e4bef5dc04`.

Validation:

- 15 actual PostgreSQL execution checks using PGlite: original failure reproduced; fixed creation and idempotent retry pass; permissions, company isolation, invalid lines, negative quantities, over-receipt reason and conversion checks remain; insertion failure rolls back its document.
- 10 existing receiving contract checks passed.
- Production catalog confirms renamed variable and qualified column; ACL, SECURITY DEFINER and search path are unchanged.
- Read-only checks for ALAN confirm creation, draft editing, posting under the existing canonical/legacy aliases, and the affected Purchase Order's company/branch context are allowed.
- Production rollback-write acceptance was NOT executed: automatic approval rejected use of a real staff identity and live PO for write attempts due to possible effects beyond rollback. No retained or temporary business test writes were performed in production. Actual user submission remains the final end-to-end acceptance.

Run the execution fixture with an available PGlite installation:

```sh
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/fixtures/goods-receiving/column-disambiguation.mjs
```

Operator evidence is saved in `/tmp/seri-grn-328-{preflight,apply,verify,kitchen-readonly}.json` and `/tmp/seri-grn-328-apply.sql`. These contain diagnostic metadata and are not committed as credentials or business fixtures.
