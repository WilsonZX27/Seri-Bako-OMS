-- Allow Managers to own a roster end-to-end and ingest NGTeco Timecard Report
-- exports as auditable first/last punch evidence.

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.permission_code in ('schedule.draft','schedule.submit')
where r.role_code='manager' and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

alter table public.attendance_import_batches drop constraint if exists attendance_import_batches_parser_profile_check;
alter table public.attendance_import_batches add constraint attendance_import_batches_parser_profile_check
check(parser_profile in ('view_attendance_punch','attendance_report','timecard_report'));

create or replace function public.decide_schedule_week(p_week_id uuid,p_decision text,p_comment text default null) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare w public.schedule_weeks; actor uuid:=public.current_staff_id(); target text; manager_self_publish boolean:=false;
begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
 if w.id is null or not public.has_permission('schedule.approve') or not public.can_access_company_branch(w.company_id,w.branch_id) then raise exception 'Schedule decision is not authorised.'; end if;
 select exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id where sr.staff_id=actor and sr.is_primary and r.role_code in ('manager','super_admin') and r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date)) into manager_self_publish;
 if w.submitted_by=actor and not (p_decision='approve' and manager_self_publish) then raise exception 'A roster submitter cannot make this decision.'; end if;
 if w.status<>'submitted' then raise exception 'Only a submitted roster may be decided.'; end if;
 target:=case p_decision when 'approve' then 'published' when 'return' then 'returned' when 'reject' then 'rejected' else null end;
 if target is null or (target<>'published' and coalesce(length(trim(p_comment)),0)=0) then raise exception 'A valid decision and comment are required.'; end if;
 update public.schedule_weeks set status=target,published_by=case when target='published' then actor else published_by end,published_at=case when target='published' then now() else published_at end,updated_at=now() where id=w.id returning * into w;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment) values(w.company_id,w.id,p_decision,'submitted',target,actor,p_comment);
 return w;
end $$;

