-- Attendance actuals and time-off-in-lieu ledger.
-- Published rosters and raw punches remain immutable source evidence.

insert into public.permissions(permission_code,module,action,description) values
 ('attendance.report.submit','attendance','report_submit','Submit daily attendance reports'),
 ('attendance.report.approve','attendance','report_approve','Approve daily attendance reports'),
 ('comp_time.read','attendance','comp_time_read','View compensatory-time balances and ledger'),
 ('comp_time.submit','attendance','comp_time_submit','Submit compensatory-time entries'),
 ('comp_time.approve','attendance','comp_time_approve','Approve compensatory-time entries')
on conflict(permission_code) do update set module=excluded.module,action=excluded.action,description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where (r.role_code='outlet_supervisor' and p.permission_code in ('attendance.report.submit','comp_time.read','comp_time.submit'))
   or (r.role_code in ('manager','people_operations') and p.permission_code in ('attendance.report.submit','attendance.report.approve','comp_time.read','comp_time.submit','comp_time.approve'))
on conflict do nothing;

create table public.comp_time_transactions(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 staff_id uuid not null references public.staffs(id), branch_id uuid references public.branches(id), work_date date not null,
 transaction_kind text not null check(transaction_kind in ('earned','used','correction')),
 minutes integer not null check(minutes<>0), reason text not null check(length(trim(reason))>0), note text,
 source_result_id uuid references public.daily_attendance_results(id), source_report_id uuid,
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 submitted_by uuid not null references public.staffs(id), submitted_at timestamptz not null default now(),
 decided_by uuid references public.staffs(id), decided_at timestamptz, decision_comment text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((transaction_kind='earned' and minutes>0) or (transaction_kind='used' and minutes<0) or transaction_kind='correction')
);

create table public.daily_attendance_reports(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 assignment_id uuid not null references public.shift_assignment_revisions(id), result_id uuid references public.daily_attendance_results(id),
 staff_id uuid not null references public.staffs(id), branch_id uuid not null references public.branches(id), work_date date not null,
 report_type text not null check(report_type in ('comp_time_used','mc','emergency_leave','punch_correction','other_exception')),
 requested_minutes integer check(requested_minutes is null or requested_minutes>0), proposed_actual_first_in timestamptz, proposed_actual_last_out timestamptz,
 reason text not null check(length(trim(reason))>0), note text, scheduled_snapshot jsonb not null default '{}', punch_snapshot jsonb not null default '{}',
 evidence_attachment_id uuid references public.attachments(id), evidence_waiver_reason text,
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 submitted_by uuid not null references public.staffs(id), submitted_at timestamptz not null default now(),
 decided_by uuid references public.staffs(id), decided_at timestamptz, decision_comment text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(report_type<>'comp_time_used' or requested_minutes is not null),
 check(report_type<>'punch_correction' or proposed_actual_first_in is not null or proposed_actual_last_out is not null)
);

alter table public.comp_time_transactions add constraint comp_time_transactions_source_report_fkey foreign key(source_report_id) references public.daily_attendance_reports(id);
create unique index daily_attendance_report_one_open on public.daily_attendance_reports(company_id,staff_id,work_date,report_type) where status in ('pending','approved');
create unique index comp_time_one_report_use on public.comp_time_transactions(source_report_id) where source_report_id is not null;
create index comp_time_staff_ledger on public.comp_time_transactions(company_id,staff_id,work_date,created_at);
create index daily_attendance_reports_queue on public.daily_attendance_reports(company_id,status,work_date,branch_id);

alter table public.comp_time_transactions enable row level security;
alter table public.daily_attendance_reports enable row level security;
create policy "comp time scoped read" on public.comp_time_transactions for select to authenticated using(
 company_id=public.current_staff_company_id() and public.has_permission('comp_time.read') and
 (staff_id=public.current_staff_id() or branch_id is null or public.can_access_company_branch(company_id,branch_id)));
create policy "attendance reports scoped read" on public.daily_attendance_reports for select to authenticated using(
 company_id=public.current_staff_company_id() and public.has_permission('attendance.read') and
 (staff_id=public.current_staff_id() or public.can_access_company_branch(company_id,branch_id)));

create or replace function public.get_comp_time_balance(p_staff_id uuid) returns integer
language sql stable security definer set search_path=public as $$
 select coalesce(sum(t.minutes),0)::integer from public.comp_time_transactions t
 where t.company_id=public.current_staff_company_id() and t.staff_id=p_staff_id and t.status='approved'
   and (t.staff_id=public.current_staff_id() or public.has_permission('comp_time.read'));
$$;

