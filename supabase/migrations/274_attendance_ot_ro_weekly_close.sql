-- Attendance weekly close: auditable OT claims, schedule-bound RO reservations,
-- FIFO use allocation, People-only sensitive exports and punch compliance facts.

insert into public.permissions(permission_code,module,action,description) values
 ('attendance.ot.submit','attendance','ot_submit','Submit calculated overtime for People review'),
 ('attendance.ot.approve','attendance','ot_approve','Approve overtime into replacement-off balance'),
 ('attendance.week.close','attendance','week_close','Close a reconciled attendance week'),
 ('attendance.sensitive.export','attendance','sensitive_export','Download sensitive employee attendance workbooks'),
 ('people.sensitive.read','people','sensitive_read','Read salary and passport details'),
 ('people.sensitive.manage','people','sensitive_manage','Maintain salary and passport details')
on conflict(permission_code) do update set module=excluded.module,action=excluded.action,description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where (r.role_code='outlet_supervisor' and p.permission_code='attendance.ot.submit')
   or (r.role_code='people_operations' and p.permission_code in (
     'attendance.ot.submit','attendance.ot.approve','attendance.week.close','attendance.sensitive.export',
     'people.sensitive.read','people.sensitive.manage'))
   or (r.role_code='super_admin' and p.permission_code in (
     'attendance.ot.submit','attendance.ot.approve','attendance.week.close','attendance.sensitive.export',
     'people.sensitive.read','people.sensitive.manage'))
on conflict do nothing;

-- Managers may verify punches and publish schedules. People/Owner own OT credit,
-- final RO use and the sensitive workbook.
delete from public.role_permissions rp using public.roles r,public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and r.role_code='manager'
  and p.permission_code in ('attendance.lock','comp_time.approve','comp_time.submit');
delete from public.role_permissions rp using public.roles r,public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and r.role_code='outlet_supervisor'
  and p.permission_code='comp_time.submit';

