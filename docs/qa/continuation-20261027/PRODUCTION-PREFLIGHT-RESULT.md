# Production read-only verification and revised375 proposal

##371–374

Correct project nnvdsaftiwpqkekjfrgc, main PRODUCTION, execution role postgres confirmed through supported browser SQL Editor. Only top-level SELECTs ran; no business data mutation or installation performed.

At2026-10-26 17:44:12UTC, dedupe helper, external-assignment v2 helper, packaging_stores and packaging_store_movements were absent; matching nonidle transactions containing the migration/helper names counted0. This is a point-in-time restricted activity check, not proof of all database activity.

At17:53:53.212072UTC the exact original read-only preflight was rerun. Normalized comparison against08:10:25.467618UTC is identical for all four sections: function definitions/owners/ACL/config, relation schema/constraints/RLS/ACL, default ACL, and specified-company Manager Items permission rows. All five function MD5s independently validate. Manager items.view/create/update are all false; new371/373/374 objects absent. No partial installation is evidenced. The frozen archive hash remains54fe1a08e2a5248d6c24ceace829a93838df09cb08d608c7768e24152558a9bf.

Conclusion: original frozen package's checked drift prerequisites still match; it can proceed only through its unchanged per-step before/after guards and postflight after parent confirms unique write execution and original approval evidence. No blind replay, no375 authorization inferred. A new drift or uncertain result must stop the sequence. Fresh guarded checks remain authoritative at execution time.

Evidence: /tmp/oms-continuation-evidence-20261027/371-374-production-preflight.json and371-374-drift-comparison.json.

##375 production differences and local follow-up

17:45:45UTC extended metadata SELECT returned15 relation schemas plus helper/resolver/PR-update-trigger definitions; separate later dependency SELECT returned actual branch access, company-role, staff-id, item-scope and line-supplier functions. No business rows read. New375 function absent. Production default function ACL includes service_role, so an authenticated grant is not an exhaustive effective-ACL claim.

Production PR UPDATE fires enforce_inventory_branch_scope, which checks can_access_inventory_branch even for supplier-only updates. PR lines additionally fire inventory-item and supplier guards, and updates set actual timestamps. Status/branch-only transition triggers remain present. Tables have RLS enabled but force_rls=false; a postgres-owned SECURITY DEFINER function bypasses table RLS, so internal actor/company/access guards and still-running triggers are essential. No existing policy/trigger/ACL was changed.

The actual resolver body has292/293 behavior. Its Item Master fallback excludes active mappings in ANY branch, while the earlier375 proposal excluded current-branch mappings only. Revised375 narrows fallback to the same global no-mapping prerequisite; it does not enable other-branch-only recovery or manager_review.

Replayed the actual exported public helper/resolver/PR/line-trigger definitions in a NEW network-none tmpfs PostgreSQL container with synthetic data, not boolean helper stubs. Replayed default service_role execute inheritance.50 cases and four separate-session lock-wait scenarios passed, including inventory-branch rejection despite PR view_all and fallback conflict. The pre-existing49 cases include actual resolver qty/UOM/provisional-cost behavior, role/company ownership, stale versions, duplicate/no-catalog guards, replay, anon/service-without-staff refusal, and audit-failure rollback. Historical malformed unassigned catalog fixtures locally disable then restore only the fixture's user triggers during setup; normal call/resolver paths have triggers enabled.

Limit: fixture tables remain minimal (text statuses and limited constraints), not a complete production schema/RLS replay. Production observed composite item/supplier/mapping FKs, positive quantity/UOM checks and role tenant triggers are stricter. The new function independently verifies those tenant/relationship conditions; no claim of complete all-schema UAT or real business-write acceptance is made.

Evidence:375-production-preflight.json,375-production-dependencies.json,375-production-trigger-fixture.sql,375-production-trigger-behavior.json/.log in the evidence directory. Replica assembly script:tests/local375/assemble_production_triggers.py. All failures found during setup were diagnosed as fixture ordering, production timestamp/defaultACL or illegal fixture-row construction; final suite passed with real exported trigger chain enabled.

## Precise separate approval text (not yet approved)

Approve installing only the new public.select_unassigned_purchase_request_supplier(uuid,uuid,timestamptz) function from375_supplier_recovery.PROPOSED.sql after final metadata drift comparison. CREATE FUNCTION must stop if the signature exists. Revoke PUBLIC/anon execute and grant authenticated execute; retain and disclose effective default service_role access. No existing helper, permission row, role grant, RLS, Auth policy or resolver is changed.

Function availability applies across companies, each actor strictly within own company. Actor must be active/nondeleted/not beyond Kuala Lumpur last working day, have pr.admin_review and same-company valid purchasing/super_admin role. Local permission/override evidence cannot come only from a foreign/deleted role. Existing PR-access and inventory-branch trigger gates remain. Manager gets no new375 access.

Installation does not scan/backfill/modify PR records. A later explicit user call may select one same-company active eligible supplier only on an admin_review PR with unresolved descriptions and no catalog lines, preserving row lock/version protection and existing-supplier protection. It changes that PR's assigned_supplier_id/updated_at and adds one actor/company audit; it does not match lines, change quantities/UOM/prices, advance approval or recompute history. Same-supplier retry returns without duplicate audit before version/catalog checks.

If never used, rollback can revoke/drop the new function after checking client dependencies and revert its client entry. If used, dropping/reverting code cannot undo selected supplier/timestamp/audit; business correction needs separate record/state-specific review. Never auto-clear suppliers or delete audits. Unknown installation outcome must be checked, not retried blindly.

This request does NOT authorize real PR supplier selection, employee changes, schedule publish, stock adjustment, historical recalculation or automatic numbering.375 client entry is still inactive. Final unified Preview original-state/image/role acceptance remains necessary before Production promotion.
