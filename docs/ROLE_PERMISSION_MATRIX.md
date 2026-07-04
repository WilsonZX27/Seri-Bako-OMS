# Seri Bako OMS Role Permission Matrix

Sprint 6.12.3 clarifies the visible role model used by Staff, workflow actions, and future permission audits. Keep database role keys stable where needed; user-facing labels should use the display names below.

## Role Definitions

| Display Role | Database Keys | Purpose |
| --- | --- | --- |
| Super Admin / Owner | `super_admin`, legacy `admin` when used as owner | Protected system owner. Full authority over company setup, users, roles, permissions, master data, workflow actions, imports, documents, and reports. Should not be assigned casually from Staff forms. |
| Administrator | `operations_admin`, legacy `admin` when used operationally | Office/admin operations role. Manages day-to-day setup, staff invitations, branches, locations, items, suppliers, imports, documents, and Admin Review. Not the business owner by default. |
| Manager | `manager` | Business approval role. Handles manager approval for PR/PO workflow and views operational summaries. Does not manage users or supplier setup by default. |
| Purchasing | `purchasing` | Supplier, item, procurement, and PO operations role. Verifies purchase requests, manages supplier data, creates/sends purchase orders, and runs purchasing imports. |
| Finance | `finance` | Finance/reporting role. Reviews finance-facing documents and reports. Does not approve operational workflow by default. |
| Kitchen | `kitchen_staff`, legacy `kitchen` | Daily operations role. Creates/submits PRs, prepares receiving, uploads attachments, and views assigned branch documents. |
| Viewer | `viewer` | Read-only role for limited document/report visibility. |

## Protected Assignment Rules

- Only Super Admin / Owner can assign Super Admin / Owner.
- Only Super Admin / Owner can assign Administrator.
- Administrator may assign Manager, Purchasing, Finance, Kitchen, and Viewer only when permitted.
- Non-admin roles cannot assign roles.
- Wilson Super Admin (`SUPER-ADMIN`, `wilson@seribako.com.my`) is protected by Sprint 6.12.4 recovery and must remain Super Admin / Owner.
- The app must block deactivating the last Super Admin / Owner.
- The app must block removing the only remaining Super Admin / Owner role from yourself.

## Disable vs Delete Policy

- Use **Disable sign-in** for real staff or any staff with business history.
- Use **Permanent delete staff** only for safe test users with no linked PR, PO, GRN, stock, attachment, comment, or timeline history.
- Permanent delete must delete the Supabase auth user with the server-only admin client, then remove the staff profile safely.
- Wilson Super Admin / Owner and the last owner account can never be permanently deleted.
- If history exists, the app must show: "This staff has historical records and cannot be permanently deleted. Disable sign-in instead."

## Permission Keys

Use explicit permission keys in code where possible:

- `users.manage`
- `settings.manage`
- `staff.invite`
- `items.create`
- `suppliers.create`
- `pr.create`
- `pr.submit`
- `pr.admin_review`
- `pr.purchasing_review`
- `pr.manager_approve`
- `pr.finance_review`
- `pr.convert_to_po`
- `po.create`
- `po.approve`
- `po.send`
- `grn.create`
- `grn.post`
- `attachments.upload`
- `imports.run`
- `reports.view`

The app maps these friendly keys to older database permission names where needed, such as `purchase_request.create`, `purchase_order.send`, `goods_receiving.post`, `documents.attach`, and `imports.create`.

## Matrix

| Permission Area | Key Examples | Super Admin / Owner | Administrator | Manager | Purchasing | Finance | Kitchen | Viewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Users / Staff / Roles | `users.manage`, `staff.invite` | Yes | Yes | No | No | No | No | No |
| Settings | `settings.manage` | Yes | Yes | No | No | No | No | No |
| Branches / Locations | `settings.manage` | Yes | Yes | View | No | No | Assigned only | No |
| Items | `items.create`, `items.manage` | Yes | Yes | No | Yes | No | No | No |
| Suppliers | `suppliers.create`, `suppliers.manage` | Yes | Yes | No | Yes | No | No | No |
| Purchase Request Create/Submit | `pr.create`, `pr.submit` | Yes | Yes | No | Yes | No | Yes | No |
| Purchase Request Admin Review | `pr.admin_review` | Yes | Yes | No | No | No | No | No |
| Purchase Request Purchasing Review | `pr.purchasing_review` | Yes | No | No | Yes | No | No | No |
| Purchase Request Manager Approval | `pr.manager_approve` | Yes | No | Yes | No | No | No | No |
| Purchase Request Finance Review | `pr.finance_review` | Yes | Yes | No | No | Yes | No | No |
| Convert PR to PO | `pr.convert_to_po` | Yes | No | No | No | No | No | No |
| Purchase Order Create/Submit | `po.create`, `po.submit` | Yes | Yes | No | Yes | No | No | No |
| Purchase Order Approval | `po.approve` | Yes | No | Yes | No | No | No | No |
| Send PO to Supplier | `po.send` | Yes | No | No | Yes | No | No | No |
| Goods Receiving Create | `grn.create` | Yes | Yes | No | Yes | No | Yes | No |
| Goods Receiving Post | `grn.post` | Yes | No | No | No | No | No | No |
| Attachments | `attachments.upload` | Yes | Yes | Yes | Yes | No | Yes | No |
| Imports | `imports.run` | Yes | Yes | No | Yes | No | No | No |
| Documents | `documents.view`, `documents.manage` | Yes | View/manage allowed areas | View | View | View | View assigned | View |
| Reports | `reports.view` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

## UI Rules

- Hide buttons the current role cannot perform.
- Kitchen must not see approve, verify, convert, create item, create supplier, or role assignment actions.
- Administrator can see admin review and setup actions, but not purchasing review or manager approval unless explicitly assigned.
- Purchasing can see purchasing review and supplier/item/procurement actions, but not manager approval.
- Manager can see manager approval/rejection actions, but not purchasing verification.
- Super Admin / Owner can see all valid workflow actions for the document's current state.
- Staff role dropdowns must use display labels: Administrator, Manager, Purchasing, Finance, Kitchen, Viewer. Super Admin / Owner should be hidden unless the current user is an owner.
- Staff detail should show primary role plus grouped function permissions so multi-function staff can be reviewed without assuming one role equals one responsibility forever.
- The visible purchase request flow is Kitchen submit -> Manager Review -> Admin Review -> Finance Review -> Ready to Convert -> Converted to PO.

## Server Rules

- Every server action that changes data must call a permission check before writing.
- UI permission checks are for usability only; server checks are mandatory.
- Direct unauthorized action attempts should return the friendly message: "You do not have permission to perform this action."
- Never expose raw Supabase, Postgres, RLS, or constraint messages to normal users.
- Staff role assignment must be checked server-side with the same protected assignment rules listed above.

## Current Audit Notes

- PR Manager Review uses `pr.manager_approve`.
- PR Admin Review uses `pr.admin_review`.
- PR Finance Review uses `pr.finance_review`.
- Legacy Purchasing Review permissions remain available for purchasing workflows and supplier operations.
- Staff create/edit now filters assignable roles by the current user's role and keeps protected owner checks on the server.
- The app-level permission helper contains a role matrix so target roles have predictable behavior while database permissions continue to normalize.
