# Seri Bako OMS Database Schema v1.1

Status: review draft. No frontend work is included in this revision.

## Core Principles

- Stock balance is never stored manually in item or product master.
- Stock balance is calculated from posted `stock_transaction_lines`.
- Stock can belong to raw material / packaging `items` or finished goods `products`.
- Every operational document has audit columns and can be linked to attachments, activity timeline, audit logs, and approvals.
- Purchasing, receiving, invoice matching, payments, production, inventory, and recipe costing are connected by foreign keys.
- AutoCount integration is prepared through `autocount_code`, document numbers, and `external_ref`.
- Multi-site support uses branches and locations:
  - Branch: central kitchen, outlet, event booth, office, or other operating unit.
  - Location: inventory storage area under a branch, such as dry store, chiller, freezer, packaging area, production floor, dispatch area, receiving area, or finished goods store.

## Shared Enums

```text
record_status: active, inactive, archived
approval_status: draft, pending_approval, approved, rejected, cancelled
document_status: draft, submitted, approved, rejected, cancelled, closed
branch_type: central_kitchen, outlet, event_booth, office, other
location_type: dry_store, chiller, freezer, packaging_area, production_floor, dispatch_area, receiving_area, finished_goods_store, other
stock_entity_type: item, product
reset_frequency: never, yearly, monthly, daily
line_status: open, partial, received, cancelled, closed
stock_transaction_type: opening_balance, purchase, production_usage, production_output, wastage, damage, missing, extra, correction, transfer, return_supplier, stock_count_adjustment
po_status: draft, pending_approval, approved, sent, partial_received, received, cancelled, closed
receiving_status: draft, posted, cancelled
invoice_status: draft, pending_matching, pending_approval, approved, rejected, scheduled, paid, cancelled
payment_status: pending, scheduled, partially_paid, paid, overdue, cancelled
production_status: planned, released, in_progress, completed, cancelled
count_status: draft, submitted, approved, posted, cancelled
```

## A. Admin & Company

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `companies` | Legal company profile. | `id` PK, `company_code` unique, `company_name`, registration/tax/contact fields, `status`, audit columns, `deleted_at`. |
| `document_sequences` | Document numbering for PO, GRN, invoices, stock count, production job, and future documents. | `company_id` FK, `document_type`, `prefix`, `next_number`, `padding`, `reset_frequency`, unique `company_id + document_type`, positive number/padding checks. |
| `branches` | Operating branches: central kitchen, outlet, event booth, office. | `company_id` FK, `branch_code`, `branch_name`, `branch_type`, contact fields, unique `company_id + branch_code`. |
| `locations` | Inventory storage areas under a branch. | `company_id` FK, `branch_id` FK, `location_code`, `location_name`, `location_type`, unique `company_id + location_code`. |
| `staffs` | App staff linked to Supabase Auth. | `auth_user_id` FK to `auth.users`, `default_branch_id` FK, unique staff code per company. |
| `roles` | Role definitions. | `company_id`, `role_code`, `role_name`, unique `company_id + role_code`. |
| `permissions` | Permission catalog. | `permission_code` unique, `module`, `action`. |
| `role_permissions` | Role-to-permission mapping. | `role_id` FK, `permission_id` FK, unique pair. |
| `tags` | Reusable tags. | `company_id`, `tag_name`, `tag_type`, `color`, status and audit columns. |
| `entity_tags` | Polymorphic tag assignment. | `tag_id`, `entity_type`, `entity_id`, unique assignment. |

Indexes: company, branch, location, status, role, permission, and polymorphic entity indexes are included in the SQL migration.

