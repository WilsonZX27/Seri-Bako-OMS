# Seri Bako OMS Role Permission Matrix

Sprint 7.3.6 locks the ERP permission model before adding more modules. The app should use explicit permission checks for UI visibility and server actions. Database RLS remains the final data safety layer.

## Role Definitions

| Role | Purpose |
| --- | --- |
| `super_admin` | Full system owner. Can manage company setup, users, roles, permissions, master data, workflow actions, imports, documents, and reports. |
| `operations_admin` | Office/admin operations role. Can manage day-to-day setup, staff invitations, branches, locations, items, suppliers, imports, documents, and the admin review step. Not the final workflow owner by default. |
| `purchasing` | Supplier, item, procurement, and PO operations role. Can verify purchase requests, create/manage supplier data, create/send purchase orders, run purchasing imports, and prepare receiving. |
| `manager` | Final approval role. Can approve or reject PR/PO workflow steps and view operational reports. Does not manage users or supplier setup by default. |
| `kitchen_staff` | Daily operations role. Can create and submit purchase requests, prepare receiving, upload supporting attachments, and view assigned operational documents. Cannot approve, verify, convert, or manage master data. |

Legacy role codes:

| Legacy Code | Treatment |
| --- | --- |
| `admin` | Treated as full owner for backward compatibility. New installs should prefer `super_admin` for system owner and `operations_admin` for office/admin operations. |
| `kitchen` | Treated like `kitchen_staff` for backward compatibility. |

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

| Permission Area | Key Examples | Super Admin | Operations Admin | Purchasing | Manager | Kitchen Staff |
| --- | --- | --- | --- | --- | --- | --- |
| Users / Staff / Roles | `users.manage`, `staff.invite` | Yes | Yes | No | No | No |
| Settings | `settings.manage` | Yes | Yes | No | No | No |
| Branches / Locations | `settings.manage` | Yes | Yes | No | No | No |
| Items | `items.create`, `items.manage` | Yes | Yes | Yes | No | No |
| Suppliers | `suppliers.create`, `suppliers.manage` | Yes | Yes | Yes | No | No |
| Purchase Request Create/Submit | `pr.create`, `pr.submit` | Yes | Yes | Yes | No | Yes |
| Purchase Request Admin Review | `pr.admin_review` | Yes | Yes | No | No | No |
| Purchase Request Purchasing Review | `pr.purchasing_review` | Yes | No | Yes | No | No |
| Purchase Request Final Approval | `pr.manager_approve` | Yes | No | No | Yes | No |
| Convert PR to PO | `pr.convert_to_po` | Yes | No | No | No | No |
| Purchase Order Create/Submit | `po.create`, `po.submit` | Yes | Yes | Yes | No | No |
| Purchase Order Approval | `po.approve` | Yes | No | No | Yes | No |
| Send PO to Supplier | `po.send` | Yes | No | Yes | No | No |
| Goods Receiving Create | `grn.create` | Yes | Yes | Yes | No | Yes |
| Goods Receiving Post | `grn.post` | Yes | No | No | No | No |
| Attachments | `attachments.upload` | Yes | Yes | Yes | Yes | Yes |
| Imports | `imports.run` | Yes | Yes | Yes | No | No |
| Documents | `documents.view`, `documents.manage` | Yes | View | View | View | View |
| Reports | `reports.view` | Yes | Yes | Yes | Yes | Yes |

## UI Rules

- Hide buttons the current role cannot perform.
- Kitchen Staff must not see approve, verify, convert, create item, or create supplier actions.
- Operations Admin can see admin review and setup actions, but not purchasing review or manager approval unless explicitly assigned.
- Purchasing can see purchasing review and supplier/item/procurement actions, but not manager approval.
- Manager can see approval/rejection actions, but not purchasing verification.
- Super Admin can see all valid workflow actions for the document's current state.

## Server Rules

- Every server action that changes data must call a permission check before writing.
- UI permission checks are for usability only; server checks are mandatory.
- Direct unauthorized action attempts should return the friendly message: "You do not have permission to perform this action."
- Never expose raw Supabase, Postgres, RLS, or constraint messages to normal users.

## Current Audit Notes

- PR, PO, GRN, document attachment, item, supplier, import, staff, branch, location, and settings writes already use server-side permission helpers.
- Workflow detail pages use permission maps to hide invalid next actions.
- The app-level permission helper now contains a role matrix so the five target roles have predictable behavior even while existing database permission rows are still being normalized.