create or replace function public.finalise_timecard_attendance_import(p_week_start date,p_file_name text,p_file_hash text,p_rows jsonb) returns public.attendance_import_batches
language plpgsql security definer set search_path=public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); batch public.attendance_import_batches; row jsonb; event_id uuid; fingerprint text; local_ts timestamp; source_row integer:=2; was_existing boolean; event_count integer:=0; value_time text; value_kind text;
begin
 if not public.has_permission('attendance.import') then raise exception 'Attendance import is not authorised.'; end if;
 if extract(isodow from p_week_start)<>1 then raise exception 'Attendance week must start on Monday.'; end if;
 if coalesce(length(p_file_name),0)=0 or coalesce(length(p_file_hash),0)<>64 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>10000 then raise exception 'Invalid attendance import payload.'; end if;
 insert into public.attendance_import_batches(company_id,parser_profile,week_start,file_name,file_hash,status,uploader_staff_id,row_count,source_metadata)
 values(company,'timecard_report',p_week_start,left(p_file_name,255),p_file_hash,'validated',actor,jsonb_array_length(p_rows),jsonb_build_object('timezone','Asia/Kuala_Lumpur','source','NGTeco Timecard Report','punch_semantics','daily first and last')) returning * into batch;
 for row in select value from jsonb_array_elements(p_rows) loop
   source_row:=source_row+1;
   if coalesce(row->>'Person ID','')='' or coalesce(row->>'Date','')!~'^\d{2}/\d{2}/\d{4}$' then raise exception 'Invalid Timecard identity or date at row %.',source_row; end if;
   local_ts:=to_timestamp((row->>'Date')||' 00:00:00','MM/DD/YYYY HH24:MI:SS')::timestamp;
   if to_char(local_ts,'MM/DD/YYYY')<>(row->>'Date') or local_ts::date not between p_week_start and p_week_start+6 then raise exception 'Timecard row % is outside the selected week.',source_row; end if;
   foreach value_kind in array array['clock_in','clock_out'] loop
     value_time:=case value_kind when 'clock_in' then coalesce(row->>'Clock In','') else coalesce(row->>'Clock Out','') end;
     if value_time<>'' then
       if value_time!~'^\d{2}:\d{2}:\d{2}$' then raise exception 'Invalid Timecard time at row %.',source_row; end if;
       local_ts:=to_timestamp((row->>'Date')||' '||value_time,'MM/DD/YYYY HH24:MI:SS')::timestamp;
       if to_char(local_ts,'MM/DD/YYYY HH24:MI:SS')<>(row->>'Date')||' '||value_time then raise exception 'Invalid Timecard time at row %.',source_row; end if;
       fingerprint:=encode(extensions.digest(company::text||'|'||(row->>'Person ID')||'|'||local_ts::text||'|NGTECO_TIMECARD_REPORT|'||value_kind,'sha256'),'hex');
       select exists(select 1 from public.attendance_raw_punch_events where company_id=company and event_fingerprint=fingerprint) into was_existing;
       insert into public.attendance_raw_punch_events(company_id,person_id,person_name,occurred_at,local_timestamp,timezone_offset,verify_type,source_code,punch_type,event_fingerprint,raw_row)
       values(company,row->>'Person ID',nullif(row->>'Person Name',''),local_ts at time zone 'Asia/Kuala_Lumpur',local_ts,'+08:00','Timecard Report','NGTECO_TIMECARD_REPORT',case value_kind when 'clock_in' then 'in' else 'out' end,fingerprint,row||jsonb_build_object('_event_kind',value_kind))
       on conflict(company_id,event_fingerprint) do nothing;
       select id into event_id from public.attendance_raw_punch_events where company_id=company and event_fingerprint=fingerprint;
       insert into public.attendance_import_batch_events(batch_id,event_id,source_row_number,disposition) values(batch.id,event_id,source_row,case when was_existing then 'duplicate' else 'inserted' end) on conflict do nothing;
       event_count:=event_count+1;
     end if;
   end loop;
 end loop;
 if event_count=0 then raise exception 'Timecard Report contains no Clock In or Clock Out values.'; end if;
 update public.attendance_import_batches set parser_profile='view_attendance_punch' where id=batch.id;
 perform public.recalculate_attendance_week(batch.id);
 update public.daily_attendance_results set statuses=array_remove(statuses,'wrong_branch_device'),calculation=calculation||jsonb_build_object('source_profile','timecard_report') where import_batch_id=batch.id and is_current;
 delete from public.attendance_exceptions where batch_id=batch.id and exception_code='wrong_branch_device';
 insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity,details)
 select company,result.id,batch.id,case when coalesce(source_row->>'Clock In','')='' then 'missing_check_in' else 'missing_check_out' end,'blocker',jsonb_build_object('source_row',ordinality+2)
 from jsonb_array_elements(p_rows) with ordinality source(source_row,ordinality)
 join public.ngteco_person_mappings mapping on mapping.company_id=company and mapping.person_id=source_row->>'Person ID' and mapping.is_active
 join public.daily_attendance_results result on result.import_batch_id=batch.id and result.staff_id=mapping.staff_id and result.work_date=to_timestamp(source_row->>'Date','MM/DD/YYYY')::date and result.is_current
 where (coalesce(source_row->>'Clock In','')='')<>(coalesce(source_row->>'Clock Out','')='');
 update public.daily_attendance_results result set statuses=result.statuses||missing.codes
 from (select result_id,array_agg(exception_code order by exception_code) codes from public.attendance_exceptions where batch_id=batch.id and exception_code in ('missing_check_in','missing_check_out') group by result_id) missing
 where result.id=missing.result_id;
 update public.attendance_import_batches set parser_profile='timecard_report',status='finalised',finalised_at=now(),source_metadata=source_metadata||jsonb_build_object('event_count',event_count) where id=batch.id returning * into batch;
 return batch;
end $$;

create or replace function public.upsert_ngteco_device_mapping(p_source_code text,p_branch_id uuid,p_active boolean default true) returns public.ngteco_device_mappings
language plpgsql security definer set search_path=public as $$ declare result public.ngteco_device_mappings; company uuid:=public.current_staff_company_id(); begin
 if not public.has_permission('attendance.map') or nullif(trim(p_source_code),'') is null or not exists(select 1 from public.branches b where b.id=p_branch_id and b.company_id=company and b.branch_type in ('outlet','central_kitchen') and b.status='active' and b.deleted_at is null) then raise exception 'Device mapping is not authorised.'; end if;
 insert into public.ngteco_device_mappings(company_id,source_code,branch_id,is_active,created_by) values(company,trim(p_source_code),p_branch_id,p_active,public.current_staff_id()) on conflict(company_id,source_code) do update set branch_id=excluded.branch_id,is_active=excluded.is_active returning * into result; return result; end $$;

revoke all on function public.finalise_timecard_attendance_import(date,text,text,jsonb) from public,anon;
grant execute on function public.finalise_timecard_attendance_import(date,text,text,jsonb) to authenticated;
notify pgrst,'reload schema';
