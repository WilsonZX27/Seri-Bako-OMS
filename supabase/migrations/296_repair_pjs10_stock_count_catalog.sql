-- Repair PJS10 count eligibility and unit semantics reported during the
-- 2026-09-16 kitchen count. Preserve posted quantities and ledger movements;
-- only their incorrectly configured unit labels are corrected.

do $$
declare
  target_company uuid;
  target_branch uuid;
  quik_supplier uuid;
  actor uuid;
  corn_item uuid;
  corn_supplier_item uuid;
begin
  select id,company_id into target_branch,target_company
  from public.branches
  where (upper(branch_code) like '%PJS10%' or upper(branch_name) like '%PJS10%')
    and status='active' and deleted_at is null
  order by case when upper(branch_code)='PJS10' then 0 else 1 end,id
  limit 1;
  if target_branch is null then raise exception 'Active PJS10 branch was not found.'; end if;

  select id into quik_supplier from public.suppliers
  where company_id=target_company and upper(name)='QUIK GROCER MART SDN BHD'
    and status='active' and deleted_at is null limit 1;
  if quik_supplier is null then raise exception 'Active Quik Grocer supplier was not found.'; end if;
  select id into actor from public.staffs where company_id=target_company and status='active' and deleted_at is null order by created_at,id limit 1;

  update public.items
  set base_unit='KG',purchase_unit='KG',conversion_to_base_unit=1,updated_at=now()
  where company_id=target_company and item_code in ('QUIKGROC00051','QUIKGROC00060','QUIKGROC00128')
    and status='active' and deleted_at is null;

  update public.supplier_items si
  set purchase_uom='KG',conversion_to_base_uom=1,updated_at=now(),updated_by=coalesce(updated_by,actor)
  from public.items i
  where si.item_id=i.id and i.company_id=target_company
    and i.item_code in ('QUIKGROC00051','QUIKGROC00060','QUIKGROC00128')
    and si.status='active' and si.deleted_at is null;

  update public.stock_count_lines l
  set uom='KG',updated_at=now()
  from public.items i
  where l.item_id=i.id and i.company_id=target_company
    and i.item_code in ('QUIKGROC00051','QUIKGROC00060','QUIKGROC00128');

  select id into corn_item from public.items where company_id=target_company and item_code='QUIKGROC00138' order by (deleted_at is null) desc,created_at desc limit 1;
  if corn_item is null then
    insert into public.items(company_id,item_code,autocount_code,item_name,category,purchase_unit,base_unit,conversion_to_base_unit,supplier_id,cost,safety_stock,lead_time_days,moq,status)
    select target_company,'QUIKGROC00138','QUIKGROC00138','CORN FLOUR',coalesce(source.category,'Grocery'),'KG','KG',1,quik_supplier,0,0,0,0,'active'
    from (select category from public.items where company_id=target_company and item_code='ORIENTAL00121' limit 1) source
    returning id into corn_item;
  else
    update public.items set item_name='CORN FLOUR',purchase_unit='KG',base_unit='KG',conversion_to_base_unit=1,
      supplier_id=quik_supplier,status='active',deleted_at=null,updated_at=now() where id=corn_item;
  end if;

  select id into corn_supplier_item from public.supplier_items where supplier_id=quik_supplier and item_id=corn_item order by (deleted_at is null) desc,created_at desc limit 1;
  if corn_supplier_item is null then
    insert into public.supplier_items(company_id,supplier_id,item_id,supplier_item_code,supplier_item_name,purchase_uom,conversion_to_base_uom,unit_cost,moq,lead_time_days,valid_from,status,created_by,updated_by)
    values(target_company,quik_supplier,corn_item,'QUIKGROC00138','CORN FLOUR','KG',1,0,0,0,current_date,'active',actor,actor);
  else
    update public.supplier_items set supplier_item_code='QUIKGROC00138',supplier_item_name='CORN FLOUR',purchase_uom='KG',
      conversion_to_base_uom=1,status='active',deleted_at=null,updated_at=now(),updated_by=actor where id=corn_supplier_item;
  end if;

  update public.stock_count_item_retirements r
  set status='cancelled',updated_at=now()
  from public.items i
  where r.item_id=i.id and r.branch_id=target_branch and i.item_code='QUIKGROC00060'
    and r.status='applied' and r.actual_qty>0;

  insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,retirement_reason,retirement_note,last_physical_qty,pending_stock_count_id,retired_stock_count_id,retired_by,retired_at,restored_by,restored_at,created_by,updated_by)
  select target_company,target_branch,i.id,'active',null,null,null,null,null,null,null,actor,now(),actor,actor
  from public.items i
  where i.company_id=target_company and i.item_code in ('OIYIN00023','QUIKGROC00060','QUIKGROC00138')
    and i.status='active' and i.deleted_at is null
  on conflict(branch_id,item_id) do update set status='active',retirement_reason=null,retirement_note=null,
    pending_stock_count_id=null,restored_by=actor,restored_at=now(),updated_by=actor,updated_at=now();
end $$;

-- A branch item can only leave future counts after the final physical stock is
-- zero. This prevents a mistap from hiding live inventory.
create or replace function public.sync_stock_count_item_retirements(p_stock_count_id uuid,p_retirements jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; entry record; kept uuid[]:=array[]::uuid[];
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['stock_count.create','stock_count.update']) then raise exception 'Missing permission: stock_count.update'; end if;
  select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null for update;
  if count_row.id is null or count_row.status<>'draft' or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Only an accessible draft Stock Count can schedule item retirement.'; end if;
  for entry in select * from jsonb_to_recordset(coalesce(p_retirements,'[]'::jsonb)) as x(line_id uuid,item_id uuid,reason text,note text,actual_qty numeric) loop
    if entry.reason not in ('used_up','wrong_or_duplicate_code','branch_no_longer_uses','other') or length(trim(coalesce(entry.note,'')))<3 or entry.actual_qty<>0 then raise exception 'An item can retire only after its final physical count is zero.'; end if;
    if not exists(select 1 from public.stock_count_lines l where l.id=entry.line_id and l.stock_count_id=count_row.id and l.item_id=entry.item_id) then raise exception 'Retirement line is outside this Stock Count.'; end if;
    insert into public.stock_count_item_retirements(company_id,stock_count_id,stock_count_line_id,branch_id,item_id,reason,note,actual_qty,status,requested_by)
    values(count_row.company_id,count_row.id,entry.line_id,count_row.branch_id,entry.item_id,entry.reason,trim(entry.note),0,'pending',actor.id)
    on conflict(stock_count_id,item_id) do update set stock_count_line_id=excluded.stock_count_line_id,reason=excluded.reason,note=excluded.note,actual_qty=0,status='pending',requested_by=actor.id,updated_at=now();
    kept:=array_append(kept,entry.item_id);
  end loop;
  update public.stock_count_item_retirements set status='cancelled',updated_at=now()
  where stock_count_id=count_row.id and status='pending' and not(item_id=any(kept));
  return jsonb_build_object('stock_count_id',count_row.id,'pending_count',coalesce(array_length(kept,1),0));
end $$;

revoke all on function public.sync_stock_count_item_retirements(uuid,jsonb) from public,anon;
grant execute on function public.sync_stock_count_item_retirements(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
