-- Purchasing outlet follow-up access and roster identity metadata.

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.permission_code in (
  'outlet_daily_record.view','outlet_daily_record.view_all',
  'outlet_compliance.read','outlet_compliance.upload','outlet_compliance.document.read'
)
where r.role_code='purchasing' and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

delete from public.role_permissions rp using public.roles r,public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and r.role_code='purchasing'
and p.permission_code in (
  'outlet_compliance.review','outlet_compliance.manage','compliance.types.manage',
  'schedule.draft','schedule.submit','schedule.approve','schedule.swap_review',
  'attendance.adjust','attendance.lock','goods_receiving.close'
);

drop function if exists public.get_schedule_staff(uuid);

create function public.get_schedule_staff(p_branch_id uuid)
returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text)
language sql security definer set search_path=public stable as $$
  select distinct s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code
  from public.staffs s
  join public.staff_branches sb on sb.staff_id=s.id and sb.branch_id=p_branch_id
  join public.staff_roles sr on sr.staff_id=s.id and sr.is_primary=true and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date)
  join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
  where s.company_id=public.current_staff_company_id() and s.status='active' and s.deleted_at is null
    and r.role_code in ('outlet_staff','outlet_supervisor')
    and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read')
    and (s.id=public.current_staff_id() or public.has_any_permission(array['schedule.draft','schedule.submit','schedule.approve','schedule.swap_review']))
  order by s.full_name,s.id
$$;

revoke all on function public.get_schedule_staff(uuid) from public,anon;
grant execute on function public.get_schedule_staff(uuid) to authenticated;
notify pgrst,'reload schema';
