# Supplier recovery 375 — continued source review, NOT behavior verified

Reviewed immutable proposal: /tmp/oms375-supplier-recovery-review-20261026/375_select_unassigned_pr_supplier.PROPOSED.sql, SHA256 65ee9b7a193bd9e62b5192990d305e20a59d2f1726b2edfcc5091fa222b5fd76. Proposal unchanged; not installed in migrations, no client entry activated.

## Established from repository source (not current production metadata)

- Owner role code is super_admin (030 recovery label “Super Admin / Owner”, 073 current_staff_is_owner); do not use a guessed owner code.
- Proposal requires active, nondeleted, employment-date-eligible actor in current company, pr.admin_review, and purchasing/super_admin role, plus existing can_access_purchase_request. None of these may be replaced by Owner-page visibility.
- Latest explicit current_staff_company_id is 304 with inclusive Kuala Lumpur end-date boundary. Latest explicit role_codes is 005; it joins staff_roles and active roles with effective dates, but does not explicitly filter role company/deleted_at. Latest explicit has_any_permission is 090, not 052: super_admin bypass; per-permission deny/allow; role permissions. Current production metadata and any intervening dynamic rewrites must be checked before finalizing.
- Proposal currently trusts role_codes for role identity. A final isolated test must use actual staff_roles/roles/permissions/overrides helpers and include cross-company role attachment, deleted role and expired/future assignments. Source alone does not establish whether existing constraints make invalid role attachments impossible. Do not claim correct company role ownership until verified.
- 236 defines the resolver, 292 enables controlled purchasing preparation in manager_review as well as admin_review, 293 broadens mapping selection to other branches and supports requested-UOM mismatch with provisional zero cost. Proposal is admin_review-only and branch-local mapping or Item Master fallback. This is a deliberately narrower scope requiring explicit explanation, not complete parity with current repository resolver.
- Existing resolver branch preference/fallback must be tested as a complete chain; absence of current branch mapping alone is not authority. Eligibility also requires same-company active item/supplier and the real access helper. Proposal's mapping query should be compared with actual composite relationships/constraints and resolver's item/UOM behavior.
- Proposal locks PR FOR UPDATE and compares expected_updated_at before first assignment. Different existing supplier refuses; same supplier returns without another log. Same-supplier replay happens before version and no-catalog checks by design in current proposal; document and behavior-test this ordering rather than claiming every replay is version checked.
- Installation itself makes no PR edits. Explicit call assigns one supplier/timestamp and adds one audit; it does not resolve item lines. ACL/default service_role, owner and triggers still need metadata preflight. CREATE OR REPLACE must not overwrite an unknown existing function.

## Required behavioral matrix, all NOT RUN this continuation

1. Real auth UID to staff/role/permission joins: purchasing and super_admin allowed; manager, no actor, disabled/deleted/ended staff, denied permission, future/expired/deleted/foreign role refused. Service role without valid staff refused.
2. Same-company PR plus actual can_access_purchase_request branch scope; cross-company PR/supplier/item refused; active/deleted supplier/item and branch mapping relationships exercised.
3. manager_review refusal (proposal scope), admin_review success, other states refusal; no unresolved descriptions and existing catalog lines refusal; nullable/stale updated_at refusal.
4. Exact/current branch mapping; other-branch mapping; no mapping with valid Item Master fallback; inactive/deleted/conflicting mapping; differing UOM, zero cost and duplicate-item refusal through actual resolver after selection. Preserve requested quantity/UOM and audit attribution.
5. Two PostgreSQL sessions against the same PR: competing distinct suppliers => one successful first assignment and one protected failure; same supplier => one audit; stale concurrent version/status changes => refuse; rollback on audit/trigger failure => no partial assignment. Use genuinely overlapping sessions, not regex or serial helper stubs.
6. authenticated execute/anon refusal, effective default ACL and security-definer owner/search_path; production metadata drift must stop install. No real business-row mutation for acceptance.

Runtime blocker: Docker socket access denied before any container/database was touched. Existing local tests in /tmp/oms-seven-feedback-20261026 use fixed auth/current company and configurable role/permission/access stubs, one connection, and omit existing resolver chain. They remain limited prior evidence and do not pass this matrix.

Do not solicit final installation approval from this review alone. Complete runtime matrix and current SELECT metadata preflight first, freeze revised exact SQL/hash and scope/rollback boundaries, then obtain the separate approval through parent. 371–374 approval never includes375.
