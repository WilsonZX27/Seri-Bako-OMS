-- P0 onboarding repair: exact-match, Owner-only, audited Staff/Auth linking.

-- Invited users may read only their own linked Staff row so the forced-password
-- route can recognize them. Permission resolution still requires active status,
-- so this does not grant an operational workspace or business-data access.
drop policy if exists "staffs scoped read" on public.staffs;
create policy "staffs scoped read" on public.staffs for select to authenticated
using (
  (auth_user_id = auth.uid() and status in ('active', 'invited') and deleted_at is null)
  or (company_id = public.current_staff_company_id() and public.has_permission('staffs.read'))
);

create or replace function public.repair_staff_auth_link(
  target_staff_id uuid,
  target_auth_user_id uuid,
  normalized_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.staffs%rowtype;
  target public.staffs%rowtype;
  matched_staff_count integer;
  matched_auth_count integer;
  normalized text := lower(trim(normalized_email));
  result text;
begin
  select s.* into actor
  from public.staffs s
  where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null;

  if actor.id is null or not public.current_staff_is_owner() then
    raise exception 'Only the Super Admin / Owner can repair a staff sign-in link.';
  end if;

  select s.* into target
  from public.staffs s
  where s.id = target_staff_id and s.company_id = actor.company_id
    and s.status in ('active', 'invited') and s.deleted_at is null
  for update;

  if target.id is null then
    raise exception 'The eligible staff profile was not found.';
  end if;
  if normalized = '' or lower(trim(coalesce(target.email, ''))) <> normalized
    or (target.invite_email is not null and lower(trim(target.invite_email)) <> normalized) then
    raise exception 'The staff profile email does not match exactly.';
  end if;

  select count(*) into matched_staff_count
  from public.staffs s
  where s.company_id = actor.company_id and s.status in ('active', 'invited') and s.deleted_at is null
    and (lower(trim(coalesce(s.email, ''))) = normalized or lower(trim(coalesce(s.invite_email, ''))) = normalized);
  if matched_staff_count <> 1 then
    raise exception 'The staff email match is ambiguous.';
  end if;

  select count(*) into matched_auth_count
  from auth.users u
  where lower(trim(coalesce(u.email, ''))) = normalized;
  if matched_auth_count <> 1 or not exists (
    select 1 from auth.users u where u.id = target_auth_user_id and lower(trim(coalesce(u.email, ''))) = normalized
  ) then
    raise exception 'The Auth account email match is missing or ambiguous.';
  end if;

  if exists (
    select 1 from public.staffs s
    where s.auth_user_id = target_auth_user_id and s.id <> target.id and s.deleted_at is null
  ) then
    raise exception 'The Auth account is already linked to another staff profile.';
  end if;
  result := case
    when target.must_change_password or target.status = 'invited' or target.invitation_status in ('invited', 'pending', 'password_required') then 'setup_pending'
    else 'auth_linked'
  end;
  if target.auth_user_id = target_auth_user_id then return result; end if;

  update public.staffs set auth_user_id = target_auth_user_id where id = target.id;
  insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (
    actor.company_id, 'staff', target.id, 'auth_link_repaired', 'Owner repaired staff sign-in link',
    jsonb_build_object('outcome', result), actor.id
  );
  return result;
end;
$$;

revoke all on function public.repair_staff_auth_link(uuid, uuid, text) from public, anon;
grant execute on function public.repair_staff_auth_link(uuid, uuid, text) to authenticated;

-- The Manager PR workspace renders the shared document comment panel, so its
-- submit permission must match the operational surface the role can access.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'documents.comment'
where r.role_code = 'manager'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

-- Resolve a page's permission set in one request. The prior per-permission
-- Promise fan-out could overwhelm a small PostgREST pool during authenticated
-- layout and page rendering.
create or replace function public.get_allowed_permissions(permission_codes text[])
returns setof text
language sql
stable
security invoker
set search_path = ''
as $$
  select requested.permission_code
  from unnest(permission_codes) as requested(permission_code)
  where public.has_permission(requested.permission_code)
$$;

revoke all on function public.get_allowed_permissions(text[]) from public, anon;
grant execute on function public.get_allowed_permissions(text[]) to authenticated;
