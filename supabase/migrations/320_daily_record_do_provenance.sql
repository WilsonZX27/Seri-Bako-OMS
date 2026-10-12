-- Preserve the established save and POS contract, adding source locks and explicit confirmations.
alter function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) rename to save_outlet_daily_record_before_planning;
revoke all on function public.save_outlet_daily_record_before_planning(uuid,uuid,date,text,jsonb,text) from public,anon,authenticated;
create function public.save_outlet_daily_record(p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid; r public.outlet_daily_records%rowtype; x jsonb; normalized jsonb:='[]'; l public.outlet_daily_record_lines%rowtype;
begin
 if p_record_id is not null then
  select * into r from public.outlet_daily_records where id=p_record_id for update;
  if exists(select 1 from public.outlet_daily_record_lines where record_id=p_record_id and do_managed) and (r.branch_id<>p_branch_id or r.record_date<>p_record_date) then raise exception 'DO-managed daily records cannot change outlet or date.'; end if;
 end if;
 for x in select value from jsonb_array_elements(p_lines) loop
  select * into l from public.outlet_daily_record_lines where record_id=p_record_id and product_id=(x->>'product_id')::uuid;
  if l.do_managed then x:=x||jsonb_build_object('qty_sent',l.qty_sent); end if;
  if public.has_permission('outlet_daily_record.update') and p_target_status='evening_completed' then
   if not coalesce((x->>'morning_received_provided')::boolean,false) then raise exception 'Received must be independently confirmed, including zero.'; end if;
   if not coalesce((x->>'wastage_provided')::boolean,false) then raise exception 'Wastage must be independently confirmed, including zero.'; end if;
  end if;
  normalized:=normalized||jsonb_build_array(x);
 end loop;
 rid:=public.save_outlet_daily_record_before_planning(p_record_id,p_branch_id,p_record_date,p_notes,normalized,p_target_status);
 if public.has_permission('outlet_daily_record.update') then
  for x in select value from jsonb_array_elements(normalized) loop
   update public.outlet_daily_record_lines set stockout=coalesce((x->>'stockout')::boolean,false),stockout_time=nullif(x->>'stockout_time','')::time,
   wastage_provided=coalesce((x->>'wastage_provided')::boolean,false)
   where record_id=rid and product_id=(x->>'product_id')::uuid;
  end loop;
 end if;
 return rid;
end $$;
revoke all on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) from public,anon;
grant execute on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
