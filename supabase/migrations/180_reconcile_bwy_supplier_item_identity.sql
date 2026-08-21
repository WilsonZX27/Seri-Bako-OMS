-- Reconcile the legacy BWY placeholder identity and the imported duplicate
-- supplier-item row for BWYHOLDI00003. The source item code is authoritative
-- for this exact collision: the active purchasing identity is BWY Holdings
-- (creditor code 406-B003), not the Quik row that was imported with the same
-- supplier-item code. Every merge is soft/recoverable and audited.

create table if not exists public.supplier_item_merge_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  canonical_supplier_item_id uuid not null references public.supplier_items(id),
  merged_supplier_item_id uuid not null references public.supplier_items(id),
  canonical_before jsonb not null,
  merged_before jsonb not null,
  merge_reason text not null,
  merged_at timestamptz not null default now(),
  unique (canonical_supplier_item_id, merged_supplier_item_id)
);

alter table public.supplier_item_merge_audit enable row level security;

do $$
declare
  canonical_supplier public.suppliers%rowtype;
  placeholder_supplier public.suppliers%rowtype;
  canonical_item public.supplier_items%rowtype;
  source_item public.supplier_items%rowtype;
  source_branch public.branch_supplier_items%rowtype;
begin
  select * into canonical_supplier
  from public.suppliers
  where supplier_code = '406-B003'
    and upper(trim(name)) = 'BWY HOLDINGS SDN BHD'
    and deleted_at is null
  order by created_at, id
  limit 1;

  select * into placeholder_supplier
  from public.suppliers
  where supplier_code = 'BWYHOLDI'
    and upper(trim(name)) = 'BWYHOLDI'
    and deleted_at is null
  order by created_at, id
  limit 1;

  if canonical_supplier.id is not null then
    update public.suppliers
    set supplier_group = 'BWYHOLDI', updated_at = now()
    where id = canonical_supplier.id
      and supplier_group is distinct from 'BWYHOLDI';
  end if;

  if canonical_supplier.id is not null and placeholder_supplier.id is not null
     and canonical_supplier.id <> placeholder_supplier.id then
    for source_item in
      select * from public.supplier_items
      where supplier_id = placeholder_supplier.id
        and deleted_at is null
        and status = 'active'
      order by created_at, id
    loop
      select * into canonical_item
      from public.supplier_items
      where supplier_id = canonical_supplier.id
        and item_id = source_item.item_id
        and lower(trim(supplier_item_code)) = lower(trim(source_item.supplier_item_code))
        and deleted_at is null
        and status = 'active'
      order by created_at, id
      limit 1;

      if canonical_item.id is null then
        update public.supplier_items
        set supplier_id = canonical_supplier.id, updated_at = now()
        where id = source_item.id;
      else
        insert into public.supplier_item_merge_audit(
          company_id, canonical_supplier_item_id, merged_supplier_item_id,
          canonical_before, merged_before, merge_reason
        ) values (
          source_item.company_id, canonical_item.id, source_item.id,
          to_jsonb(canonical_item), to_jsonb(source_item),
          'Legacy BWYHOLDI placeholder supplier merged into creditor 406-B003.'
        ) on conflict (canonical_supplier_item_id, merged_supplier_item_id) do nothing;

        for source_branch in
          select * from public.branch_supplier_items
          where supplier_item_id = source_item.id
            and deleted_at is null
            and status = 'active'
          order by created_at, id
        loop
          if exists (
            select 1 from public.branch_supplier_items
            where branch_id = source_branch.branch_id
              and supplier_item_id = canonical_item.id
              and deleted_at is null
              and status = 'active'
          ) then
            update public.branch_supplier_items
            set status = 'inactive', is_preferred = false, deleted_at = now(), updated_at = now()
            where id = source_branch.id;
          else
            update public.branch_supplier_items
            set supplier_item_id = canonical_item.id, updated_at = now()
            where id = source_branch.id;
          end if;
        end loop;

        update public.supplier_items
        set status = 'inactive', deleted_at = now(), updated_at = now()
        where id = source_item.id;
      end if;
      canonical_item := null;
    end loop;

    update public.items
    set supplier_id = canonical_supplier.id, updated_at = now()
    where supplier_id = placeholder_supplier.id
      and upper(trim(item_code)) like 'BWYHOLDI%';
    update public.supplier_external_references
    set supplier_id = canonical_supplier.id, updated_at = now()
    where supplier_id = placeholder_supplier.id;
    update public.purchase_request_lines
    set suggested_supplier_id = canonical_supplier.id
    where suggested_supplier_id = placeholder_supplier.id;
    update public.purchase_orders
    set supplier_id = canonical_supplier.id
    where supplier_id = placeholder_supplier.id;
    update public.goods_receivings
    set supplier_id = canonical_supplier.id
    where supplier_id = placeholder_supplier.id;
    update public.purchase_returns
    set supplier_id = canonical_supplier.id
    where supplier_id = placeholder_supplier.id;
    update public.supplier_invoices
    set supplier_id = canonical_supplier.id
    where supplier_id = placeholder_supplier.id;
    update public.suppliers
    set status = 'inactive', deleted_at = now(), updated_at = now()
    where id = placeholder_supplier.id;
  end if;

  -- The Quik row is an exact imported collision for the BWY item code. Move
  -- its branch mapping to the canonical BWY relationship before archiving it.
  if canonical_supplier.id is not null then
    select * into canonical_item
    from public.supplier_items
    where supplier_id = canonical_supplier.id
      and supplier_item_code = 'BWYHOLDI00003'
      and deleted_at is null
      and status = 'active'
    order by created_at, id
    limit 1;

    select si.* into source_item
    from public.supplier_items si
    join public.suppliers s on s.id = si.supplier_id
    where s.supplier_code = '400-Q001'
      and si.supplier_item_code = 'BWYHOLDI00003'
      and si.deleted_at is null
      and si.status = 'active'
    order by si.created_at, si.id
    limit 1;

    if canonical_item.id is not null and source_item.id is not null then
      insert into public.supplier_item_merge_audit(
        company_id, canonical_supplier_item_id, merged_supplier_item_id,
        canonical_before, merged_before, merge_reason
      ) values (
        source_item.company_id, canonical_item.id, source_item.id,
        to_jsonb(canonical_item), to_jsonb(source_item),
        'Exact BWYHOLDI item-code collision imported under Quik; BWY source identity is canonical.'
      ) on conflict (canonical_supplier_item_id, merged_supplier_item_id) do nothing;

      for source_branch in
        select * from public.branch_supplier_items
        where supplier_item_id = source_item.id
          and deleted_at is null
          and status = 'active'
        order by created_at, id
      loop
        if exists (
          select 1 from public.branch_supplier_items
          where branch_id = source_branch.branch_id
            and supplier_item_id = canonical_item.id
            and deleted_at is null
            and status = 'active'
        ) then
          update public.branch_supplier_items
          set status = 'inactive', is_preferred = false, deleted_at = now(), updated_at = now()
          where id = source_branch.id;
        else
          update public.branch_supplier_items
          set supplier_item_id = canonical_item.id, updated_at = now()
          where id = source_branch.id;
        end if;
      end loop;

      update public.supplier_items
      set status = 'inactive', deleted_at = now(), updated_at = now()
      where id = source_item.id;
    end if;
  end if;
end;
$$;

notify pgrst, 'reload schema';
