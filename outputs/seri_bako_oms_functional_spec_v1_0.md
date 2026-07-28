# ⚠️ Historical artifact — do not use as the current OMS specification

This June 2026 v1.0 draft describes the retired location-based design (for example, dry store, chiller, freezer and location-level stock). It is not aligned with the current branch-only inventory model, current role catalogue, or the migration chain after 093.

Use [the strict SOP audit](../docs/audits/OMS_STRICT_SYSTEM_SOP_AUDIT_2026-07-23.md), [the current schema relationship map](../docs/SCHEMA_RELATIONSHIP_MAP_2026-07-23.md), and the checked-in migrations as the current evidence. A replacement functional specification will be generated only after migration 099 has been database-validated.

---

# Seri Bako OMS Functional Specification v1.0

Status: review draft. This document does not change the database schema and does not include frontend implementation.

## 1. Purpose

Seri Bako OMS is an internal F&B operations ERP for Seri Bako central kitchen, frozen pastry production, warehouse, outlets, event booths, purchasing, and finance.

This functional specification translates Database Schema v1.1 into system behavior, page requirements, validations, permissions, logs, attachments, notifications, and operational workflows.

## 2. Main Operating Flow

Daily Stock Check -> Purchase Request -> Admin Review -> Purchasing Review -> Manager Approval -> Purchase Order -> Supplier Delivery -> Goods Receiving -> Invoice Matching -> Payment Schedule

## 3. Core Roles

| Role | Main Responsibility |
| --- | --- |
| Admin | System setup, master data, review operational requests, override with audit trail. |
| Kitchen | Daily stock check, receiving, wastage reporting, production usage and output. |
| Purchasing | Supplier, catalogue, purchase request review, PO preparation, delivery follow-up. |
| Manager | Approval for PO, recipe, adjustment, invoice, and payment schedule. |
| Finance | Invoice matching, supplier outstanding, payment planning, payment status. |
| Viewer | Read-only access to approved data and reports. |

## 4. Global Rules

1. Stock balance is never manually edited.
2. All stock changes must create `stock_transactions` and `stock_transaction_lines`.
3. Stock lines can be for raw materials / packaging items or finished goods products.
4. Draft documents do not affect stock balance.
5. Posted, submitted, approved, or closed stock transactions are included in stock views.
6. Any approval rejection must require remarks.
7. Every create, update, approve, reject, cancel, post, upload, and delete action writes an activity log.
8. Soft delete is used where available; deleted records are hidden by default.
9. Document numbers must come from document sequence rules once production numbering is enabled.
10. AutoCount code and external reference are preserved for future integration.

## 5. Global Permission Pattern

| Permission | Meaning |
| --- | --- |
| `module.read` | View list, details, reports, and attachments. |
| `module.create` | Create draft records. |
| `module.update` | Edit allowed fields before posting or approval lock. |
| `module.delete` | Soft delete draft or inactive records only. |
| `module.submit` | Submit for review or approval. |
| `module.approve` | Approve or reject assigned approval tasks. |
| `module.post` | Post operational documents that affect stock or finance. |
| `module.export` | Export lists and reports. |
| `module.admin` | Configure module rules and override with audit log. |

## 6. Global Page Patterns

Most modules use these page patterns:

- List page: search, filter, status tabs, table, quick actions, export where allowed.
- Detail page: header summary, status timeline, line details, attachments, activity log.
- Create/Edit page: validated form, save draft, submit, cancel.
- Approval panel: requested by, current approver, decision history, approve/reject controls.

## 7. Module Specifications

### 7.1 Dashboard

1. Page list: Main dashboard, operations dashboard, purchasing dashboard, finance dashboard.
2. Page purpose: Provide live exception view for kitchen stock, purchasing workload, pending approvals, receiving, invoice matching, and weekly cash requirement.
3. Buttons / actions: Refresh, open low stock, open pending PR, open pending PO, open pending GRN, open pending invoices, export dashboard snapshot.
4. Form fields: Date range, branch, location, dashboard view.
5. Table columns: Widget-specific columns such as document no, supplier, item, location, status, due date, amount, owner.
6. Filters: Branch, location, date range, supplier, status, role-owned tasks.
7. Status flow: Display only; each widget links to source document status.
8. Validation rules: Date range must be valid; user can only see permitted branches.
9. Business rules: Dashboard prioritizes exceptions: low stock, variance, pending approvals, pending delivery, invoice mismatch, overdue payment.
10. Required permissions: `dashboard.read`; widget data also requires source module read permission.
11. Activity log events: Dashboard viewed, dashboard exported.
12. Attachments required: None.
13. Notifications triggered: None directly; dashboard displays notifications generated by source modules.

### 7.2 Settings