## B. Master Data

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `item_categories` | Raw material and packaging categories. | `company_id`, `category_code`, `category_name`, `parent_id`, unique category code per company. |
| `items` | Ingredient and packaging master. No stock balance column. | `item_code`, `autocount_code`, `item_name`, `category_id`, `base_uom`, `purchase_uom`, `conversion_to_base_uom`, `cost`, `safety_stock`, `lead_time_days`, `moq`, `stock_control`, status/audit columns. Non-negative cost/safety/MOQ and positive conversion checks. |
| `suppliers` | Supplier master. | `supplier_code`, `autocount_code`, `supplier_name`, `payment_terms_days`, `tax_no`, unique supplier code per company. |
| `supplier_contacts` | Supplier contact people. | `supplier_id`, `contact_name`, `phone`, `email`, `is_primary`. |
| `supplier_items` | Supplier catalogue assignment to internal item. | `supplier_id`, `item_id`, supplier item code/name, purchase UOM, conversion, unit cost, MOQ, lead time, validity dates. |
| `product_categories` | Finished goods categories. | `company_id`, `category_code`, `category_name`, `parent_id`. |
| `products` | Finished goods master. No stock balance column. | `product_code`, `autocount_code`, `product_name`, `category_id`, `base_uom`, `selling_uom`, `tax_rate_id`, status/audit columns. |
| `product_packaging` | Pack sizes and selling price. | `product_id`, `packaging_name`, `packaging_uom`, `qty_per_pack`, `price`, `min_order_qty`. |
| `uom_conversions` | Unit conversion setup. | `company_id`, `from_uom`, `to_uom`, `factor`, unique conversion per company. |
| `tax_rates` | Tax rate master. | `tax_code`, `tax_name`, `rate_percent`, unique tax code per company. |

## C. Recipe / BOM

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `recipes` | Recipe header per product/version. | `product_id`, `recipe_code`, `version`, `yield_qty`, `yield_uom`, `approval_status`, `approval_id`, `effective_date`, `remark`, unique `product_id + version`. Approval workflow supported. |
| `recipe_lines` | Ingredients required by recipe. | `ingredient_item_id`, `recipe_uom`, `base_uom`, `conversion_factor`, `qty_required`, generated `base_qty_required`, `wastage_percent`, `cost_per_unit`, unique ingredient per recipe. Positive qty/conversion checks. |
| `recipe_versions` | Historical recipe snapshot. | `recipe_id`, `version`, `snapshot_json`, `created_by`. |
| `recipe_cost_snapshots` | Historical recipe costing. | `recipe_id`, `snapshot_date`, `total_cost`, `cost_per_unit`, `source`. |

Recipe cost logic: line cost = `base_qty_required * cost_per_unit * (1 + wastage_percent / 100)`. Cost per finished unit = total recipe cost / `yield_qty`.

## D. Inventory

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `stock_transactions` | Stock movement document header. | `company_id`, `branch_id`, `location_id`, `transaction_no`, `transaction_type`, `transaction_date`, reference fields, `status`, `posted_at`, unique document number per company. |
| `stock_transaction_lines` | Stock movement source of truth. | `stock_entity_type`, nullable `item_id`, nullable `product_id`, `location_id`, batch/expiry, `quantity_in`, `quantity_out`, `unit_cost`, generated `total_cost`, `uom`. Constraint enforces item lines have item only and product lines have product only. One direction and quantity checks. |
| `stock_counts` | Physical stock count header. | `location_id`, `count_no`, `count_date`, `status`, `posted_stock_transaction_id`. |
| `stock_count_lines` | Physical count lines for items or products. | `stock_entity_type`, nullable `item_id`, nullable `product_id`, `theoretical_qty`, `physical_qty`, generated variance fields, entity constraint. |
| `stock_adjustments` | Approved correction documents. | `adjustment_no`, `location_id`, `reason`, `status`, `approval_id`, `posted_stock_transaction_id`. Approval workflow supported. |
| `stock_wastage` | Wastage/damage/missing document. | `wastage_no`, `location_id`, `wastage_date`, `reason`, `status`, `posted_stock_transaction_id`. |
| `stock_transfers` | Transfer header between storage locations. | `transfer_no`, `from_location_id`, `to_location_id`, `transfer_date`, `status`, location-difference check. |
| `stock_transfer_lines` | Transfer lines for items or products. | `stock_entity_type`, nullable `item_id`, nullable `product_id`, `quantity`, `uom`, entity constraint. |
| `inventory_variances` | Variance records from counts, production, or adjustments. | `stock_entity_type`, nullable `item_id`, nullable `product_id`, `location_id`, theoretical/actual/generated variance qty, entity constraint. |

