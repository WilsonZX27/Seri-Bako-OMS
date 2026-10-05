-- User confirms existing values are kilograms; CTN is a label error, not a conversion.
-- No stock movement, physical quantity, cost or document snapshot is rewritten.
do $$
declare
  target_company constant uuid := '3b104582-f8cb-4a4d-867f-b99e5ffc6486';
  target_ids uuid[];
  before_counts text;
  before_ledger text;
  before_balances text;
  after_digest text;
  original jsonb;
begin
  select array_agg(id order by id),jsonb_agg(jsonb_build_object('id',id,'code',item_code,'base_unit',base_unit,'purchase_unit',purchase_unit,'factor',conversion_to_base_unit) order by id)
  into target_ids,original from public.items
  where company_id=target_company and item_code in ('QUIKGROC00060','QUIKGROC00024')
    and status='active' and deleted_at is null;
  if cardinality(target_ids) is distinct from 2 then raise exception 'Expected exactly two active confirmed KG items'; end if;
  perform 1 from public.items where id=any(target_ids) for update;
  if exists(select 1 from public.items where id=any(target_ids) and (base_unit<>'CTN' or purchase_unit<>'CTN' or conversion_to_base_unit<>1)) then
    raise exception 'Item unit configuration changed; review before applying';
  end if;
  if exists(select 1 from public.stock_count_lines where item_id=any(target_ids) and upper(uom) not in ('CTN','KG'))
    or exists(select 1 from public.supplier_items where item_id=any(target_ids) and status='active' and deleted_at is null and (upper(purchase_uom) not in ('CTN','KG') or conversion_to_base_uom is distinct from 1)) then
    raise exception 'Unexpected count or supplier units; review before applying';
  end if;
  perform 1 from public.stock_count_lines where item_id=any(target_ids) for update;
  select md5(coalesce(jsonb_agg(to_jsonb(l)-'uom'-'updated_at' order by id)::text,'')) into before_counts from public.stock_count_lines l where item_id=any(target_ids);
  select md5(jsonb_build_object('headers',(select jsonb_agg(to_jsonb(t) order by id) from public.stock_transactions t where item_id=any(target_ids)),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.stock_transaction_lines l where item_id=any(target_ids)))::text) into before_ledger;
  select md5(coalesce(jsonb_agg(jsonb_build_object('item',item_id,'branch',branch_id,'in',total_quantity_in,'out',total_quantity_out,'current',current_qty,'average_cost',average_cost) order by item_id,branch_id)::text,'')) into before_balances from public.stock_balances_summary where item_id=any(target_ids);

  update public.items set base_unit='KG',purchase_unit='KG',conversion_to_base_unit=1,updated_at=now() where id=any(target_ids);
  update public.supplier_items set purchase_uom='KG',conversion_to_base_uom=1,updated_at=now()
    where item_id=any(target_ids) and status='active' and deleted_at is null and upper(purchase_uom)='CTN';
  update public.stock_count_lines set uom='KG',updated_at=now() where item_id=any(target_ids) and upper(uom)='CTN';

  select md5(coalesce(jsonb_agg(to_jsonb(l)-'uom'-'updated_at' order by id)::text,'')) into after_digest from public.stock_count_lines l where item_id=any(target_ids);
  if before_counts is distinct from after_digest then raise exception 'Count quantities or other snapshots changed'; end if;
  select md5(jsonb_build_object('headers',(select jsonb_agg(to_jsonb(t) order by id) from public.stock_transactions t where item_id=any(target_ids)),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.stock_transaction_lines l where item_id=any(target_ids)))::text) into after_digest;
  if before_ledger is distinct from after_digest then raise exception 'Stock ledger changed'; end if;
  select md5(coalesce(jsonb_agg(jsonb_build_object('item',item_id,'branch',branch_id,'in',total_quantity_in,'out',total_quantity_out,'current',current_qty,'average_cost',average_cost) order by item_id,branch_id)::text,'')) into after_digest from public.stock_balances_summary where item_id=any(target_ids);
  if before_balances is distinct from after_digest then raise exception 'Stock balance quantities or cost changed'; end if;

  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  select target_company,'item',id,'unit_label_corrected','Corrected confirmed kilogram unit labels; quantities unchanged',
    jsonb_build_object('source','explicit_user_confirmation_2026-10-05','migration','333','before',original,'after_unit','KG','count_quantity_digest',before_counts,'ledger_digest',before_ledger,'balance_digest',before_balances),null
  from public.items where id=any(target_ids);
end $$;
