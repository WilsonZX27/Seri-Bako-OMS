-- Candidate only. Install before the matching app; no role/business permission grants.
-- Existing save RPCs remain callable by the old app. Every record/line write
-- invalidates snapshots held by the new app, including legacy and DO writers.
begin;
alter table public.outlet_daily_records add column edit_revision bigint not null default 0;
create function public.bump_outlet_daily_edit_revision() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
 new.edit_revision:=old.edit_revision+1;
 return new;
end $$;
revoke all on function public.bump_outlet_daily_edit_revision() from public,anon,authenticated;
create trigger bump_outlet_daily_edit_revision before update on public.outlet_daily_records
 for each row execute function public.bump_outlet_daily_edit_revision();
create function public.touch_outlet_daily_line_revision() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op='UPDATE' and new is not distinct from old then return null; end if;
 update public.outlet_daily_records set edit_revision=edit_revision
 where id=case when tg_op='DELETE' then old.record_id else new.record_id end;
 if tg_op='UPDATE' and old.record_id<>new.record_id then
  update public.outlet_daily_records set edit_revision=edit_revision where id=old.record_id;
 end if;
 return null;
end $$;
revoke all on function public.touch_outlet_daily_line_revision() from public,anon,authenticated;
create trigger touch_outlet_daily_line_revision after insert or update or delete on public.outlet_daily_record_lines
 for each row execute function public.touch_outlet_daily_line_revision();

create function public.save_outlet_daily_record_checked(
 p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text,
 p_expected_revision bigint,p_include_sales boolean,p_pos_total_sales numeric,p_sales_breakdown jsonb,p_sales_variance_reason text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor uuid; company uuid; current_revision bigint; saved uuid; sales_saved boolean:=false;
begin
 actor:=public.current_staff_id(); company:=public.current_staff_company_id();
 if actor is null or company is null then raise exception 'Active staff access is required.'; end if;
 if p_record_id is null then
  if not public.has_permission('outlet_daily_record.create') then raise exception 'Missing permission: outlet_daily_record.create'; end if;
 else
  if not public.has_permission('outlet_daily_record.update') and not public.has_permission('outlet_daily_record.qty_sent') then
   raise exception 'Missing permission to update this outlet daily record.';
  end if;
  select r.edit_revision into current_revision from public.outlet_daily_records r
   where r.id=p_record_id and r.company_id=company and public.can_access_outlet_daily_branch(r.branch_id) for update;
  if not found then raise exception 'Outlet daily record was not found or access is denied.'; end if;
  if p_expected_revision is null or p_expected_revision<>current_revision then
   raise exception 'ODR_CONFLICT: This record changed in another session. Your entries are still here. Open the latest record in another tab and compare before reloading.';
  end if;
 end if;
 -- Existing functions own every quantity, status, dispatch-source and role guard.
 if p_include_sales then
  begin
   saved:=public.save_outlet_daily_record_v92(p_record_id,p_branch_id,p_record_date,p_notes,p_lines,p_target_status,p_pos_total_sales,p_sales_breakdown,p_sales_variance_reason);
   sales_saved:=true;
  exception when undefined_table or undefined_function then
   -- PL/pgSQL rolls the attempted save back before the quantity-only fallback.
   saved:=public.save_outlet_daily_record(p_record_id,p_branch_id,p_record_date,p_notes,p_lines,p_target_status);
  end;
 else
  saved:=public.save_outlet_daily_record(p_record_id,p_branch_id,p_record_date,p_notes,p_lines,p_target_status);
 end if;
 return jsonb_build_object('record_id',saved,'sales_saved',sales_saved);
end $$;
revoke all on function public.save_outlet_daily_record_checked(uuid,uuid,date,text,jsonb,text,bigint,boolean,numeric,jsonb,text) from public,anon;
-- Same authenticated RPC entry boundary as existing saves; guards above grant no role authority.
grant execute on function public.save_outlet_daily_record_checked(uuid,uuid,date,text,jsonb,text,bigint,boolean,numeric,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