create table public.staff_sensitive_employment(
 staff_id uuid primary key references public.staffs(id) on delete cascade,
 company_id uuid not null references public.companies(id),
 passport_number text,
 basic_salary numeric(14,2) check(basic_salary is null or basic_salary>=0),
 updated_by uuid not null references public.staffs(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.attendance_ot_claims(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 result_id uuid not null references public.daily_attendance_results(id), staff_id uuid not null references public.staffs(id),
 branch_id uuid not null references public.branches(id), work_date date not null,
 calculation_revision integer not null, candidate_minutes integer not null check(candidate_minutes>=0 and candidate_minutes%30=0),
 requested_minutes integer not null check(requested_minutes>0 and requested_minutes%30=0),
 decided_minutes integer check(decided_minutes is null or (decided_minutes>=0 and decided_minutes%30=0)),
 schedule_snapshot jsonb not null, punch_snapshot jsonb not null,
 reason text not null check(length(trim(reason))>0), review_note text,
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','credited','cancelled')),
 submitted_by uuid not null references public.staffs(id), submitted_at timestamptz not null default now(),
 decided_by uuid references public.staffs(id), decided_at timestamptz, decision_comment text,
 credited_transaction_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index attendance_ot_claim_one_active_result on public.attendance_ot_claims(result_id) where status in ('submitted','approved','credited');
create unique index attendance_ot_claim_one_active_day on public.attendance_ot_claims(company_id,staff_id,work_date) where status in ('submitted','approved','credited');
create index attendance_ot_claim_queue on public.attendance_ot_claims(company_id,status,work_date,branch_id);

alter table public.shift_assignment_revisions
 add column if not exists ro_minutes integer,
 add column if not exists ro_original_start time,
 add column if not exists ro_original_end time,
 add column if not exists ro_direction text;
alter table public.shift_assignment_revisions drop constraint if exists shift_assignment_ro_minutes_check;
alter table public.shift_assignment_revisions add constraint shift_assignment_ro_minutes_check check(
 ro_minutes is null or (assignment_kind='shift' and ro_minutes>0 and ro_minutes%30=0 and ro_direction in ('late_start','early_finish'))
);

create table public.attendance_ro_reservations(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 schedule_week_id uuid not null references public.schedule_weeks(id), assignment_id uuid not null references public.shift_assignment_revisions(id),
 staff_id uuid not null references public.staffs(id), branch_id uuid not null references public.branches(id), work_date date not null,
 reserved_minutes integer not null check(reserved_minutes>0 and reserved_minutes%30=0),
 original_start time not null, original_end time not null, adjusted_start time not null, adjusted_end time not null,
 direction text not null check(direction in ('late_start','early_finish')),
 recommended_used_minutes integer check(recommended_used_minutes is null or recommended_used_minutes>=0),
 final_used_minutes integer check(final_used_minutes is null or final_used_minutes>=0),
 status text not null default 'reserved' check(status in ('reserved','consumed','released')),
 reserved_by uuid not null references public.staffs(id), reserved_at timestamptz not null default now(),
 decided_by uuid references public.staffs(id), decided_at timestamptz, decision_note text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(assignment_id)
);
create index attendance_ro_active_balance on public.attendance_ro_reservations(company_id,staff_id,status,work_date);

alter table public.comp_time_transactions add column if not exists source_ot_claim_id uuid references public.attendance_ot_claims(id);
alter table public.comp_time_transactions add column if not exists source_ro_reservation_id uuid references public.attendance_ro_reservations(id);
create unique index if not exists comp_time_one_ot_claim on public.comp_time_transactions(source_ot_claim_id) where source_ot_claim_id is not null;
create unique index if not exists comp_time_one_ro_use on public.comp_time_transactions(source_ro_reservation_id) where source_ro_reservation_id is not null;
alter table public.attendance_ot_claims add constraint attendance_ot_claim_credit_fkey foreign key(credited_transaction_id) references public.comp_time_transactions(id);

create table public.comp_time_allocations(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 used_transaction_id uuid not null references public.comp_time_transactions(id),
 earned_transaction_id uuid not null references public.comp_time_transactions(id),
 allocated_minutes integer not null check(allocated_minutes>0), created_at timestamptz not null default now(),
 unique(used_transaction_id,earned_transaction_id)
);

alter table public.daily_attendance_results
 add column if not exists expected_punch_count integer,
 add column if not exists actual_punch_count integer,
 add column if not exists missing_punch_count integer,
 add column if not exists monthly_missing_punch_count integer,
 add column if not exists overtime_candidate_seconds integer not null default 0,
 add column if not exists holiday_normal_equivalent_seconds integer;

do $$ declare t text; begin foreach t in array array['staff_sensitive_employment','attendance_ot_claims','attendance_ro_reservations','comp_time_allocations'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy "sensitive employment People read" on public.staff_sensitive_employment for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('people.sensitive.read'));
create policy "OT claim scoped read" on public.attendance_ot_claims for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.read') and (staff_id=public.current_staff_id() or public.can_access_company_branch(company_id,branch_id)));
create policy "RO reservation scoped read" on public.attendance_ro_reservations for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('comp_time.read') and (staff_id=public.current_staff_id() or public.can_access_company_branch(company_id,branch_id)));
create policy "comp allocation scoped read" on public.comp_time_allocations for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('comp_time.read'));

-- Retire the legacy whole-day comp-time request and direct earned-entry paths.
-- Existing rows remain readable and auditable.
alter function public.submit_comp_time_transaction(uuid,uuid,date,text,integer,text,text) rename to submit_comp_time_transaction_before_ot_claims;
alter function public.submit_daily_attendance_report(uuid,text,integer,timestamptz,timestamptz,text,text,uuid) rename to submit_daily_attendance_report_before_schedule_ro;
alter function public.decide_daily_attendance_report(uuid,text,text,text) rename to decide_daily_attendance_report_before_schedule_ro;
alter function public.lock_attendance_period(date,uuid) rename to lock_attendance_period_before_weekly_close;

create or replace function public.save_staff_sensitive_employment(p_staff_id uuid,p_passport_number text,p_basic_salary numeric) returns public.staff_sensitive_employment
language plpgsql security definer set search_path=public as $$ declare result public.staff_sensitive_employment; company uuid:=public.current_staff_company_id(); begin
 if not public.has_permission('people.sensitive.manage') or not exists(select 1 from public.staffs s where s.id=p_staff_id and s.company_id=company and s.deleted_at is null) then raise exception 'Sensitive employment update is not authorised.'; end if;
 if p_basic_salary is not null and p_basic_salary<0 then raise exception 'Basic salary cannot be negative.'; end if;
 insert into public.staff_sensitive_employment(staff_id,company_id,passport_number,basic_salary,updated_by)
 values(p_staff_id,company,nullif(trim(p_passport_number),''),p_basic_salary,public.current_staff_id())
 on conflict(staff_id) do update set passport_number=excluded.passport_number,basic_salary=excluded.basic_salary,updated_by=excluded.updated_by,updated_at=now()
 returning * into result; return result; end $$;

create or replace function public.get_comp_time_available_balance(p_staff_id uuid) returns integer
language sql stable security definer set search_path=public as $$
 select greatest(0,coalesce((select sum(t.minutes) from public.comp_time_transactions t where t.company_id=public.current_staff_company_id() and t.staff_id=p_staff_id and t.status='approved'),0)
   -coalesce((select sum(r.reserved_minutes) from public.attendance_ro_reservations r where r.company_id=public.current_staff_company_id() and r.staff_id=p_staff_id and r.status='reserved'),0))::integer
 where p_staff_id=public.current_staff_id() or public.has_permission('comp_time.read');
$$;

-- Keep the mature schedule validation and revision logic, then attach audited
-- partial-RO facts to the new immutable assignment revision.
alter function public.save_schedule_week(uuid,date,jsonb) rename to save_schedule_week_before_ro;
create or replace function public.save_schedule_week(p_branch_id uuid,p_week_start date,p_assignments jsonb) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare result public.schedule_weeks; item jsonb; a public.shift_assignment_revisions; original_start time; original_end time; adjusted_start time; adjusted_end time; minutes integer; direction text; staff_type text; begin
 for item in select value from jsonb_array_elements(p_assignments) loop
  minutes:=nullif(item->>'ro_minutes','')::integer;
  if minutes is not null then
   if minutes<=0 or minutes%30<>0 or lower(item->>'assignment_kind')<>'shift' then raise exception 'RO must be attached to a working shift in 30-minute units.'; end if;
   select employment_type into staff_type from public.staffs where id=(item->>'staff_id')::uuid and company_id=public.current_staff_company_id();
   if staff_type<>'full_time' then raise exception 'Only Full-time employees can reserve RO.'; end if;
   select planned_start,planned_end into original_start,original_end from public.shift_templates where id=nullif(item->>'shift_template_id','')::uuid and company_id=public.current_staff_company_id();
   original_start:=coalesce(nullif(item->>'ro_original_start','')::time,original_start); original_end:=coalesce(nullif(item->>'ro_original_end','')::time,original_end);
   adjusted_start:=nullif(item->>'custom_start','')::time; adjusted_end:=nullif(item->>'custom_end','')::time;
   if original_start is null or original_end is null or adjusted_start is null or adjusted_end is null then raise exception 'Original and adjusted RO shift times are required.'; end if;
   direction:=case when adjusted_start>original_start and adjusted_end=original_end then 'late_start' when adjusted_start=original_start and adjusted_end<original_end then 'early_finish' end;
   if direction is null or (case direction when 'late_start' then extract(epoch from adjusted_start-original_start) else extract(epoch from original_end-adjusted_end) end)::integer<>minutes*60 then raise exception 'Adjusted shift must redeem exactly the selected RO minutes at one edge.'; end if;
  end if;
 end loop;
 select public.save_schedule_week_before_ro(p_branch_id,p_week_start,p_assignments) into result;
 for item in select value from jsonb_array_elements(p_assignments) loop
  minutes:=nullif(item->>'ro_minutes','')::integer;
  select * into a from public.shift_assignment_revisions where schedule_week_id=result.id and staff_id=(item->>'staff_id')::uuid and work_date=(item->>'work_date')::date and is_current;
  if a.id is not null then
   if minutes is null then update public.shift_assignment_revisions set ro_minutes=null,ro_original_start=null,ro_original_end=null,ro_direction=null where id=a.id;
   else
    select planned_start,planned_end into original_start,original_end from public.shift_templates where id=a.shift_template_id;
    original_start:=coalesce(nullif(item->>'ro_original_start','')::time,original_start); original_end:=coalesce(nullif(item->>'ro_original_end','')::time,original_end);
    adjusted_start:=nullif(item->>'custom_start','')::time; adjusted_end:=nullif(item->>'custom_end','')::time;
    direction:=case when adjusted_start>original_start then 'late_start' else 'early_finish' end;
    update public.shift_assignment_revisions set ro_minutes=minutes,ro_original_start=original_start,ro_original_end=original_end,ro_direction=direction,
      template_snapshot=template_snapshot||jsonb_build_object('planned_start',adjusted_start,'planned_end',adjusted_end,'ro_original_start',original_start,'ro_original_end',original_end,'ro_minutes',minutes,'ro_direction',direction)
    where id=a.id;
   end if;
  end if;
 end loop; return result; end $$;

create or replace function public.copy_schedule_week(p_source_week_id uuid,p_target_week_start date) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare source public.schedule_weeks; result public.schedule_weeks; payload jsonb; begin
 select * into source from public.schedule_weeks where id=p_source_week_id and company_id=public.current_staff_company_id();
 if source.id is null or not public.can_access_company_branch(source.company_id,source.branch_id) or extract(isodow from p_target_week_start)<>1 then raise exception 'Schedule copy is not authorised.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('staff_id',a.staff_id,'work_date',p_target_week_start+(a.work_date-source.week_start),'assignment_kind',a.assignment_kind,'shift_template_id',a.shift_template_id,'custom_start',a.custom_start,'custom_end',a.custom_end,'custom_crosses_midnight',a.custom_crosses_midnight,'custom_break_seconds',a.custom_break_seconds,'custom_maximum_recognised_seconds',a.custom_maximum_recognised_seconds,'custom_reason',coalesce(a.custom_reason,'Copied from prior week'))),'[]'::jsonb) into payload from public.shift_assignment_revisions a where a.schedule_week_id=source.id and a.is_current;
 select public.save_schedule_week(source.branch_id,p_target_week_start,payload) into result; return result; end $$;

alter function public.decide_schedule_week(uuid,text,text) rename to decide_schedule_week_before_ro;
create or replace function public.decide_schedule_week(p_week_id uuid,p_decision text,p_comment text default null) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare result public.schedule_weeks; a record; available integer; begin
 select public.decide_schedule_week_before_ro(p_week_id,p_decision,p_comment) into result;
 if p_decision='approve' then
  for a in select * from public.shift_assignment_revisions where schedule_week_id=result.id and is_current and ro_minutes is not null order by staff_id,work_date loop
   perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||':'||a.staff_id::text,0));
   select public.get_comp_time_available_balance(a.staff_id) into available;
   if available<a.ro_minutes then raise exception 'Insufficient RO balance for % on %: % minutes available, % requested.',(select full_name from public.staffs where id=a.staff_id),a.work_date,available,a.ro_minutes; end if;
   insert into public.attendance_ro_reservations(company_id,schedule_week_id,assignment_id,staff_id,branch_id,work_date,reserved_minutes,original_start,original_end,adjusted_start,adjusted_end,direction,reserved_by)
   values(a.company_id,a.schedule_week_id,a.id,a.staff_id,a.branch_id,a.work_date,a.ro_minutes,a.ro_original_start,a.ro_original_end,coalesce(a.custom_start,(a.template_snapshot->>'planned_start')::time),coalesce(a.custom_end,(a.template_snapshot->>'planned_end')::time),a.ro_direction,public.current_staff_id());
  end loop;
 elsif p_decision in ('return','reject') then update public.attendance_ro_reservations set status='released',decided_by=public.current_staff_id(),decided_at=now(),decision_note=coalesce(p_comment,'Schedule returned'),updated_at=now() where schedule_week_id=result.id and status='reserved'; end if;
 return result; end $$;