1. Page list: Settings overview, company settings, branch/location settings, staff settings, roles and permissions, integrations, subscription placeholder, documents, rules, tags, notifications, email configuration.
2. Page purpose: Central configuration area for company-wide setup.
3. Buttons / actions: Save settings, add rule, edit rule, activate/deactivate, test email, add tag, import/export configuration.
4. Form fields: Setting name, value, module, branch scope, status, remarks.
5. Table columns: Setting group, setting name, value, scope, status, last updated.
6. Filters: Module, branch, status, updated by.
7. Status flow: Draft -> Active -> Inactive or Archived.
8. Validation rules: Required fields must be present; configuration keys must be unique per company/scope.
9. Business rules: Only active rules are applied to workflows; archived settings are read-only.
10. Required permissions: `settings.read`, `settings.update`, `settings.admin`.
11. Activity log events: Setting changed, rule activated, rule deactivated, email tested.
12. Attachments required: Optional policy or configuration documents.
13. Notifications triggered: Notify admin when critical integration or email configuration changes.

### 7.3 Company

1. Page list: Company profile, document numbering, tax settings, AutoCount integration placeholder.
2. Page purpose: Maintain Seri Bako legal and operational company information.
3. Buttons / actions: Edit company, save, upload logo, configure document sequence, test integration placeholder.
4. Form fields: Company code, name, registration no, tax no, phone, email, address, status, document type, prefix, next number, padding, reset frequency.
5. Table columns: Document type, prefix, next number, padding, reset frequency, status.
6. Filters: Document type, status.
7. Status flow: Active -> Inactive -> Archived.
8. Validation rules: Company code and company name required; document type unique per company; next number and padding must be positive.
9. Business rules: Document sequences are used for PO, GRN, invoice, stock count, production job, payment schedule, and future documents.
10. Required permissions: `company.read`, `company.update`, `company.admin`.
11. Activity log events: Company profile updated, logo uploaded, document sequence changed.
12. Attachments required: Optional company registration, tax certificate.
13. Notifications triggered: Admin notification when registration or tax data changes.

### 7.4 Branches / Locations

1. Page list: Branch list, add/edit branch, branch detail, location list, add/edit location.
2. Page purpose: Manage operating units and stock storage areas.
3. Buttons / actions: Add branch, edit branch, deactivate branch, add location, edit location, deactivate location, import/export.
4. Form fields: Branch code, branch name, branch type, phone, email, address, status, location code, location name, location type, branch.
5. Table columns: Code, name, type, branch, phone, address, status, created date, actions.
6. Filters: Branch type, location type, status, branch.
7. Status flow: Active -> Inactive -> Archived.
8. Validation rules: Branch code unique per company; location code unique per company; location must belong to a branch.
9. Business rules: Stock transactions require a location; locations cannot be archived if open stock documents exist.
10. Required permissions: `branches.read`, `branches.create`, `branches.update`, `branches.delete`.
11. Activity log events: Branch created, branch updated, location created, location updated, status changed.
12. Attachments required: Optional premises, outlet, or warehouse documents.
13. Notifications triggered: Notify admin and kitchen leads when a stock location is activated/deactivated.

### 7.5 Staffs

1. Page list: Staff list, add/edit staff, staff detail, staff import.
2. Page purpose: Manage staff access, assignment, and account status.
3. Buttons / actions: Add staff, invite staff, edit, deactivate, reset invitation, import staff.
4. Form fields: Staff code, full name, email, phone, default branch, role assignment, status.
5. Table columns: Staff, role, default branch, phone, email, status, added date, actions.
6. Filters: Role, branch, status, search.
7. Status flow: Invited -> Active -> Inactive -> Archived.
8. Validation rules: Email format valid; staff code unique per company; auth user unique.
9. Business rules: Deactivated staff cannot approve, post, or receive notifications; historical audit records remain.
10. Required permissions: `staffs.read`, `staffs.create`, `staffs.update`, `staffs.delete`.
11. Activity log events: Staff added, role changed, branch changed, deactivated, invitation resent.
12. Attachments required: Optional staff documents.
13. Notifications triggered: Invitation notification; role change notification.

### 7.6 Roles & Permissions

1. Page list: Role list, role detail, permission matrix, add/edit role.
2. Page purpose: Control access to modules and workflow actions.
3. Buttons / actions: Add role, duplicate role, edit role, assign permissions, deactivate role.
4. Form fields: Role code, role name, description, permission checkboxes, status.
5. Table columns: Role code, role name, permission count, status, updated date.
6. Filters: Status, module, permission action.
7. Status flow: Active -> Inactive -> Archived.
8. Validation rules: Role code unique; at least one permission required for active custom role.
9. Business rules: System roles are protected; only admin can change permission assignments.
10. Required permissions: `roles.read`, `roles.create`, `roles.update`, `roles.admin`.
11. Activity log events: Role created, permission added, permission removed, role deactivated.
12. Attachments required: None.
13. Notifications triggered: Notify affected staff when role permissions change.

