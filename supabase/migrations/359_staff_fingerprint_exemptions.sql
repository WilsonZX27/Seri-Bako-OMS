begin;
-- Staff identity, not a name or source label, owns this exception. Policy changes
-- are dated and audited. They never manufacture attendance or paid hours.
create table public.staff_fingerprint_policies (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id), staff_id uuid not null references public.staffs(id),
 effective_from date not null, requires_fingerprint boolean not null, reason text not null check(length(trim(reason)) between 1 and 1000),
 confirmed_by uuid not null references public.staffs(id), confirmed_at timestamptz not null default now(),
 unique(company_id,staff_id,effective_from)
);
alter table public.staff_fingerprint_policies enable row level security;
revoke all on public.staff_fingerprint_policies from public,anon,authenticated;
create function public.staff_requires_fingerprint(p_company uuid,p_staff uuid,p_date date) returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce((select requires_fingerprint from public.staff_fingerprint_policies where company_id=p_company and staff_id=p_staff and effective_from<=p_date order by effective_from desc limit 1),true)
$$;
revoke all on function public.staff_requires_fingerprint(uuid,uuid,date) from public,anon,authenticated,service_role;
create function public.get_staff_fingerprint_exemptions(p_week_start date) returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(s.id),'[]') from public.staffs s where s.company_id=public.current_staff_company_id() and public.has_permission('schedule.draft')
 and exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and public.can_access_company_branch(s.company_id,sb.branch_id))
 and not exists(select 1 from generate_series(0,6) day where public.staff_requires_fingerprint(s.company_id,s.id,p_week_start+day))
$$;
revoke all on function public.get_staff_fingerprint_exemptions(date) from public,anon;
grant execute on function public.get_staff_fingerprint_exemptions(date) to authenticated;
create function public.set_staff_fingerprint_policy(p_staff_id uuid,p_effective_from date,p_requires_fingerprint boolean,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
begin
 if company is null or actor is null or not public.current_staff_has_company_role(array['super_admin']) then raise exception 'Only Owner may change a fingerprint exception.'; end if;
 if not exists(select 1 from public.staffs where id=p_staff_id and company_id=company) or p_effective_from is null or p_requires_fingerprint is null or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'A company employee, effective date and reason are required.'; end if;
 -- Append-only audit: corrections use a new effective date.
 insert into public.staff_fingerprint_policies(company_id,staff_id,effective_from,requires_fingerprint,reason,confirmed_by)
 values(company,p_staff_id,p_effective_from,p_requires_fingerprint,trim(p_reason),actor);
end $$;
revoke all on function public.set_staff_fingerprint_policy(uuid,date,boolean,text) from public,anon;
grant execute on function public.set_staff_fingerprint_policy(uuid,date,boolean,text) to authenticated;

create function public.apply_staff_fingerprint_policy() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if not public.staff_requires_fingerprint(new.company_id,new.staff_id,new.work_date) then
  new.statuses:=array(select code from unnest(new.statuses) code where code<>all(array['missing_punches','missing_check_in','missing_check_out','missing_break_punch','odd_punch_count','short_break','late','early_leave']));
  new.expected_punch_count:=0;new.missing_punch_count:=0;
  new.calculation:=coalesce(new.calculation,'{}')||jsonb_build_object('fingerprint_exempt',true,'expected_punch_count',0,'attendance_basis','owner_staff_exception');
  -- Preserve observed evidence. Absence of punches is never treated as worked time.
 end if;
 return new;
end $$;
revoke all on function public.apply_staff_fingerprint_policy() from public,anon,authenticated,service_role;
create trigger apply_staff_fingerprint_policy before insert or update on public.daily_attendance_results for each row execute function public.apply_staff_fingerprint_policy();
create function public.suppress_exempt_missing_punch_exception() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.exception_code=any(array['missing_punches','missing_check_in','missing_check_out','missing_break_punch','odd_punch_count','short_break','late','early_leave'])
 and exists(select 1 from public.daily_attendance_results r where r.id=new.result_id and not public.staff_requires_fingerprint(r.company_id,r.staff_id,r.work_date)) then return null; end if;
 return new;
end $$;
revoke all on function public.suppress_exempt_missing_punch_exception() from public,anon,authenticated,service_role;
create trigger suppress_exempt_missing_punch_exception before insert on public.attendance_exceptions for each row execute function public.suppress_exempt_missing_punch_exception();
-- The immutable import receipt is the source of these untimed roster notes.
-- It is not an attendance result and supplies no payable hours.
create function public.get_schedule_untimed_duties(p_branch_id uuid,p_week_start date)
returns table(staff_id uuid,work_date date,label text) language sql stable security definer set search_path=public as $$
 select distinct (note->>'staffId')::uuid,(note->>'date')::date,note->>'label'
 from public.schedule_workbook_receipts r cross join lateral jsonb_array_elements(coalesce(r.source_metadata->'untimedDuties','[]')) note
 where r.company_id=public.current_staff_company_id() and r.week_start=p_week_start and public.has_permission('schedule.read')
 and public.can_access_company_branch(r.company_id,p_branch_id) and (note->>'branchId')::uuid=p_branch_id
 and not public.staff_requires_fingerprint(r.company_id,(note->>'staffId')::uuid,(note->>'date')::date)
 and not exists(select 1 from public.shift_assignment_revisions a where a.company_id=r.company_id and a.staff_id=(note->>'staffId')::uuid and a.work_date=(note->>'date')::date and a.is_current)
$$;
revoke all on function public.get_schedule_untimed_duties(uuid,date) from public,anon;
grant execute on function public.get_schedule_untimed_duties(uuid,date) to authenticated;
alter function public.validate_schedule_week(uuid) rename to validate_schedule_week_before_fingerprint_notes;
revoke all on function public.validate_schedule_week_before_fingerprint_notes(uuid) from public,anon,authenticated,service_role;
create function public.validate_schedule_week(p_week_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; blockers jsonb; w public.schedule_weeks;
begin
 result:=public.validate_schedule_week_before_fingerprint_notes(p_week_id);
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id();
 select coalesce(jsonb_agg(blocker),'[]') into blockers from jsonb_array_elements(result->'blockers') blocker
 where not (blocker->>'code'='unresolved_staff_day' and exists(select 1 from public.get_schedule_untimed_duties(w.branch_id,w.week_start) n where n.staff_id=(blocker->>'staffId')::uuid and n.work_date=(blocker->>'workDate')::date));
 return result||jsonb_build_object('blockers',blockers,'status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(result->'warnings')>0 then 'warning' else 'ready' end);
end $$;
revoke all on function public.validate_schedule_week(uuid) from public,anon;
grant execute on function public.validate_schedule_week(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
