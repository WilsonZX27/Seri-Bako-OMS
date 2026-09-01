-- Migration 237 used exact function text and could miss PostgreSQL's
-- normalized formatting. Apply the same repair with format-tolerant patterns
-- and fail the migration unless every expected guard is actually replaced.
do $$
declare definition text; patched text;
begin
  select pg_get_functiondef('public.update_stock_count_draft_atomic(uuid,jsonb)'::regprocedure) into definition;
  patched := regexp_replace(definition, E'and item\\.status = ''active''[^\\n]*\\n\\s*and item\\.deleted_at is null', 'and item.deleted_at is null', 'g');
  if patched = definition then raise exception 'Could not patch draft Item status guard'; end if;
  definition := patched;

  patched := regexp_replace(definition, E'and item\\.base_unit = [^\\n]+', 'and line.uom = nullif(trim(submitted->>''uom''), '''')', 'g');
  if patched = definition then raise exception 'Could not patch draft UOM snapshot guard'; end if;
  execute patched;
end $$;

do $$
declare definition text; patched text;
begin
  select pg_get_functiondef('public.post_stock_count_atomic(uuid)'::regprocedure) into definition;
  patched := regexp_replace(definition, E'and item\\.status = ''active''[^\\n]*\\n\\s*and item\\.deleted_at is null', 'and item.deleted_at is null', 'g');
  if patched = definition then raise exception 'Could not patch posting Item status guard'; end if;
  definition := patched;

  patched := regexp_replace(definition, E'or\\s+line\\.theoretical_qty\\s*<\\s*0\\s+or\\s+line\\.physical_qty\\s+is\\s+null', 'or line.physical_qty is null', 'g');
  if patched = definition then raise exception 'Could not patch negative snapshot guard'; end if;
  definition := patched;

  patched := replace(definition, 'or item_row.base_unit <> line.uom', 'or nullif(trim(line.uom), '''') is null');
  if patched = definition then raise exception 'Could not patch posting UOM snapshot guard'; end if;
  execute patched;
end $$;
