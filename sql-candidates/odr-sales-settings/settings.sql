-- LOCAL CANDIDATE. Display preferences for existing monetary keys only.
-- No role grants, monetary data changes, new money channels or financial RPC replacement.
begin;
create table public.outlet_sales_channel_settings_versions (
 company_id uuid not null references public.companies(id),
 revision bigint not null check(revision>0),
 channels jsonb not null check(jsonb_typeof(channels)='array'),
 created_by uuid not null references public.staffs(id),
 created_at timestamptz not null default now(),
 primary key(company_id,revision)
);
alter table public.outlet_sales_channel_settings_versions enable row level security;
revoke all on public.outlet_sales_channel_settings_versions from public,anon,authenticated,service_role;
create function public.get_outlet_sales_channel_settings() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); result jsonb;
begin
 if company is null or not coalesce(public.has_permission('outlet_daily_record.view'),false) then raise exception 'Missing permission: outlet_daily_record.view'; end if;
 select jsonb_build_object('revision',v.revision,'channels',v.channels) into result
 from public.outlet_sales_channel_settings_versions v where v.company_id=company order by v.revision desc limit 1;
 return coalesce(result,jsonb_build_object('revision',0,'channels',null));
end $$;
create function public.configure_outlet_sales_channel_settings(p_expected_revision bigint,p_channels jsonb) returns bigint
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); version bigint; x jsonb; canonical jsonb:='[]';
 allowed text[]:=array['visa','master','debit','union_pay','alipay','jcb','feedme_card','duitnow','bank_transfer','feedme_wallet','grabfood','foodpanda','shopee_food','voucher','credit_card'];
begin
 if company is null or actor is null or not coalesce('super_admin'=any(public.current_staff_role_codes()),false) then raise exception 'Only an active Owner can change sales channel settings.'; end if;
 if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=9007199254740991 then raise exception 'Invalid settings revision.'; end if;
 if jsonb_typeof(p_channels) is distinct from 'array' or jsonb_array_length(p_channels)<>cardinality(allowed) then raise exception 'Every existing channel must appear exactly once.'; end if;
 for x in select value from jsonb_array_elements(p_channels) loop
  if jsonb_typeof(x) is distinct from 'object' or not coalesce(x->>'key'=any(allowed),false)
   or jsonb_typeof(x->'label') is distinct from 'string' or length(trim(x->>'label')) not between 1 and 80
   or jsonb_typeof(x->'active') is distinct from 'boolean' then raise exception 'Invalid channel display settings.'; end if;
  canonical:=canonical||jsonb_build_array(jsonb_build_object('key',x->>'key','label',trim(x->>'label'),'active',(x->>'active')::boolean));
 end loop;
 if (select count(distinct value->>'key') from jsonb_array_elements(canonical))<>cardinality(allowed) then raise exception 'Every existing channel must appear exactly once.'; end if;
 if exists(select 1 from jsonb_array_elements(canonical) where (value->>'active')::boolean group by lower(value->>'label') having count(*)>1) then raise exception 'Active channel names must be distinct.'; end if;
 -- Serialize settings writers for this company only. Revisions are immutable history.
 perform pg_advisory_xact_lock(hashtextextended('odr-sales-channel-settings:'||company::text,0));
 select coalesce(max(v.revision),0) into version from public.outlet_sales_channel_settings_versions v where v.company_id=company;
 if version<>p_expected_revision then raise exception 'ODR_SETTINGS_CONFLICT: Settings changed in another session.'; end if;
 insert into public.outlet_sales_channel_settings_versions(company_id,revision,channels,created_by) values(company,version+1,canonical,actor);
 return version+1;
end $$;
revoke all on function public.get_outlet_sales_channel_settings() from public,anon,service_role;
revoke all on function public.configure_outlet_sales_channel_settings(bigint,jsonb) from public,anon,service_role;
grant execute on function public.get_outlet_sales_channel_settings(),public.configure_outlet_sales_channel_settings(bigint,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
