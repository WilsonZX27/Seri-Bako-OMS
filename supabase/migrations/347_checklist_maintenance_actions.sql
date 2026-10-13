-- Local candidate only. Requires separate approval together with 346.
-- Reuse the maintenance ledger and personal notifications; never broadcast by branch/role.
begin;
create function public.asset_maintenance_responsible(p_location uuid) returns setof uuid
language sql stable security definer set search_path=pg_catalog,public as $$
 with location as (select * from public.asset_locations where id=p_location),
 candidates as (
  select s.id from public.staffs s join location l on l.company_id=s.company_id
  where s.status='active' and s.deleted_at is null and s.auth_user_id is not null
   and l.kind='branch' and (s.default_branch_id=l.branch_id or exists(select 1 from public.staff_branches b where b.staff_id=s.id and b.branch_id=l.branch_id))
 ), active_roles as (
  select c.id staff_id,r.id role_id,r.role_code from candidates c join public.staff_roles sr on sr.staff_id=c.id
  join public.roles r on r.id=sr.role_id join location l on r.company_id=l.company_id
  where r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date)
   and (sr.effective_to is null or sr.effective_to>=current_date)
 )
 select c.id from candidates c where exists(select 1 from active_roles r where r.staff_id=c.id and r.role_code in ('super_admin','manager','outlet_supervisor'))
 and not exists (
  select 1 from unnest(array['assets.view','assets.maintenance']) required(code)
  where not (exists(select 1 from active_roles r where r.staff_id=c.id and r.role_code='super_admin') or (
   not exists(select 1 from public.staff_permission_overrides o join public.permissions p on p.id=o.permission_id where o.staff_id=c.id and p.permission_code=required.code and o.effect='deny')
   and (exists(select 1 from public.staff_permission_overrides o join public.permissions p on p.id=o.permission_id where o.staff_id=c.id and p.permission_code=required.code and o.effect='allow')
    or exists(select 1 from active_roles r join public.role_permissions rp on rp.role_id=r.role_id join public.permissions p on p.id=rp.permission_id where r.staff_id=c.id and p.permission_code=required.code))
  ))
 )
$$;
revoke all on function public.asset_maintenance_responsible(uuid) from public,anon,authenticated;

create function public.asset_maintenance_notify() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='INSERT' and lower(new.status) not in ('closed','resolved','cancelled') then
  insert into public.notifications(company_id,recipient_staff_id,title,message,priority,action_url,entity_type,entity_id,is_company_wide)
  select new.company_id,r,'Repair needs attention','A repair request needs your attention. Open the request for details.',
   'normal','/asset-management/maintenance/'||new.id,'asset_maintenance',new.id,false
  from public.asset_maintenance_responsible(new.location_id) r;
 elsif tg_op='UPDATE' and lower(new.status) in ('closed','resolved','cancelled') then
  update public.notifications set dismissed_at=coalesce(dismissed_at,now())
  where company_id=new.company_id and entity_type='asset_maintenance' and entity_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.asset_maintenance_notify() from public,anon,authenticated;
create trigger asset_maintenance_notify after insert or update of status on public.asset_maintenance
 for each row execute function public.asset_maintenance_notify();

-- Same transaction as the inspection. Existing checklist replay skips the insert,
-- and the ledger source key also prevents duplicate work orders.
create function public.asset_check_exception_request() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.result<>'Checked' then
  insert into public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by)
  values(new.company_id,new.asset_id,new.location_id,'CHECK-'||new.id,'Open','Normal',new.result||': '||coalesce(new.source_data->>'remark',''),new.author_name,
   jsonb_build_object('Checklist ID',new.id,'Actor ID',public.current_staff_id(),'Created Date',(now() at time zone 'Asia/Kuala_Lumpur')::text),public.current_staff_id())
  on conflict(company_id,source_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.asset_check_exception_request() from public,anon,authenticated;
create trigger asset_check_exception_request after insert on public.asset_daily_checks
 for each row execute function public.asset_check_exception_request();

-- Read current state, so completion removes the action even when a notification was read.
-- Re-evaluate role, permission and assigned branch after staff responsibility changes.
create function public.get_my_maintenance_actions(p_limit integer default 5) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if not public.asset_management_role() or not public.has_permission('assets.maintenance') then
  return jsonb_build_object('total',0,'items','[]'::jsonb);
 end if;
 return (with eligible as (
  select m.id,m.created_at,l.source_name location from public.asset_maintenance m
  join public.asset_locations l on l.id=m.location_id
  where m.company_id=public.current_staff_company_id() and public.asset_location_access(m.location_id)
   and lower(m.status) not in ('closed','resolved','cancelled')
   and public.current_staff_id() in (select public.asset_maintenance_responsible(m.location_id))
 ), limited as (select * from eligible order by created_at desc,id limit greatest(1,least(coalesce(p_limit,5),100)))
 select jsonb_build_object('total',(select count(*) from eligible),'items',coalesce((select jsonb_agg(limited order by created_at desc,id) from limited),'[]'::jsonb)));
end $$;
revoke all on function public.get_my_maintenance_actions(integer) from public,anon;
grant execute on function public.get_my_maintenance_actions(integer) to authenticated;
-- Historical alerts must not disclose details after responsibility/access revocation.
create policy maintenance_notification_current_access on public.notifications as restrictive for select to authenticated
 using(entity_type is distinct from 'asset_maintenance' or (
  recipient_staff_id=public.current_staff_id() and public.asset_management_role() and public.has_permission('assets.maintenance')
  and exists(select 1 from public.asset_maintenance m where m.id=entity_id and public.asset_location_access(m.location_id))
 ));
notify pgrst,'reload schema';
commit;
