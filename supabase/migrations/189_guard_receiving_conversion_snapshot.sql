-- Guard the progressive receiving contract at the database boundary.
-- The browser normally submits the derived factor, but the actual Purchase
-- and Base quantities are authoritative when an unknown pack is confirmed.
-- Derive the immutable snapshot before the posting RPC can write an audit row.

create or replace function public.ensure_goods_receiving_line_conversion_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.conversion_to_base_uom_snapshot is null then
    if coalesce(new.received_qty, 0) > 0 and coalesce(new.received_base_qty, 0) > 0 then
      new.conversion_to_base_uom_snapshot := new.received_base_qty / new.received_qty;
      new.conversion_source := coalesce(nullif(btrim(new.conversion_source), ''), 'receiving_confirmed');
    elsif coalesce(new.rejected_qty, 0) > 0 and coalesce(new.rejected_base_qty, 0) > 0 then
      new.conversion_to_base_uom_snapshot := new.rejected_base_qty / new.rejected_qty;
      new.conversion_source := coalesce(nullif(btrim(new.conversion_source), ''), 'receiving_confirmed');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists goods_receiving_line_conversion_snapshot_guard on public.goods_receiving_lines;
create trigger goods_receiving_line_conversion_snapshot_guard
before insert or update of received_qty, rejected_qty, received_base_qty, rejected_base_qty, conversion_to_base_uom_snapshot
on public.goods_receiving_lines
for each row execute function public.ensure_goods_receiving_line_conversion_snapshot();

revoke all on function public.ensure_goods_receiving_line_conversion_snapshot() from public, anon;
