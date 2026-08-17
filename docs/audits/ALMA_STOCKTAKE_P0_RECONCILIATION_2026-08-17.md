# Alma Central Kitchen stock-take P0 reconciliation

Source: `C:\Users\WilsonZX\Downloads\AUGUST (2).xlsx`  
Audit date: 2026-08-17  
Scope: item-code/name identity and stock-take readiness. UOM differences are reported only; they are intentionally not changed in this P0 pass.

## Verified facts

- 151 coded stock-take rows were found (133 ingredient/raw-material rows and 18 packaging rows).
- 141 rows have quantity greater than zero; 10 rows are zero quantity.
- There are no duplicate `Item Code` values inside the coded stock-take rows.
- Row 136 is a `PACKAGING` section separator, not an item and must not be imported.
- Against `supabase/seed_stock_listing.sql`, 85 matched codes have a different description and 32 have a different item group.
- 39 stock-take codes are not present in the seed, including the numeric packaging codes. They cannot be silently treated as renames.
- 11 rows have an exact description match under a different existing seed code. Those are potential duplicate identities, not safe one-row updates.

## P0 execution decision

The owner authorised the stock-take as canonical, including the duplicate identities. Migration `158_reconcile_alma_stocktake_item_master.sql` therefore updates all stock-take names/categories, reactivates canonical stock-take codes, renames the exact-match legacy rows where the canonical code is new, archives legacy duplicates where both rows already exist, and inserts genuinely new stock-take codes. It does not hard-delete item rows, and it intentionally leaves existing UOM values unchanged.

The audit helper remains read-only:

```text
python scripts/audit_alma_stocktake.py
```

## Current stock-count warning

`SC/AUG26/011` showing `0 KG` physical versus `0.05 KG` theoretical and `-100%` variance is a valid variance warning. It does not mean the stock-count calculation is corrupt; it means the count differs from the ledger beyond the 2% tolerance, and the record needs remarks when the workflow requires them.

UOM is intentionally deferred as requested. Stock quantities still need to be posted through the Stock Count workflow; this migration only corrects item-master identity and does not fabricate ledger movements.
