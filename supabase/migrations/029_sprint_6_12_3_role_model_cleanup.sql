-- Sprint 6.12.3 Role Model Cleanup
-- Idempotently adds the Manager role and expected approval/view permissions
-- without renaming existing production role keys.

insert into public.permissions (permission_code, module, action, description)
values
  ('dashboard.view','dashboard','view','View dashboard'),
  ('documents.view','documents','view','View documents'),
  ('pr.view_branch','purchase_requests','view_branch','View branch purchase requests'),
  ('pr.manager_approve','purchase_requests','manager_approve','Approve purchase requests as manager'),
  ('pr.reject','purchase_requests','reject','Reject purchase requests'),
  ('po.view','purchase_orders','view','View purchase orders'),
  ('grn.view','goods_receiving','view','View goods receiving'),
  ('stock.view','stock','view','View stock information'),
  ('reports.view','reports','view','View reports')
on conflict (permission_code) do nothing;

insert into public.roles (company_id, role_code, role_name, description, status)
select
  c.id,
  'manager',
  'Manager',
  'Business manager for approval workflow and branch operation summaries',
  'active'
from public.companies c
where not exists (
  select 1
  from public.roles r
  where r.company_id = c.id
    and r.role_code = 'manager'
    and r.deleted_at is null
);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'dashboard.view',
  'documents.view',
  'pr.view_branch',
  'pr.manager_approve',
  'pr.reject',
  'po.view',
  'grn.view',
  'stock.view',
  'reports.view'
)
where r.role_code = 'manager'
on conflict (role_id, permission_id) do nothing;
