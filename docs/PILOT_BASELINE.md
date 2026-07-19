# v1.0 Pilot Baseline

- Application baseline: `v0.2.15 / Sprint 7.5`
- Database ceiling: `054_sprint_7_5_pr_to_po_supplier_scope_fix`

## Objective and scope

Run a controlled Seri Bako operational pilot on the verified release without adding features, migrations, or fabricated business data. The pilot covers authenticated daily work across procurement, inventory, production, documents, and administration using real permissions and branch scope.

Out of scope: accounting/general ledger replacement, automated finance reconciliation, unreviewed bulk cleanup, schema changes, and workflow redesign.

## Pilot roles and Branches / Outlets

- Super Admin / Owner: recovery access, staff/role oversight, and final incident decisions. Keep more than one active owner-class account.
- Operations Admin: company and master-data setup within granted effective permissions.
- Manager: approvals and operational oversight.
- Purchasing: suppliers, purchase requests, purchase orders, returns, and receiving within granted scope.
- Inventory Staff: stock counts, transfers, transactions, wastage, and reconciliation within branch scope.
- Production Staff: recipes and production jobs within granted scope.
- Viewer: read-only validation where granted.

Use only role codes already present in the application catalogue. Assign every pilot staff member a default Branch / Outlet and the minimum required branch scope. Verify explicit staff overrides separately from role defaults.

Before onboarding, Wilson records the exact participating branch codes, branch names, responsible manager, and pilot start date in the pilot evidence log. A Branch / Outlet is excluded until its scope is confirmed in the application.

## Onboarding order

1. Confirm Company Profile.
2. Confirm participating Branches / Outlets.
3. Confirm Staff.
4. Confirm Roles and Staff permission overrides.
5. Import Suppliers.
6. Import Items.
7. Import Supplier-item mappings.
8. Create Products and packaging in the application.
9. Create Recipes in the application; no recipe CSV importer exists.
10. Preview and post Opening Stock.
11. Reconcile Stock Balance.
12. Reconcile Stock Ledger.

## Workflow order

1. Begin one controlled Purchase Request.
2. Approve the PR through its configured stages.
3. Convert the Ready-to-Convert PR to one Purchase Order.
4. Receive it through Goods Receiving and verify the stock increase.
5. Run one Production Job and verify ingredient usage and finished output.
6. Run one Stock Transfer.
7. Run one Stock Count and reconciliation.
8. Run one Wastage entry.
9. Run one Purchase Return.
10. Run one Supplier Invoice and payment record where supported.
11. Verify documents, attachments, activity history, permissions, Stock Balance, and Stock Ledger.

## Daily monitoring

- Confirm login, protected-route rejection, and one owner-class login at start of day.
- Review failed actions, activity entries, pending approvals, low stock, and incomplete receiving/production work.
- Reconcile unexpected stock movement against posted ledger records; never edit a balance directly.
- Check attachment upload/view/download for the affected record when evidence is required.
- Record errors with user, time, branch, route, record number, expected result, and screenshot; do not include credentials.

## Incident handling

1. Stop only the affected workflow and preserve the record/error evidence.
2. Confirm whether the issue is permission, branch scope, application, database, Storage, or data quality.
3. Avoid repeated submissions, manual production SQL patches, or deleting real records.
4. Escalate to an owner with record identifiers and reproduction steps.
5. Resume only after the correction and affected end-to-end flow are verified.

## Stop conditions

Pause the pilot for any unauthorized protected-content access, zero reachable owner accounts, duplicate active PO from one PR, partial transactional posting, incorrect branch/company exposure, unexplained stock balance change, public/cross-company attachment access, destructive import behavior, or recurring generic error that blocks a primary workflow.

## Acceptance criteria

- Required users can sign in and only see/use effective permissions within assigned scope.
- Procurement completes from PR through PO and receiving without duplication or partial records.
- Opening stock and later movements reconcile to the ledger.
- Recipe/production checks pass where included.
- Private documents remain authorized and downloadable.
- Mobile primary actions, filters, tables, forms, and right-console context remain usable.
- All required QA checks are signed with no unresolved stop condition.
