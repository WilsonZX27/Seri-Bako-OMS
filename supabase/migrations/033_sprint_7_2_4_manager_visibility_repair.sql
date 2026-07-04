-- Sprint 7.2.4: Manager Role Visibility and Approval Access Repair
-- Keeps Manager as an operational approval role without owner/system-admin powers.

insert into public.permissions (permission_code, module, action, description)
values
  ('dashboard.view','dashboard','view','View operational dashboard'),
  ('procurement.view','procurement','view','View procurement workspace'),
  ('inventory.read','inventory','read','Read inventory dashboard and balances'),
  ('stock_count.read','stock_count','read','Read stock counts'),
  ('stock_transfer.read','stock_transfer','read','Read stock transfers'),
  ('stock_wastage.read','stock_wastage','read','Read stock wastage'),
  ('purchase_request.read','purchase_request','read','Read purchase requests'),
  ('purchase_order.read','purchase_order','read','Read purchase orders'),
  ('goods_receiving.read','goods_receiving','read','Read goods receiving'),
  ('documents.read','documents','read','Read document register'),
  ('reports.view','reports','view','View reports'),
  ('production.view','production','view','View production workspace'),
  ('pr.view_branch','purchase_requests','view_branch','View branch purchase requests'),
  ('pr.manager_approve','purchase_requests','manager_approve','Approve purchase requests at Manager Approval step'),
  ('pr.reject','purchase_requests','reject','Reject purchase requests at assigned review step'),
  ('po.view','purchase_orders','view','View purchase orders'),
  ('po.approve','purchase_orders','approve','Approve purchase orders'),
  ('grn.view','goods_receiving','view','View goods receiving')
on conflict (permission_code) do nothing;

insert into public.roles (company_id, role_code, role_name, description, status)
select
  companies.id,
  'manager',
  'Manager',
  'Operational manager for branch/company review and approval workflow',
  'active'
from public.companies
on conflict (company_id, role_code) do update
  set role_name = excluded.role_name,
      description = excluded.description,
      status = 'active',
      deleted_at = null;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.permission_code in (
  'dashboard.view',
  'procurement.view',
  'inventory.read',
  'stock_count.read',
  'stock_transfer.read',
  'stock_wastage.read',
  'purchase_request.read',
  'purchase_order.read',
  'goods_receiving.read',
  'documents.read',
  'reports.view',
  'production.view',
  'pr.view_branch',
  'pr.manager_approve',
  'pr.reject',
  'po.view',
  'po.approve',
  'grn.view'
)
where roles.role_code = 'manager'
  and coalesce(roles.status, 'active') = 'active'
  and roles.deleted_at is null
on conflict (role_id, permission_id) do nothing;

do $$
declare
  manager_staff record;
  manager_role_id uuid;
  default_branch_id uuid;
begin
  for manager_staff in
    select staffs.id, staffs.company_id
    from public.staffs
    where lower(coalesce(staffs.email, staffs.invite_email, '')) = 'test.manager@seribako.com.my'
      and staffs.deleted_at is null
  loop
    select roles.id
      into manager_role_id
    from public.roles
    where roles.company_id = manager_staff.company_id
      and roles.role_code = 'manager'
      and roles.deleted_at is null
    limit 1;

    if manager_role_id is null then
      continue;
    end if;

    insert into public.staff_roles (staff_id, role_id, branch_id, is_primary, effective_from, effective_to)
    values (manager_staff.id, manager_role_id, null, true, current_date, null)
    on conflict do nothing;

    update public.staff_roles
       set is_primary = true,
           effective_to = null
     where staff_id = manager_staff.id
       and role_id = manager_role_id;

    select branches.id
      into default_branch_id
    from public.branches
    where branches.company_id = manager_staff.company_id
      and branches.deleted_at is null
      and coalesce(branches.status, 'active') = 'active'
    order by
      case
        when branches.branch_name ilike '%Central Kitchen%' then 0
        when branches.branch_name ilike '%Main%' then 1
        else 2
      end,
      branches.created_at
    limit 1;

    if default_branch_id is not null then
      insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
      values (manager_staff.id, default_branch_id, 'read_only', true)
      on conflict do nothing;

      update public.staff_branches
         set is_default = true,
             access_level = case
               when access_level in ('full', 'manage') then access_level
               else 'read_only'
             end
       where staff_id = manager_staff.id
         and branch_id = default_branch_id;
    end if;
  end loop;
end $$;
