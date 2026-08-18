-- Resolve legacy PR lines that predate the supplier snapshot/fallback rules.
-- A line is auto-resolved only when the branch + item + UOM identifies one
-- supplier (or one preferred mapping). Ambiguous lines stay unresolved and are
-- intentionally stopped at review instead of guessing a supplier.

create or replace function public.resolve_purchase_request_line_suppliers(p_purchase_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.purchase_requests%rowtype;
  line_row record;
  candidate_count integer;
  preferred_count integer;
  resolved_supplier uuid;
begin
  select * into request_row
  from public.purchase_requests
  where id = p_purchase_request_id and deleted_at is null;

  if request_row.id is null or request_row.branch_id is null then
    return;
  end if;

  for line_row in
    select id, item_id, uom
    from public.purchase_request_lines
    where purchase_request_id = request_row.id
      and suggested_supplier_id is null
  loop
    resolved_supplier := null;

    select count(distinct si.supplier_id)::integer
      into candidate_count
    from public.branch_supplier_items bsi
    join public.supplier_items si
      on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
    join public.suppliers s on s.id = si.supplier_id
    where bsi.branch_id = request_row.branch_id
      and bsi.item_id = line_row.item_id
      and upper(trim(si.purchase_uom)) = upper(trim(line_row.uom))
      and bsi.status = 'active' and bsi.deleted_at is null
      and si.status = 'active' and si.deleted_at is null
      and s.status = 'active' and s.deleted_at is null;

    if candidate_count = 1 then
      select si.supplier_id
        into resolved_supplier
      from public.branch_supplier_items bsi
      join public.supplier_items si
        on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
      join public.suppliers s on s.id = si.supplier_id
      where bsi.branch_id = request_row.branch_id
        and bsi.item_id = line_row.item_id
        and upper(trim(si.purchase_uom)) = upper(trim(line_row.uom))
        and bsi.status = 'active' and bsi.deleted_at is null
        and si.status = 'active' and si.deleted_at is null
        and s.status = 'active' and s.deleted_at is null
      limit 1;
    elsif candidate_count > 1 then
      select count(distinct si.supplier_id)::integer
        into preferred_count
      from public.branch_supplier_items bsi
      join public.supplier_items si
        on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
      join public.suppliers s on s.id = si.supplier_id
      where bsi.branch_id = request_row.branch_id
        and bsi.item_id = line_row.item_id
        and upper(trim(si.purchase_uom)) = upper(trim(line_row.uom))
        and bsi.is_preferred = true
        and bsi.status = 'active' and bsi.deleted_at is null
        and si.status = 'active' and si.deleted_at is null
        and s.status = 'active' and s.deleted_at is null;

      if preferred_count = 1 then
        select si.supplier_id
          into resolved_supplier
        from public.branch_supplier_items bsi
        join public.supplier_items si
          on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
        join public.suppliers s on s.id = si.supplier_id
        where bsi.branch_id = request_row.branch_id
          and bsi.item_id = line_row.item_id
          and upper(trim(si.purchase_uom)) = upper(trim(line_row.uom))
          and bsi.is_preferred = true
          and bsi.status = 'active' and bsi.deleted_at is null
          and si.status = 'active' and si.deleted_at is null
          and s.status = 'active' and s.deleted_at is null
        limit 1;
      end if;
    end if;

    if resolved_supplier is null
       and not exists (
         select 1
         from public.branch_supplier_items bsi
         where bsi.branch_id = request_row.branch_id
           and bsi.item_id = line_row.item_id
           and bsi.status = 'active' and bsi.deleted_at is null
       ) then
      select i.supplier_id
        into resolved_supplier
      from public.items i
      join public.suppliers s on s.id = i.supplier_id
      where i.id = line_row.item_id
        and i.status = 'active' and i.deleted_at is null
        and s.status = 'active' and s.deleted_at is null
        and upper(trim(coalesce(i.purchase_unit, i.base_unit))) = upper(trim(line_row.uom));
    end if;

    if resolved_supplier is not null then
      update public.purchase_request_lines
      set suggested_supplier_id = resolved_supplier
      where id = line_row.id and suggested_supplier_id is null;
    end if;
  end loop;
end;
$$;

create or replace function public.validate_purchase_request_supplier_mappings(p_purchase_request_id uuid, p_require_all boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare request_row public.purchase_requests%rowtype;
begin
  select * into request_row from public.purchase_requests where id = p_purchase_request_id and deleted_at is null;
  if request_row.id is null or request_row.branch_id is null then raise exception 'Purchase request branch is required.'; end if;

  perform public.resolve_purchase_request_line_suppliers(p_purchase_request_id);

  if p_require_all and exists (
    select 1 from public.purchase_request_lines where purchase_request_id = request_row.id and suggested_supplier_id is null
  ) then raise exception 'Every item needs a supplier mapped to this branch and unit before the request can continue.'; end if;
  if exists (
    select 1 from public.purchase_request_lines prl
    where prl.purchase_request_id = request_row.id and prl.suggested_supplier_id is not null
      and not exists (
        select 1 from public.branch_supplier_items bsi
        join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
        join public.suppliers s on s.id = si.supplier_id
        where bsi.branch_id = request_row.branch_id and bsi.item_id = prl.item_id
          and si.supplier_id = prl.suggested_supplier_id
          and upper(trim(si.purchase_uom)) = upper(trim(prl.uom))
          and bsi.status = 'active' and bsi.deleted_at is null
          and si.status = 'active' and si.deleted_at is null
          and s.status = 'active' and s.deleted_at is null
      )
      and not exists (
        select 1 from public.items i
        join public.suppliers s on s.id = i.supplier_id
        where i.id = prl.item_id and i.supplier_id = prl.suggested_supplier_id
          and i.status = 'active' and i.deleted_at is null
          and s.status = 'active' and s.deleted_at is null
          and upper(trim(coalesce(i.purchase_unit, i.base_unit))) = upper(trim(prl.uom))
          and not exists (
            select 1 from public.branch_supplier_items bsi
            where bsi.branch_id = request_row.branch_id and bsi.item_id = prl.item_id
              and bsi.status = 'active' and bsi.deleted_at is null
          )
      )
  ) then raise exception 'A selected supplier is not mapped to this purchase request branch, item, and unit.'; end if;
end;
$$;

revoke all on function public.resolve_purchase_request_line_suppliers(uuid) from public, anon, authenticated;
