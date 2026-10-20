begin;
alter table public.staffs add column if not exists username text;
alter table public.staffs add constraint staff_username_format check(username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
-- Global uniqueness is required because login has no tenant selector. Retain
-- usernames on deleted profiles so another account cannot reuse the identity.
create unique index if not exists staffs_username_unique on public.staffs(lower(username)) where username is not null;
create or replace function public.replace_staff_access_with_username(
 p_staff_id uuid,p_role_id uuid,p_default_branch_id uuid,
 p_accessible_branch_ids uuid[] default '{}',p_status public.record_status default null,
 p_staff_code text default null,p_full_name text default null,p_email text default null,p_phone text default null,p_username text default null
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 -- Existing atomic entrypoint owns tenant, actor, role and protected-owner checks.
 result:=public.replace_staff_access_atomic(p_staff_id,p_role_id,p_default_branch_id,p_accessible_branch_ids,p_status,p_staff_code,p_full_name,p_email,p_phone);
 if p_username is not null then
   update public.staffs set username=nullif(lower(trim(p_username)),'') where id=p_staff_id;
 end if;
 return result;
end $$;
revoke all on function public.replace_staff_access_with_username(uuid,uuid,uuid,uuid[],public.record_status,text,text,text,text,text) from public,anon;
grant execute on function public.replace_staff_access_with_username(uuid,uuid,uuid,uuid[],public.record_status,text,text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