### 7.7 Items

1. Page list: Item list, add/edit item, item detail, import items, category management, item stock card.
2. Page purpose: Maintain raw material and packaging master data without storing stock balance.
3. Buttons / actions: Add item, edit item, import, export, bulk edit, manage categories, deactivate, view stock card.
4. Form fields: Item code, AutoCount code, item name, category, base UOM, purchase UOM, conversion to base UOM, supplier, cost, safety stock, lead time, MOQ, stock control, status.
5. Table columns: Item code, AutoCount code, name, category, base UOM, supplier, cost, safety stock, current stock from view, status.
6. Filters: Category, supplier, status, low stock, stock control, search.
7. Status flow: Active -> Inactive -> Archived.
8. Validation rules: Item code unique; cost/safety/MOQ non-negative; conversion positive; base UOM required.
9. Business rules: Current stock is calculated from stock transactions; inactive items cannot be selected for new PR, PO, recipe, or stock movement.
10. Required permissions: `items.read`, `items.create`, `items.update`, `items.delete`, `items.export`.
11. Activity log events: Item created, item updated, category changed, cost changed, safety stock changed, item deactivated.
12. Attachments required: Optional item specification, halal certificate, supplier product sheet.
13. Notifications triggered: Notify purchasing when supplier, MOQ, lead time, or cost changes.

### 7.8 Products

1. Page list: Product list, add/edit product, product detail, import products, packaging and pricing, category management, product stock card.
2. Page purpose: Maintain finished goods master data and product packaging setup.
3. Buttons / actions: Add product, edit, import, export, bulk edit, manage categories, manage tags, add packaging, deactivate, view recipe, view stock card.
4. Form fields: Product code, AutoCount code, product name, category, base UOM, selling UOM, tax rate, packaging name, packaging UOM, qty per pack, price, min order qty, status.
5. Table columns: Product code, name, category, base UOM, selling UOM, price, status, recipe status, current stock from view.
6. Filters: Category, status, tag, has recipe, search.
7. Status flow: Active -> Inactive -> Archived.
8. Validation rules: Product code unique; qty per pack positive; price non-negative; base UOM required.
9. Business rules: Finished goods stock is calculated from stock transactions; production output increases product stock.
10. Required permissions: `products.read`, `products.create`, `products.update`, `products.delete`, `products.export`.
11. Activity log events: Product created, product updated, packaging added, price changed, product deactivated.
12. Attachments required: Optional product photo, product specification, label artwork.
13. Notifications triggered: Notify kitchen/production when active product packaging or base UOM changes.

### 7.9 Suppliers

1. Page list: Supplier list, add/edit supplier, supplier detail, contacts, supplier items, price history.
2. Page purpose: Manage supplier master, contacts, and assigned items.
3. Buttons / actions: Add supplier, edit, invite placeholder, add contact, add supplier item, export, deactivate.
4. Form fields: Supplier code, AutoCount code, supplier name, payment terms, tax no, contact name, phone, email, supplier item code/name, purchase UOM, conversion, unit cost, MOQ, lead time.
5. Table columns: Supplier code, name, contact, phone, email, payment terms, item count, outstanding amount, status.
6. Filters: Status, payment terms, assigned item, search.
7. Status flow: Active -> Inactive -> Archived.
8. Validation rules: Supplier code unique; payment terms non-negative; supplier item conversion positive; unit cost non-negative.
9. Business rules: Inactive suppliers cannot be selected for new PO; price history is preserved through supplier item changes and PO lines.
10. Required permissions: `suppliers.read`, `suppliers.create`, `suppliers.update`, `suppliers.delete`, `suppliers.export`.
11. Activity log events: Supplier created, contact added, supplier item assigned, cost changed, supplier deactivated.
12. Attachments required: Optional company profile, halal certificate, SSM, quotation, bank details.
13. Notifications triggered: Notify purchasing when supplier item cost or lead time changes.

### 7.10 Catalogue

1. Page list: Buy catalogue, sell catalogue, schedule pricing, download history, supplier item assignment, branch visibility control.
2. Page purpose: Control what items/products are available for purchasing and sales/outlet ordering.
3. Buttons / actions: Create catalogue, assign item, assign supplier, schedule price, export, download template, set branch visibility.
4. Form fields: Catalogue type, supplier, item/product, branch visibility, effective date, price, MOQ, status.
5. Table columns: Catalogue, item/product, supplier, branch visibility, price, effective date, status.
6. Filters: Catalogue type, supplier, branch, status, effective date.
7. Status flow: Draft -> Active -> Inactive -> Archived.
8. Validation rules: Active catalogue line requires item/product and effective date; duplicate active assignment not allowed for same scope.
9. Business rules: Buy catalogue feeds PR/PO item selection; sell catalogue supports future orders/sales.
10. Required permissions: `catalogue.read`, `catalogue.create`, `catalogue.update`, `catalogue.export`.
11. Activity log events: Catalogue created, item assigned, price scheduled, branch visibility changed.
12. Attachments required: Optional catalogue import file.
13. Notifications triggered: Notify purchasing when scheduled buy price becomes active.

