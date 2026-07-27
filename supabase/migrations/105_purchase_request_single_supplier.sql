-- Purchase requests are submitted to one supplier only.
-- Drafts may remain incomplete while users prepare them; submission is strict.

create or replace function public.validate_purchase_request_single_supplier(p_purchase_request_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare supplier_count integer;
begin
  select count(distinct suggested_supplier_id)::integer
    into supplier_count
  from public.purchase_request_lines
  where purchase_request_id = p_purchase_request_id
    and suggested_supplier_id is not null;

  if supplier_count <> 1 then
    raise exception 'A purchase request must contain items from exactly one supplier.';
  end if;
end;
$$;

create or replace function public.guard_purchase_request_supplier_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.status::text = 'draft' and new.status::text <> 'draft' then
    perform public.validate_purchase_request_supplier_mappings(new.id, true);
    perform public.validate_purchase_request_single_supplier(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.validate_purchase_request_single_supplier(uuid) from public, anon, authenticated;
