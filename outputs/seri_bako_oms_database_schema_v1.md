# Seri Bako OMS Database Schema v1.0

Status: review draft. Do not run in production until approved and tested on a fresh Supabase project or planned migration branch.

## Design Principles

- Stock balance is never stored manually in item master.
- Stock balance is calculated from `stock_transaction_lines`.
- All operational documents are auditable through `activity_logs`, `audit_logs`, `approvals`, and `attachments`.
- Purchase, receiving, invoice, payment, production, recipe, and inventory records are linked by foreign keys.
- `autocount_code`, `external_ref`, and integration-ready document numbers are included where relevant.
- Multi-branch support is modeled through `companies`, `branches`, and `locations`.
- Soft deletion uses `deleted_at` on master and document tables.

## Shared Status Enums

```text
record_status: active, inactive, archived
approval_status: draft, pending_approval, approved, rejected, cancelled
document_status: draft, submitted, approved, rejected, cancelled, closed
stock_transaction_type: opening_balance, purchase, production_usage, production_output, wastage, damage, missing, extra, correction, transfer, return_supplier, stock_count_adjustment
location_type: central_kitchen, warehouse, outlet, event_booth, office, supplier, customer, other
po_status: draft, pending_approval, approved, sent, partial_received, received, cancelled, closed
receiving_status: draft, posted, cancelled
invoice_status: draft, pending_matching, pending_approval, approved, rejected, scheduled, paid, cancelled
payment_status: pending, scheduled, partially_paid, paid, overdue, cancelled
production_status: planned, released, in_progress, completed, cancelled
count_status: draft, submitted, approved, posted, cancelled
```

## A. Admin & Company

### companies
Purpose: legal company profile.
Key columns: `id`, `company_code`, `company_name`, `registration_no`, `tax_no`, `phone`, `email`, `address`, `status`, audit columns.
Indexes: `company_code`, `status`.

### branches
Purpose: outlets, event booths, operating branches, central kitchen records.
Key columns: `id`, `company_id`, `branch_code`, `branch_name`, `branch_type`, `phone`, `email`, `address`, `status`, audit columns.
Indexes: `company_id`, `branch_code`, `branch_type`.

### locations
Purpose: inventory locations under branches.
Key columns: `id`, `company_id`, `branch_id`, `location_code`, `location_name`, `location_type`, `status`, audit columns.
Indexes: `company_id`, `branch_id`, `location_code`, `location_type`.

### staffs
Purpose: app users linked to Supabase Auth.
Key columns: `id`, `company_id`, `auth_user_id`, `staff_code`, `full_name`, `email`, `phone`, `default_branch_id`, `status`, audit columns.
Indexes: `company_id`, `auth_user_id`, `email`.

### roles
Purpose: role definitions.
Key columns: `id`, `company_id`, `role_code`, `role_name`, `description`, `status`, audit columns.

### permissions
Purpose: system permission catalog.
Key columns: `id`, `permission_code`, `module`, `action`, `description`.

### role_permissions
Purpose: many-to-many roles and permissions.
Key columns: `id`, `role_id`, `permission_id`.
Constraint: unique `role_id, permission_id`.

### tags
Purpose: reusable tags for products, items, suppliers, outlets, documents.
Key columns: `id`, `company_id`, `tag_name`, `tag_type`, `color`, `status`, audit columns.

### entity_tags
Purpose: polymorphic tag assignment.
Key columns: `id`, `tag_id`, `entity_type`, `entity_id`.
Constraint: unique `tag_id, entity_type, entity_id`.

## B. Master Data

### item_categories
Purpose: raw material and packaging categories.
Columns: `id`, `company_id`, `category_code`, `category_name`, `parent_id`, `status`, audit columns.

### items
Purpose: ingredient and packaging master. Does not store stock balance.
Columns: `id`, `company_id`, `item_code`, `autocount_code`, `item_name`, `category_id`, `base_uom`, `purchase_uom`, `conversion_to_base_uom`, `cost`, `safety_stock`, `lead_time_days`, `moq`, `stock_control`, `status`, audit columns.
Constraints: cost/safety/MOQ non-negative, conversion positive.

### suppliers
Purpose: supplier master.
Columns: `id`, `company_id`, `supplier_code`, `autocount_code`, `supplier_name`, `payment_terms_days`, `tax_no`, `status`, audit columns.

### supplier_contacts
Purpose: supplier people/contact methods.
Columns: `id`, `supplier_id`, `contact_name`, `phone`, `email`, `is_primary`, `status`, audit columns.

### supplier_items
Purpose: supplier catalogue assignment to internal items.
Columns: `id`, `supplier_id`, `item_id`, `supplier_item_code`, `supplier_item_name`, `purchase_uom`, `conversion_to_base_uom`, `unit_cost`, `moq`, `lead_time_days`, `valid_from`, `valid_to`, `status`, audit columns.

### product_categories
Purpose: finished goods categories.
Columns: `id`, `company_id`, `category_code`, `category_name`, `parent_id`, `status`, audit columns.

### products
Purpose: finished goods master.
Columns: `id`, `company_id`, `product_code`, `autocount_code`, `product_name`, `category_id`, `base_uom`, `selling_uom`, `tax_rate_id`, `status`, audit columns.