create or replace function public.submit_comp_time_transaction(p_staff_id uuid,p_branch_id uuid,p_work_date date,p_kind text,p_minutes integer,p_reason text,p_note text default null) returns public.comp_time_transactions
language plpgsql security definer set search_path=public as $$ declare result public.comp_time_transactions; company uuid:=public.current_staff_company_id(); begin
 if not public.has_permission('comp_time.submit') or p_kind not in ('earned','correction') or p_minutes=0 or (p_kind='earned' and p_minutes<0) or nullif(trim(p_reason),'') is null then raise exception 'Comp time submission is not authorised.'; end if;
 if not exists(select 1 from public.staffs s where s.id=p_staff_id and s.company_id=company and s.deleted_at is null) then raise exception 'Employee is not available.'; end if;
 if p_branch_id is not null and (not public.can_access_company_branch(company,p_branch_id) or not exists(select 1 from public.branches b where b.id=p_branch_id and b.company_id=company)) then raise exception 'Outlet is not available.'; end if;
 if exists(select 1 from public.attendance_period_locks l where l.company_id=company and l.week_start=date_trunc('week',p_work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=p_branch_id)) then raise exception 'Attendance period is locked.'; end if;
 insert into public.comp_time_transactions(company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,note,submitted_by)
 values(company,p_staff_id,p_branch_id,p_work_date,p_kind,p_minutes,trim(p_reason),nullif(trim(p_note),''),public.current_staff_id()) returning * into result; return result; end $$;

create or replace function public.decide_comp_time_transaction(p_transaction_id uuid,p_decision text,p_comment text default null) returns public.comp_time_transactions
language plpgsql security definer set search_path=public as $$ declare item public.comp_time_transactions; balance integer; begin
 if not public.has_permission('comp_time.approve') or p_decision not in ('approve','reject') then raise exception 'Comp time decision is not authorised.'; end if;
 select * into item from public.comp_time_transactions where id=p_transaction_id and company_id=public.current_staff_company_id() for update;
 if item.id is null or item.status<>'pending' then raise exception 'Pending comp time entry not found.'; end if;
 if item.submitted_by=public.current_staff_id() then raise exception 'A submitter cannot approve their own entry.'; end if;
 if p_decision='reject' and nullif(trim(p_comment),'') is null then raise exception 'A rejection comment is required.'; end if;
 if p_decision='approve' and item.minutes<0 then select public.get_comp_time_balance(item.staff_id) into balance; if balance+item.minutes<0 then raise exception 'Comp time balance cannot go below zero.'; end if; end if;
 update public.comp_time_transactions set status=case when p_decision='approve' then 'approved' else 'rejected' end,decided_by=public.current_staff_id(),decided_at=now(),decision_comment=nullif(trim(p_comment),''),updated_at=now() where id=item.id returning * into item; return item; end $$;

create or replace function public.submit_daily_attendance_report(p_assignment_id uuid,p_type text,p_minutes integer,p_actual_first_in timestamptz,p_actual_last_out timestamptz,p_reason text,p_note text default null,p_evidence_attachment_id uuid default null) returns public.daily_attendance_reports
language plpgsql security definer set search_path=public as $$ declare a public.shift_assignment_revisions; w public.schedule_weeks; current_result public.daily_attendance_results; report public.daily_attendance_reports; company uuid:=public.current_staff_company_id(); begin
 if not public.has_permission('attendance.report.submit') or p_type not in ('comp_time_used','mc','emergency_leave','punch_correction','other_exception') or nullif(trim(p_reason),'') is null then raise exception 'Daily attendance report is not authorised.'; end if;
 select * into a from public.shift_assignment_revisions where id=p_assignment_id and company_id=company and is_current;
 if a.id is null or not public.can_access_company_branch(company,a.branch_id) then raise exception 'Published assignment is not available.'; end if;
 select * into w from public.schedule_weeks where id=a.schedule_week_id and status in ('published','locked'); if w.id is null then raise exception 'Only a published schedule can receive an actual report.'; end if;
 if exists(select 1 from public.attendance_period_locks l where l.company_id=company and l.week_start=date_trunc('week',a.work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=a.branch_id)) then raise exception 'Attendance period is locked.'; end if;
 if p_type='comp_time_used' and coalesce(p_minutes,0)<=0 then raise exception 'Comp time minutes are required.'; end if;
 if p_type='punch_correction' and p_actual_first_in is null and p_actual_last_out is null then raise exception 'Corrected punch time is required.'; end if;
 select * into current_result from public.daily_attendance_results where assignment_id=a.id and is_current order by calculation_revision desc limit 1;
 insert into public.daily_attendance_reports(company_id,assignment_id,result_id,staff_id,branch_id,work_date,report_type,requested_minutes,proposed_actual_first_in,proposed_actual_last_out,reason,note,scheduled_snapshot,punch_snapshot,evidence_attachment_id,submitted_by)
 values(company,a.id,current_result.id,a.staff_id,a.branch_id,a.work_date,p_type,p_minutes,p_actual_first_in,p_actual_last_out,trim(p_reason),nullif(trim(p_note),''),jsonb_build_object('assignment',to_jsonb(a),'week',to_jsonb(w)),coalesce(to_jsonb(current_result),'{}'::jsonb),p_evidence_attachment_id,public.current_staff_id()) returning * into report; return report; end $$;

