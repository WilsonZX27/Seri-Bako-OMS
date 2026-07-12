# Seri Bako OMS Core MVP Release Candidate

Sprint: 7.2.34
Release note: Core MVP Release Candidate
Migration ceiling: 050

## Completed core modules

- Master data: items, suppliers, branches, staff, roles, recipes, import center.
- Procurement: purchase requests, purchase orders, goods receiving, purchase returns, supplier invoices and payments.
- Inventory: stock balance, stock ledger, low stock, stock transfers, stock counts, stock write-off, opening stock import.
- Production: production jobs, recipe-linked posting, material consumption, finished-goods output.
- Administration: company profile, staff, roles and permissions.

## Verified core workflows

- Production posting.
- Purchase order to goods receiving to stock inbound.
- Stock transfer.
- Stock count adjustment.
- Purchase return.
- Stock write-off.
- Purchase requisition to purchase order.
- Supplier invoice partial and full payment.
- Low stock to purchase request.
- Stock ledger and valuation.
- Fixed-template master data import.

## Known deferred issues

- Purchase Return AP offset is not implemented.
- Workflow timeline does not show every event everywhere.
- Viewer/outlet role lacks full live-account QA.
- Advanced costing is not implemented.
- Error and empty-state polish is deferred.

## Deployment prerequisites

- Apply all Supabase migrations through `050_sprint_7_2_33_supplier_permission_seed.sql`.
- Reload PostgREST schema after database changes where required.
- Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, and server-only `SUPABASE_SERVICE_ROLE_KEY`.
- Configure Supabase Auth redirect URLs and production SMTP before production onboarding.