Inventory valuation: current value is calculated from posted stock lines as `sum((quantity_in - quantity_out) * unit_cost)`.

## E. Production

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `production_plans` | Planned production demand. | `plan_no`, `plan_date`, `location_id`, `status`, `remark`. |
| `production_jobs` | Released production job using a recipe. | `job_no`, `product_id`, `recipe_id`, `location_id`, `planned_qty`, `actual_output_qty`, usage/output stock transaction links. |
| `production_job_lines` | Planned and actual ingredient usage. | `item_id`, `planned_qty`, `actual_qty`, `uom`. |
| `production_outputs` | Actual finished goods output. | `product_id`, `output_qty`, `uom`, `batch_no`. |
| `production_wastage` | Production wastage by ingredient or product. | nullable `item_id`, nullable `product_id`, `quantity`, `uom`, `reason`. |
| `production_variances` | Planned vs actual production variance. | `item_id`, `planned_qty`, `actual_qty`, generated `variance_qty`. |

Production posting will create `production_usage` stock lines for ingredients and `production_output` stock lines for finished products.

## F. Purchasing

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `purchase_requests` | Internal purchase request before PO. | `request_no`, `requested_by`, dates, `status`, `remark`. |
| `purchase_request_lines` | Request line items. | `item_id`, `qty`, `uom`, `estimated_unit_cost`. |
| `purchase_orders` | Supplier PO header. | `supplier_id`, `po_no`, order/expected dates, `status`, `approval_id`, `sent_at`, `external_ref`, unique PO number per company. Approval workflow supported. |
| `purchase_order_lines` | PO lines with partial receiving. | `item_id`, `qty_ordered`, `qty_received`, `qty_cancelled`, generated `qty_pending`, `uom`, `unit_price`, generated `line_total`, `line_status`. Pending qty cannot be negative. |
| `goods_receivings` | GRN header. | `purchase_order_id`, `supplier_id`, `grn_no`, `received_date`, `location_id`, `status`, `posted_stock_transaction_id`. |
| `goods_receiving_lines` | Received lines. | `purchase_order_line_id`, `item_id`, `received_qty`, `uom`, `unit_cost`, batch/expiry. |

Partial receiving rule: received quantity accumulates against PO lines, and pending quantity = `qty_ordered - qty_received - qty_cancelled`.

## G. Finance

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `supplier_invoices` | Supplier invoice header. | `supplier_id`, `purchase_order_id`, `invoice_no`, invoice/due dates, `status`, `approval_id`, `total_amount`, `external_ref`. Approval workflow supported. |
| `supplier_invoice_lines` | Invoice lines for three-way matching. | `purchase_order_line_id`, `goods_receiving_line_id`, `item_id`, `qty_invoiced`, `uom`, `unit_price`, generated `line_total`. |
| `supplier_credit_notes` | Supplier credits. | `supplier_id`, `supplier_invoice_id`, `credit_note_no`, `credit_note_date`, `amount`, `reason`, `status`. |
| `payment_schedules` | Weekly payment planning header. | `schedule_no`, `week_start`, `week_end`, `status`, `approval_id`, `total_amount`. Approval workflow supported. |
| `payment_schedule_lines` | Payment plan detail by invoice/supplier. | `supplier_invoice_id`, `supplier_id`, `due_date`, `amount`, `paid_amount`, `status`, `paid_at`. |
| `three_way_matches` | PO vs GRN vs invoice validation. | `supplier_invoice_line_id`, `purchase_order_line_id`, `goods_receiving_line_id`, `po_qty`, `received_qty`, `qty_invoiced`, generated `is_matched`. |

