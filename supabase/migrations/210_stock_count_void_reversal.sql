-- Server-authoritative preview and atomic Stock Count reversal.

create or replace function public.preview_stock_count_void(p_stock_count_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; fingerprint text; line_count integer; total_in numeric; total_out numeric; existing_void public.stock_count_voids%rowtype;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_count.cancel') then raise exception 'Missing permission: stock_count.cancel'; end if;
  select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null;
  if count_row.id is null or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Stock Count is unavailable for this branch.'; end if;
  select * into existing_void from public.stock_count_voids where stock_count_id=count_row.id;
  select md5(coalesce(string_agg(st.id::text||':'||st.quantity_in::text||':'||st.quantity_out::text||':'||coalesce(stl.quantity_in,0)::text||':'||coalesce(stl.quantity_out,0)::text,'|' order by st.id,stl.id),'')),
         count(distinct st.id),coalesce(sum(coalesce(stl.quantity_in,st.quantity_in)),0),coalesce(sum(coalesce(stl.quantity_out,st.quantity_out)),0)
  into fingerprint,line_count,total_in,total_out
  from public.stock_transactions st left join public.stock_transaction_lines stl on stl.stock_transaction_id=st.id
  where st.reference_type='stock_count' and st.reference_id=count_row.id and st.status='posted';
  return jsonb_build_object('stock_count_id',count_row.id,'count_no',count_row.count_no,'status',count_row.status,'already_voided',existing_void.id is not null,'fingerprint',fingerprint,'adjustment_line_count',line_count,'reverse_quantity_in',total_out,'reverse_quantity_out',total_in);
end $$;

create or replace function public.void_stock_count_atomic(p_stock_count_id uuid,p_reason text,p_expected_fingerprint text,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; movement record; existing_void public.stock_count_voids%rowtype; fingerprint text; line_count integer; total_in numeric; total_out numeric; reversal_id uuid; reversal_ids jsonb:='[]'::jsonb;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_count.cancel') then raise exception 'Missing permission: stock_count.cancel'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Explain why this posted Stock Count must be voided.'; end if;
  if p_idempotency_key is null then raise exception 'A valid operation key is required.'; end if;
  select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null for update;
  if count_row.id is null or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Stock Count is unavailable for this branch.'; end if;
  select * into existing_void from public.stock_count_voids where stock_count_id=count_row.id or (company_id=count_row.company_id and idempotency_key=p_idempotency_key) order by stock_count_id=count_row.id desc limit 1;
  if existing_void.id is not null then return jsonb_build_object('id',existing_void.id,'stock_count_id',count_row.id,'already_voided',true); end if;
  if count_row.status<>'posted' then raise exception 'Only a posted Stock Count can be voided and reversed.'; end if;
  select md5(coalesce(string_agg(st.id::text||':'||st.quantity_in::text||':'||st.quantity_out::text||':'||coalesce(stl.quantity_in,0)::text||':'||coalesce(stl.quantity_out,0)::text,'|' order by st.id,stl.id),'')),
         count(distinct st.id),coalesce(sum(coalesce(stl.quantity_in,st.quantity_in)),0),coalesce(sum(coalesce(stl.quantity_out,st.quantity_out)),0)
  into fingerprint,line_count,total_in,total_out
  from public.stock_transactions st left join public.stock_transaction_lines stl on stl.stock_transaction_id=st.id
  where st.reference_type='stock_count' and st.reference_id=count_row.id and st.status='posted';
  if fingerprint is distinct from p_expected_fingerprint then raise exception 'VOID_PREVIEW_STALE: Inventory movements changed after confirmation. Review the impact and confirm again.'; end if;
  for movement in
    select st.*,coalesce(stl.item_id,st.item_id) resolved_item_id,coalesce(stl.branch_id,st.branch_id) resolved_branch_id,
      coalesce(stl.quantity_in,st.quantity_in) resolved_in,coalesce(stl.quantity_out,st.quantity_out) resolved_out,coalesce(stl.unit_cost,st.unit_cost,0) resolved_cost
    from public.stock_transactions st left join public.stock_transaction_lines stl on stl.stock_transaction_id=st.id
    where st.reference_type='stock_count' and st.reference_id=count_row.id and st.status='posted'
    order by st.id,stl.id
  loop
    perform public.inventory_lock_item_branch(movement.resolved_item_id,movement.resolved_branch_id);
    reversal_id:=public.insert_inventory_movement(
      'RV-'||left(movement.transaction_no,46),count_row.document_id,movement.resolved_branch_id,movement.resolved_item_id,
      'stock_count_adjustment',(now() at time zone 'Asia/Kuala_Lumpur')::date,movement.resolved_out,movement.resolved_in,movement.resolved_cost,actor.id,
      'Reversal of '||movement.transaction_no||' after voiding Stock Count '||count_row.count_no,
      'stock_count_void',count_row.id
    );
    reversal_ids:=reversal_ids||jsonb_build_array(reversal_id);
  end loop;
  insert into public.stock_count_voids(company_id,stock_count_id,movement_fingerprint,adjustment_line_count,reversed_quantity_in,reversed_quantity_out,reason,idempotency_key,voided_by)
  values(count_row.company_id,count_row.id,fingerprint,line_count,total_out,total_in,trim(p_reason),p_idempotency_key,actor.id) returning * into existing_void;
  update public.stock_counts set status='voided',updated_by=actor.id,updated_at=now() where id=count_row.id;
  if count_row.document_id is not null then update public.documents set status='cancelled',current_step='Voided and reversed',updated_by=actor.id,updated_at=now() where id=count_row.document_id; end if;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(count_row.company_id,'stock_count',count_row.id,'voided_and_reversed','Posted Stock Count voided and inventory movements reversed',jsonb_build_object('reason',trim(p_reason),'fingerprint',fingerprint,'adjustment_line_count',line_count,'reverse_quantity_in',total_out,'reverse_quantity_out',total_in,'reversal_transaction_ids',reversal_ids,'business_data_changed',true),actor.id);
  return jsonb_build_object('id',existing_void.id,'stock_count_id',count_row.id,'already_voided',false,'adjustment_line_count',line_count,'reversal_transaction_ids',reversal_ids);
end $$;

revoke all on function public.preview_stock_count_void(uuid),public.void_stock_count_atomic(uuid,text,text,uuid) from public,anon;
grant execute on function public.preview_stock_count_void(uuid),public.void_stock_count_atomic(uuid,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
