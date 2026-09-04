-- Outlet entries remain correctable until a company-wide authorised role
-- posts them. The existing reviewed enum value is retained as the durable
-- posted state so historical schema and audit columns remain compatible.

insert into public.permissions (permission_code, module, action, description)
values ('outlet_daily_record.post', 'outlet_daily_record', 'post', 'Post a completed outlet daily record and lock outlet editing')
on conflict (permission_code) do update set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'outlet_daily_record.post'
where r.role_code in ('super_admin', 'admin', 'operations_admin', 'purchasing', 'manager', 'finance')
on conflict (role_id, permission_id) do nothing;

drop trigger if exists trg_prevent_outlet_daily_review_status on public.outlet_daily_records;
drop function if exists public.prevent_outlet_daily_review_status();

create or replace function public.transition_outlet_daily_record(
  p_record_id uuid,
  p_action text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  target public.outlet_daily_records%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null then raise exception 'Active staff access is required.'; end if;

  select * into target
  from public.outlet_daily_records
  where id = p_record_id
    and company_id = actor.company_id
  for update;

  if target.id is null then raise exception 'Outlet daily record was not found in your company.'; end if;
  if not public.can_access_outlet_daily_branch(target.branch_id) then raise exception 'Permission denied for this outlet.'; end if;

  if p_action = 'post' then
    if not public.has_permission('outlet_daily_record.post') then raise exception 'Missing permission: outlet_daily_record.post'; end if;
    if target.status <> 'evening_completed' then raise exception 'Only a Ready to post outlet daily record can be posted.'; end if;

    update public.outlet_daily_records
    set status = 'reviewed',
        reviewed_by = actor.id,
        reviewed_at = now(),
        updated_by = actor.id
    where id = target.id;
  elsif p_action = 'void' then
    if not public.has_permission('outlet_daily_record.void') then raise exception 'Missing permission: outlet_daily_record.void'; end if;
    if target.status = 'void' then raise exception 'This outlet daily record is already void.'; end if;
    if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Void reason is required.'; end if;

    update public.outlet_daily_records
    set status = 'void',
        void_reason = trim(p_reason),
        voided_by = actor.id,
        voided_at = now(),
        updated_by = actor.id
    where id = target.id;
  else
    raise exception 'Invalid outlet daily record action.';
  end if;
end;
$$;

revoke all on function public.transition_outlet_daily_record(uuid,text,text) from public, anon;
grant execute on function public.transition_outlet_daily_record(uuid,text,text) to authenticated;

notify pgrst, 'reload schema';