### 7.11 Recipe / BOM

1. Page list: Recipe list, add recipe, edit recipe, view recipe detail, version history, cost snapshot.
2. Page purpose: Define ingredient requirements and costing for finished products.
3. Buttons / actions: Add recipe, edit draft, add/remove ingredient row, calculate cost, save draft, submit for approval, approve, reject, create new version, archive.
4. Form fields: Product, product code, recipe code, version, yield qty, yield UOM, status, effective date, remark, ingredient item, recipe UOM, base UOM, conversion factor, qty required, wastage %, cost per unit.
5. Table columns: Recipe code, product, version, yield, status, approval status, total cost, cost per unit, effective date.
6. Filters: Product, status, approval status, category, effective date.
7. Status flow: Draft -> Pending Approval -> Approved -> Active; Rejected returns to Draft; Active -> Archived.
8. Validation rules: Product required; ingredient must exist; qty and conversion positive; duplicate ingredient not allowed; yield positive.
9. Business rules: Approved recipe is required before production job posting; recipe cost uses base quantity and wastage.
10. Required permissions: `recipes.read`, `recipes.create`, `recipes.update`, `recipes.submit`, `recipes.approve`.
11. Activity log events: Recipe created, ingredient added, cost recalculated, submitted, approved, rejected, new version created.
12. Attachments required: Optional production method, product specification, costing sheet.
13. Notifications triggered: Notify manager on recipe approval request; notify kitchen when recipe approved or changed.

### 7.12 Inventory

1. Page list: Inventory overview, stock balance, stock card, item/product stock detail, valuation view, low stock.
2. Page purpose: Provide transaction-based stock visibility by location.
3. Buttons / actions: View stock card, export, open count, open adjustment, open transfer, open wastage.
4. Form fields: Branch, location, stock entity type, item/product, date range.
5. Table columns: Type, item/product code, name, location, base UOM, quantity in, quantity out, current quantity, unit cost, inventory value, safety stock, low stock flag.
6. Filters: Branch, location, item/product, category, low stock, date range.
7. Status flow: View reflects source stock transaction status.
8. Validation rules: Filters must be valid; date from cannot be after date to.
9. Business rules: Stock is calculated only from eligible posted transactions; inventory value is calculated from stock line costs.
10. Required permissions: `inventory.read`, `inventory.export`.
11. Activity log events: Stock card viewed, inventory report exported.
12. Attachments required: None.
13. Notifications triggered: Low stock and negative variance alerts from source processes.

### 7.13 Stock Count

1. Page list: Stock count list, new stock count, count entry, count review, count detail.
2. Page purpose: Kitchen performs daily/nightly physical stock check by location.
3. Buttons / actions: Start count, save draft, submit count, review variance, approve/post adjustment, reject, export.
4. Form fields: Count no, count date, branch, location, stock entity type, item/product, theoretical qty, physical qty, remarks.
5. Table columns: Count no, date, location, counted by, status, variance count, submitted at, actions.
6. Filters: Date, branch, location, status, counted by, variance only.
7. Status flow: Draft -> Submitted -> Approved -> Posted; Rejected returns to Draft; Cancelled closes without posting.
8. Validation rules: Location required; physical qty cannot be negative; duplicate item/product in same count not allowed.
9. Business rules: Variance is calculated against theoretical stock; variance beyond tolerance must be highlighted and reviewed before posting.
10. Required permissions: `stock_count.read`, `stock_count.create`, `stock_count.update`, `stock_count.submit`, `stock_count.approve`, `stock_count.post`.
11. Activity log events: Count started, line updated, submitted, variance reviewed, approved, posted, rejected.
12. Attachments required: Optional count sheet photo or signed stock count sheet.
13. Notifications triggered: Notify admin when count submitted; notify manager when variance exceeds tolerance.

### 7.14 Stock Adjustment

