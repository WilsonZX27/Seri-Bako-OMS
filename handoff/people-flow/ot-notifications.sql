\set ON_ERROR_STOP on
begin;
insert into permissions(permission_code,module,action) values('attendance.ot.approve','attendance','approve') on conflict do nothing;
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permissions p where r.role_code='people_operations' and p.permission_code='attendance.ot.approve' on conflict do nothing;
insert into daily_attendance_results(company_id,staff_id,branch_id,work_date,overtime_candidate_seconds,calculation) select company_id,id,default_branch_id,'2033-03-07',3600,'{"punches":[]}' from staffs where full_name='QA super_admin' returning id as result_id \gset
select set_config('test.result', :'result_id',true);
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where full_name='QA super_admin'),true);
set local role authenticated;
do $$begin
 begin perform public.submit_attendance_ot_claim(current_setting('test.result')::uuid,90,'Synthetic',null);raise exception 'unexpected excess success'; exception when others then if sqlerrm<>'Requested OT exceeds the calculated candidate.' then raise;end if;end;
 begin perform public.submit_attendance_ot_claim(current_setting('test.result')::uuid,30,' ',null);raise exception 'unexpected blank success'; exception when others then if sqlerrm<>'OT claim submission is not authorised.' then raise;end if;end;
 begin perform public.submit_attendance_ot_claim(current_setting('test.result')::uuid,31,'Synthetic',null);raise exception 'unexpected unit success'; exception when others then if sqlerrm<>'OT claim submission is not authorised.' then raise;end if;end;
end$$;
select (public.submit_attendance_ot_claim(:'result_id',30,'Synthetic own claim',null)).id as claim_id \gset
select set_config('test.claim', :'claim_id',true);
do $$begin
 begin perform public.submit_attendance_ot_claim(current_setting('test.result')::uuid,30,'Retry',null);raise exception 'unexpected repeat success'; exception when unique_violation then null;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from attendance_ot_claims where id=current_setting('test.claim')::uuid and status='submitted' and requested_minutes=30 and candidate_minutes=60 and submitted_by=staff_id and decided_by is null) then raise exception 'claim audit mismatch';end if;
end$$;
insert into attendance_period_locks(company_id,branch_id,week_start,locked_by) select company_id,default_branch_id,'2033-03-07',id from staffs where full_name='QA super_admin';
set local role authenticated;
do $$begin
 begin perform public.submit_attendance_ot_claim(current_setting('test.result')::uuid,30,'Locked',null);raise exception 'unexpected locked success'; exception when others then if sqlerrm<>'Attendance period is locked.' then raise;end if;end;
end$$;
reset role;
update daily_attendance_results set is_current=false where id=:'result_id';
set local role authenticated;
do $$begin
 begin perform public.submit_attendance_ot_claim(current_setting('test.result')::uuid,30,'Stale',null);raise exception 'unexpected stale success'; exception when others then if sqlerrm<>'Attendance result is not available.' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where full_name='QA outlet_staff'),true);
set local role authenticated;
do $$begin
 begin perform public.submit_attendance_ot_claim(current_setting('test.result')::uuid,30,'Forbidden',null);raise exception 'unexpected role success'; exception when others then if sqlerrm<>'OT claim submission is not authorised.' then raise;end if;end;
end$$;
reset role;
do $$begin
 if (select count(*) from notifications where entity_type='attendance_ot_claims' and entity_id=current_setting('test.claim')::uuid)<>1 then raise exception 'OT notify count';end if;
 if not exists(select 1 from notifications n join staffs s on s.id=n.recipient_staff_id where n.entity_id=current_setting('test.claim')::uuid and s.full_name='QA people_operations' and s.company_id=n.company_id) then raise exception 'OT recipient';end if;
end$$;
select 'PASS own pending claim, audit, excess, blank, units, duplicate, stale, role' as result;
insert into comp_time_transactions(company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,submitted_by,reverses_ot_claim_id)
select company_id,staff_id,branch_id,work_date,'correction',-30,'Synthetic reversal unchanged',submitted_by,id from attendance_ot_claims where id=current_setting('test.claim')::uuid returning id as reversal_id \gset
select set_config('test.reversal', :'reversal_id',true);
do $$begin
 if exists(select 1 from notifications where entity_type='comp_time_transactions' and entity_id=current_setting('test.reversal')::uuid) then raise exception 'reversal behavior changed';end if;
end$$;
rollback;
