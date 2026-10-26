# 375 isolated behavior validation — proposal only

This supersedes the Docker runtime blocker and NOT RUN matrix in the earlier review. Parent explicitly permitted one normal escalation of the same read-only Docker check; that succeeded. A new container named oms375-continuation-synthetic-20261027 was approved and created with --network none, tmpfs PGDATA and no host mounts. No existing container data, browser, production SQL, push or deployment was accessed.

## Final proposal logic and effect

supabase/maintenance/375_supplier_recovery.PROPOSED.sql is review material only, not a migration or active client entry. Owner code remains super_admin. Only admin_review is supported; manager_review and other-branch-only supplier eligibility are not added.

Compared with the earlier proposal, the new function independently binds role evidence to actor company, active/nondeleted role and current assignment dates. It requires purchasing/super_admin plus existing pr.admin_review. For non-Owner actors, local company role-permission or explicit staff allow must support that permission, and explicit deny refuses. Existing has_permission remains an additional gate. This prevents a foreign/deleted role or foreign role-permission grant from authorizing375 even if old helpers return it. No global helper, role assignment, permission grant or Auth policy changes.

Supplier mapping additionally checks supplier_items.company_id and b.item_id=si.item_id. The requirement remains local branch mapping or valid Item Master fallback; other-branch mapping alone is insufficient. Requested quantity/UOM and provisional-cost behavior stay owned by the existing resolver.

Installation uses CREATE FUNCTION, not CREATE OR REPLACE: unknown existing same-signature functions stop the transaction. New function ACL remains revoke PUBLIC/anon then grant authenticated; effective default service_role must be disclosed and checked at preflight. Installation makes no business-row edits. A later explicit authorized call changes only target PR supplier/timestamp and one audit. Matching, quantities/UOM and workflow approval are separate. Same-supplier replay returns without another audit before version/catalog checks; different supplier cannot overwrite.

## Actual execution evidence

48 behavior cases passed against real PostgreSQL using repository function bodies: current_staff_role_codes005, has_any_permission090, has_permission052, current_staff_company_id304, can_access_purchase_request075, resolver236 with resolver-specific292 transformation and full293 transformation. Only auth.uid reads the synthetic session JWT setting; role/permission/company/branch helpers query actual synthetic tables, not boolean stubs. Tables are a minimal fixture schema, not a complete production replay or production RLS/trigger model.

Coverage: purchasing/Owner success; last working day inclusive in Kuala Lumpur; manager/no actor/inactive/deleted/ended staff; foreign/deleted/inactive/future/expired role; permission missing/deny/allow; foreign role permission contamination; branch access; foreign/deleted PR; manager_review/other-status refusal; supplier/item active/deleted/company conditions; existing supplier; no unresolved/catalog lines; null/stale timestamp; exact mapping; other-branch-only refusal; inactive/malformed/foreign mapping; actual resolver fallback and exact/other-branch mapping preference; differing UOM -> zero provisional cost with quantity and requested UOM retained; duplicate item no merge; mapping revoked after selection; same-supplier idempotence; anon execute refusal; service role without actor refusal; audit failure rolls assignment back.

Four additional concurrent scenarios passed using separate overlapping psql processes. First process emits LOCK_HELD only after acquiring/updating the PR, holds transaction for one second; second process must wait >0.65 seconds. Observed waits: different suppliers 1.020s, same supplier 1.010s, status change 1.019s, version change 1.018s on the earlier final run; rerun final log contains current measurements. Different suppliers produce one committed selection/audit and protected failure; same supplier one audit; changed status or timestamp refuses without selection audit.

Installation collision test passed: second install fails already-exists and stored definition MD5 is unchanged. Expanded metadata SELECT executes successfully on the synthetic schema only. It now includes has_any_permission plus roles, staff_roles, permissions, role_permissions, overrides and staff_branches, because the revised function directly depends on them.

Logs: /tmp/oms-continuation-evidence-20261027/375-behavior.log, 375-behavior.json, 375-install-collision.log, 375-synthetic-catalog.json. Reproducible fixtures/scripts: tests/local375. Application regression after adding proposal: 2002 passed, zero failures/skips. App runtime source unchanged after the previously successful complete Next build.

## Remaining release/approval gates

1. Parent must confirm old task stopped and unique-executor handover. All browser/production SQL/push/deployment restrictions remain.
2. Current production pure SELECT metadata preflight still NOT EXECUTED. Compare actual helpers/resolver, columns, composite constraints, RLS, triggers, function owner, search_path and effective/default ACL. The synthetic test proves algorithm behavior within its fixture, not production schema parity.
3. Freeze exact SQL and preflight hashes, review detected drift, then seek separate375 installation approval through parent. Existing371–374 approval does not cover375. Client supplier selection entry remains absent; enabling it requires the approved backend and complete unified Preview acceptance.
4. No PR supplier recovery business call is authorized or executed on real records. Installed-function rollback does not undo a later explicit supplier assignment/audit; business correction would need separate object-specific assessment.
5. Full original-state/role/image Preview acceptance for the unified afternoon scope is still pending; incomplete original comments and intermittent logout cause remain open. No partial Production promotion.

Final SQL SHA256: 4f9eb8ca724b1f67d32bfa8bb3654e9a994e4db22aad92e4715030bc628651bf.
Expanded read-only metadata SELECT SHA256: 9b8f7df4c39ee0cdafe642aa1727c5bf1f851ce2464c45a90d0374d507220ce3.
