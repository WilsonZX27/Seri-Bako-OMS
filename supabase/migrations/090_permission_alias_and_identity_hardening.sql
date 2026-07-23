-- Sprint 7.23.9.0 — evaluate permission aliases independently and accept one valid identity alias.
create or replace function public.has_any_permission(permission_codes text[])
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $$
  with actor as (
    select s.id from public.staffs s where s.auth_user_id = auth.uid() and s.status='active' and s.deleted_at is null limit 1
  ), active_roles as (
    select r.id, r.role_code from actor a join public.staff_roles sr on sr.staff_id=a.id join public.roles r on r.id=sr.role_id and r.status='active' and r.deleted_at is null
    where (sr.effective_from is null or sr.effective_from <= current_date) and (sr.effective_to is null or sr.effective_to >= current_date)
  ), requested as (select unnest(permission_codes) as code)
  select case when exists(select 1 from active_roles where role_code='super_admin') then true else exists (
    select 1 from requested q
    where not exists (select 1 from actor a join public.staff_permission_overrides o on o.staff_id=a.id join public.permissions p on p.id=o.permission_id where p.permission_code=q.code and o.effect='deny')
      and (exists (select 1 from actor a join public.staff_permission_overrides o on o.staff_id=a.id join public.permissions p on p.id=o.permission_id where p.permission_code=q.code and o.effect='allow')
           or exists (select 1 from active_roles ar join public.role_permissions rp on rp.role_id=ar.id join public.permissions p on p.id=rp.permission_id where p.permission_code=q.code))
  ) end
$$;
revoke all on function public.has_any_permission(text[]) from public;
grant execute on function public.has_any_permission(text[]) to authenticated;
