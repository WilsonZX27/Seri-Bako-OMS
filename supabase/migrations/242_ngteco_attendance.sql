-- NGTeco event import, OMS-authoritative calculation, reconciliation, review and locks.
insert into public.permissions(permission_code,module,action,description) values
 ('attendance.read','attendance','read','View attendance results'),('attendance.import','attendance','import','Import NGTeco exports'),
 ('attendance.map','attendance','manage','Maintain NGTeco mappings'),('attendance.review','attendance','review','Review attendance exceptions'),
 ('attendance.adjust','attendance','adjust','Adjust attendance with history'),('attendance.export','attendance','export','Export attendance reports'),
 ('attendance.lock','attendance','lock','Lock an attendance period'),('attendance.reconcile','attendance','read','Compare NGTeco report totals')
on conflict(permission_code) do update set module=excluded.module,action=excluded.action,description=excluded.description;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on
 r.role_code='super_admin' or
 (r.role_code='people_operations' and p.permission_code in ('attendance.read','attendance.import','attendance.map','attendance.review','attendance.adjust','attendance.export','attendance.lock','attendance.reconcile')) or
 (r.role_code='manager' and p.permission_code in ('attendance.read','attendance.export','attendance.reconcile')) or
 (r.role_code='outlet_supervisor' and p.permission_code in ('attendance.read','attendance.review')) or
 (r.role_code='outlet_staff' and p.permission_code='attendance.read')
where p.module='attendance' on conflict do nothing;

create table public.ngteco_person_mappings(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),person_id text not null,staff_id uuid not null references public.staffs(id),is_active boolean not null default true,created_by uuid not null references public.staffs(id),created_at timestamptz not null default now(),unique(company_id,person_id));
create table public.ngteco_device_mappings(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),source_code text not null,branch_id uuid not null references public.branches(id),is_active boolean not null default true,created_by uuid not null references public.staffs(id),created_at timestamptz not null default now(),unique(company_id,source_code));
create table public.attendance_import_batches(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),parser_profile text not null check(parser_profile in ('view_attendance_punch','attendance_report')),week_start date not null check(extract(isodow from week_start)=1),file_name text not null,file_hash text not null,status text not null check(status in ('previewed','validated','finalised','rolled_back')),uploader_staff_id uuid not null references public.staffs(id),row_count integer not null default 0,error_count integer not null default 0,warning_count integer not null default 0,source_metadata jsonb not null default '{}',created_at timestamptz not null default now(),finalised_at timestamptz);
create index attendance_import_batches_hash_idx on public.attendance_import_batches(company_id,parser_profile,file_hash,created_at desc);
create table public.attendance_raw_punch_events(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),person_id text not null,person_name text,occurred_at timestamptz not null,local_timestamp timestamp not null,timezone_offset text not null,verify_type text,source_code text not null,punch_type text,event_fingerprint text not null,raw_row jsonb not null,created_at timestamptz not null default now(),unique(company_id,event_fingerprint));
create table public.attendance_import_batch_events(batch_id uuid not null references public.attendance_import_batches(id),event_id uuid not null references public.attendance_raw_punch_events(id),source_row_number integer not null,disposition text not null check(disposition in ('inserted','duplicate')),primary key(batch_id,event_id,source_row_number));
create table public.attendance_reconciliation_rows(id uuid primary key default gen_random_uuid(),batch_id uuid not null references public.attendance_import_batches(id),company_id uuid not null references public.companies(id),person_id text not null,person_name text,period_label text not null,ngteco_late_seconds integer,ngteco_early_seconds integer,ngteco_break_seconds integer,ngteco_work_seconds integer,ngteco_overtime_seconds integer,ngteco_total_seconds integer,raw_row jsonb not null,created_at timestamptz not null default now());
create table public.daily_attendance_results(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),staff_id uuid not null references public.staffs(id),branch_id uuid references public.branches(id),work_date date not null,assignment_id uuid references public.shift_assignment_revisions(id),import_batch_id uuid references public.attendance_import_batches(id),calculation_revision integer not null default 1,scheduled_start timestamptz,scheduled_end timestamptz,actual_first_in timestamptz,actual_last_out timestamptz,raw_work_seconds integer not null default 0,recognised_paid_seconds integer not null default 0,break_seconds integer not null default 0,late_seconds integer not null default 0,early_leave_seconds integer not null default 0,pre_shift_seconds integer not null default 0,post_shift_seconds integer not null default 0,statuses text[] not null default '{}',review_status text not null default 'pending' check(review_status in ('pending','reviewed','adjusted','locked')),is_current boolean not null default true,calculation jsonb not null default '{}',created_at timestamptz not null default now(),unique(company_id,staff_id,work_date,calculation_revision));
create unique index daily_attendance_one_current on public.daily_attendance_results(company_id,staff_id,work_date) where is_current;
create table public.attendance_exceptions(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),result_id uuid references public.daily_attendance_results(id),batch_id uuid references public.attendance_import_batches(id),exception_code text not null,severity text not null check(severity in ('warning','blocker')),details jsonb not null default '{}',resolved_at timestamptz,resolved_by uuid references public.staffs(id),resolution_note text,created_at timestamptz not null default now());
create table public.attendance_adjustments(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),result_id uuid not null references public.daily_attendance_results(id),actor_staff_id uuid not null references public.staffs(id),reason text not null check(length(trim(reason))>0),before_state jsonb not null,after_state jsonb not null,created_at timestamptz not null default now());
create table public.attendance_period_locks(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),branch_id uuid references public.branches(id),week_start date not null check(extract(isodow from week_start)=1),locked_by uuid not null references public.staffs(id),locked_at timestamptz not null default now(),unlocked_by uuid references public.staffs(id),unlocked_at timestamptz,unlock_reason text,unique(company_id,branch_id,week_start));