-- Enrich the existing calculation without changing immutable raw punches.
alter function public.recalculate_attendance_week(uuid) rename to recalculate_attendance_week_pay_v1;
create or replace function public.recalculate_attendance_week(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$ declare calculated integer; batch public.attendance_import_batches; begin
 select * into batch from public.attendance_import_batches where id=p_batch_id and company_id=public.current_staff_company_id();
 if batch.id is null or batch.parser_profile<>'view_attendance_punch' then raise exception 'Attendance calculation is not authorised.'; end if;
 select public.recalculate_attendance_week_pay_v1(p_batch_id) into calculated;
  update public.daily_attendance_results r set
    payable_seconds=case when s.employment_type='part_time' and r.worked_seconds is not null then floor(r.worked_seconds/1800.0)::integer*1800 else r.payable_seconds end,
    recognised_paid_seconds=case when s.employment_type='part_time' and r.worked_seconds is not null then floor(r.worked_seconds/1800.0)::integer*1800 else r.recognised_paid_seconds end,
   actual_punch_count=jsonb_array_length(coalesce(r.calculation->'punches','[]'::jsonb)),
   expected_punch_count=case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then 2 when s.employment_type='part_time' then 4 when (r.calculation->>'shift_class')='full_day' then 6 else 4 end,
   missing_punch_count=greatest(0,(case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then 2 when s.employment_type='part_time' then 4 when (r.calculation->>'shift_class')='full_day' then 6 else 4 end)-jsonb_array_length(coalesce(r.calculation->'punches','[]'::jsonb))),
   overtime_candidate_seconds=case when s.employment_type='part_time' then 0 else coalesce((r.calculation->>'overtime_candidate_seconds')::integer,0) end,
   holiday_normal_multiplier=case when r.holiday_id is null then null when s.employment_type='full_time' then 2 else 1 end,
   holiday_ot_multiplier=case when r.holiday_id is null then null else 1 end,
    holiday_normal_equivalent_seconds=case when r.holiday_id is null then null when s.employment_type='full_time' then r.payable_seconds*2 when r.worked_seconds is not null then floor(r.worked_seconds/1800.0)::integer*1800 else r.payable_seconds end,
   statuses=case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then array_remove(r.statuses,'missing_break_punch') when s.employment_type='part_time' then array_remove(r.statuses,'overtime') else r.statuses end,
   calculation=r.calculation||jsonb_build_object('rules_version','weekly-close-v2','expected_punch_count',case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then 2 when s.employment_type='part_time' then 4 when (r.calculation->>'shift_class')='full_day' then 6 else 4 end,'overtime_policy',case when s.employment_type='part_time' then 'ordinary_hours_no_ro' else 'post_schedule_floor_30_minutes_to_ro' end)
 from public.staffs s where r.import_batch_id=p_batch_id and r.is_current and s.id=r.staff_id;
 delete from public.attendance_exceptions e using public.daily_attendance_results r,public.staffs s where e.result_id=r.id and r.import_batch_id=p_batch_id and r.is_current and s.id=r.staff_id and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 and e.exception_code='missing_break_punch';
 insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity,details)
 select r.company_id,r.id,p_batch_id,'short_break','warning',jsonb_build_object('minimum_seconds',1800,'actual_seconds',r.break_seconds)
 from public.daily_attendance_results r join public.staffs s on s.id=r.staff_id
 where r.import_batch_id=p_batch_id and r.is_current and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)>18000
   and r.actual_punch_count>=4 and r.break_seconds<1800 and not exists(select 1 from public.attendance_exceptions e where e.result_id=r.id and e.exception_code='short_break');
 update public.daily_attendance_results r set statuses=array_append(r.statuses,'short_break') from public.staffs s
 where r.import_batch_id=p_batch_id and r.is_current and s.id=r.staff_id and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)>18000 and r.actual_punch_count>=4 and r.break_seconds<1800 and not ('short_break'=any(r.statuses));
 with punch_pairs as (
   select r.id,r.staff_id,r.work_date,r.scheduled_end,r.calculation,
     coalesce(((r.work_date+a.ro_original_end) at time zone 'Asia/Kuala_Lumpur'),r.scheduled_end) ot_start,
     punch.value::timestamptz interval_start,next_punch.value::timestamptz interval_end
   from public.daily_attendance_results r join public.staffs s on s.id=r.staff_id and s.employment_type='full_time'
   left join public.shift_assignment_revisions a on a.id=r.assignment_id
   cross join lateral jsonb_array_elements_text(coalesce(r.calculation->'punches','[]'::jsonb)) with ordinality punch(value,ordinality)
   join lateral (select value from jsonb_array_elements_text(coalesce(r.calculation->'punches','[]'::jsonb)) with ordinality following(value,ordinality) where following.ordinality=punch.ordinality+1) next_punch on true
   where r.import_batch_id=p_batch_id and r.is_current and punch.ordinality%2=1
 ), overtime as (
   select id,floor(sum(case when interval_end>ot_start then extract(epoch from interval_end-greatest(interval_start,ot_start)) else 0 end)/1800.0)::integer*1800 seconds
   from punch_pairs group by id
 ) update public.daily_attendance_results r set overtime_candidate_seconds=coalesce(overtime.seconds,0),calculation=r.calculation||jsonb_build_object('overtime_candidate_seconds',coalesce(overtime.seconds,0),'overtime_baseline','original_published_shift_end') from overtime where r.id=overtime.id;
 update public.daily_attendance_results current_result set monthly_missing_punch_count=monthly.total
 from (select company_id,staff_id,date_trunc('month',work_date)::date month_start,sum(coalesce(missing_punch_count,0))::integer total from public.daily_attendance_results where is_current group by company_id,staff_id,date_trunc('month',work_date)::date) monthly
 where current_result.is_current and current_result.company_id=monthly.company_id and current_result.staff_id=monthly.staff_id and date_trunc('month',current_result.work_date)::date=monthly.month_start;
 update public.attendance_ro_reservations reservation set recommended_used_minutes=case reservation.direction
   when 'late_start' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (result.actual_first_in-((reservation.work_date+reservation.original_start) at time zone 'Asia/Kuala_Lumpur'))))/1800.0)::integer*30)
   when 'early_finish' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (((reservation.work_date+reservation.original_end) at time zone 'Asia/Kuala_Lumpur')-result.actual_last_out)))/1800.0)::integer*30)
 end,updated_at=now()
 from public.daily_attendance_results result where result.import_batch_id=p_batch_id and result.is_current and result.assignment_id=reservation.assignment_id and result.actual_first_in is not null and result.actual_last_out is not null and reservation.status='reserved';
 return calculated; end $$;

