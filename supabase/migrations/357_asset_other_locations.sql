begin;
-- Non-operating destinations (e.g. Hostel) are asset locations, not fake outlets.
-- Existing owner-only access for non-branch locations is retained.
alter table public.asset_locations drop constraint asset_locations_kind_check;
alter table public.asset_locations drop constraint asset_locations_check;
alter table public.asset_locations add constraint asset_locations_kind_check check(kind in ('branch','event','other'));
alter table public.asset_locations add constraint asset_locations_check check((kind='branch' and branch_id is not null) or (kind in ('event','other') and branch_id is null));
create function public.register_asset_other_location(p_name text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); result uuid; label text:=trim(p_name);
begin
 if not public.current_staff_has_company_role(array['super_admin']) or not public.has_permission('assets.manage') or not public.asset_company_live(company) then raise exception 'Only an asset owner may register another location'; end if;
 if label is null or length(label) not between 2 and 120 then raise exception 'Enter a location name between 2 and 120 characters'; end if;
 perform pg_advisory_xact_lock(hashtextextended(company::text||':asset-location:'||lower(label),0));
 select id into result from public.asset_locations where company_id=company and lower(source_name)=lower(label);
 if result is not null then
  if not exists(select 1 from public.asset_locations where id=result and kind='other') then raise exception 'This name is already registered as an outlet or event'; end if;
  return result;
 end if;
 insert into public.asset_locations(company_id,source_name,kind) values(company,label,'other') returning id into result;
 return result;
end $$;
revoke all on function public.register_asset_other_location(text) from public,anon;
grant execute on function public.register_asset_other_location(text) to authenticated;
commit;
