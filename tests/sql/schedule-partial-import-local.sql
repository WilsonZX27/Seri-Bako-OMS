-- Run only against the disposable synthetic release fixture. Rolls back all data.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub',s.auth_user_id::text,true),
 set_config('test.schedule_staff',staff.id::text,true),
 set_config('test.schedule_branch',sb.branch_id::text,true)
from public.staffs s join auth.users u on u.id=s.auth_user_id
join public.staffs staff on staff.company_id=s.company_id and staff.full_name='Synthetic staff'
join public.staff_branches sb on sb.staff_id=staff.id
where u.email like 'release-%' and s.full_name='Synthetic owner' limit 1;
set local role authenticated;
do $$
declare payload jsonb; first_result jsonb; replay jsonb; before_row jsonb; after_row jsonb; rejected boolean:=false;
begin
 if public.current_staff_id() is null then raise exception 'Synthetic fixture unavailable'; end if;
 payload:=jsonb_build_array(jsonb_build_object('branch_id',current_setting('test.schedule_branch'),'assignments',jsonb_build_array(jsonb_build_object('staff_id',current_setting('test.schedule_staff'),'work_date','2026-10-19','assignment_kind','off','shift_template_id',null))));
 first_result:=public.append_schedule_workbook_drafts('2026-10-19','synthetic.xlsx',repeat('a',64),payload,0,'{}',repeat('b',64));
 select to_jsonb(a) into before_row from public.shift_assignment_revisions a where staff_id=current_setting('test.schedule_staff')::uuid and work_date='2026-10-19' and is_current;
 replay:=public.append_schedule_workbook_drafts('2026-10-19','synthetic.xlsx',repeat('a',64),payload,0,'{}',repeat('b',64));
 if (replay->>'idempotent')::boolean is distinct from true then raise exception 'Retry was not idempotent'; end if;
 begin
  perform public.append_schedule_workbook_drafts('2026-10-19','synthetic.xlsx',repeat('a',64),payload,0,'{}',repeat('c',64));
 exception when others then
  if sqlerrm not like '%cannot be replaced%' then raise; end if; rejected:=true;
 end;
 if not rejected then raise exception 'Existing day was overwritten'; end if;
 payload:=jsonb_set(payload,'{0,assignments,0,work_date}','"2026-10-20"');
 perform public.append_schedule_workbook_drafts('2026-10-19','synthetic.xlsx',repeat('a',64),payload,0,'{}',repeat('d',64));
 select to_jsonb(a) into after_row from public.shift_assignment_revisions a where staff_id=current_setting('test.schedule_staff')::uuid and work_date='2026-10-19' and is_current;
 if before_row is distinct from after_row then raise exception 'Appending a day changed the existing revision'; end if;
 if (select count(*) from public.shift_assignment_revisions where staff_id=current_setting('test.schedule_staff')::uuid and work_date between '2026-10-19' and '2026-10-20' and is_current)<>2 then raise exception 'Partial append did not preserve both days'; end if;
 raise notice 'PASS: idempotent retry, existing-day rejection, partial append preserves exact original row';
end $$;
rollback;