alter function public.adjust_attendance_result(uuid,jsonb,text) rename to adjust_attendance_result_before_ot_claims;
create or replace function public.adjust_attendance_result(p_result_id uuid,p_patch jsonb,p_reason text) returns public.daily_attendance_results
language plpgsql security definer set search_path=public as $$
declare prior public.daily_attendance_results; revised public.daily_attendance_results;
begin
 select * into prior from public.daily_attendance_results where id=p_result_id and company_id=public.current_staff_company_id() and is_current;
 select * into revised from public.adjust_attendance_result_before_ot_claims(p_result_id,p_patch-'overtime_seconds',p_reason);
 update public.daily_attendance_results set
  expected_punch_count=prior.expected_punch_count,actual_punch_count=prior.actual_punch_count,missing_punch_count=prior.missing_punch_count,
  monthly_missing_punch_count=prior.monthly_missing_punch_count,overtime_candidate_seconds=prior.overtime_candidate_seconds,
  holiday_normal_equivalent_seconds=prior.holiday_normal_equivalent_seconds,holiday_ot_equivalent_seconds=prior.holiday_ot_equivalent_seconds
 where id=revised.id returning * into revised;
 return revised;
end $$;

create or replace function public.submit_attendance_ot_claim(p_result_id uuid,p_requested_minutes integer,p_reason text,p_review_note text default null) returns public.attendance_ot_claims
language plpgsql security definer set search_path=public as $$ declare r public.daily_attendance_results; claim public.attendance_ot_claims; candidate integer; begin
 if not public.has_permission('attendance.ot.submit') or p_requested_minutes<=0 or p_requested_minutes%30<>0 or nullif(trim(p_reason),'') is null then raise exception 'OT claim submission is not authorised.'; end if;
 select * into r from public.daily_attendance_results where id=p_result_id and company_id=public.current_staff_company_id() and is_current for update;
 candidate:=coalesce(r.overtime_candidate_seconds,0)/60;
 if r.id is null or r.branch_id is null or not public.can_access_company_branch(r.company_id,r.branch_id) then raise exception 'Attendance result is not available.'; end if;
 if p_requested_minutes>candidate then raise exception 'Requested OT exceeds the calculated candidate.'; end if;
 if exists(select 1 from public.attendance_period_locks l where l.company_id=r.company_id and l.week_start=date_trunc('week',r.work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=r.branch_id)) then raise exception 'Attendance period is locked.'; end if;
 insert into public.attendance_ot_claims(company_id,result_id,staff_id,branch_id,work_date,calculation_revision,candidate_minutes,requested_minutes,schedule_snapshot,punch_snapshot,reason,review_note,submitted_by)
 values(r.company_id,r.id,r.staff_id,r.branch_id,r.work_date,r.calculation_revision,candidate,p_requested_minutes,jsonb_build_object('start',r.scheduled_start,'end',r.scheduled_end,'assignment_id',r.assignment_id),coalesce(r.calculation->'punches','[]'::jsonb),trim(p_reason),nullif(trim(p_review_note),''),public.current_staff_id()) returning * into claim; return claim; end $$;