do $$ declare t text; begin foreach t in array array['ngteco_person_mappings','ngteco_device_mappings','attendance_import_batches','attendance_raw_punch_events','attendance_import_batch_events','attendance_reconciliation_rows','daily_attendance_results','attendance_exceptions','attendance_adjustments','attendance_period_locks'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy "person mappings people read" on public.ngteco_person_mappings for select to authenticated using(company_id=public.current_staff_company_id() and public.has_any_permission(array['attendance.map','attendance.import']));
create policy "person mappings people manage" on public.ngteco_person_mappings for all to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.map')) with check(company_id=public.current_staff_company_id() and public.has_permission('attendance.map'));
create policy "device mappings people read" on public.ngteco_device_mappings for select to authenticated using(company_id=public.current_staff_company_id() and public.has_any_permission(array['attendance.map','attendance.import']));
create policy "device mappings people manage" on public.ngteco_device_mappings for all to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.map')) with check(company_id=public.current_staff_company_id() and public.has_permission('attendance.map') and public.can_access_company_branch(company_id,branch_id));
create policy "attendance batches authorised read" on public.attendance_import_batches for select to authenticated using(company_id=public.current_staff_company_id() and public.has_any_permission(array['attendance.import','attendance.review','attendance.reconcile']));
create policy "raw punches import read" on public.attendance_raw_punch_events for select to authenticated using(company_id=public.current_staff_company_id() and public.has_any_permission(array['attendance.import','attendance.review']));
create policy "batch events import read" on public.attendance_import_batch_events for select to authenticated using(exists(select 1 from public.attendance_import_batches b where b.id=batch_id and b.company_id=public.current_staff_company_id() and public.has_any_permission(array['attendance.import','attendance.review'])));
create policy "reconciliation authorised read" on public.attendance_reconciliation_rows for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.reconcile'));
create policy "attendance result scoped read" on public.daily_attendance_results for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.read') and (staff_id=public.current_staff_id() or (public.has_any_permission(array['attendance.review','attendance.adjust','attendance.export','attendance.reconcile']) and branch_id is not null and public.can_access_company_branch(company_id,branch_id))));
create policy "attendance exceptions scoped read" on public.attendance_exceptions for select to authenticated using(company_id=public.current_staff_company_id() and exists(select 1 from public.daily_attendance_results r where r.id=result_id and (r.staff_id=public.current_staff_id() or (public.has_any_permission(array['attendance.review','attendance.adjust']) and r.branch_id is not null and public.can_access_company_branch(r.company_id,r.branch_id)))));
create policy "attendance adjustments scoped read" on public.attendance_adjustments for select to authenticated using(company_id=public.current_staff_company_id() and exists(select 1 from public.daily_attendance_results r where r.id=result_id and (r.staff_id=public.current_staff_id() or (public.has_permission('attendance.adjust') and r.branch_id is not null and public.can_access_company_branch(r.company_id,r.branch_id)))));
create policy "attendance locks scoped read" on public.attendance_period_locks for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.read') and (branch_id is null or public.can_access_company_branch(company_id,branch_id)));

create or replace function public.lock_attendance_period(p_week_start date,p_branch_id uuid default null) returns public.attendance_period_locks language plpgsql security definer set search_path=public as $$ declare l public.attendance_period_locks; begin
 if not public.has_permission('attendance.lock') or extract(isodow from p_week_start)<>1 or (p_branch_id is not null and not public.can_access_company_branch(public.current_staff_company_id(),p_branch_id)) then raise exception 'Attendance lock is not authorised.'; end if;
 insert into public.attendance_period_locks(company_id,branch_id,week_start,locked_by) values(public.current_staff_company_id(),p_branch_id,p_week_start,public.current_staff_id()) on conflict(company_id,branch_id,week_start) do update set locked_by=excluded.locked_by,locked_at=now(),unlocked_by=null,unlocked_at=null,unlock_reason=null returning * into l;
 update public.daily_attendance_results set review_status='locked' where company_id=l.company_id and work_date between p_week_start and p_week_start+6 and (p_branch_id is null or branch_id=p_branch_id) and is_current;
 return l; end $$;
create or replace function public.unlock_attendance_period(p_lock_id uuid,p_reason text) returns public.attendance_period_locks language plpgsql security definer set search_path=public as $$ declare l public.attendance_period_locks; begin
 if not public.has_permission('schedule.unlock') or coalesce(length(trim(p_reason)),0)=0 then raise exception 'Owner unlock permission and reason are required.'; end if;
 update public.attendance_period_locks set unlocked_by=public.current_staff_id(),unlocked_at=now(),unlock_reason=p_reason where id=p_lock_id and company_id=public.current_staff_company_id() and unlocked_at is null returning * into l;
 if l.id is null then raise exception 'Active attendance lock not found.'; end if; return l; end $$;
create or replace function public.finalise_attendance_import(p_parser_profile text,p_week_start date,p_file_name text,p_file_hash text,p_rows jsonb) returns public.attendance_import_batches
language plpgsql security definer set search_path=public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); batch public.attendance_import_batches; row jsonb; event_id uuid; fingerprint text; local_ts timestamp; offset_value text; source_row integer:=2; was_existing boolean;
begin
 if not public.has_permission('attendance.import') then raise exception 'Attendance import is not authorised.'; end if;
 if p_parser_profile not in ('view_attendance_punch','attendance_report') or extract(isodow from p_week_start)<>1 then raise exception 'Invalid attendance import profile or week.'; end if;
 if coalesce(length(p_file_name),0)=0 or coalesce(length(p_file_hash),0)<>64 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>10000 then raise exception 'Invalid attendance import payload.'; end if;
 insert into public.attendance_import_batches(company_id,parser_profile,week_start,file_name,file_hash,status,uploader_staff_id,row_count,source_metadata)
 values(company,p_parser_profile,p_week_start,left(p_file_name,255),p_file_hash,'validated',actor,jsonb_array_length(p_rows),jsonb_build_object('timezone','Asia/Kuala_Lumpur')) returning * into batch;
 for row in select value from jsonb_array_elements(p_rows) loop
   source_row:=source_row+1;
   if p_parser_profile='view_attendance_punch' then
     offset_value:=row->>'TimeZone';
     if coalesce(row->>'Punch Date','')!~'^\d{2}/\d{2}/\d{4}$' or coalesce(row->>'Attendance record','')!~'^\d{2}:\d{2}:\d{2}$' then raise exception 'Invalid punch date/time at row %.',source_row; end if;
     local_ts:=to_timestamp((row->>'Punch Date')||' '||(row->>'Attendance record'),'MM/DD/YYYY HH24:MI:SS')::timestamp;
     if to_char(local_ts,'MM/DD/YYYY HH24:MI:SS')<>(row->>'Punch Date')||' '||(row->>'Attendance record') or local_ts::date not between p_week_start and p_week_start+6 then raise exception 'Punch row % is outside the selected week.',source_row; end if;
     if offset_value<>'+08:00' or coalesce(row->>'Person ID','')='' or coalesce(row->>'Source','')='' then raise exception 'Invalid punch row %.',source_row; end if;
     fingerprint:=encode(extensions.digest(company::text||'|'||(row->>'Person ID')||'|'||local_ts::text||'|'||(row->>'Source')||'|'||coalesce(row->>'Punch Type',''),'sha256'),'hex');
     select exists(select 1 from public.attendance_raw_punch_events where company_id=company and event_fingerprint=fingerprint) into was_existing;
     insert into public.attendance_raw_punch_events(company_id,person_id,person_name,occurred_at,local_timestamp,timezone_offset,verify_type,source_code,punch_type,event_fingerprint,raw_row)
     values(company,row->>'Person ID',nullif(row->>'Person Name',''),local_ts at time zone 'Asia/Kuala_Lumpur',local_ts,offset_value,nullif(row->>'Verify Type',''),row->>'Source',nullif(row->>'Punch Type',''),fingerprint,row)
     on conflict(company_id,event_fingerprint) do nothing;
     select id into event_id from public.attendance_raw_punch_events where company_id=company and event_fingerprint=fingerprint;
     insert into public.attendance_import_batch_events(batch_id,event_id,source_row_number,disposition) values(batch.id,event_id,source_row,case when was_existing then 'duplicate' else 'inserted' end) on conflict do nothing;
   else
     if coalesce(row->>'Person ID','')='' or coalesce(row->>'Date','')!~'^\d{2}\.\d{2}-\d{2}\.\d{2}$' then raise exception 'Invalid reconciliation row %.',source_row; end if;
     if exists(select 1 from jsonb_array_elements_text(jsonb_build_array(row->>'Total Late Time',row->>'Total Early Departure Time',row->>'Total Break Time',row->>'Total Work Hours(h)',row->>'Total Overtime Hours(h)',row->>'Total Hours(h)')) value where value<>'' and value!~'^\d+:\d{2}:\d{2}$') then raise exception 'Invalid reconciliation duration at row %.',source_row; end if;
     insert into public.attendance_reconciliation_rows(batch_id,company_id,person_id,person_name,period_label,ngteco_late_seconds,ngteco_early_seconds,ngteco_break_seconds,ngteco_work_seconds,ngteco_overtime_seconds,ngteco_total_seconds,raw_row)
     values(batch.id,company,row->>'Person ID',nullif(row->>'Person Name',''),row->>'Date',extract(epoch from nullif(row->>'Total Late Time','')::interval)::integer,extract(epoch from nullif(row->>'Total Early Departure Time','')::interval)::integer,extract(epoch from nullif(row->>'Total Break Time','')::interval)::integer,extract(epoch from nullif(row->>'Total Work Hours(h)','')::interval)::integer,extract(epoch from nullif(row->>'Total Overtime Hours(h)','')::interval)::integer,extract(epoch from nullif(row->>'Total Hours(h)','')::interval)::integer,row);
   end if;
 end loop;
 update public.attendance_import_batches set status='finalised',finalised_at=now() where id=batch.id returning * into batch;
 if p_parser_profile='view_attendance_punch' then execute 'select public.recalculate_attendance_week($1)' using batch.id; end if;
 return batch;
