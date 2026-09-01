-- Migration 237 used exact function text and could miss PostgreSQL's
-- normalized formatting. Apply the same repair with format-tolerant patterns
-- and fail the migration unless every expected guard is actually replaced.
do $$
declare definition text; patched text;
begin
  select pg_get_functiondef('public.update_stock_count_draft_atomic(uuid,jsonb)'::regprocedure) into definition;
  patched := regexp_replace(definition, E'and item\\.status = ''active''[^\\n]*\\n\\s*and item\\.deleted_at is null', 'and item.deleted_at is null', 'g');
  definition := case when patched = definition then definition else patched end;

  patched := regexp_replace(definition, E'and item\\.base_unit = [^\\n]+', 'and line.uom = nullif(trim(submitted->>''uom''), '''')', 'g');
  if patched = definition and position('and line.uom = nullif' in definition) = 0 then raise exception 'Could not verify draft UOM snapshot guard'; end if;
  execute case when patched = definition then definition else patched end;
end $$;

do $$
declare definition text; patched text;
begin
  select pg_get_functiondef('public.post_stock_count_atomic(uuid)'::regprocedure) into definition;
  patched := regexp_replace(definition, E'and item\\.status = ''active''[^\\n]*\\n\\s*and item\\.deleted_at is null', 'and item.deleted_at is null', 'g');
  definition := case when patched = definition then definition else patched end;

  patched := regexp_replace(definition, E'or\\s+line\\.theoretical_qty\\s*<\\s*0\\s+or\\s+line\\.physical_qty\\s+is\\s+null', 'or line.physical_qty is null', 'g');
  definition := case when patched = definition then definition else patched end;

  patched := replace(definition, 'or item_row.base_unit <> line.uom', 'or nullif(trim(line.uom), '''') is null');
  if patched = definition and position('nullif(trim(line.uom)' in definition) = 0 then raise exception 'Could not verify posting UOM snapshot guard'; end if;
  execute case when patched = definition then definition else patched end;
end $$;