### product_packaging
Purpose: product pack size and pricing.
Columns: `id`, `product_id`, `packaging_name`, `packaging_uom`, `qty_per_pack`, `price`, `min_order_qty`, `status`, audit columns.

### uom_conversions
Purpose: conversion rules.
Columns: `id`, `company_id`, `from_uom`, `to_uom`, `factor`, `status`, audit columns.

### tax_rates
Purpose: tax rate master.
Columns: `id`, `company_id`, `tax_code`, `tax_name`, `rate_percent`, `status`, audit columns.

## C. Recipe / BOM

### recipes
Purpose: active recipe header per product/version.
Columns: `id`, `company_id`, `product_id`, `recipe_code`, `version`, `yield_qty`, `yield_uom`, `status`, `approval_status`, `effective_date`, `remark`, audit columns.

### recipe_lines
Purpose: ingredients required by recipe.
Columns: `id`, `recipe_id`, `ingredient_item_id`, `qty_required`, `uom`, `wastage_percent`, `cost_per_unit`, `sort_order`, audit columns.
Constraint: unique `recipe_id, ingredient_item_id`.

### recipe_versions
Purpose: version history snapshot.
Columns: `id`, `recipe_id`, `version`, `snapshot_json`, `created_at`, `created_by`.

### recipe_cost_snapshots
Purpose: historical recipe costing.
Columns: `id`, `recipe_id`, `snapshot_date`, `total_cost`, `cost_per_unit`, `source`, `created_at`, `created_by`.

## D. Inventory

### stock_transactions
Purpose: stock document header.
Columns: `id`, `company_id`, `branch_id`, `location_id`, `transaction_no`, `transaction_type`, `transaction_date`, `reference_type`, `reference_id`, `status`, `posted_at`, audit columns.

### stock_transaction_lines
Purpose: stock movement lines. Current stock is calculated from these.
Columns: `id`, `stock_transaction_id`, `item_id`, `location_id`, `batch_no`, `expiry_date`, `quantity_in`, `quantity_out`, `unit_cost`, `uom`, `remarks`, audit columns.
Constraints: quantities non-negative; one direction only; has quantity.

### stock_counts / stock_count_lines
Purpose: physical count and variance capture.

### stock_adjustments
Purpose: approved correction documents linked to stock transactions.

### stock_wastage
Purpose: wastage/damage/missing record.

### stock_transfers / stock_transfer_lines
Purpose: transfer between locations.

### inventory_variances
Purpose: variance records from counts, production, or adjustments.

## E. Production

### production_plans
Purpose: planned production demand.

### production_jobs
Purpose: released production job using a recipe.

### production_job_lines
Purpose: planned ingredient usage.

### production_outputs
Purpose: actual produced finished goods.

### production_wastage
Purpose: production wastage by ingredient/product.

### production_variances
Purpose: planned vs actual usage/output variance.

## F. Purchasing

### purchase_requests / purchase_request_lines
Purpose: internal purchase request before PO.

### purchase_orders / purchase_order_lines
Purpose: approved supplier order.

### goods_receivings / goods_receiving_lines
Purpose: receiving and partial delivery tracking.

## G. Finance

### supplier_invoices / supplier_invoice_lines
Purpose: supplier billing.

### supplier_credit_notes
Purpose: credits from suppliers.

### payment_schedules / payment_schedule_lines
Purpose: planned and actual payable payments.

### three_way_matches
Purpose: PO vs GRN vs invoice validation.

## H. System

### approvals / approval_steps
Purpose: reusable approval workflow.

### attachments
Purpose: files for any module using `entity_type`, `entity_id`.

### activity_logs
Purpose: visible timeline for operational users.

### audit_logs
Purpose: technical audit trail.

### notifications
Purpose: in-app/email notification queue.

## Relationship Summary

- `companies` own all master and transaction data.
- `branches` belong to `companies`; `locations` belong to `branches`.
- `items` are ingredients/packaging and connect to suppliers through `supplier_items`.
- `products` are finished goods and connect to `recipes`.
- `recipes` connect products to ingredient `items`.
- `production_jobs` use `recipes`; posted production creates `stock_transactions`.
- `purchase_orders` create expected inbound quantities; `goods_receivings` create purchase stock transactions.
- `supplier_invoices` are matched to PO and receiving through `three_way_matches`.
- `payment_schedules` plan cash requirements from approved supplier invoices.
- `attachments`, `activity_logs`, `audit_logs`, and `approvals` use polymorphic `entity_type` + `entity_id`.

## Important Business Rules

1. Never update stock balance directly.
2. Every stock movement must create `stock_transactions` + `stock_transaction_lines`.
3. Ledger rows should be append-only after posting.
4. Corrections are new transactions, not edits to old posted transactions.
5. Invoice approval requires invoice quantity <= received quantity.
6. Duplicate ingredients are not allowed in the same recipe.
7. Production posting deducts ingredient stock and optionally adds finished goods output.
8. Purchase receiving supports partial receipt and pending quantity.
9. All approvals are stored in `approvals` and `approval_steps`.
10. All important documents should support attachments and timeline entries.