create or replace function public.attach_daily_attendance_report_evidence(p_report_id uuid,p_attachment_id uuid,p_file_name text,p_file_type text,p_file_size bigint,p_storage_path text) returns public.daily_attendance_reports
language plpgsql security definer set search_path=public as $$ declare report public.daily_attendance_reports; actor uuid:=public.current_staff_id(); begin
 select * into report from public.daily_attendance_reports where id=p_report_id and company_id=public.current_staff_company_id() for update;
 if report.id is null or report.status<>'pending' or report.report_type<>'mc' then raise exception 'Pending MC report not found.'; end if;
 if report.submitted_by<>actor and not public.has_permission('attendance.report.approve') then raise exception 'MC evidence upload is not authorised.'; end if;
 if not public.can_access_company_branch(report.company_id,report.branch_id) then raise exception 'Outlet is not available.'; end if;
 if report.evidence_attachment_id is not null then raise exception 'MC evidence has already been attached.'; end if;
 insert into public.attachments(id,company_id,entity_type,entity_id,file_name,file_type,file_size,storage_path,file_url,uploaded_by,created_by,updated_by)
 values(p_attachment_id,report.company_id,'daily_attendance_report',report.id,left(p_file_name,180),p_file_type,p_file_size,p_storage_path,null,actor,actor,actor);
 update public.daily_attendance_reports set evidence_attachment_id=p_attachment_id,updated_at=now() where id=report.id returning * into report;
 return report;
end $$;

create or replace function public.decide_daily_attendance_report(p_report_id uuid,p_decision text,p_comment text default null,p_evidence_waiver_reason text default null) returns public.daily_attendance_reports
language plpgsql security definer set search_path=public as $$ declare report public.daily_attendance_reports; prior public.daily_attendance_results; revised public.daily_attendance_results; balance integer; credit integer:=0; new_early integer; new_statuses text[]; begin
 if not public.has_permission('attendance.report.approve') or p_decision not in ('approve','reject') then raise exception 'Daily attendance decision is not authorised.'; end if;
 select * into report from public.daily_attendance_reports where id=p_report_id and company_id=public.current_staff_company_id() for update;
 if report.id is null or report.status<>'pending' then raise exception 'Pending daily attendance report not found.'; end if;
 if report.submitted_by=public.current_staff_id() then raise exception 'A submitter cannot approve their own report.'; end if;
 if p_decision='reject' and nullif(trim(p_comment),'') is null then raise exception 'A rejection comment is required.'; end if;
 if report.report_type='mc' and p_decision='approve' and report.evidence_attachment_id is null and nullif(trim(p_evidence_waiver_reason),'') is null then raise exception 'MC evidence or a waiver reason is required.'; end if;
 if exists(select 1 from public.attendance_period_locks l where l.company_id=report.company_id and l.week_start=date_trunc('week',report.work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=report.branch_id)) then raise exception 'Attendance period is locked.'; end if;
 if p_decision='approve' and report.report_type='comp_time_used' then select public.get_comp_time_balance(report.staff_id) into balance; if balance<report.requested_minutes then raise exception 'Comp time balance cannot go below zero.'; end if; end if;
 update public.daily_attendance_reports set status=case when p_decision='approve' then 'approved' else 'rejected' end,decided_by=public.current_staff_id(),decided_at=now(),decision_comment=nullif(trim(p_comment),''),evidence_waiver_reason=coalesce(nullif(trim(p_evidence_waiver_reason),''),evidence_waiver_reason),updated_at=now() where id=report.id returning * into report;
 if p_decision='approve' and report.report_type='comp_time_used' then insert into public.comp_time_transactions(company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,note,source_result_id,source_report_id,status,submitted_by,decided_by,decided_at,decision_comment) values(report.company_id,report.staff_id,report.branch_id,report.work_date,'used',-report.requested_minutes,report.reason,report.note,report.result_id,report.id,'approved',report.submitted_by,public.current_staff_id(),now(),p_comment); end if;
 if p_decision='approve' and report.result_id is not null then
   select * into prior from public.daily_attendance_results where id=report.result_id and is_current for update;
   if prior.id is not null then
     credit:=case when report.report_type='comp_time_used' then report.requested_minutes*60 else 0 end;
     new_early:=greatest(0,prior.early_leave_seconds-credit);
     new_statuses:=prior.statuses;
     if report.report_type='comp_time_used' and new_early=0 then new_statuses:=array_remove(new_statuses,'early_leave'); end if;
     if report.report_type='mc' then new_statuses:=array_append(array_remove(new_statuses,'mc'),'mc'); end if;
     if report.report_type='emergency_leave' then new_statuses:=array_append(array_remove(new_statuses,'emergency_leave'),'emergency_leave'); end if;
     update public.daily_attendance_results set is_current=false where id=prior.id;
     insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,review_status,is_current,calculation)
     values(prior.company_id,prior.staff_id,prior.branch_id,prior.work_date,prior.assignment_id,prior.import_batch_id,prior.calculation_revision+1,prior.scheduled_start,prior.scheduled_end,coalesce(report.proposed_actual_first_in,prior.actual_first_in),coalesce(report.proposed_actual_last_out,prior.actual_last_out),case when report.report_type='punch_correction' and coalesce(report.proposed_actual_first_in,prior.actual_first_in) is not null and coalesce(report.proposed_actual_last_out,prior.actual_last_out) is not null then greatest(0,extract(epoch from (coalesce(report.proposed_actual_last_out,prior.actual_last_out)-coalesce(report.proposed_actual_first_in,prior.actual_first_in)))::integer-prior.break_seconds) else prior.raw_work_seconds end,case when prior.scheduled_start is not null and prior.scheduled_end is not null then least(prior.recognised_paid_seconds+credit,greatest(0,extract(epoch from (prior.scheduled_end-prior.scheduled_start))::integer-prior.break_seconds)) else prior.recognised_paid_seconds+credit end,prior.break_seconds,prior.late_seconds,new_early,prior.pre_shift_seconds,prior.post_shift_seconds,new_statuses,'adjusted',true,prior.calculation||jsonb_build_object('approved_daily_report_id',report.id,'approved_report_type',report.report_type,'comp_time_credit_seconds',credit)) returning * into revised;
     insert into public.attendance_adjustments(company_id,result_id,actor_staff_id,reason,before_state,after_state) values(prior.company_id,revised.id,public.current_staff_id(),report.reason,to_jsonb(prior),to_jsonb(revised));
   end if;
 end if; return report; end $$;

