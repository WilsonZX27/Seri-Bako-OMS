# Master-data import readiness

This note records the safe interpretation of the workbook extracts supplied for the current OMS cleanup. It is a preflight record, not an instruction to import every row.

## Findings

- `SUPPLIER.xlsx` contains 265 supplier rows.
- `WHOLE ITEM.xlsx` contains 681 item rows with no duplicate item codes. 99 rows have a blank `Main Supplier`.
- `STOCK TAKE PJS10 CK (2).xlsx` has 127 coded rows on the `12 Aug` sheet. Every code matches the item master, but all 127 quantity cells are blank. The sheet is therefore a count worksheet, not an opening-stock import.
- The `Sample` sheet has descriptions and supplier text but no item codes; it is not safe to use as an import source.
- `branch-supplier-items-template.csv` is structurally valid, but its sample row is only a template example and must not be treated as real mapping data.

## Safe import order

1. Import or reconcile the supplier master using stable supplier codes.
2. Import `WHOLE ITEM.xlsx` through the `items-stock-listing` profile. `UOM Count` remains source information; it never creates stock.
3. Import supplier-item commercial relationships with verified item and supplier codes, purchase UOM, and cost.
4. Import branch-supplier mappings only after step 3. Each row must resolve to an active branch, item, supplier, and supplier-item relationship; preferred rows must be unique per branch and item.
5. Treat the stock-take workbook as an operator count source. Enter observed quantities in Stock Count and post only after every line is physically verified. Never translate blank quantities into zero.

The import UI now states these boundaries directly: blank `Main Supplier` cells remain item-master data, unresolved branch mappings remain blocked, and the system does not invent supplier relationships from names.
