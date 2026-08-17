-- Enforce separation of duties for the three purchase-request approval stages.
-- Permissions remain configurable within the owning role, but may not leak to
-- another operational role through historical grants.

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.role_code <> 'super_admin'
  and (
    (p.permission_code in ('pr.manager_approve', 'purchase_request.approve') and r.role_code <> 'manager')
    or (p.permission_code in ('pr.admin_review', 'pr.purchasing_review') and r.role_code <> 'purchasing')
    or (p.permission_code = 'pr.finance_review' and r.role_code <> 'finance')
  );

notify pgrst, 'reload schema';