end $$;

create or replace function public.recalculate_attendance_week(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare
  batch public.attendance_import_batches; a record; points timestamptz[]; sources text[]; punch_types text[]; point_count integer;
  idx integer; raw_seconds integer; recognised integer; breaks integer; first_in timestamptz; last_out timestamptz;
  shift_start timestamptz; shift_end timestamptz; window_start timestamptz; window_end timestamptz;
  interval_start timestamptz; interval_end timestamptz; cap_seconds integer; revision_no integer; prior_id uuid; result_id uuid;
  exceptions text[]; expected_sources text[]; calculated integer:=0;
begin
  select * into batch from public.attendance_import_batches where id=p_batch_id and company_id=public.current_staff_company_id();
  if batch.id is null or batch.parser_profile<>'view_attendance_punch' or not public.has_any_permission(array['attendance.import','attendance.adjust']) then raise exception 'Attendance calculation is not authorised.'; end if;
  for a in
    select ar.*,coalesce((ar.template_snapshot->>'planned_start')::time,t.planned_start) planned_start,coalesce((ar.template_snapshot->>'planned_end')::time,t.planned_end) planned_end,coalesce((ar.template_snapshot->>'crosses_midnight')::boolean,t.crosses_midnight) crosses_midnight,coalesce((ar.template_snapshot->>'planned_break_seconds')::integer,t.planned_break_seconds) planned_break_seconds,coalesce((ar.template_snapshot->>'maximum_recognised_seconds')::integer,t.maximum_recognised_seconds) maximum_recognised_seconds,coalesce((ar.template_snapshot->>'grace_seconds')::integer,t.grace_seconds) grace_seconds,coalesce((ar.template_snapshot->>'match_before_seconds')::integer,t.match_before_seconds) match_before_seconds,coalesce((ar.template_snapshot->>'match_after_seconds')::integer,t.match_after_seconds) match_after_seconds,s.employment_type,s.daily_recognised_cap_seconds
    from public.shift_assignment_revisions ar join public.shift_templates t on t.id=ar.shift_template_id join public.staffs s on s.id=ar.staff_id
    where ar.company_id=batch.company_id and ar.work_date between batch.week_start and batch.week_start+6 and ar.assignment_kind='shift' and ar.is_current
  loop
    shift_start:=(a.work_date+a.planned_start) at time zone 'Asia/Kuala_Lumpur';
    shift_end:=((a.work_date+case when a.crosses_midnight then 1 else 0 end)+a.planned_end) at time zone 'Asia/Kuala_Lumpur';
    window_start:=shift_start-make_interval(secs=>a.match_before_seconds); window_end:=shift_end+make_interval(secs=>a.match_after_seconds);
    select array_agg(e.occurred_at order by e.occurred_at),array_agg(e.source_code order by e.occurred_at),array_agg(lower(e.punch_type) order by e.occurred_at) into points,sources,punch_types
    from public.attendance_raw_punch_events e join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=a.staff_id and pm.is_active
    join public.attendance_import_batch_events be on be.event_id=e.id and be.batch_id=batch.id where e.company_id=batch.company_id and e.occurred_at between window_start and window_end;
    point_count:=coalesce(cardinality(points),0); raw_seconds:=0; recognised:=0; breaks:=0; exceptions:='{}'; first_in:=points[1]; last_out:=points[point_count];
    if point_count=0 then exceptions:=array_append(exceptions,'missing_punches'); end if;
    if point_count%2=1 then exceptions:=array_append(exceptions,'odd_punch_count'); end if;
    idx:=1;
    while idx+1<=point_count loop
      interval_start:=points[idx]; interval_end:=points[idx+1];
      if (punch_types[idx] is not null and punch_types[idx] not in ('in','check in','check-in')) or (punch_types[idx+1] is not null and punch_types[idx+1] not in ('out','check out','check-out')) then exceptions:=array_append(exceptions,'impossible_ordering');
      elsif interval_end<=interval_start then exceptions:=array_append(exceptions,'impossible_ordering');
      else
        raw_seconds:=raw_seconds+extract(epoch from interval_end-interval_start)::integer;
        recognised:=recognised+greatest(0,extract(epoch from least(interval_end,shift_end)-greatest(interval_start,shift_start))::integer);
        if idx>1 then breaks:=breaks+greatest(0,extract(epoch from interval_start-points[idx-1])::integer); end if;
      end if; idx:=idx+2;
    end loop;
    if a.planned_break_seconds>0 and point_count<4 then exceptions:=array_append(exceptions,'missing_break_punch'); end if;
    select array_agg(dm.source_code) into expected_sources from public.ngteco_device_mappings dm where dm.company_id=batch.company_id and dm.branch_id=a.branch_id and dm.is_active;
    if cardinality(expected_sources)>0 and exists(select 1 from unnest(sources) source where not(source=any(expected_sources))) then exceptions:=array_append(exceptions,'wrong_branch_device'); end if;
    cap_seconds:=least(a.maximum_recognised_seconds,coalesce(a.daily_recognised_cap_seconds,case when a.employment_type='part_time' then a.maximum_recognised_seconds else 30600 end)); recognised:=least(recognised,cap_seconds);
    select id,calculation_revision into prior_id,revision_no from public.daily_attendance_results where company_id=batch.company_id and staff_id=a.staff_id and work_date=a.work_date and is_current for update;
    revision_no:=coalesce(revision_no,0)+1; if prior_id is not null then update public.daily_attendance_results set is_current=false where id=prior_id; end if;
    insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,calculation)
    values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,raw_seconds,recognised,breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('punches',coalesce(to_jsonb(points),'[]'::jsonb),'cap_seconds',cap_seconds,'seconds_precise',true)) returning id into result_id;
    insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','odd_punch_count','missing_break_punch','impossible_ordering') then 'blocker' else 'warning' end from unnest(exceptions) code;
    calculated:=calculated+1;
  end loop; return calculated;
