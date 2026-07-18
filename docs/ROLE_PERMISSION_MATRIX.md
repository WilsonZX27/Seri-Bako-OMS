# Fixed role and location-access matrix

Sprint 7.23.1 establishes six system-controlled roles. The database remains authoritative; this document is a sanitized product-level summary.

| Role | Scope | Core responsibility | Owner controls | Finance/AP | Purchasing/master data | Assigned operations |
|---|---|---|---:|---:|---:|---:|
| Super Admin / Owner | Company-wide | Protected system ownership and full operational authority | Yes | Yes | Yes | Yes |
| Finance | Company-wide | Finance review, payables, payments, financial reporting | No | Yes | No | Read where granted |
| Manager | Assigned locations or explicitly all locations | Operational approval and oversight | No | No | No | Yes |
| Purchasing | Company-wide | Purchasing review, suppliers, items, imports, PO and receiving preparation | No | No | Yes | Read where granted |
| Kitchen | Assigned Central Kitchen locations | PR creation/submission and kitchen/production work | No | No | No | Yes |
| Outlet Staff | Assigned outlet locations | Outlet Daily Records | No | No | No | Outlet only |

## Assignment rules

- Only an active Super Admin / Owner may assign roles.
- The last active Super Admin / Owner cannot be removed, demoted, disabled, or permanently deleted.
- Fixed roles cannot be created, renamed, edited, or deleted through normal UI.
- Role controls actions. Default Location controls initial context only. Accessible Locations control record visibility.
- Company-wide roles receive all active locations automatically. Manager may be assigned eligible locations or all locations. Kitchen accepts Central Kitchen locations only. Outlet Staff accepts outlet locations only.
- Staff-specific permission overrides remain available only through protected owner controls and never alter the shared role definition.

## Purchase Request sequence

Kitchen Submit → Manager Review → Purchasing Review → Finance Review → Ready to Convert → Purchase Order.

The stored `admin_review` state and `pr.admin_review` permission remain database compatibility identifiers so the verified transition function is unchanged. All user-facing vocabulary calls this step Purchasing Review, and the permission is granted to Purchasing by migration 071.
