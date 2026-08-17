-- A branch mapping is an optional sourcing override, not the only way an item
-- can have a supplier. Fall back to items.supplier_id when no mapping exists
-- for the request branch and item.

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
  if p_require_all and exists (
    select 1 from public.purchase_request_lines where purchase_request_id = request_row.id and suggested_supplier_id is null
  ) then raise exception 'Every item needs a supplier mapped to this branch before the request can continue.'; end if;
  if exists (
    select 1 from public.purchase_request_lines prl
    where prl.purchase_request_id = request_row.id and prl.suggested_supplier_id is not null
      and not exists (
        select 1
        from public.branch_supplier_items bsi
        join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
        join public.suppliers s on s.id = si.supplier_id
        where bsi.branch_id = request_row.branch_id and bsi.item_id = prl.item_id
          and si.supplier_id = prl.suggested_supplier_id
          and bsi.status = 'active' and bsi.deleted_at is null
          and si.status = 'active' and si.deleted_at is null
          and s.status = 'active' and s.deleted_at is null
      )
      and not exists (
        select 1
        from public.items i
        join public.suppliers s on s.id = i.supplier_id
        where i.id = prl.item_id and i.supplier_id = prl.suggested_supplier_id
          and i.status = 'active' and i.deleted_at is null
          and s.status = 'active' and s.deleted_at is null
          and not exists (
            select 1 from public.branch_supplier_items bsi
            where bsi.branch_id = request_row.branch_id and bsi.item_id = prl.item_id
              and bsi.status = 'active' and bsi.deleted_at is null
          )
      )
  ) then raise exception 'A selected supplier is not mapped to this purchase request branch and item.'; end if;
end
$$;

create or replace function public.guard_purchase_request_line_supplier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare target_branch_id uuid;
begin
  if new.suggested_supplier_id is null then return new; end if;
  select branch_id into target_branch_id from public.purchase_requests where id = new.purchase_request_id;
  if not exists (
    select 1
    from public.branch_supplier_items bsi
    join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
    join public.suppliers s on s.id = si.supplier_id
    where bsi.branch_id = target_branch_id and bsi.item_id = new.item_id
      and si.supplier_id = new.suggested_supplier_id
      and bsi.status = 'active' and bsi.deleted_at is null
      and si.status = 'active' and si.deleted_at is null
      and s.status = 'active' and s.deleted_at is null
  ) and not exists (
    select 1
    from public.items i
    join public.suppliers s on s.id = i.supplier_id
    where i.id = new.item_id and i.supplier_id = new.suggested_supplier_id
      and i.status = 'active' and i.deleted_at is null
      and s.status = 'active' and s.deleted_at is null
      and not exists (
        select 1 from public.branch_supplier_items bsi
        where bsi.branch_id = target_branch_id and bsi.item_id = new.item_id
          and bsi.status = 'active' and bsi.deleted_at is null
      )
  ) then raise exception 'Selected supplier is not mapped to this purchase request branch and item.'; end if;
  return new;
end
$$;