create or replace function public.decide_attendance_ot_claim(p_claim_id uuid,p_decision text,p_decided_minutes integer,p_comment text default null) returns public.attendance_ot_claims
language plpgsql security definer set search_path=public as $$ declare claim public.attendance_ot_claims; transaction_id uuid; current_result public.daily_attendance_results; revised public.daily_attendance_results; begin
 if not public.has_permission('attendance.ot.approve') or p_decision not in ('approve','reject') then raise exception 'OT claim decision is not authorised.'; end if;
 select * into claim from public.attendance_ot_claims where id=p_claim_id and company_id=public.current_staff_company_id() for update;
 if claim.id is null or claim.status<>'submitted' then raise exception 'Submitted OT claim was not found.'; end if;
 if claim.submitted_by=public.current_staff_id() then raise exception 'A submitter cannot decide their own OT claim.'; end if;
 if p_decision='reject' and nullif(trim(p_comment),'') is null then raise exception 'A rejection comment is required.'; end if;
 if p_decision='approve' and (coalesce(p_decided_minutes,0)<=0 or p_decided_minutes%30<>0 or p_decided_minutes>claim.requested_minutes) then raise exception 'Approved OT must be a 30-minute amount within the request.'; end if;
 update public.attendance_ot_claims set status=case when p_decision='approve' then 'approved' else 'rejected' end,decided_minutes=case when p_decision='approve' then p_decided_minutes else 0 end,decided_by=public.current_staff_id(),decided_at=now(),decision_comment=nullif(trim(p_comment),''),updated_at=now() where id=claim.id returning * into claim;
 if p_decision='approve' then
  insert into public.comp_time_transactions(company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,note,source_result_id,source_ot_claim_id,status,submitted_by,decided_by,decided_at,decision_comment)
  values(claim.company_id,claim.staff_id,claim.branch_id,claim.work_date,'earned',p_decided_minutes,'Approved attendance OT',claim.reason,claim.result_id,claim.id,'approved',claim.submitted_by,public.current_staff_id(),now(),p_comment) returning id into transaction_id;
  select * into current_result from public.daily_attendance_results where company_id=claim.company_id and staff_id=claim.staff_id and work_date=claim.work_date and is_current for update;
  if current_result.id is not null then
   select * into revised from public.adjust_attendance_result_before_ot_claims(current_result.id,jsonb_build_object('recognised_paid_seconds',coalesce(current_result.payable_seconds,current_result.recognised_paid_seconds),'overtime_seconds',p_decided_minutes*60),format('People approved OT claim %s',claim.id));
   update public.daily_attendance_results set expected_punch_count=current_result.expected_punch_count,actual_punch_count=current_result.actual_punch_count,missing_punch_count=current_result.missing_punch_count,monthly_missing_punch_count=current_result.monthly_missing_punch_count,overtime_candidate_seconds=current_result.overtime_candidate_seconds,holiday_normal_equivalent_seconds=current_result.holiday_normal_equivalent_seconds,holiday_ot_equivalent_seconds=current_result.holiday_ot_equivalent_seconds where id=revised.id;
  end if;
  update public.attendance_ot_claims set status='credited',credited_transaction_id=transaction_id,updated_at=now() where id=claim.id returning * into claim;
 end if; return claim; end $$;

