-- Migration 175 introduced supplier-UOM conversion for purchase returns.
-- Keep the PL/pgSQL po_line variable distinct from the SQL JOIN alias so
-- PostgreSQL cannot resolve po_line.id/uom ambiguously at runtime.
do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.post_purchase_return_atomic(uuid)'::regprocedure);
  if position('join public.purchase_order_lines po_line on' in definition) = 0 then
    return;
  end if;
  definition := replace(definition,
    'upper(trim(i.base_unit))=upper(trim(po_line.uom))',
    'upper(trim(i.base_unit))=upper(trim(pol.uom))');
  definition := replace(definition,
    'join public.purchase_order_lines po_line on po_line.id=grn_line.purchase_order_line_id and po_line.purchase_order_id=po.id',
    'join public.purchase_order_lines pol on pol.id=grn_line.purchase_order_line_id and pol.purchase_order_id=po.id');
  definition := replace(definition,
    'join public.items i on i.id=po_line.item_id and i.company_id=po.company_id and i.deleted_at is null',
    'join public.items i on i.id=pol.item_id and i.company_id=po.company_id and i.deleted_at is null');
  definition := replace(definition,
    'si.item_id=po_line.item_id',
    'si.item_id=pol.item_id');
  definition := replace(definition,
    'upper(trim(si.purchase_uom))=upper(trim(po_line.uom))',
    'upper(trim(si.purchase_uom))=upper(trim(pol.uom))');
  execute definition;
end $$;

comment on function public.post_purchase_return_atomic(uuid) is
  'Tenant-scoped supplier-UOM purchase return posting with unambiguous conversion lookup.';