1. Page list: Adjustment list, new adjustment, adjustment detail, approval detail.
2. Page purpose: Correct stock after approved variance, damage, missing, or manual correction need.
3. Buttons / actions: Create adjustment, add lines, submit, approve, reject, post, cancel.
4. Form fields: Adjustment no, location, reason, item/product, direction, quantity, UOM, unit cost, remarks.
5. Table columns: Adjustment no, location, reason, status, approval status, posted transaction, created by, date.
6. Filters: Status, location, reason, created by, date range.
7. Status flow: Draft -> Pending Approval -> Approved -> Posted; Rejected returns to Draft; Cancelled closes.
8. Validation rules: Reason required; quantity positive; cannot post before approval.
9. Business rules: Posting creates correction or stock count adjustment transaction lines; no direct stock edit.
10. Required permissions: `stock_adjustment.read`, `stock_adjustment.create`, `stock_adjustment.update`, `stock_adjustment.submit`, `stock_adjustment.approve`, `stock_adjustment.post`.
11. Activity log events: Adjustment created, submitted, approved, rejected, posted, cancelled.
12. Attachments required: Required for high-value or large-variance adjustment; optional otherwise.
13. Notifications triggered: Notify manager on approval request; notify admin/kitchen when posted or rejected.

### 7.15 Stock Wastage

1. Page list: Wastage list, new wastage, wastage detail.
2. Page purpose: Record wastage, damage, missing stock, expired ingredients, and production losses.
3. Buttons / actions: Create wastage, add line, submit/post, cancel, export.
4. Form fields: Wastage no, location, date, reason, item/product, quantity, UOM, batch no, expiry date, remarks.
5. Table columns: Wastage no, date, location, reason, status, item count, created by.
6. Filters: Date, location, reason, item/product, status.
7. Status flow: Draft -> Submitted/Approved -> Posted; Cancelled.
8. Validation rules: Quantity positive; reason required; item/product required.
9. Business rules: Posting creates wastage/damage/missing stock transaction with quantity out.
10. Required permissions: `stock_wastage.read`, `stock_wastage.create`, `stock_wastage.update`, `stock_wastage.post`.
11. Activity log events: Wastage created, line added, posted, cancelled.
12. Attachments required: Photo required for damage/expired claims; optional for routine wastage.
13. Notifications triggered: Notify admin if wastage exceeds configured tolerance.

### 7.16 Stock Transfer

1. Page list: Transfer list, new transfer, transfer detail.
2. Page purpose: Move stock between storage locations or future branches.
3. Buttons / actions: Create transfer, add lines, submit/post, cancel, print transfer note.
4. Form fields: Transfer no, from location, to location, transfer date, item/product, quantity, UOM, remarks.
5. Table columns: Transfer no, from location, to location, date, status, item count, posted transaction.
6. Filters: From location, to location, status, date range.
7. Status flow: Draft -> Submitted/Approved -> Posted; Cancelled.
8. Validation rules: From and to location required and different; quantity positive; item/product required.
9. Business rules: Posting creates quantity out from source and quantity in to destination.
10. Required permissions: `stock_transfer.read`, `stock_transfer.create`, `stock_transfer.update`, `stock_transfer.post`.
11. Activity log events: Transfer created, submitted, posted, cancelled.
12. Attachments required: Optional signed transfer note.
13. Notifications triggered: Notify receiving location when transfer is posted.

### 7.17 Production

1. Page list: Production plan list, production job list, new production job, job detail, ingredient usage, output entry, production variance.
2. Page purpose: Convert ingredients into finished goods with BOM-based usage and output posting.
3. Buttons / actions: Create plan, create job, release job, issue ingredients, record output, record wastage, complete job, cancel.
4. Form fields: Plan no, job no, product, recipe, location, planned qty, actual output qty, UOM, ingredient planned qty, actual qty, batch no, wastage reason.
5. Table columns: Job no, product, recipe version, planned qty, actual output, variance, status, location, date.
6. Filters: Status, product, recipe, location, date range.
7. Status flow: Planned -> Released -> In Progress -> Completed; Cancelled.
8. Validation rules: Approved recipe required; planned qty positive; cannot complete without output entry.
9. Business rules: Usage posting deducts ingredient stock; output posting increases finished product stock; variance is tracked.
10. Required permissions: `production.read`, `production.create`, `production.update`, `production.post`, `production.complete`.
11. Activity log events: Plan created, job released, ingredients issued, output posted, wastage recorded, job completed.
12. Attachments required: Optional production sheet, QC sheet, batch label photo.
13. Notifications triggered: Notify kitchen when job released; notify manager for abnormal production variance.

### 7.18 Purchase Request

1. Page list: PR list, new PR, PR detail, review PR.
2. Page purpose: Capture purchase needs from kitchen daily stock check and low stock alerts.
3. Buttons / actions: Create PR, add lines, save draft, submit, admin review, purchasing review, reject, convert to PO.
4. Form fields: Request no, requested by, request date, required date, item, qty, UOM, estimated unit cost, remarks.
5. Table columns: PR no, requested by, required date, status, line count, estimated amount, current reviewer.
6. Filters: Status, requested by, required date, item, low stock source.
7. Status flow: Draft -> Submitted -> Admin Review -> Purchasing Review -> Manager Approval -> Approved -> Converted; Rejected or Cancelled.
8. Validation rules: Required date required; at least one line; qty positive; item active and purchasable.
9. Business rules: Kitchen can create from stock check; purchasing verifies supplier, MOQ, lead time, and cost before approval.
10. Required permissions: `purchase_request.read`, `purchase_request.create`, `purchase_request.update`, `purchase_request.submit`, `purchase_request.approve`.
11. Activity log events: PR created, line added, submitted, admin reviewed, purchasing reviewed, approved, rejected, converted.
12. Attachments required: Optional stock check sheet or supporting request document.
13. Notifications triggered: Notify admin on kitchen submission; notify purchasing after admin review; notify manager for approval.