create or replace function public.close_attendance_week_v2(p_week_start date,p_branch_id uuid default null,p_ro_decisions jsonb default '[]'::jsonb) returns public.attendance_period_locks
language plpgsql security definer set search_path=public as $$ declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); reservation public.attendance_ro_reservations; decision jsonb; final_minutes integer; use_id uuid; remaining integer; earning record; allocation integer; lock_row public.attendance_period_locks; begin
 if not public.has_permission('attendance.week.close') or extract(isodow from p_week_start)<>1 or jsonb_typeof(p_ro_decisions)<>'array' then raise exception 'Weekly attendance close is not authorised.'; end if;
 if p_branch_id is not null and not public.can_access_company_branch(company,p_branch_id) then raise exception 'Outlet is not available.'; end if;
 if exists(select 1 from public.daily_attendance_results r join public.attendance_exceptions e on e.result_id=r.id and e.severity='blocker' and e.resolved_at is null where r.company_id=company and r.is_current and r.work_date between p_week_start and p_week_start+6 and (p_branch_id is null or r.branch_id=p_branch_id)) then raise exception 'Resolve missing or invalid punches before closing the week.'; end if;
 if exists(select 1 from public.daily_attendance_reports r where r.company_id=company and r.work_date between p_week_start and p_week_start+6 and (p_branch_id is null or r.branch_id=p_branch_id) and r.status='pending') then raise exception 'Resolve pending attendance reports before closing the week.'; end if;
 if exists(select 1 from public.attendance_ot_claims c where c.company_id=company and c.work_date between p_week_start and p_week_start+6 and (p_branch_id is null or c.branch_id=p_branch_id) and c.status='submitted') then raise exception 'Decide all submitted OT claims before closing the week.'; end if;
 for reservation in select * from public.attendance_ro_reservations where company_id=company and work_date between p_week_start and p_week_start+6 and status='reserved' and (p_branch_id is null or branch_id=p_branch_id) for update loop
  select value into decision from jsonb_array_elements(p_ro_decisions) where value->>'reservationId'=reservation.id::text;
  if decision is null then raise exception 'Every scheduled RO reservation needs a final People decision.'; end if;
  final_minutes:=coalesce((decision->>'finalUsedMinutes')::integer,0);
  if final_minutes<0 or final_minutes>reservation.reserved_minutes or final_minutes%30<>0 then raise exception 'Final RO use must be within the reservation in 30-minute units.'; end if;
  if final_minutes>0 then
   insert into public.comp_time_transactions(company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,note,source_ro_reservation_id,status,submitted_by,decided_by,decided_at,decision_comment)
   values(company,reservation.staff_id,reservation.branch_id,reservation.work_date,'used',-final_minutes,'Scheduled RO redeemed',nullif(trim(decision->>'note'),''),reservation.id,'approved',actor,actor,now(),nullif(trim(decision->>'note'),'')) returning id into use_id;
   remaining:=final_minutes;
   for earning in select t.id,t.minutes-coalesce((select sum(a.allocated_minutes) from public.comp_time_allocations a where a.earned_transaction_id=t.id),0) available from public.comp_time_transactions t where t.company_id=company and t.staff_id=reservation.staff_id and t.status='approved' and t.minutes>0 and t.minutes-coalesce((select sum(a.allocated_minutes) from public.comp_time_allocations a where a.earned_transaction_id=t.id),0)>0 order by t.work_date,t.created_at,t.id for update loop
    allocation:=least(remaining,earning.available); insert into public.comp_time_allocations(company_id,used_transaction_id,earned_transaction_id,allocated_minutes) values(company,use_id,earning.id,allocation); remaining:=remaining-allocation; exit when remaining=0;
   end loop;
   if remaining<>0 then raise exception 'RO balance allocation could not be completed.'; end if;
  end if;
  update public.attendance_ro_reservations set final_used_minutes=final_minutes,status=case when final_minutes>0 then 'consumed' else 'released' end,decided_by=actor,decided_at=now(),decision_note=nullif(trim(decision->>'note'),''),updated_at=now() where id=reservation.id;
 end loop;
 insert into public.attendance_period_locks(company_id,branch_id,week_start,locked_by) values(company,p_branch_id,p_week_start,actor) on conflict(company_id,branch_id,week_start) do update set locked_by=excluded.locked_by,locked_at=now(),unlocked_by=null,unlocked_at=null,unlock_reason=null returning * into lock_row;
 update public.daily_attendance_results set review_status='locked' where company_id=company and is_current and work_date between p_week_start and p_week_start+6 and (p_branch_id is null or branch_id=p_branch_id);
 return lock_row; end $$;

