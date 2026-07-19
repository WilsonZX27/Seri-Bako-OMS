-- Sprint 7.23.2: Finance receives the read-level Manager + Purchasing visibility union.
-- Review authority remains stage-specific: Finance Review only.

insert into public.permissions (permission_code, module, action, description)
values
  ('items.view', 'items', 'view', 'View item master data'),
  ('suppliers.view', 'suppliers', 'view', 'View supplier master data')
on conflict (permission_code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'dashboard.view'
where r.role_code in ('super_admin', 'finance', 'manager', 'purchasing', 'kitchen', 'outlet_staff')
  and r.status = 'active' and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in (
  'purchase_order.read', 'goods_receiving.read',
  'inventory.read', 'stock_count.read', 'stock_transfer.read', 'stock_wastage.read',
  'po.view', 'grn.view', 'purchase_return.view', 'items.view', 'suppliers.view',
  'production.view', 'outlet_daily_record.view', 'outlet_daily_record.view_all'
)
where r.role_code = 'finance' and r.status = 'active' and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

create or replace function public.prevent_purchase_request_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_id uuid;
begin
  if new.status is distinct from old.status
     and old.status::text in ('manager_review', 'finance_review')
     and new.status::text in ('admin_review', 'ready_to_convert') then
    select id into actor_id from public.staffs
    where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
    if actor_id is not null and old.requested_by = actor_id then
      raise exception 'You cannot approve a purchase request that you created.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists purchase_request_self_approval_guard on public.purchase_requests;
create trigger purchase_request_self_approval_guard
before update of status on public.purchase_requests
for each row execute function public.prevent_purchase_request_self_approval();