### 7.19 Purchase Order

1. Page list: PO list, new PO, PO detail, PO approval, PO print/send view.
2. Page purpose: Confirm supplier order and track ordered, received, cancelled, and pending quantities.
3. Buttons / actions: Create from PR, create manual PO, add lines, submit approval, approve, reject, send email/WhatsApp placeholder, cancel line, close PO.
4. Form fields: PO no, supplier, order date, expected delivery date, item, qty ordered, UOM, unit price, remarks.
5. Table columns: PO no, supplier, order date, expected delivery, status, amount, received %, pending qty, sent at.
6. Filters: Status, supplier, delivery date, pending delivery, branch/location, created by.
7. Status flow: Draft -> Pending Approval -> Approved -> Sent -> Partial Received -> Received -> Closed; Rejected or Cancelled.
8. Validation rules: Supplier active; at least one line; qty ordered positive; unit price non-negative; cannot approve with inactive item.
9. Business rules: Partial receiving updates line received/pending quantities; PO approval required before sending.
10. Required permissions: `purchase_order.read`, `purchase_order.create`, `purchase_order.update`, `purchase_order.submit`, `purchase_order.approve`, `purchase_order.export`.
11. Activity log events: PO created, line added, submitted, approved, rejected, sent, partially received, closed.
12. Attachments required: Optional supplier quotation, signed PO.
13. Notifications triggered: Notify manager on approval request; notify kitchen/purchasing when supplier delivery is expected.

### 7.20 Goods Receiving

1. Page list: GRN list, new receiving, receiving detail, receive against PO.
2. Page purpose: Kitchen receives supplier delivery and posts purchase stock into location.
3. Buttons / actions: Create GRN, select PO, receive line, save draft, post receiving, cancel, print GRN.
4. Form fields: GRN no, PO, supplier, received date, location, item, received qty, UOM, unit cost, batch no, expiry date, remarks.
5. Table columns: GRN no, supplier, PO no, received date, location, status, posted transaction, received by.
6. Filters: Status, supplier, PO, received date, location.
7. Status flow: Draft -> Posted; Cancelled.
8. Validation rules: Received qty positive; cannot receive more than PO pending without authorized override; location required.
9. Business rules: Posting creates purchase stock transaction; PO line qty_received and qty_pending are updated by receiving logic.
10. Required permissions: `goods_receiving.read`, `goods_receiving.create`, `goods_receiving.update`, `goods_receiving.post`.
11. Activity log events: GRN created, PO selected, line received, posted, cancelled.
12. Attachments required: Delivery order required; invoice optional at receiving stage; photos optional for damaged delivery.
13. Notifications triggered: Notify purchasing for partial delivery; notify finance when GRN is posted and ready for invoice matching.

### 7.21 Supplier Invoice

1. Page list: Invoice list, upload invoice, invoice entry, invoice detail, approval detail.
2. Page purpose: Capture supplier invoice and prepare it for three-way matching and payment.
3. Buttons / actions: Add invoice, upload file, link PO/GRN, add lines, run matching, submit approval, approve, reject, schedule payment.
4. Form fields: Supplier, PO, invoice no, invoice date, due date, item, PO line, GRN line, qty invoiced, UOM, unit price, total amount.
5. Table columns: Invoice no, supplier, PO no, invoice date, due date, amount, match status, approval status, payment status.
6. Filters: Supplier, status, due date, match result, PO, overdue.
7. Status flow: Draft -> Pending Matching -> Pending Approval -> Approved -> Scheduled -> Paid; Rejected or Cancelled.
8. Validation rules: Invoice no unique per supplier; qty invoiced positive; invoice qty cannot exceed received qty for approval; due date after invoice date.
9. Business rules: Invoice lines should link to PO line and GRN line; approved invoice becomes available for payment schedule.
10. Required permissions: `supplier_invoice.read`, `supplier_invoice.create`, `supplier_invoice.update`, `supplier_invoice.submit`, `supplier_invoice.approve`.
11. Activity log events: Invoice uploaded, line added, matching run, mismatch found, submitted, approved, rejected, scheduled.
12. Attachments required: Supplier invoice file required; credit note or delivery note optional.
13. Notifications triggered: Notify finance when GRN awaits invoice; notify manager when invoice approval is required; notify finance when rejected.