create or replace function public.submit_comp_time_transaction(p_staff_id uuid,p_branch_id uuid,p_work_date date,p_kind text,p_minutes integer,p_reason text,p_note text default null) returns public.comp_time_transactions
language plpgsql security definer set search_path=public as $$
begin
 if not public.has_permission('attendance.ot.approve') or p_kind<>'correction' or p_minutes=0 or p_minutes%30<>0 then raise exception 'Only People may add a 30-minute RO balance correction.'; end if;
 return public.submit_comp_time_transaction_before_ot_claims(p_staff_id,p_branch_id,p_work_date,p_kind,p_minutes,p_reason,p_note);
end $$;

create or replace function public.submit_daily_attendance_report(p_assignment_id uuid,p_type text,p_minutes integer,p_actual_first_in timestamptz,p_actual_last_out timestamptz,p_reason text,p_note text default null,p_evidence_attachment_id uuid default null) returns public.daily_attendance_reports
language plpgsql security definer set search_path=public as $$
begin
 if p_type='comp_time_used' then raise exception 'Schedule RO redemption on the published roster instead.'; end if;
 return public.submit_daily_attendance_report_before_schedule_ro(p_assignment_id,p_type,p_minutes,p_actual_first_in,p_actual_last_out,p_reason,p_note,p_evidence_attachment_id);
