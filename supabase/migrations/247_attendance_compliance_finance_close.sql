-- Attendance identity correction, configurable outlet compliance, and Finance GRN closure.

create or replace function public.get_schedule_staff(p_branch_id uuid)
returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text)
language sql security definer set search_path=public stable as $$
  select distinct s.id,s.full_name,s.staff_code,s.status,s.employment_type
  from public.staffs s
  join public.staff_branches sb on sb.staff_id=s.id and sb.branch_id=p_branch_id
  join public.staff_roles sr on sr.staff_id=s.id
    and sr.is_primary=true and sr.effective_from<=current_date
    and (sr.effective_to is null or sr.effective_to>=current_date)
  join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
  where s.company_id=public.current_staff_company_id() and s.status='active' and s.deleted_at is null
    and r.role_code in ('outlet_staff','outlet_supervisor')
    and public.can_access_company_branch(s.company_id,p_branch_id)
    and public.has_permission('schedule.read')
    and (s.id=public.current_staff_id() or public.has_any_permission(array['schedule.draft','schedule.submit','schedule.approve','schedule.swap_review']))
  order by s.full_name,s.id
$$;

insert into public.compliance_types(company_id,type_code,type_name,subject_kind,is_sensitive)
select c.id,'PEST_CONTROL','Pest control','outlet',false from public.companies c
on conflict(company_id,type_code) do update set type_name=excluded.type_name,status='active',deleted_at=null;

insert into public.outlet_compliance_requirements(company_id,branch_id,compliance_type_id,is_required)
select b.company_id,b.id,t.id,true from public.branches b join public.compliance_types t on t.company_id=b.company_id and t.type_code='PEST_CONTROL'
where b.branch_type='outlet' and b.status='active' and b.deleted_at is null
on conflict(branch_id,compliance_type_id) do update set is_required=true;

alter table public.goods_receivings add column if not exists finance_closed_at timestamptz;
alter table public.goods_receivings add column if not exists finance_closed_by uuid references public.staffs(id);
alter table public.goods_receivings add column if not exists finance_close_note text;

insert into public.permissions(permission_code,module,action,description)
values('goods_receiving.close','goods_receiving','close','Close a posted receiving after Finance verification')
on conflict(permission_code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.permission_code='goods_receiving.close'
where r.role_code in ('super_admin','finance') and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

create or replace function public.close_goods_receiving(p_goods_receiving_id uuid,p_reason text)
returns public.goods_receivings language plpgsql security definer set search_path=public as $$
declare actor uuid:=public.current_staff_id(); company uuid:=public.current_staff_company_id(); target public.goods_receivings;
begin
  if actor is null or company is null or not public.has_permission('goods_receiving.close') then raise exception 'Finance closure is not authorised.'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A Finance closure note is required.'; end if;
  select * into target from public.goods_receivings where id=p_goods_receiving_id and company_id=company and deleted_at is null for update;
  if target.id is null then raise exception 'Goods receiving is not available in your organisation.'; end if;
  if target.status<>'posted' then raise exception 'Only a posted receiving can be closed by Finance.'; end if;
  if target.finance_closed_at is not null then return target; end if;
  update public.goods_receivings set finance_closed_at=now(),finance_closed_by=actor,finance_close_note=trim(p_reason),updated_by=actor where id=target.id returning * into target;
  if target.document_id is not null then update public.documents set status='closed',updated_by=actor where id=target.document_id and company_id=company; end if;
  insert into public.audit_logs(company_id,table_name,record_id,entity_type,entity_id,action,new_values,changed_by,created_by)
  values(company,'goods_receivings',target.id,'goods_receivings',target.id,'finance_close',jsonb_build_object('reason',trim(p_reason),'closed_at',target.finance_closed_at),actor,actor);
  return target;
end $$;

revoke all on function public.close_goods_receiving(uuid,text) from public,anon;
grant execute on function public.close_goods_receiving(uuid,text) to authenticated;
revoke all on function public.get_schedule_staff(uuid) from public,anon;
grant execute on function public.get_schedule_staff(uuid) to authenticated;
notify pgrst,'reload schema';