end $$;

create or replace function public.adjust_attendance_result(p_result_id uuid,p_patch jsonb,p_reason text) returns public.daily_attendance_results language plpgsql security definer set search_path=public as $$
declare prior public.daily_attendance_results; result public.daily_attendance_results; locked boolean;
begin
 if not public.has_permission('attendance.adjust') or nullif(trim(p_reason),'') is null then raise exception 'Attendance adjustment is not authorised.'; end if;
 select * into prior from public.daily_attendance_results where id=p_result_id and company_id=public.current_staff_company_id() and is_current for update;
 if prior.id is null then raise exception 'Current attendance result not found.'; end if;
 select exists(select 1 from public.attendance_period_locks l where l.company_id=prior.company_id and l.week_start=date_trunc('week',prior.work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=prior.branch_id)) into locked;
 if locked then raise exception 'Attendance period is locked.'; end if;
 update public.daily_attendance_results set is_current=false where id=prior.id;
 insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,review_status,is_current,calculation)
 values(prior.company_id,prior.staff_id,prior.branch_id,prior.work_date,prior.assignment_id,prior.import_batch_id,prior.calculation_revision+1,prior.scheduled_start,prior.scheduled_end,coalesce((p_patch->>'actual_first_in')::timestamptz,prior.actual_first_in),coalesce((p_patch->>'actual_last_out')::timestamptz,prior.actual_last_out),coalesce((p_patch->>'raw_work_seconds')::integer,prior.raw_work_seconds),coalesce((p_patch->>'recognised_paid_seconds')::integer,prior.recognised_paid_seconds),coalesce((p_patch->>'break_seconds')::integer,prior.break_seconds),coalesce((p_patch->>'late_seconds')::integer,prior.late_seconds),coalesce((p_patch->>'early_leave_seconds')::integer,prior.early_leave_seconds),prior.pre_shift_seconds,prior.post_shift_seconds,prior.statuses,'adjusted',true,prior.calculation||jsonb_build_object('adjustment_reason',trim(p_reason))) returning * into result;
 insert into public.attendance_adjustments(company_id,result_id,actor_staff_id,reason,before_state,after_state) values(prior.company_id,result.id,public.current_staff_id(),trim(p_reason),to_jsonb(prior),to_jsonb(result)); return result;
