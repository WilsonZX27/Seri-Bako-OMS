# Pilot Import Templates

These CSVs mirror the supported headers in `src/lib/imports/config.ts`. Every file contains one clearly marked placeholder row; delete it before importing real pilot data. CSV files use a header row, comma delimiters, UTF-8 text, dot-decimal numbers, ISO dates (`YYYY-MM-DD`), and the stated boolean/status values.

## Order

1. `suppliers.csv`
2. `items.csv`
3. `supplier_items.csv` when supplier-specific purchasing data is required
4. `products.csv` when recipes/production need product records
5. Enter recipes manually in Recipes / BOM; recipe CSV import is not supported
6. `opening_stock.csv` last

Download/preview through Import Data, resolve every error, and confirm only the intended mode. Stable `supplier_code`, `item_code`, `product_code`, and `branch_code` values are the cross-file identifiers. Missing referenced suppliers, items, branches, or UOM conversions are errors; the importer does not silently create them. Never put several suppliers in one field or use database UUIDs as substitutes for business codes.

Items support a supplier link through `supplier_code`. Opening stock uses `branch_code`. Posting requires explicit confirmation and writes ledger transactions, not direct balances.

Products are optional. Recipes must be created in the application by selecting the finished product, version/yield/effective information, and ingredient item lines with quantities/UOMs; use only fields shown by the current form.

## Suppliers

Unique key: `supplier_code`. Required: `supplier_code`, `supplier_name`. Optional: `contact_name`, `email`, `phone`, `address`, `payment_terms_days`, `status`. Payment terms must be a non-negative whole number. Status is `active` or `inactive` (blank defaults through importer behavior). Create rejects an existing code; update skips an unknown code; upsert chooses the matching result. Names may repeat, so review name/contact duplicates manually. No tax/registration field is supported by this CSV.

## Items

Unique key: `item_code`. Required: `item_code`, `item_name`, `category`, `base_uom`. Optional numeric fields are `safety_stock`, `reorder_level`, `default_unit_cost`, `supplier_price`, `minimum_order_qty`, and `lead_time_days`; they must not be negative. Optional purchasing fields are `supplier_code`, `supplier_item_code`, and `purchase_uom`; the supplier code must resolve to an active Supplier and the UOM must use a supported value. Status is `active` or `inactive`. When a supplier is supplied, the importer creates or updates one supplier-item purchasing record.

## Supplier items

Unique key: `supplier_code` + `item_code`. Required by validation: an existing supplier identified by `supplier_code` or `supplier_name`, plus `item_code`, `purchase_uom`, and non-negative `unit_cost`. For the pilot use stable `supplier_code` and leave `supplier_name` blank. Optional: `supplier_item_code`, `supplier_item_name`, positive `conversion_rate`, non-negative `lead_time_days`, non-negative `moq`, and boolean `active`. Unknown supplier/item rows fail; no master record is created.

## Products

Unique key: `product_code`. Required: `product_code`, `product_name`, `category`, `selling_unit`. Optional `active` accepts `true`/`false`. Create rejects an existing code; update skips an unknown code; upsert resolves by code. Product packaging and Recipes are configured in the application, not this CSV.

## Opening stock

Unique posting guard: `branch_code` + `item_code`; create mode only. Required: existing active `branch_code`, existing `item_code`, positive `quantity`, and `uom`. Optional: non-negative `unit_cost`, ISO `transaction_date`, and `notes`. The input UOM must equal the item's base UOM or have an active conversion. An existing opening balance for the branch/item is skipped. Confirmation posts one ledger transaction/line; it never edits current stock directly.