create or replace function public.lock_attendance_period(p_week_start date,p_branch_id uuid default null) returns public.attendance_period_locks language plpgsql security definer set search_path=public as $$ declare l public.attendance_period_locks; begin
 if not public.has_permission('attendance.lock') or extract(isodow from p_week_start)<>1 or (p_branch_id is not null and not public.can_access_company_branch(public.current_staff_company_id(),p_branch_id)) then raise exception 'Attendance lock is not authorised.'; end if;
 if exists(select 1 from public.daily_attendance_reports r where r.company_id=public.current_staff_company_id() and r.work_date between p_week_start and p_week_start+6 and (p_branch_id is null or r.branch_id=p_branch_id) and (r.status='pending' or (r.report_type='mc' and r.status='approved' and r.evidence_attachment_id is null and nullif(trim(r.evidence_waiver_reason),'') is null))) then raise exception 'Resolve pending reports and MC evidence before closing attendance.'; end if;
 insert into public.attendance_period_locks(company_id,branch_id,week_start,locked_by) values(public.current_staff_company_id(),p_branch_id,p_week_start,public.current_staff_id()) on conflict(company_id,branch_id,week_start) do update set locked_by=excluded.locked_by,locked_at=now(),unlocked_by=null,unlocked_at=null,unlock_reason=null returning * into l;
 update public.daily_attendance_results set review_status='locked' where company_id=l.company_id and work_date between p_week_start and p_week_start+6 and (p_branch_id is null or branch_id=p_branch_id) and is_current; return l; end $$;

grant select on public.comp_time_transactions,public.daily_attendance_reports to authenticated;
revoke all on function public.get_comp_time_balance(uuid),public.submit_comp_time_transaction(uuid,uuid,date,text,integer,text,text),public.decide_comp_time_transaction(uuid,text,text),public.submit_daily_attendance_report(uuid,text,integer,timestamptz,timestamptz,text,text,uuid),public.attach_daily_attendance_report_evidence(uuid,uuid,text,text,bigint,text),public.decide_daily_attendance_report(uuid,text,text,text) from public,anon;
grant execute on function public.get_comp_time_balance(uuid),public.submit_comp_time_transaction(uuid,uuid,date,text,integer,text,text),public.decide_comp_time_transaction(uuid,text,text),public.submit_daily_attendance_report(uuid,text,integer,timestamptz,timestamptz,text,text,uuid),public.attach_daily_attendance_report_evidence(uuid,uuid,text,text,bigint,text),public.decide_daily_attendance_report(uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
