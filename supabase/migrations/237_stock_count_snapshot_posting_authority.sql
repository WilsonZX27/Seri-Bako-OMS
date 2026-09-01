-- A Stock Count is an auditable snapshot. Once a line has been captured, a
-- later Item Master status/UOM edit must not make the saved count impossible
-- to post. The line's saved UOM remains authoritative for this document.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.update_stock_count_draft_atomic(uuid,jsonb)'::regprocedure) into definition;
  if definition is null then raise exception 'update_stock_count_draft_atomic(uuid,jsonb) is unavailable'; end if;

  definition := replace(definition,
$old$        and item.status = 'active'
        and item.deleted_at is null
        and item.base_unit = nullif(trim(submitted->>'uom'), '')$old$,
$new$        and item.deleted_at is null
        and line.uom = nullif(trim(submitted->>'uom'), '')$new$);

  definition := replace(definition,
    'Draft quantity, item, or UOM is invalid.',
    'A saved Stock Count line is no longer valid. Refresh the count and review its Item/UOM setup.'
  );
  execute definition;
end $$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.post_stock_count_atomic(uuid)'::regprocedure) into definition;
  if definition is null then raise exception 'post_stock_count_atomic(uuid) is unavailable'; end if;

  definition := replace(definition,
$old$      and item.status = 'active'
      and item.deleted_at is null;$old$,
$new$      and item.deleted_at is null;$new$);

  definition := replace(definition,
$old$    if line.line_position is null or line.line_position < 1
      or line.theoretical_qty < 0 or line.physical_qty is null or line.physical_qty < 0$old$,
$new$    if line.line_position is null or line.line_position < 1
      or line.physical_qty is null or line.physical_qty < 0$new$);

  definition := replace(definition,
    'or item_row.base_unit <> line.uom',
    'or nullif(trim(line.uom), '''') is null'
  );

  definition := replace(definition,
$old$      raise exception 'Stock count line % failed item, UOM, or quantity validation.', line.line_position;$old$,
$new$      raise exception 'Stock count line % (% %) failed item, UOM, or quantity validation.',
        line.line_position, coalesce(item_row.item_code, line.item_id::text), coalesce(item_row.item_name, 'Unknown item');$new$);

  execute definition;
end $$;
