# Fixed role, route, and Branch / Outlet matrix

## Asset rework 2026-10-09 — prepared, not deployed

Migration 339 and local route/query changes require company plus assigned-location authorization for non-Owner asset access, regardless of stale view_all grants. Only Super Admin, Manager and Outlet Supervisor access Overview and Maintenance management. Ordinary staff and kitchen use the independent location-scoped checklist summary and can record exceptions there. Managers and supervisors remain limited to assigned locations; Owner retains the company boundary. Imported raw master JSON and history require original-location access; unlocated legacy attachments follow that same provenance gate. Direct authenticated selection of assets.source_data is revoked; the checked identity RPC returns raw source fields only within that provenance scope. Source values remain unchanged. These restrictions are locally rehearsed, NOT live yet, and require actual hosted identity/storage checks before release.

## Attendance additions (v9.2.15)

| Role | Schedule | Attendance |
| --- | --- | --- |
| Owner | All scopes; reasoned unlock | Import, review, adjust, export, lock and reasoned unlock |
| People Operations | Read/history only; cannot approve | Organisation-wide mapping, import, review, adjust, export and lock |
| Manager | Read and decide within authorised scope | Read/export/reconcile within authorised scope |
| Outlet Supervisor | Draft/submit assigned outlets; pure-swap review; no self-approval | Assigned-outlet exception review |
| Outlet Staff | Own published schedule and requests | Own attendance only |

All boundaries are enforced by capability checks and RLS; navigation visibility is not an authorisation boundary.

## Asset workspace — local migration 337, not activated in Production

| Default role | Read scope | Master, counts and operating exceptions | Checks | Maintenance and its photos | Request/dispatch/receive transfers | Transfer decisions |
|---|---|---|---|---|---|---|
| Owner / Manager | Company-wide asset locations | Allowed | Allowed | Allowed | Allowed | Allowed |
| Finance / Purchasing | Company-wide asset locations | Denied | Denied | Read only | Read only | Denied |
| Kitchen / Outlet Supervisor / Outlet Staff | Assigned OMS branches | Denied | Allowed | Allowed within assigned branches | Allowed at accessible source/destination | Denied |
| People Operations | Denied by default | Denied | Denied | Denied | Denied | Denied |

The seven capabilities are `assets.view`, `assets.view_all`, `assets.manage`, `assets.check`, `assets.maintenance`, `assets.transfer` and `assets.approve`. Existing OMS permission overrides remain authoritative. Event is not an operating branch and requires company-wide asset access. Every operational read/write checks the active company and permitted locations in SQL; hiding navigation does not replace these checks.

General master attachments, invoices and warranty uploads require `assets.manage`. An operator with `assets.maintenance` may add photos only to an accessible maintenance record. Maintenance attachments retain their parent and location; the same asset being held at another outlet does not expose those photos there. Asset, maintenance and attachment locations must agree. Pending files are unreadable in the private bucket; only server-verified bytes become readable. Authenticated clients cannot upload, overwrite, delete or mark Storage files verified directly.

Legacy author names remain history text. No legacy user or password is imported as an OMS account. Staging imports and recovery are privileged operator tools with no activation command, and cannot modify a verified/live ledger. They are not new permissions for ordinary application users.

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
| People directory | `/people` | Manage | Manage | Denied | Scoped status | Denied | Denied | Denied |
| Branches / Outlets | `/branches` | Manage | Read | Manage | Manage within scope | Read | Denied | Denied |
| Employee account creation | `/staffs/new` | Manage | Manage employees | Manage non-Owner | Manage within scope | Denied | Denied | Denied |
| Employee account & access | `/staffs/[id]` | Manage | Manage employees | Manage non-Owner | Manage within scope | Denied | Denied | Denied |
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
- `/people` is the only employee directory. `/staffs` is a compatibility redirect that preserves existing query parameters; it must not regain a second list implementation. Account creation and access administration remain at `/staffs/new` and `/staffs/[id]` because those are privileged administration tasks linked from the People profile.

## Purchase Request sequence

Kitchen Submit → Manager Review → Purchasing Review → Finance Review → Ready to Convert → Purchase Order.

The stored `admin_review` state and `pr.admin_review` permission remain database compatibility identifiers so the verified transition function is unchanged. User-facing vocabulary calls this Purchasing Review.

Migration 337 asset permission grants were applied alone on 8 October 2026 with owner authorization. Independent readback confirmed all preexisting permission rows and role grants remain unchanged. Asset RLS still requires a live import batch; the reconciled production staging batch remains rehearsal. Actual live role/location acceptance and formal cutover are pending.

### Local candidate: general maintenance (migration 346, not deployed)

`assets.report` grants super admin, manager, outlet supervisor, outlet staff and kitchen the ability to report a problem at an accessible asset location. An asset is optional. Non-management readers can see only their own `reported_by` requests, history and verified photos, and only while retaining access to that location. They cannot update status, assign or close tickets. Management roles retain the existing location restriction and `assets.maintenance`/`assets.manage` mutation split. Finance and purchasing receive no new reporting grant. Storage remains private; service verification and company-bound paths remain mandatory.

## Compliance authority correction — 2026-10-13

Migration 269 lines 16–18 historically granted outlet_supervisor read. Migration 314_restrict_outlet_compliance.sql supersedes it and revokes outlet_staff/outlet_supervisor compliance grants. Current information architecture and attendance-operations-269 contract deny those roles. The older canonical-route table above is historical for this capability: /outlet-compliance, /outlet-calendar and the /compliance redirect follow management-only access. No runtime grant is changed by this documentation/test correction.
