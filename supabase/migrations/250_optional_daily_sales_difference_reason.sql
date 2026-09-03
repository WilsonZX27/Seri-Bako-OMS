-- A sales mismatch is an operational attention signal, not a posting blocker.
-- Keep the optional reason and persist needs_review for back-office follow-up.
create or replace function public.save_outlet_daily_record_v92(
  p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text,
  p_pos_total_sales numeric,p_sales_breakdown jsonb,p_sales_variance_reason text
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  saved_id uuid;
  channel_row jsonb;
  channel_total numeric:=0;
  difference numeric;
  can_edit boolean:=public.has_permission('outlet_daily_record.update');
begin
  saved_id:=public.save_outlet_daily_record(p_record_id,p_branch_id,p_record_date,p_notes,p_lines,p_target_status);
  if can_edit then
    if p_pos_total_sales is null then
      if p_target_status='evening_completed' then raise exception 'POS Total Sales is required before completing this record.'; end if;
      return saved_id;
    end if;
    if p_pos_total_sales<0 then raise exception 'POS Total Sales cannot be negative.'; end if;
    if jsonb_typeof(p_sales_breakdown)<>'array' or jsonb_array_length(p_sales_breakdown)<>5 then raise exception 'All five sales channels are required.'; end if;
    delete from public.outlet_daily_sales_breakdowns where record_id=saved_id;
    for channel_row in select value from jsonb_array_elements(p_sales_breakdown) loop
      if channel_row->>'channel' not in ('duitnow','credit_card','voucher','grabfood','foodpanda') then raise exception 'Invalid sales channel.'; end if;
      if coalesce((channel_row->>'amount')::numeric,0)<0 then raise exception 'Sales amounts cannot be negative.'; end if;
      insert into public.outlet_daily_sales_breakdowns(record_id,channel,amount) values(saved_id,channel_row->>'channel',coalesce((channel_row->>'amount')::numeric,0));
      channel_total:=channel_total+coalesce((channel_row->>'amount')::numeric,0);
    end loop;
    difference:=round(p_pos_total_sales-channel_total,2);
    update public.outlet_daily_records set
      pos_total_sales=round(p_pos_total_sales,2),
      sales_variance_reason=nullif(trim(coalesce(p_sales_variance_reason,'')),''),
      sales_review_status=case when difference=0 then 'not_required' else 'needs_review' end
    where id=saved_id;
  end if;
  return saved_id;
end $$;

revoke all on function public.save_outlet_daily_record_v92(uuid,uuid,date,text,jsonb,text,numeric,jsonb,text) from public,anon;
grant execute on function public.save_outlet_daily_record_v92(uuid,uuid,date,text,jsonb,text,numeric,jsonb,text) to authenticated;
notify pgrst,'reload schema';
