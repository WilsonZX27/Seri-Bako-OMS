-- One checklist per outlet/business date; retries retain the original submission.
-- Registered quantities are deliberately never updated by this operation.
create or replace function public.submit_asset_check(p_location uuid,p_date date,p_submission uuid,p_lines jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); line jsonb; holding public.asset_holdings; observed integer; existing public.asset_daily_checks; key text;
begin
 if not public.has_permission('assets.check') or not public.asset_location_access(p_location) then raise exception 'Asset checklist permission denied'; end if;
 if p_date is null or p_date>(now() at time zone 'Asia/Kuala_Lumpur')::date or p_submission is null or p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 5000 then raise exception 'Invalid checklist date or lines'; end if;
 -- Serialize every submission for this tenant/location, including concurrent requests.
 perform 1 from public.asset_locations where id=p_location and company_id=company for update;
 if not found then raise exception 'Asset location unavailable'; end if;
 if exists(select 1 from public.asset_daily_checks where company_id=company and location_id=p_location and check_date=p_date
   and source_data->>'Count Confirmation' is distinct from 'true' and submission_id is distinct from p_submission::text) then
   raise exception 'This outlet already submitted its checklist for this date';
 end if;
 -- An exact retry remains safe, but a reused key cannot append or remove lines.
 if exists(select 1 from public.asset_daily_checks where company_id=company and submission_id=p_submission::text)
   and ((select count(*) from public.asset_daily_checks where company_id=company and submission_id=p_submission::text)<>jsonb_array_length(p_lines) or exists(select 1 from public.asset_daily_checks c where c.company_id=company and c.submission_id=p_submission::text and not exists(select 1 from jsonb_array_elements(p_lines) e where (e->>'asset_id')::uuid=c.asset_id))) then
   raise exception 'Checklist key was reused with different lines';
 end if;
 if (select count(distinct e->>'asset_id') from jsonb_array_elements(p_lines) e)<>jsonb_array_length(p_lines) then raise exception 'Duplicate checklist asset'; end if;
 for line in select value from jsonb_array_elements(p_lines) order by value->>'asset_id' loop
  select * into holding from public.asset_holdings where company_id=company and asset_id=(line->>'asset_id')::uuid and location_id=p_location for update;
  if not found or coalesce(line->>'result','') not in ('Checked','Damaged','Missing','Needs Maintenance','Other') then raise exception 'Invalid checklist asset or result'; end if;
  observed:=(line->>'quantity')::integer;
  if observed<0 or (line->>'result'<>'Checked' and length(trim(coalesce(line->>'remark','')))=0) then raise exception 'Enter a valid quantity and explain exceptions'; end if;
  if line->>'result'='Checked' and observed is not null and holding.quantity is not null and observed<>holding.quantity then raise exception 'Count differs from registered quantity; record an exception'; end if;
  key:='OMS-'||p_submission||':'||holding.asset_id;
  select * into existing from public.asset_daily_checks where company_id=company and source_key=key;
  if found then
   if existing.location_id<>p_location or existing.check_date<>p_date or existing.result<>line->>'result' or existing.quantity is distinct from observed or existing.source_data->>'remark' is distinct from line->>'remark' then raise exception 'Checklist key was reused with different values'; end if;
   continue;
  end if;
  insert into public.asset_daily_checks(company_id,asset_id,location_id,source_key,submission_id,check_date,result,quantity,author_name,source_data) values(company,holding.asset_id,p_location,key,p_submission::text,p_date,line->>'result',observed,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),line||jsonb_build_object('Actor ID',actor));
  update public.asset_holdings set latest_check_date=p_date,latest_check_result=line->>'result',latest_check_remark=line->>'remark',condition=case line->>'result' when 'Checked' then 'Good' when 'Other' then 'Review Required' else line->>'result' end,updated_at=now() where asset_id=holding.asset_id and location_id=p_location and (latest_check_date is null or latest_check_date<=p_date);
 end loop;
 return p_submission;
end $$;
