begin;
-- Chef retains the existing Kitchen grants and branch scope. Scheduling uses
-- an explicit eligible-role list, intentionally excluding Chef.
insert into public.roles(company_id,role_code,role_name,description)
select company_id,'chef','Chef','Kitchen head; excluded from shift scheduling.'
from public.roles where role_code='kitchen' and deleted_at is null
on conflict(company_id,role_code) do nothing;
insert into public.role_permissions(role_id,permission_id)
select chef.id,rp.permission_id from public.roles chef
join public.roles kitchen on kitchen.company_id=chef.company_id and kitchen.role_code='kitchen'
join public.role_permissions rp on rp.role_id=kitchen.id
where chef.role_code='chef' and chef.deleted_at is null and kitchen.deleted_at is null
on conflict(role_id,permission_id) do nothing;
create or replace function public.enforce_kitchen_inventory_branch_write_access()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.staffs s
    join public.branches b
      on b.id = new.branch_id
     and b.company_id = s.company_id
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.id = new.staff_id
      and s.status = 'active'
      and s.deleted_at is null
      and b.branch_type = 'central_kitchen'
      and b.status = 'active'
      and b.deleted_at is null
      and r.role_code in ('kitchen', 'kitchen_staff', 'chef')
      and r.status = 'active'
      and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ) then
    new.access_level := 'manage'::public.staff_access_level;
  end if;
  return new;
end $$;

revoke all on function public.enforce_kitchen_inventory_branch_write_access() from public, anon, authenticated;
create or replace function public.replace_staff_access_atomic_unlocked(
  p_staff_id uuid, p_role_id uuid, p_default_branch_id uuid,
  p_accessible_branch_ids uuid[] default '{}'::uuid[],
  p_status public.record_status default null, p_staff_code text default null,
  p_full_name text default null, p_email text default null, p_phone text default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor record; target record; selected_role record; actor_is_owner boolean;
  target_was_owner boolean; company_wide boolean; requested_branch_ids uuid[];
  eligible_branch_ids uuid[]; invalid_count integer; remaining_owner_count integer;
begin
  select s.id,s.company_id into actor from public.staffs s where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null for update;
  if actor.id is null or not public.has_permission('staffs.update') then raise exception 'Active staff with staffs.update permission required.' using errcode='42501'; end if;
  select s.id,s.company_id into target from public.staffs s where s.id=p_staff_id and s.company_id=actor.company_id and s.deleted_at is null for update;
  if target.id is null then raise exception 'Target staff was not found in your company.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('owner:'||actor.company_id::text,0));
  select r.id,r.role_code into selected_role from public.roles r where r.id=p_role_id and r.company_id=actor.company_id and r.status='active' and r.deleted_at is null;
  if selected_role.id is null then raise exception 'Selected role was not found in your company.' using errcode='42501'; end if;
  actor_is_owner:=public.current_staff_has_company_role(array['super_admin']);
  select exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id where sr.staff_id=p_staff_id and r.company_id=actor.company_id and r.role_code='super_admin' and r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date)) into target_was_owner;
  if (selected_role.role_code='super_admin' or target_was_owner) and not actor_is_owner then raise exception 'Only an Owner can assign or change an Owner role.' using errcode='42501'; end if;
  if target_was_owner and (selected_role.role_code<>'super_admin' or coalesce(p_status,'active'::public.record_status)<>'active'::public.record_status) then
    select count(distinct s.id) into remaining_owner_count from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id and r.company_id=s.company_id where s.company_id=actor.company_id and s.id<>p_staff_id and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date);
    if remaining_owner_count=0 then raise exception 'Cannot remove the last Owner in this company.' using errcode='23514'; end if;
  end if;
  company_wide:=selected_role.role_code=any(array['super_admin','finance','manager','purchasing']);
  requested_branch_ids:=array(select distinct x from unnest(coalesce(p_accessible_branch_ids,'{}'::uuid[])||array[p_default_branch_id]) x where x is not null);
  select count(*) into invalid_count from unnest(requested_branch_ids) requested(id) left join public.branches b on b.id=requested.id and b.company_id=actor.company_id and b.status='active' and b.deleted_at is null where b.id is null or (selected_role.role_code in ('kitchen','chef') and b.branch_type<>'central_kitchen') or (selected_role.role_code='outlet_staff' and b.branch_type<>'outlet');
  if invalid_count>0 then raise exception 'One or more branch IDs are not eligible in your company.' using errcode='42501'; end if;
  if company_wide then select array_agg(b.id order by b.id) into eligible_branch_ids from public.branches b where b.company_id=actor.company_id and b.status='active' and b.deleted_at is null; else eligible_branch_ids:=requested_branch_ids; end if;
  if p_default_branch_id is null or not(p_default_branch_id=any(coalesce(eligible_branch_ids,'{}'::uuid[]))) then raise exception 'Default branch is not eligible for the selected role.' using errcode='23514'; end if;
  delete from public.staff_branches where staff_id=p_staff_id;
  delete from public.staff_roles where staff_id=p_staff_id;
  insert into public.staff_roles(staff_id,role_id,branch_id,is_primary,effective_from,effective_to) values(p_staff_id,p_role_id,case when company_wide then null else p_default_branch_id end,true,current_date,null);
  insert into public.staff_branches(staff_id,branch_id,access_level,is_default) select p_staff_id,b.id,case when selected_role.role_code='super_admin' then 'full'::public.staff_access_level when company_wide then 'manage'::public.staff_access_level else 'read_only'::public.staff_access_level end,b.id=p_default_branch_id from public.branches b where b.id=any(eligible_branch_ids);
  update public.staffs set default_branch_id=p_default_branch_id,status=coalesce(p_status,status),staff_code=coalesce(p_staff_code,staff_code),full_name=coalesce(p_full_name,full_name),email=coalesce(p_email,email),phone=p_phone,invite_email=coalesce(p_email,invite_email),updated_at=now() where id=p_staff_id and company_id=actor.company_id;
  return jsonb_build_object('staff_id',p_staff_id,'role_code',selected_role.role_code,'branch_count',coalesce(cardinality(eligible_branch_ids),0));
end $$;
-- Kitchen heads receive the same approved production plan notification.
create or replace function public.planning_queue_release(p_plan uuid) returns void language plpgsql set search_path=public as $$
declare p public.production_plans%rowtype; begin
 select * into p from public.production_plans where id=p_plan;
 insert into public.notifications(company_id,recipient_role_id,branch_id,title,message,action_url,entity_type,entity_id,created_by)
 select p.company_id,r.id,p.kitchen_id,'Production plan approved',p.delivery_date||' · version '||p.version,
 '/production/planning?date='||p.delivery_date||'&kitchen='||p.kitchen_id,'production_plan',p.id,p.approved_by
 from public.roles r where r.company_id=p.company_id and r.role_code in ('kitchen','chef') and r.status='active' and r.deleted_at is null;
end $$;
notify pgrst, 'reload schema';
commit;
