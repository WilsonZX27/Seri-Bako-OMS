-- Attendance pay semantics: employment type, paid/unpaid breaks and branch holidays.
alter table public.daily_attendance_results
  add column if not exists presence_seconds integer,
  add column if not exists worked_seconds integer,
  add column if not exists unpaid_break_seconds integer,
  add column if not exists paid_break_seconds integer,
  add column if not exists payable_seconds integer,
  add column if not exists overtime_seconds integer,
  add column if not exists holiday_id uuid,
  add column if not exists holiday_normal_multiplier numeric(8,4),
  add column if not exists holiday_ot_multiplier numeric(8,4);

create table if not exists public.attendance_pay_rule_versions(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 effective_from date not null, holiday_normal_multiplier numeric(8,4) not null check(holiday_normal_multiplier>0),
 holiday_ot_multiplier numeric(8,4) not null check(holiday_ot_multiplier>0), is_active boolean not null default true,
 created_by uuid not null references public.staffs(id), created_at timestamptz not null default now(),
 unique(company_id,effective_from)
);
create table if not exists public.public_holidays(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 name text not null check(length(trim(name))>0), holiday_date date not null,
 status text not null default 'active' check(status in ('active','inactive')),
 notes text, substitute_for_id uuid references public.public_holidays(id),
 created_by uuid not null references public.staffs(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.public_holiday_branches(
 holiday_id uuid not null references public.public_holidays(id) on delete cascade,
 branch_id uuid not null references public.branches(id), company_id uuid not null references public.companies(id),
 holiday_date date not null, active_slot boolean not null default true,
 primary key(holiday_id,branch_id)
);
create unique index if not exists public_holiday_branch_active_day
 on public.public_holiday_branches(company_id,branch_id,holiday_date) where active_slot;
create index if not exists attendance_pay_rules_effective_idx on public.attendance_pay_rule_versions(company_id,effective_from desc) where is_active;
alter table public.daily_attendance_results drop constraint if exists daily_attendance_results_holiday_id_fkey;
alter table public.daily_attendance_results add constraint daily_attendance_results_holiday_id_fkey foreign key(holiday_id) references public.public_holidays(id);

alter table public.attendance_pay_rule_versions enable row level security;
alter table public.public_holidays enable row level security;
alter table public.public_holiday_branches enable row level security;
create policy "attendance pay rules read" on public.attendance_pay_rule_versions for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.read'));
create policy "public holidays read" on public.public_holidays for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.read'));
create policy "public holiday branches read" on public.public_holiday_branches for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('attendance.read') and public.can_access_company_branch(company_id,branch_id));

create or replace function public.save_attendance_pay_rules(p_effective_from date,p_normal_multiplier numeric,p_ot_multiplier numeric) returns public.attendance_pay_rule_versions
language plpgsql security definer set search_path=public as $$ declare result public.attendance_pay_rule_versions; begin
 if not public.has_permission('shift_template.manage') or p_effective_from is null or p_normal_multiplier<=0 or p_ot_multiplier<=0 then raise exception 'Attendance pay rule update is not authorised or invalid.'; end if;
 insert into public.attendance_pay_rule_versions(company_id,effective_from,holiday_normal_multiplier,holiday_ot_multiplier,created_by)
 values(public.current_staff_company_id(),p_effective_from,p_normal_multiplier,p_ot_multiplier,public.current_staff_id()) returning * into result; return result;
end $$;

create or replace function public.save_public_holiday(p_id uuid,p_name text,p_date date,p_branch_ids uuid[],p_status text default 'active',p_notes text default null,p_substitute_for_id uuid default null) returns public.public_holidays
language plpgsql security definer set search_path=public as $$ declare result public.public_holidays; company uuid:=public.current_staff_company_id(); branch uuid; begin
 if not public.has_permission('shift_template.manage') or nullif(trim(p_name),'') is null or p_date is null or coalesce(cardinality(p_branch_ids),0)=0 or p_status not in ('active','inactive') then raise exception 'Public holiday update is not authorised or invalid.'; end if;
 if exists(select 1 from unnest(p_branch_ids) x where not exists(select 1 from public.branches b where b.id=x and b.company_id=company and b.status='active' and b.deleted_at is null)) then raise exception 'Public holiday contains an inaccessible branch.'; end if;
 if p_id is null then insert into public.public_holidays(company_id,name,holiday_date,status,notes,substitute_for_id,created_by) values(company,trim(p_name),p_date,p_status,nullif(trim(p_notes),''),p_substitute_for_id,public.current_staff_id()) returning * into result;
 else update public.public_holidays set name=trim(p_name),holiday_date=p_date,status=p_status,notes=nullif(trim(p_notes),''),substitute_for_id=p_substitute_for_id,updated_at=now() where id=p_id and company_id=company returning * into result; end if;
 if result.id is null then raise exception 'Public holiday was not found.'; end if;
 delete from public.public_holiday_branches where holiday_id=result.id;
 foreach branch in array p_branch_ids loop insert into public.public_holiday_branches(holiday_id,branch_id,company_id,holiday_date,active_slot) values(result.id,branch,company,p_date,p_status='active'); end loop;
 return result;
exception when unique_violation then raise exception 'An active public holiday already exists for this branch and date.'; end $$;

create or replace function public.recalculate_attendance_week(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare batch public.attendance_import_batches; a record; points timestamptz[]; sources text[]; punch_types text[]; point_count integer; idx integer;
 worked integer; breaks integer; presence integer; payable integer; normal_cap integer; ot_candidate integer; shift_span integer; required_breaks integer; valid_breaks integer;
 first_in timestamptz; last_out timestamptz; shift_start timestamptz; shift_end timestamptz; window_start timestamptz; window_end timestamptz; interval_start timestamptz; interval_end timestamptz;
 revision_no integer; prior_id uuid; result_id uuid; exceptions text[]; expected_sources text[]; calculated integer:=0; complete boolean; shift_class text;
 holiday record; pay_rule record; holiday_normal numeric; holiday_ot numeric; break_values jsonb;
begin
 select * into batch from public.attendance_import_batches where id=p_batch_id and company_id=public.current_staff_company_id();
 if batch.id is null or batch.parser_profile<>'view_attendance_punch' or not public.has_any_permission(array['attendance.import','attendance.adjust']) then raise exception 'Attendance calculation is not authorised.'; end if;
 for a in select ar.*,coalesce((ar.template_snapshot->>'planned_start')::time,t.planned_start) planned_start,coalesce((ar.template_snapshot->>'planned_end')::time,t.planned_end) planned_end,coalesce((ar.template_snapshot->>'crosses_midnight')::boolean,t.crosses_midnight) crosses_midnight,coalesce((ar.template_snapshot->>'planned_break_seconds')::integer,t.planned_break_seconds) planned_break_seconds,coalesce((ar.template_snapshot->>'maximum_recognised_seconds')::integer,t.maximum_recognised_seconds) maximum_recognised_seconds,coalesce((ar.template_snapshot->>'grace_seconds')::integer,t.grace_seconds) grace_seconds,coalesce((ar.template_snapshot->>'match_before_seconds')::integer,t.match_before_seconds) match_before_seconds,coalesce((ar.template_snapshot->>'match_after_seconds')::integer,t.match_after_seconds) match_after_seconds,s.employment_type from public.shift_assignment_revisions ar join public.shift_templates t on t.id=ar.shift_template_id join public.staffs s on s.id=ar.staff_id where ar.company_id=batch.company_id and ar.work_date between batch.week_start and batch.week_start+6 and ar.assignment_kind='shift' and ar.is_current loop
  if exists(select 1 from public.attendance_period_locks l where l.company_id=batch.company_id and l.week_start=date_trunc('week',a.work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=a.branch_id)) then continue; end if;
  shift_start:=(a.work_date+a.planned_start) at time zone 'Asia/Kuala_Lumpur'; shift_end:=((a.work_date+case when a.crosses_midnight then 1 else 0 end)+a.planned_end) at time zone 'Asia/Kuala_Lumpur';
  window_start:=shift_start-make_interval(secs=>a.match_before_seconds); window_end:=shift_end+make_interval(secs=>a.match_after_seconds);
  select array_agg(e.occurred_at order by e.occurred_at),array_agg(e.source_code order by e.occurred_at),array_agg(lower(e.punch_type) order by e.occurred_at) into points,sources,punch_types from public.attendance_raw_punch_events e join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=a.staff_id and pm.is_active join public.attendance_import_batch_events be on be.event_id=e.id and be.batch_id=batch.id where e.company_id=batch.company_id and e.occurred_at between window_start and window_end;
  point_count:=coalesce(cardinality(points),0); worked:=0; breaks:=0; valid_breaks:=0; exceptions:='{}'; break_values:='[]'::jsonb; first_in:=points[1]; last_out:=points[point_count];
  if point_count=0 then exceptions:=array_append(exceptions,'missing_punches'); end if; if point_count%2=1 then exceptions:=array_append(exceptions,'odd_punch_count'); end if;
  idx:=1; while idx+1<=point_count loop interval_start:=points[idx]; interval_end:=points[idx+1]; if (punch_types[idx] is not null and punch_types[idx] not in ('in','check in','check-in')) or (punch_types[idx+1] is not null and punch_types[idx+1] not in ('out','check out','check-out')) or interval_end<=interval_start then exceptions:=array_append(exceptions,'impossible_ordering'); else worked:=worked+extract(epoch from interval_end-interval_start)::integer; if idx>1 then breaks:=breaks+extract(epoch from interval_start-points[idx-1])::integer; break_values:=break_values||jsonb_build_array(extract(epoch from interval_start-points[idx-1])::integer); if extract(epoch from interval_start-points[idx-1])>=3600 then valid_breaks:=valid_breaks+1; end if; end if; end if; idx:=idx+2; end loop;
  shift_span:=extract(epoch from shift_end-shift_start)::integer; shift_class:=case when a.employment_type='full_time' and shift_span>34200 then 'full_day' else 'morning_afternoon' end; required_breaks:=case when a.employment_type='full_time' and shift_class='full_day' then 2 else 1 end;
  if point_count<required_breaks*2+2 then exceptions:=array_append(exceptions,'missing_break_punch'); elsif a.employment_type='full_time' and valid_breaks<required_breaks then exceptions:=array_append(exceptions,'short_break'); end if;
  complete:=point_count>=2 and point_count%2=0 and not ('impossible_ordering'=any(exceptions)); presence:=case when complete then extract(epoch from last_out-first_in)::integer end;
  normal_cap:=case when a.employment_type='full_time' and shift_class='full_day' then 34200 when a.employment_type='full_time' then 30600 else least(a.maximum_recognised_seconds,shift_span) end;
  payable:=case when not complete then null when a.employment_type='full_time' then normal_cap else floor(worked/1800.0)::integer*1800 end; ot_candidate:=case when payable is null then 0 else least(floor(greatest(0,worked-normal_cap)/1800.0)::integer*1800,floor(greatest(0,extract(epoch from last_out-shift_end)::integer)/1800.0)::integer*1800) end;
  if first_in is null then exceptions:=array_append(exceptions,'missing_check_in'); elsif first_in>shift_start+make_interval(secs=>a.grace_seconds) then exceptions:=array_append(exceptions,'late'); end if;
  if last_out is null then exceptions:=array_append(exceptions,'missing_check_out'); elsif last_out<shift_end then exceptions:=array_append(exceptions,'early_leave'); end if;
  if ot_candidate>0 then exceptions:=array_append(exceptions,'overtime'); end if;
  select h.* into holiday from public.public_holidays h join public.public_holiday_branches hb on hb.holiday_id=h.id and hb.branch_id=a.branch_id and hb.active_slot where h.company_id=batch.company_id and h.holiday_date=a.work_date and h.status='active' limit 1;
  holiday_normal:=null; holiday_ot:=null; if holiday.id is not null then exceptions:=array_append(exceptions,'public_holiday'); select * into pay_rule from public.attendance_pay_rule_versions r where r.company_id=batch.company_id and r.is_active and r.effective_from<=a.work_date order by r.effective_from desc limit 1; holiday_normal:=pay_rule.holiday_normal_multiplier; holiday_ot:=pay_rule.holiday_ot_multiplier; if pay_rule.id is null then exceptions:=array_append(exceptions,'missing_public_holiday_multiplier'); end if; end if;
  select array_agg(dm.source_code) into expected_sources from public.ngteco_device_mappings dm where dm.company_id=batch.company_id and dm.branch_id=a.branch_id and dm.is_active; if cardinality(expected_sources)>0 and exists(select 1 from unnest(sources) source where not(source=any(expected_sources))) then exceptions:=array_append(exceptions,'wrong_branch_device'); end if;
  select id,calculation_revision into prior_id,revision_no from public.daily_attendance_results where company_id=batch.company_id and staff_id=a.staff_id and work_date=a.work_date and is_current for update; revision_no:=coalesce(revision_no,0)+1; if prior_id is not null then update public.daily_attendance_results set is_current=false where id=prior_id; end if;
  insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,calculation,presence_seconds,worked_seconds,unpaid_break_seconds,paid_break_seconds,payable_seconds,overtime_seconds,holiday_id,holiday_normal_multiplier,holiday_ot_multiplier)
  values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,worked,coalesce(least(payable,normal_cap),0),breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('rules_version','employment-pay-v1','employment_type',a.employment_type,'shift_class',shift_class,'schedule_span_seconds',shift_span,'normal_cap_seconds',normal_cap,'rounding',case when a.employment_type='part_time' then 'daily_floor_30_minutes' else 'fixed_shift_pay' end,'worked_before_rounding_seconds',worked,'payable_after_rounding_seconds',payable,'required_break_count',required_breaks,'break_durations_seconds',break_values,'overtime_candidate_seconds',ot_candidate,'overtime_approved_seconds',0,'punches',coalesce(to_jsonb(points),'[]'::jsonb),'holiday_rule_version_id',pay_rule.id),presence,case when complete then worked end,case when a.employment_type='part_time' then breaks else 0 end,case when a.employment_type='full_time' and complete then required_breaks*3600 when a.employment_type='full_time' then null else 0 end,case when payable is null then null else least(payable,normal_cap) end,0,holiday.id,holiday_normal,holiday_ot) returning id into result_id;
  insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','missing_check_in','missing_check_out','odd_punch_count','impossible_ordering') then 'blocker' else 'warning' end from unnest(exceptions) code; calculated:=calculated+1;
 end loop; return calculated;
