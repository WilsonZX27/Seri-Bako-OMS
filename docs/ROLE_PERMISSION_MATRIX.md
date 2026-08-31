# Fixed role, route, and Branch / Outlet matrix

v9.2.2 keeps seven system-controlled roles. The database is authoritative; this is the sanitized product-level operating matrix.

| Role | Scope | Staff / Users | Document Sequences | Imports | Branches / Outlets | Protected system controls |
|---|---|---:|---:|---:|---:|---:|
| Super Admin / Owner | Company-wide | Manage all | Manage | Run | Manage | Yes |
| People Operations | Company-wide People; outlet compliance | Manage employees | No | No | View; manage compliance | No |
| Finance | Company-wide | Manage non-Owner accounts | Manage | Run | Manage | No |
| Manager | Assigned branches, or explicitly all | Manage scoped employees | No | No | Manage within scope | No |
| Purchasing | Company-wide procurement | No | No | Run | View/select | No |
| Kitchen | Assigned Central Kitchen branch | No | No | No | No management | No |
| Outlet Staff | Assigned outlet | No | No | No | No management | No |

## Canonical routes

| Capability | Canonical route | Owner | People Ops | Finance | Manager | Purchasing | Kitchen | Outlet Staff |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Procurement workspace | `/procurement` | Allowed | Denied | Allowed | Allowed | Allowed | Allowed when a child module is permitted | Denied |
| Inventory workspace | `/inventory` | Allowed | Denied | Allowed | Allowed | Allowed when a child module is permitted | Allowed when a child module is permitted | Denied unless a child module is permitted |
| Outlet Compliance | `/outlet-compliance` | Manage | Manage/review | Denied | Manage within scope | Denied | Status only | Status/upload only |
| People | `/people` | Manage | Manage | Denied | Scoped status | Denied | Denied | Denied |
| Branches / Outlets | `/branches` | Manage | Read | Manage | Manage within scope | Read | Denied | Denied |
| Staff / Users | `/staffs` | Manage | Manage employees | Manage non-Owner | Manage within scope | Denied | Denied | Denied |
| Document Sequences | `/document-sequences` | Manage | Denied | Manage | Denied | Denied | Denied | Denied |
| Imports | `/imports` | Run | Denied | Run | Denied | Run | Denied | Denied |
| Backup | `/administration/backups` | Allowed | Denied | Denied | Denied | Denied | Denied | Denied |

## Assignment and protection rules

- Only an active Owner can assign or alter an Owner role.
- People Operations can manage employee identity and sensitive compliance within its approved scope, but cannot enter Procurement, Inventory, Outlet Daily sales, Document Sequences, or Backup.
- Finance may invite, update, enable, disable, reset, and remove non-Owner test/staff accounts but cannot mutate an Owner account or role.
- The last active Owner cannot be removed, demoted, disabled, or permanently deleted.
- Fixed roles cannot be created, renamed, edited, or deleted through normal UI.
- Role controls actions. Assigned Branches / Outlets control record visibility; a default Branch / Outlet is context only.
- Purchasing can view and select branches needed for procurement but cannot create or edit them.
- Kitchen and Outlet Staff retain only their intended operational scope.

## Purchase Request sequence

Kitchen Submit → Manager Review → Purchasing Review → Finance Review → Ready to Convert → Purchase Order.

The stored `admin_review` state and `pr.admin_review` permission remain database compatibility identifiers so the verified transition function is unchanged. User-facing vocabulary calls this Purchasing Review.