### 7.22 Three-Way Matching

1. Page list: Matching queue, match detail, mismatch resolution.
2. Page purpose: Compare PO quantity, received quantity, and invoice quantity before approval.
3. Buttons / actions: Run match, approve matched invoice, flag mismatch, request correction, attach evidence, export.
4. Form fields: PO line, GRN line, invoice line, PO qty, received qty, invoiced qty, unit price, remarks.
5. Table columns: Supplier, invoice no, item, PO qty, received qty, invoice qty, result, status, action required.
6. Filters: Supplier, mismatch only, invoice status, PO, GRN, due date.
7. Status flow: Draft -> Matched or Mismatch -> Resolved -> Approved; Rejected.
8. Validation rules: Invoice qty must be less than or equal to received qty; required links must exist for controlled items.
9. Business rules: Mismatched invoice cannot be approved until resolved or authorized by manager with audit log.
10. Required permissions: `three_way_matching.read`, `three_way_matching.update`, `three_way_matching.approve`.
11. Activity log events: Match run, match passed, mismatch found, correction requested, resolved, override approved.
12. Attachments required: Required for mismatch override or supplier correction.
13. Notifications triggered: Notify purchasing for quantity mismatch; notify finance for price mismatch; notify manager for override approval.

### 7.23 Payment Schedule

1. Page list: Payment schedule list, weekly payment planner, schedule detail, supplier outstanding.
2. Page purpose: Plan supplier payments by week and track paid/outstanding amounts.
3. Buttons / actions: Create schedule, add approved invoice, remove line, submit approval, approve, mark paid, export payment list.
4. Form fields: Schedule no, week start, week end, supplier, invoice, due date, amount, paid amount, status, paid at.
5. Table columns: Schedule no, week, supplier, invoice count, total amount, paid amount, cash required, status.
6. Filters: Week, supplier, payment status, due date, overdue.
7. Status flow: Pending -> Scheduled -> Partially Paid -> Paid; Overdue or Cancelled.
8. Validation rules: Week dates valid; amount positive; paid amount cannot exceed amount; only approved invoices can be scheduled.
9. Business rules: Weekly cash required view is based on unpaid scheduled lines; payment schedule approval required before marking paid if configured.
10. Required permissions: `payment_schedule.read`, `payment_schedule.create`, `payment_schedule.update`, `payment_schedule.submit`, `payment_schedule.approve`, `payment_schedule.post`.
11. Activity log events: Schedule created, invoice added, submitted, approved, payment marked paid, overdue flagged.
12. Attachments required: Optional payment proof; required when marking paid.
13. Notifications triggered: Notify manager on payment approval request; notify finance for overdue payments.

### 7.24 Reports

1. Page list: Reports overview, purchase analysis, PO summary, supplier price history, stock balance, stock card, stock count analysis, wastage, adjustment, inventory variance, COGS, menu and ingredients, production history, batch tracing.
2. Page purpose: Provide operational and finance reporting for decision-making and audit.
3. Buttons / actions: Run report, export CSV/Excel/PDF, save filter, schedule report placeholder.
4. Form fields: Report type, date range, branch, location, supplier, item/product, category, status.
5. Table columns: Report-specific; must include document references, dates, quantities, UOM, amount/value, status.
6. Filters: Date range, branch, location, supplier, item/product, category, status, variance only.
7. Status flow: Report display only.
8. Validation rules: Valid date range; export limited to permitted data.
9. Business rules: Reports must use transaction views and source documents; no report should rely on manually stored stock balance.
10. Required permissions: `reports.read`, `reports.export`; sensitive finance reports require finance or manager role.
11. Activity log events: Report viewed, report exported.
12. Attachments required: None.
13. Notifications triggered: Optional scheduled report notification in later phase.

### 7.25 Notifications

1. Page list: Notification center, notification detail, notification settings.
2. Page purpose: Show pending tasks, alerts, approvals, and operational exceptions.
3. Buttons / actions: Mark read, mark all read, open source document, configure notification preference.
4. Form fields: Channel, title, body, entity type, entity id, read status.
5. Table columns: Title, module, source document, created date, read date, action.
6. Filters: Unread, module, date, priority placeholder.
7. Status flow: Unread -> Read; Sent for email/in-app where applicable.
8. Validation rules: Notification must have staff or broadcast scope; title required.
9. Business rules: Notifications should deep-link to source module and respect permissions.
10. Required permissions: `notifications.read`, `notifications.update`.
11. Activity log events: Notification read, notification opened.
12. Attachments required: None.
13. Notifications triggered: System-generated by source workflows.

### 7.26 Audit Log