end $$;

create or replace function public.adjust_attendance_result(p_result_id uuid,p_patch jsonb,p_reason text) returns public.daily_attendance_results language plpgsql security definer set search_path=public as $$
declare prior public.daily_attendance_results; result public.daily_attendance_results; locked boolean; adjusted_payable integer;
begin
 if not public.has_permission('attendance.adjust') or nullif(trim(p_reason),'') is null then raise exception 'Attendance adjustment is not authorised.'; end if;
 select * into prior from public.daily_attendance_results where id=p_result_id and company_id=public.current_staff_company_id() and is_current for update;
 if prior.id is null then raise exception 'Current attendance result not found.'; end if;
 select exists(select 1 from public.attendance_period_locks l where l.company_id=prior.company_id and l.week_start=date_trunc('week',prior.work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=prior.branch_id)) into locked;
 if locked then raise exception 'Attendance period is locked.'; end if;
 adjusted_payable:=coalesce((p_patch->>'payable_seconds')::integer,(p_patch->>'recognised_paid_seconds')::integer,prior.payable_seconds,prior.recognised_paid_seconds);
 if adjusted_payable<0 or adjusted_payable>86400 then raise exception 'Adjusted payable time is invalid.'; end if;
 update public.daily_attendance_results set is_current=false where id=prior.id;
 insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,review_status,is_current,calculation,presence_seconds,worked_seconds,unpaid_break_seconds,paid_break_seconds,payable_seconds,overtime_seconds,holiday_id,holiday_normal_multiplier,holiday_ot_multiplier)
 values(prior.company_id,prior.staff_id,prior.branch_id,prior.work_date,prior.assignment_id,prior.import_batch_id,prior.calculation_revision+1,prior.scheduled_start,prior.scheduled_end,coalesce((p_patch->>'actual_first_in')::timestamptz,prior.actual_first_in),coalesce((p_patch->>'actual_last_out')::timestamptz,prior.actual_last_out),prior.raw_work_seconds,adjusted_payable,prior.break_seconds,prior.late_seconds,prior.early_leave_seconds,prior.pre_shift_seconds,prior.post_shift_seconds,prior.statuses,'adjusted',true,prior.calculation||jsonb_build_object('adjustment_reason',trim(p_reason),'manager_adjusted_payable_seconds',adjusted_payable),prior.presence_seconds,prior.worked_seconds,prior.unpaid_break_seconds,prior.paid_break_seconds,adjusted_payable,coalesce((p_patch->>'overtime_seconds')::integer,prior.overtime_seconds),prior.holiday_id,prior.holiday_normal_multiplier,prior.holiday_ot_multiplier) returning * into result;
 insert into public.attendance_adjustments(company_id,result_id,actor_staff_id,reason,before_state,after_state) values(prior.company_id,result.id,public.current_staff_id(),trim(p_reason),to_jsonb(prior),to_jsonb(result)); return result;
end $$;

grant select on public.attendance_pay_rule_versions,public.public_holidays,public.public_holiday_branches to authenticated;
revoke all on function public.save_attendance_pay_rules(date,numeric,numeric),public.save_public_holiday(uuid,text,date,uuid[],text,text,uuid) from public,anon;
grant execute on function public.save_attendance_pay_rules(date,numeric,numeric),public.save_public_holiday(uuid,text,date,uuid[],text,text,uuid) to authenticated;
notify pgrst,'reload schema';
