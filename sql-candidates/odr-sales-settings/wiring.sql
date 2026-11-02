-- Additive LOCAL candidate; depends on existing SQL382 and settings.sql. Neither is replaced.
begin;
alter table public.outlet_sales_channel_settings_versions add column id uuid not null default gen_random_uuid() unique;
-- Existing Owner-gated tenant backup reads this new dataset through its service client.
grant select on public.outlet_sales_channel_settings_versions to service_role;
alter table public.outlet_daily_records add column sales_channel_settings_revision bigint not null default 0 check(sales_channel_settings_revision>=0);
create function public.guard_outlet_sales_settings_snapshot() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare version bigint;
begin
 if tg_op='UPDATE' then
  if new.sales_channel_settings_revision<>old.sales_channel_settings_revision then raise exception 'Sales channel presentation snapshot is immutable.'; end if;
 else
  version:=coalesce(nullif(current_setting('seri_bako.odr_sales_settings_revision',true),'')::bigint,0);
  if version<>0 and not exists(select 1 from public.outlet_sales_channel_settings_versions v where v.company_id=new.company_id and v.revision=version) then raise exception 'Sales channel settings snapshot not found.'; end if;
  new.sales_channel_settings_revision:=version;
 end if;
 return new;
end $$;
create trigger guard_outlet_sales_settings_snapshot before insert or update on public.outlet_daily_records for each row execute function public.guard_outlet_sales_settings_snapshot();
revoke all on function public.guard_outlet_sales_settings_snapshot() from public,anon,authenticated;
create function public.get_outlet_sales_channel_settings_revision(p_revision bigint) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); result jsonb;
begin
 if company is null or not coalesce(public.has_permission('outlet_daily_record.view'),false) then raise exception 'Missing permission: outlet_daily_record.view'; end if;
 if p_revision=0 then return jsonb_build_object('revision',0,'channels',null); end if;
 select jsonb_build_object('revision',v.revision,'channels',v.channels) into result from public.outlet_sales_channel_settings_versions v where v.company_id=company and v.revision=p_revision;
 if result is null then raise exception 'Sales channel settings snapshot not found.'; end if;
 return result;
end $$;
create function public.save_outlet_daily_record_with_sales_channels(
 p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text,
 p_expected_revision bigint,p_include_sales boolean,p_pos_total_sales numeric,p_sales_breakdown jsonb,p_sales_variance_reason text,
 p_channel_settings_revision bigint
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); version bigint;
begin
 if company is null or public.current_staff_id() is null then raise exception 'Active staff access is required.'; end if;
 if p_record_id is null then
  perform pg_advisory_xact_lock(hashtextextended('odr-sales-channel-settings:'||company::text,0));
  select coalesce(max(v.revision),0) into version from public.outlet_sales_channel_settings_versions v where v.company_id=company;
 else
  select r.sales_channel_settings_revision into version from public.outlet_daily_records r where r.id=p_record_id and r.company_id=company and public.can_access_outlet_daily_branch(r.branch_id);
  if not found then raise exception 'Outlet daily record was not found or access is denied.'; end if;
 end if;
 if p_channel_settings_revision is null or version<>p_channel_settings_revision then raise exception 'ODR_CHANNEL_SETTINGS_CONFLICT: Sales channel names or availability changed. Your entries remain here; compare the latest settings before reloading.'; end if;
 perform set_config('seri_bako.odr_sales_settings_revision',version::text,true);
 -- SQL382 still owns record revision, permissions, quantities and all financial guards.
 return public.save_outlet_daily_record_checked(p_record_id,p_branch_id,p_record_date,p_notes,p_lines,p_target_status,p_expected_revision,p_include_sales,p_pos_total_sales,p_sales_breakdown,p_sales_variance_reason);
end $$;
revoke all on function public.get_outlet_sales_channel_settings_revision(bigint),public.save_outlet_daily_record_with_sales_channels(uuid,uuid,date,text,jsonb,text,bigint,boolean,numeric,jsonb,text,bigint) from public,anon;
grant execute on function public.get_outlet_sales_channel_settings_revision(bigint),public.save_outlet_daily_record_with_sales_channels(uuid,uuid,date,text,jsonb,text,bigint,boolean,numeric,jsonb,text,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