end $$;

create or replace function public.upsert_ngteco_person_mapping(p_person_id text,p_staff_id uuid,p_active boolean default true) returns public.ngteco_person_mappings language plpgsql security definer set search_path=public as $$ declare result public.ngteco_person_mappings; company uuid:=public.current_staff_company_id(); begin
 if not public.has_permission('attendance.map') or nullif(trim(p_person_id),'') is null or not exists(select 1 from public.staffs s where s.id=p_staff_id and s.company_id=company and s.deleted_at is null) then raise exception 'Person mapping is not authorised.'; end if;
 insert into public.ngteco_person_mappings(company_id,person_id,staff_id,is_active,created_by) values(company,trim(p_person_id),p_staff_id,p_active,public.current_staff_id()) on conflict(company_id,person_id) do update set staff_id=excluded.staff_id,is_active=excluded.is_active returning * into result; return result; end $$;
create or replace function public.upsert_ngteco_device_mapping(p_source_code text,p_branch_id uuid,p_active boolean default true) returns public.ngteco_device_mappings language plpgsql security definer set search_path=public as $$ declare result public.ngteco_device_mappings; company uuid:=public.current_staff_company_id(); begin
 if not public.has_permission('attendance.map') or nullif(trim(p_source_code),'') is null or not exists(select 1 from public.branches b where b.id=p_branch_id and b.company_id=company and b.branch_type='outlet' and b.deleted_at is null) then raise exception 'Device mapping is not authorised.'; end if;
 insert into public.ngteco_device_mappings(company_id,source_code,branch_id,is_active,created_by) values(company,trim(p_source_code),p_branch_id,p_active,public.current_staff_id()) on conflict(company_id,source_code) do update set branch_id=excluded.branch_id,is_active=excluded.is_active returning * into result; return result; end $$;
grant select on public.ngteco_person_mappings,public.ngteco_device_mappings,public.attendance_import_batches,public.attendance_raw_punch_events,public.attendance_import_batch_events,public.attendance_reconciliation_rows,public.daily_attendance_results,public.attendance_exceptions,public.attendance_adjustments,public.attendance_period_locks to authenticated;
revoke all on function public.lock_attendance_period(date,uuid),public.unlock_attendance_period(uuid,text),public.finalise_attendance_import(text,date,text,text,jsonb),public.recalculate_attendance_week(uuid),public.adjust_attendance_result(uuid,jsonb,text),public.upsert_ngteco_person_mapping(text,uuid,boolean),public.upsert_ngteco_device_mapping(text,uuid,boolean) from public,anon;
grant execute on function public.lock_attendance_period(date,uuid),public.unlock_attendance_period(uuid,text),public.finalise_attendance_import(text,date,text,text,jsonb),public.recalculate_attendance_week(uuid),public.adjust_attendance_result(uuid,jsonb,text),public.upsert_ngteco_person_mapping(text,uuid,boolean),public.upsert_ngteco_device_mapping(text,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