1. Page list: Audit log list, audit detail.
2. Page purpose: Technical trace of changes for compliance and troubleshooting.
3. Buttons / actions: Search, filter, export, open related record.
4. Form fields: Table name, record id, action, changed by, date range.
5. Table columns: Date/time, user, table, record id, action, changed fields.
6. Filters: Table, action, user, date range, record id.
7. Status flow: Append-only.
8. Validation rules: No manual creation from UI; export permission required.
9. Business rules: Audit logs cannot be edited or deleted from normal UI.
10. Required permissions: `audit_log.read`, `audit_log.export`; admin only.
11. Activity log events: Audit log viewed, audit log exported.
12. Attachments required: None.
13. Notifications triggered: Notify admin for suspicious changes in later phase.

## 8. End-to-End Workflow Requirements

### 8.1 Daily Stock Check to Purchase Request

1. Kitchen opens stock count for assigned location.
2. System loads theoretical stock from `stock_balances_view`.
3. Kitchen enters physical quantity and submits.
4. System calculates variance and flags low stock or high variance.
5. Admin reviews submitted count.
6. If stock is below safety stock, system allows creating PR lines from low-stock items.
7. PR contains requested item, required date, quantity, UOM, estimated cost, and remarks.

### 8.2 Purchase Request Approval

1. Admin checks whether request is valid.
2. Purchasing verifies supplier, MOQ, lead time, stock on hand, and estimated cost.
3. Manager approves or rejects.
4. Approved PR can be converted to PO.
5. Rejected PR returns to requester with remarks.

### 8.3 Purchase Order to Receiving

1. Purchasing creates PO from approved PR or manually.
2. PO is submitted to manager for approval.
3. Approved PO can be sent to supplier by print/email/WhatsApp placeholder.
4. Supplier delivers full or partial quantity.
5. Kitchen creates GRN against PO.
6. Posting GRN creates purchase stock transaction and updates received/pending logic.

### 8.4 Invoice Matching to Payment

1. Finance uploads or creates supplier invoice.
2. Invoice lines link to PO lines and GRN lines.
3. System runs three-way matching.
4. Invoice cannot be approved if invoice qty exceeds received qty.
5. Approved invoice becomes available for weekly payment schedule.
6. Finance creates weekly payment schedule.
7. Manager approves payment schedule.
8. Finance marks paid and uploads payment proof.

## 9. Approval Requirements

| Document | Required Approval |
| --- | --- |
| Recipe / BOM | Manager approval before active use. |
| Stock Adjustment | Manager approval before posting. |
| Purchase Request | Admin review, purchasing review, manager approval. |
| Purchase Order | Manager approval before sending supplier. |
| Supplier Invoice | Manager/finance approval after three-way matching. |
| Payment Schedule | Manager approval before payment execution if configured. |

## 10. Attachment Requirements Summary

| Module | Required Attachments |
| --- | --- |
| Goods Receiving | Delivery order required. |
| Supplier Invoice | Supplier invoice required. |
| Payment Schedule | Payment proof required when marking paid. |
| Stock Adjustment | Required for high-value or high-variance adjustment. |
| Stock Wastage | Required for damage, expired stock, supplier claim, or abnormal wastage. |
| Recipe / BOM | Optional production method and costing support. |
| Supplier | Optional SSM, halal certificate, quotation, bank details. |
| Item/Product | Optional specification, photo, label, or certificate. |

## 11. Notification Trigger Summary

| Trigger | Recipient |
| --- | --- |
| Stock count submitted | Admin. |
| Variance exceeds tolerance | Manager and admin. |
| Low stock detected | Kitchen lead and purchasing. |
| PR submitted | Admin. |
| PR admin reviewed | Purchasing. |
| PR ready for approval | Manager. |
| PO pending approval | Manager. |
| PO approved/sent | Purchasing and kitchen. |
| Partial delivery posted | Purchasing. |
| GRN posted | Finance. |
| Invoice mismatch found | Finance and purchasing. |
| Invoice pending approval | Manager/finance approver. |
| Payment schedule pending approval | Manager. |
| Payment overdue | Finance. |

## 12. MVP vs Later Phase

### MVP

- Dashboard exception widgets.
- Company, branches, locations, staffs, roles.
- Items, products, suppliers.
- Recipe / BOM with approval and costing.
- Stock balance, stock card, stock count, stock adjustment, stock wastage, stock transfer.
- Purchase request, purchase order, goods receiving.
- Supplier invoice, three-way matching, payment schedule.
- Core reports, notifications, attachments, activity log, audit log.

### Later Phase

- AutoCount sync.
- WhatsApp/email supplier sending automation.
- OCR invoice upload.
- Advanced costing and landed cost.
- Production batch trace with QC checkpoints.
- Mobile-first kitchen count app.
- Scheduled reports.
- Supplier portal.
- Customer/outlet ordering and sales fulfillment.
- Advanced permission scopes by branch/location.
