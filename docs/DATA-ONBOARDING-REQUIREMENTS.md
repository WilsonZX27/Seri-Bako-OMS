# Supplier-item relationship onboarding

`branch-supplier-items-template.csv` is a schema template only. It is not an
authoritative source of supplier relationships and must never be imported as
production data.

## Minimum authoritative data

Provide one real, dated workbook or CSV export with a source-of-truth owner.
The import can be split across files, but the keys must be exact and stable.

### 1. Supplier master

Required columns:

- `supplier_code` (stable code used by the system)
- `supplier_name`
- `status` (`active` or `inactive`)
- `company_name` / registration identifier where applicable

Every supplier code used by an item relationship must exist in this master.

### 2. Item master

Required columns:

- `item_code` (stable SKU/code)
- `item_name`
- `base_uom`
- `status`

The supplied `WHOLE ITEM.xlsx` is useful for this master cross-check, but blank
supplier fields are unresolved data, not permission to guess a supplier.

### 3. Supplier-item terms

One row per sellable supplier-item combination:

- `supplier_code`
- `item_code`
- `supplier_item_code` (if the supplier uses a different code)
- `supplier_item_name` (optional but recommended)
- `purchase_uom`
- `units_per_base_uom` (or an explicit conversion rule)
- `unit_cost`
- `currency`
- `minimum_order_qty` (optional; include its UOM)
- `lead_time_days` (optional)
- `active_from`, `active_to` (optional)
- `status`

Do not infer `purchase_uom`, conversion, cost, or MOQ from a display label.
Those values affect purchasing and inventory arithmetic and need an explicit
source value.

### 4. Branch-supplier-item assignment

One row per relationship that is valid for a branch:

- `branch_code` (the exact system branch key, not only a display name)
- `item_code`
- `supplier_code`
- `is_preferred`
- `status`
- optional branch-specific `purchase_uom`, conversion, cost, MOQ, and dates

If the business rule is “all branches may buy from the supplier”, provide that
as an explicit policy or a row for every branch. Do not assume global scope
from a single branch row.

### 5. Exceptions and approvals

Provide a separate exception sheet for:

- items with no supplier yet;
- items with more than one preferred supplier;
- inactive suppliers still used by historical documents;
- branch names that do not map one-to-one to branch codes;
- UOM mismatches, including the 14 mismatches found in the supplied PJS10
  stock-take workbook;
- rows that should be archived rather than activated.

Each exception needs an owner and an explicit decision. Rows without a decision
remain blocked from import.

## Import preflight rules

Before any write, the loader must report counts for:

1. unknown supplier codes;
2. unknown item codes;
3. unknown branch codes;
4. duplicate `(supplier_code, item_code)` terms;
5. duplicate preferred branch assignments;
6. missing or invalid UOM conversions;
7. non-positive or missing costs where cost is required;
8. inactive supplier/item/branch references;
9. rows that would overwrite an existing active relationship.

The preflight is a hard gate: unresolved rows are rejected and no partial
relationship write is performed. The result should be saved with the source
file name, file hash, operator, and timestamp so the import can be audited or
reverted.

## Files already supplied

- `SUPPLIER.xlsx`: supplier-master evidence.
- `WHOLE ITEM.xlsx`: item-master and partial supplier evidence.
- `STOCK TAKE PJS10 CK (2).xlsx`: stock-count quantities and UOM evidence;
  it is not a supplier-term file.
- `branch-supplier-items-template.csv`: column template only; not data.

Those files are enough to produce a mismatch report, but not enough to safely
create all supplier-item and branch-supplier-item relationships because they do
not provide authoritative purchase terms and branch assignments for every row.
