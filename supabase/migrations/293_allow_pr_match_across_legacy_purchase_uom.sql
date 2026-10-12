-- Old Item Master records can have a supplier relationship whose stored UOM
-- differs from the unit written on an imported PR. Keep the PR's requested UOM,
-- reuse the verified supplier relationship, and leave the provisional cost at
-- zero when units differ so Purchasing must price the actual order unit.
begin;

do $$
declare
  target regprocedure := 'public.resolve_purchase_request_unresolved_line(uuid,uuid,uuid)'::regprocedure;
  source text := pg_get_functiondef(target);
begin
  if position('select si.unit_cost into mapped_unit_cost' in source) = 0
     or position('where bsi.branch_id=request_row.branch_id and bsi.item_id=target_item_id' in source) = 0
     or position('and upper(trim(si.purchase_uom))=upper(trim(unresolved_row.requested_uom))' in source) = 0 then
    raise exception 'PR item match function shape changed; review migration 293 before applying.';
  end if;

  source := replace(source,
    'select si.unit_cost into mapped_unit_cost',
    'select case when upper(trim(si.purchase_uom))=upper(trim(unresolved_row.requested_uom)) then si.unit_cost else 0 end into mapped_unit_cost');
  source := replace(source,
    'where bsi.branch_id=request_row.branch_id and bsi.item_id=target_item_id',
    'where bsi.item_id=target_item_id');
  source := replace(source,
    E'    and upper(trim(si.purchase_uom))=upper(trim(unresolved_row.requested_uom))\n  order by bsi.is_preferred desc,si.updated_at desc limit 1;',
    E'  order by (bsi.branch_id=request_row.branch_id) desc, (upper(trim(si.purchase_uom))=upper(trim(unresolved_row.requested_uom))) desc, bsi.is_preferred desc,si.updated_at desc limit 1;');
  source := replace(source,
    'select item.cost into mapped_unit_cost',
    'select case when upper(trim(coalesce(item.purchase_unit,item.base_unit)))=upper(trim(unresolved_row.requested_uom)) then item.cost else 0 end into mapped_unit_cost');
  source := replace(source,
    E'      and upper(trim(coalesce(item.purchase_unit,item.base_unit)))=upper(trim(unresolved_row.requested_uom))\n      and not exists (',
    E'      and not exists (');
  execute source;
end
$$;

notify pgrst, 'reload schema';

commit;
