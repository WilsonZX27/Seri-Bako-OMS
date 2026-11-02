\set ON_ERROR_STOP on
begin;
-- Existing265 role policy restored only within this rolled-back fixture.
insert into permissions(permission_code,module,action) values('comp_time.approve','attendance','comp_time_approve') on conflict do nothing;
insert into role_permissions(role_id,permission_id) select r.id,p.id from roles r cross join permissions p where r.role_code='people_operations' and p.permission_code='comp_time.approve' on conflict do nothing;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where full_name='QA super_admin'),true);
set local role authenticated;
select (public.submit_comp_time_transaction('6bc2265b-4a61-474c-b70f-b46b2a3aab89','4fc74628-8411-4994-9222-bf60de2fe4ad','2033-02-07','correction',120,'Synthetic RO rejection proof',null)).id as request_id \gset
select set_config('test.request_id', :'request_id',true);
reset role;
do $$begin
 if (select count(*) from notifications where entity_type='comp_time_transactions' and entity_id=current_setting('test.request_id')::uuid)<>1 then raise exception 'recipient count mismatch';end if;
 if not exists(select 1 from notifications n join staffs s on s.id=n.recipient_staff_id where n.entity_id=current_setting('test.request_id')::uuid and s.full_name='QA people_operations' and s.company_id=n.company_id) then raise exception 'wrong recipient';end if;
end$$;
set local role authenticated;

do $$begin
 begin perform public.decide_comp_time_transaction(current_setting('test.request_id')::uuid,'reject','Own rejection');raise exception 'unexpected self success'; exception when others then if sqlerrm<>'A submitter cannot approve their own entry.' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where full_name='QA people_operations'),true);
set local role authenticated;
do $$begin
 begin perform public.decide_comp_time_transaction(current_setting('test.request_id')::uuid,'reject','   ');raise exception 'unexpected blank success'; exception when others then if sqlerrm<>'A rejection comment is required.' then raise;end if;end;
end$$;
select (public.decide_comp_time_transaction(:'request_id','reject','Synthetic correction is not required')).status;
do $$begin
 begin perform public.decide_comp_time_transaction(current_setting('test.request_id')::uuid,'reject','Retry');raise exception 'unexpected retry success'; exception when others then if sqlerrm<>'Pending comp time entry not found.' then raise;end if;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from comp_time_transactions where id=current_setting('test.request_id')::uuid and status='rejected' and minutes=120 and decided_by=(select id from staffs where full_name='QA people_operations') and decided_at is not null and decision_comment='Synthetic correction is not required') then raise exception 'audit mismatch';end if;
end$$;
rollback;