Invoice approval rule: invoice quantity must not exceed received quantity.

## H. System

| Table | Purpose | Key Columns / Constraints |
| --- | --- | --- |
| `approvals` | Approval workflow header. | `entity_type`, `entity_id`, `status`, `requested_by`, timestamps, audit columns. |
| `approval_steps` | Approval chain lines. | `approval_id`, `step_no`, `approver_staff_id`, `approver_role_id`, `status`, action timestamps, `remarks`. |
| `attachments` | Files for any module. | `entity_type`, `entity_id`, file name/path/type/size, uploaded by. |
| `activity_logs` | User-facing timeline. | `entity_type`, `entity_id`, `activity_type`, `message`, `metadata`, `created_by`. |
| `audit_logs` | Technical audit history. | `table_name`, `record_id`, `action`, old/new JSON values, `changed_by`, `changed_at`. |
| `notifications` | In-app/email notification queue. | `staff_id`, `title`, `message`, `channel`, `is_read`, `read_at`. |

## Views

| View | Purpose |
| --- | --- |
| `stock_balances_view` | Current quantity and inventory value by company, stock entity type, item/product, and location. |
| `stock_card_view` | Transaction-level stock movement ledger including item/product, quantity, unit cost, total cost, batch, and reference. |
| `supplier_outstanding_view` | Supplier invoice amount, paid amount, and outstanding amount. |
| `weekly_cash_required_view` | Cash required by payment week and supplier. |
| `low_stock_view` | Low-stock item rows only, based on `items.safety_stock`. Finished products are excluded until finished goods safety stock is added. |

## Relationship Summary

- `companies` own all master and transaction data.
- `branches` represent operating units; `locations` represent inventory storage areas under branches.
- `items` are raw materials and packaging. `products` are finished goods.
- `stock_transaction_lines` can reference either an item or a product through `stock_entity_type`.
- `recipes` connect finished `products` to ingredient `items`.
- `production_jobs` use `recipes`; posting production creates ingredient usage and finished goods output stock transactions.
- `purchase_orders` create expected inbound quantities; `goods_receivings` create purchase stock transactions.
- `supplier_invoice_lines` link directly to PO lines and GRN lines for three-way matching.
- `payment_schedules` plan weekly cash requirements from approved supplier invoices.
- `approvals`, `attachments`, `activity_logs`, and `audit_logs` support every module through `entity_type + entity_id`.

## Important Business Rules

1. Stock balances must never be updated directly.
2. Every stock movement must create a `stock_transactions` header and one or more `stock_transaction_lines`.
3. Only posted/submitted/approved/closed stock transactions are included in stock balance views.
4. `stock_transaction_lines.stock_entity_type` controls whether `item_id` or `product_id` is required.
5. Recipe quantities can be entered in recipe UOM and converted to base UOM using `conversion_factor`.
6. PO lines support partial receiving through ordered, received, cancelled, and pending quantities.
7. Invoice lines must link to PO line and GRN line where available.
8. Invoice quantity must not exceed received quantity for approval.
9. Stock adjustment, purchase order, recipe, supplier invoice, and payment schedule support approval workflow.
10. Inventory value is calculated from stock transaction line quantities and unit cost.
11. Document numbers should be generated through `document_sequences`, not manually typed by users after production hardening.

## SQL Migration

Full Supabase SQL migration draft:

`outputs/seri_bako_oms_schema_v1_1.sql`

## Seed Data Examples

The migration includes sample seed rows for:

- Seri Bako Malaysia Sdn. Bhd.
- Central Kitchen branch.
- Dry Store location.
- Common document sequences: PO, GRN, INV, SC, PJ.
- Admin / kitchen / purchasing / finance / viewer roles.
- Item and product categories.
- Example flour supplier and wheat flour item.
- Example curry puff product and recipe header.

