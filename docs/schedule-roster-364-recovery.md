# Migration 364 release and recovery

The candidate requires migration 364 before the new UI is enabled. This is an additive schema change, but rolling back only the UI is not a complete behavioral rollback: the validator still honors persisted week exclusions. Do not drop the column, clear exclusions, delete audit events, or rewrite published schedules as a recovery shortcut.

## Preferred recovery

Keep migration 364 and ship a forward correction that continues reading and preserving `excluded_staff_ids`. Verify the affected week against its membership audit events and current assignments in an isolated copy before allowing writes again. Re-adding a staff member intentionally restores normal missing-day validation; an import or copy that adds assignments also restores membership.

## Emergency write stop (operator procedure, not applied by this change)

1. Put schedule mutations into maintenance mode at the application edge, including save, submit, copy, workbook import/reconciliation, manager correction, approvals and scheduled workers. Keep read-only views available.
2. Inventory the deployed database's actual writable schedule RPCs, signatures, owners, effective grants and callers. Snapshot ACLs before changing them. Account for inherited PUBLIC grants, service-role workers, SECURITY DEFINER wrappers and any direct table-write grants; revoking only the new three RPCs is insufficient.
3. In one reviewed transaction, deny execution of every externally callable mutating schedule RPC to application roles (including PUBLIC/anon/authenticated and service_role where granted), and pause privileged workers. Preserve a dedicated operator connection. If privileged writer coverage cannot be demonstrated, hold the entire application in maintenance mode and stop those connections rather than claiming a schedule-only pause is complete.
4. Verify with representative application roles that direct RPC and application writes fail, that schedule reads still work, and that exclusion arrays and approval events remain unchanged. Record transaction time and the ACL snapshot in the incident log.
5. Deploy and verify a forward correction, then restore the exact captured grants and resume workers. Run save/reload, exclusion/re-add, import/copy, validation and approval checks before removing maintenance mode.

This is a concrete operational sequence, not a tested production kill switch or an executable rollback migration. Exact production ACL changes require a fresh privilege inventory and approval. Local regression covered actual copy/import, durable exclusions, normal validation after re-add, audit actor/before/after, atomic submit and manager correction, inside a rolled-back fixture transaction.