end $$;

create or replace function public.decide_daily_attendance_report(p_report_id uuid,p_decision text,p_comment text default null,p_evidence_waiver_reason text default null) returns public.daily_attendance_reports
language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.daily_attendance_reports where id=p_report_id and company_id=public.current_staff_company_id() and report_type='comp_time_used') then raise exception 'Legacy comp-time requests cannot bypass scheduled RO settlement.'; end if;
 return public.decide_daily_attendance_report_before_schedule_ro(p_report_id,p_decision,p_comment,p_evidence_waiver_reason);
end $$;

create or replace function public.lock_attendance_period(p_week_start date,p_branch_id uuid default null) returns public.attendance_period_locks
language sql security definer set search_path=public as $$
 select public.close_attendance_week_v2(p_week_start,p_branch_id,'[]'::jsonb);
$$;

grant select on public.staff_sensitive_employment,public.attendance_ot_claims,public.attendance_ro_reservations,public.comp_time_allocations to authenticated;
revoke all on function public.save_staff_sensitive_employment(uuid,text,numeric),public.get_comp_time_available_balance(uuid),public.submit_attendance_ot_claim(uuid,integer,text,text),public.decide_attendance_ot_claim(uuid,text,integer,text),public.close_attendance_week_v2(date,uuid,jsonb) from public,anon;
grant execute on function public.save_staff_sensitive_employment(uuid,text,numeric),public.get_comp_time_available_balance(uuid),public.submit_attendance_ot_claim(uuid,integer,text,text),public.decide_attendance_ot_claim(uuid,text,integer,text),public.close_attendance_week_v2(date,uuid,jsonb) to authenticated;
revoke all on function public.save_schedule_week_before_ro(uuid,date,jsonb),public.decide_schedule_week_before_ro(uuid,text,text),public.recalculate_attendance_week_pay_v1(uuid),public.adjust_attendance_result_before_ot_claims(uuid,jsonb,text),public.submit_comp_time_transaction_before_ot_claims(uuid,uuid,date,text,integer,text,text),public.submit_daily_attendance_report_before_schedule_ro(uuid,text,integer,timestamptz,timestamptz,text,text,uuid),public.decide_daily_attendance_report_before_schedule_ro(uuid,text,text,text),public.lock_attendance_period_before_weekly_close(date,uuid) from public,anon,authenticated;
grant execute on function public.save_schedule_week(uuid,date,jsonb),public.copy_schedule_week(uuid,date),public.decide_schedule_week(uuid,text,text),public.recalculate_attendance_week(uuid),public.adjust_attendance_result(uuid,jsonb,text),public.submit_comp_time_transaction(uuid,uuid,date,text,integer,text,text),public.submit_daily_attendance_report(uuid,text,integer,timestamptz,timestamptz,text,text,uuid),public.decide_daily_attendance_report(uuid,text,text,text),public.lock_attendance_period(date,uuid) to authenticated;
notify pgrst,'reload schema';
