-- Finish recoverable supplier identity consolidation after the AutoCount import.
-- A supplier row is canonical only when it is an active identity. Any duplicate
-- row (including a previously archived row that still owns relationships) is
-- repointed to that canonical identity, while conflicting supplier-item and
-- branch mappings are soft-archived with an audit trail.

create table if not exists public.supplier_identity_reconciliation_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  canonical_supplier_id uuid not null references public.suppliers(id),
  merged_supplier_id uuid not null references public.suppliers(id),
  relation_type text not null,
  relation_id uuid not null,
  relation_before jsonb not null,
  action text not null,
  created_at timestamptz not null default now(),
  unique (relation_type, relation_id, action)
);

alter table public.supplier_identity_reconciliation_audit enable row level security;

do $$
declare
  duplicate_group record;
  canonical_supplier public.suppliers%rowtype;
  duplicate_supplier public.suppliers%rowtype;
  source_relationship public.supplier_items%rowtype;
  target_relationship public.supplier_items%rowtype;
  source_branch_relationship public.branch_supplier_items%rowtype;
  request_line record;
begin
  for duplicate_group in
    select company_id, upper(regexp_replace(trim(name), '\s+', ' ', 'g')) normalized_name
    from public.suppliers
    where nullif(trim(name), '') is not null
    group by company_id, upper(regexp_replace(trim(name), '\s+', ' ', 'g'))
    having count(*) > 1
  loop
    select s.* into canonical_supplier
    from public.suppliers s
    where s.company_id = duplicate_group.company_id
      and s.deleted_at is null
      and s.status = 'active'
      and upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = duplicate_group.normalized_name
    order by
      (nullif(trim(s.supplier_code), '') is not null) desc,
      (select count(*) from public.supplier_items si
       where si.supplier_id = s.id and si.deleted_at is null and si.status = 'active') desc,
      (select count(*) from public.purchase_orders po where po.supplier_id = s.id)
      + (select count(*) from public.goods_receivings gr where gr.supplier_id = s.id)
      + (select count(*) from public.purchase_request_lines prl where prl.suggested_supplier_id = s.id) desc,
      s.created_at asc,
      s.id asc
    limit 1;

    if canonical_supplier.id is null then
      continue;
    end if;

    for duplicate_supplier in
      select s.*
      from public.suppliers s
      where s.company_id = duplicate_group.company_id
        and s.id <> canonical_supplier.id
        and upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = duplicate_group.normalized_name
      order by s.deleted_at nulls first, s.created_at, s.id
    loop
      insert into public.supplier_merge_audit(
        company_id, canonical_supplier_id, merged_supplier_id,
        canonical_before, merged_before, merge_reason
      ) values (
        duplicate_group.company_id, canonical_supplier.id, duplicate_supplier.id,
        to_jsonb(canonical_supplier), to_jsonb(duplicate_supplier),
        'Exact normalized supplier identity consolidated after AutoCount import.'
      ) on conflict (canonical_supplier_id, merged_supplier_id) do nothing;

      for source_relationship in
        select * from public.supplier_items
        where supplier_id = duplicate_supplier.id
        order by (status = 'active' and deleted_at is null) desc, created_at, id
      loop
        target_relationship := null;
        select * into target_relationship
        from public.supplier_items
        where supplier_id = canonical_supplier.id
          and item_id = source_relationship.item_id
          and (
            nullif(trim(source_relationship.supplier_item_code), '') is null
            or lower(trim(supplier_item_code)) = lower(trim(source_relationship.supplier_item_code))
          )
        order by (status = 'active' and deleted_at is null) desc, created_at, id
        limit 1;

        if target_relationship.id is null then
          update public.supplier_items
          set supplier_id = canonical_supplier.id, updated_at = now()
          where id = source_relationship.id;
          insert into public.supplier_identity_reconciliation_audit(
            company_id, canonical_supplier_id, merged_supplier_id,
            relation_type, relation_id, relation_before, action
          ) values (
            source_relationship.company_id, canonical_supplier.id, duplicate_supplier.id,
            'supplier_item', source_relationship.id, to_jsonb(source_relationship),
            'repointed_to_canonical'
          ) on conflict do nothing;
        else
          for source_branch_relationship in
            select * from public.branch_supplier_items
            where supplier_item_id = source_relationship.id
            order by (status = 'active' and deleted_at is null) desc, created_at, id
          loop
            if exists (
              select 1 from public.branch_supplier_items
              where branch_id = source_branch_relationship.branch_id
                and supplier_item_id = target_relationship.id
                and status = 'active' and deleted_at is null
            ) then
              update public.branch_supplier_items
              set status = 'inactive', is_preferred = false,
                  deleted_at = coalesce(deleted_at, now()), updated_at = now()
              where id = source_branch_relationship.id;
            else
              update public.branch_supplier_items
              set supplier_item_id = target_relationship.id, updated_at = now()
              where id = source_branch_relationship.id;
            end if;
          end loop;

          update public.supplier_items
          set status = 'inactive', deleted_at = coalesce(deleted_at, now()), updated_at = now()
          where id = source_relationship.id;
          insert into public.supplier_identity_reconciliation_audit(
            company_id, canonical_supplier_id, merged_supplier_id,
            relation_type, relation_id, relation_before, action
          ) values (
            source_relationship.company_id, canonical_supplier.id, duplicate_supplier.id,
            'supplier_item', source_relationship.id, to_jsonb(source_relationship),
            'merged_into_existing_canonical'
          ) on conflict do nothing;
        end if;
      end loop;

      update public.supplier_external_references
      set supplier_id = canonical_supplier.id, updated_at = now()
      where supplier_id = duplicate_supplier.id;

      for request_line in
        select prl.id, pr.company_id, prl.item_id, prl.uom, prl.remarks, pr.branch_id
        from public.purchase_request_lines prl
        join public.purchase_requests pr on pr.id = prl.purchase_request_id
        where prl.suggested_supplier_id = duplicate_supplier.id
      loop
        if exists (
          select 1
          from public.branch_supplier_items bsi
          join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
          where bsi.branch_id = request_line.branch_id
            and bsi.item_id = request_line.item_id
            and si.supplier_id = canonical_supplier.id
            and upper(trim(si.purchase_uom)) = upper(trim(request_line.uom))
            and bsi.status = 'active' and bsi.deleted_at is null
            and si.status = 'active' and si.deleted_at is null
        ) then
          update public.purchase_request_lines
          set suggested_supplier_id = canonical_supplier.id, updated_at = now()
          where id = request_line.id;
        else
          update public.purchase_request_lines
          set suggested_supplier_id = null,
              remarks = left(concat_ws(
                ' ', nullif(trim(request_line.remarks), ''),
                format('Supplier %s was merged; choose a mapped supplier for %s.', duplicate_supplier.name, request_line.uom)
              ), 2000),
              updated_at = now()
          where id = request_line.id;
        end if;
      end loop;

      update public.purchase_requests set assigned_supplier_id = canonical_supplier.id, updated_at = now()
      where assigned_supplier_id = duplicate_supplier.id;
      update public.purchase_orders set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.goods_receivings set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.purchase_returns set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.supplier_invoices set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.items set supplier_id = canonical_supplier.id, updated_at = now()
      where supplier_id = duplicate_supplier.id;

      update public.suppliers
      set status = 'inactive', deleted_at = coalesce(deleted_at, now()), updated_at = now()
      where id = duplicate_supplier.id;
    end loop;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
