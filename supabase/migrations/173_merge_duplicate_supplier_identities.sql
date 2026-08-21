-- Merge exact duplicate live supplier names without deleting commercial history.
-- The oldest/most-referenced identity remains canonical; AutoCount's operational
-- group code is retained from the identity that owns the strongest item mapping.

create table if not exists public.supplier_merge_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  canonical_supplier_id uuid not null references public.suppliers(id),
  merged_supplier_id uuid not null references public.suppliers(id),
  canonical_before jsonb not null,
  merged_before jsonb not null,
  merge_reason text not null,
  merged_at timestamptz not null default now(),
  unique (canonical_supplier_id, merged_supplier_id)
);

alter table public.supplier_merge_audit enable row level security;

create table if not exists public.supplier_merge_line_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  purchase_request_line_id uuid not null references public.purchase_request_lines(id),
  source_supplier_id uuid not null references public.suppliers(id),
  canonical_supplier_id uuid not null references public.suppliers(id),
  original_uom text not null,
  resolution text not null,
  created_at timestamptz not null default now(),
  unique (purchase_request_line_id, source_supplier_id, canonical_supplier_id)
);

alter table public.supplier_merge_line_audit enable row level security;

do $$
declare
  duplicate_group record;
  canonical_supplier public.suppliers%rowtype;
  duplicate_supplier public.suppliers%rowtype;
  code_supplier public.suppliers%rowtype;
  source_relationship public.supplier_items%rowtype;
  target_relationship public.supplier_items%rowtype;
  source_branch_relationship public.branch_supplier_items%rowtype;
  request_line record;
  line_resolution text;
begin
  for duplicate_group in
    select company_id, upper(regexp_replace(trim(name), '\s+', ' ', 'g')) normalized_name
    from public.suppliers
    where deleted_at is null
    group by company_id, upper(regexp_replace(trim(name), '\s+', ' ', 'g'))
    having count(*) > 1
  loop
    select s.* into canonical_supplier
    from public.suppliers s
    where s.company_id = duplicate_group.company_id
      and s.deleted_at is null
      and upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = duplicate_group.normalized_name
    order by
      ((select count(*) from public.purchase_orders po where po.supplier_id = s.id)
       + (select count(*) from public.goods_receivings gr where gr.supplier_id = s.id)
       + (select count(*) from public.purchase_returns pr where pr.supplier_id = s.id)
       + (select count(*) from public.supplier_invoices si where si.supplier_id = s.id)
       + (select count(*) from public.purchase_request_lines prl where prl.suggested_supplier_id = s.id)) desc,
      s.created_at asc,
      s.id asc
    limit 1;

    select s.* into code_supplier
    from public.suppliers s
    where s.company_id = duplicate_group.company_id
      and s.deleted_at is null
      and upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = duplicate_group.normalized_name
      and nullif(trim(s.supplier_code), '') is not null
    order by
      ((select count(*) from public.supplier_items si where si.supplier_id = s.id and si.deleted_at is null and si.status = 'active')
       + (select count(*) from public.items i where i.supplier_id = s.id and i.deleted_at is null)) desc,
      s.updated_at desc,
      s.created_at desc
    limit 1;

    for duplicate_supplier in
      select s.* from public.suppliers s
      where s.company_id = duplicate_group.company_id
        and s.deleted_at is null
        and s.id <> canonical_supplier.id
        and upper(regexp_replace(trim(s.name), '\s+', ' ', 'g')) = duplicate_group.normalized_name
      order by s.created_at, s.id
    loop
      insert into public.supplier_merge_audit(
        company_id, canonical_supplier_id, merged_supplier_id,
        canonical_before, merged_before, merge_reason
      ) values (
        duplicate_group.company_id, canonical_supplier.id, duplicate_supplier.id,
        to_jsonb(canonical_supplier), to_jsonb(duplicate_supplier),
        'Exact normalized supplier name duplicated after AutoCount master-data import.'
      ) on conflict (canonical_supplier_id, merged_supplier_id) do nothing;

      for source_relationship in
        select * from public.supplier_items
        where supplier_id = duplicate_supplier.id and deleted_at is null and status = 'active'
        order by created_at, id
      loop
        select * into target_relationship
        from public.supplier_items
        where supplier_id = canonical_supplier.id
          and deleted_at is null and status = 'active'
          and (item_id = source_relationship.item_id
            or lower(trim(supplier_item_code)) = lower(trim(source_relationship.supplier_item_code)))
        order by (item_id = source_relationship.item_id) desc, created_at, id
        limit 1;

        if target_relationship.id is null then
          update public.supplier_items
          set supplier_id = canonical_supplier.id, updated_at = now()
          where id = source_relationship.id;
        else
          for source_branch_relationship in
            select * from public.branch_supplier_items
            where supplier_item_id = source_relationship.id and deleted_at is null and status = 'active'
            order by created_at, id
          loop
            if exists (
              select 1 from public.branch_supplier_items
              where branch_id = source_branch_relationship.branch_id
                and supplier_item_id = target_relationship.id
                and deleted_at is null and status = 'active'
            ) then
              update public.branch_supplier_items
              set status = 'inactive', is_preferred = false, deleted_at = now(), updated_at = now()
              where id = source_branch_relationship.id;
            else
              update public.branch_supplier_items
              set supplier_item_id = target_relationship.id, updated_at = now()
              where id = source_branch_relationship.id;
            end if;
          end loop;
          update public.supplier_items
          set status = 'inactive', deleted_at = now(), updated_at = now()
          where id = source_relationship.id;
        end if;
        target_relationship := null;
      end loop;

      update public.supplier_external_references set supplier_id = canonical_supplier.id, updated_at = now() where supplier_id = duplicate_supplier.id;

      -- Purchase-request lines have a deliberately strict trigger which checks
      -- branch, item, and supplier-UOM mapping on every supplier change. Do not
      -- disable that guard during a data repair. Repoint only lines for which
      -- the canonical supplier is already valid; unresolved lines become an
      -- explicit sourcing task while retaining the original supplier context in
      -- both the audit row and the line remark.
      for request_line in
        select
          prl.id,
          pr.company_id,
          prl.purchase_request_id,
          prl.item_id,
          prl.uom,
          prl.remarks,
          pr.branch_id
        from public.purchase_request_lines prl
        join public.purchase_requests pr on pr.id = prl.purchase_request_id
        where prl.suggested_supplier_id = duplicate_supplier.id
        order by prl.created_at, prl.id
      loop
        if exists (
          select 1
          from public.branch_supplier_items bsi
          join public.supplier_items si on si.id = bsi.supplier_item_id and si.item_id = bsi.item_id
          join public.suppliers s on s.id = si.supplier_id
          where bsi.branch_id = request_line.branch_id
            and bsi.item_id = request_line.item_id
            and si.supplier_id = canonical_supplier.id
            and upper(trim(si.purchase_uom)) = upper(trim(request_line.uom))
            and bsi.status = 'active' and bsi.deleted_at is null
            and si.status = 'active' and si.deleted_at is null
            and s.status = 'active' and s.deleted_at is null
        ) or exists (
          select 1
          from public.items i
          join public.suppliers s on s.id = i.supplier_id
          where i.id = request_line.item_id
            and i.supplier_id = canonical_supplier.id
            and i.status = 'active' and i.deleted_at is null
            and s.status = 'active' and s.deleted_at is null
            and upper(trim(coalesce(i.purchase_unit, i.base_unit))) = upper(trim(request_line.uom))
            and not exists (
              select 1 from public.branch_supplier_items bsi
              where bsi.branch_id = request_line.branch_id
                and bsi.item_id = request_line.item_id
                and bsi.status = 'active' and bsi.deleted_at is null
            )
        ) then
          line_resolution := 'repointed_to_canonical_supplier';
          insert into public.supplier_merge_line_audit(
            company_id, purchase_request_line_id, source_supplier_id,
            canonical_supplier_id, original_uom, resolution
          ) values (
            request_line.company_id, request_line.id, duplicate_supplier.id,
            canonical_supplier.id, request_line.uom, line_resolution
          ) on conflict (purchase_request_line_id, source_supplier_id, canonical_supplier_id) do nothing;
          update public.purchase_request_lines
          set suggested_supplier_id = canonical_supplier.id, updated_at = now()
          where id = request_line.id;
        else
          line_resolution := 'cleared_requires_supplier_mapping';
          insert into public.supplier_merge_line_audit(
            company_id, purchase_request_line_id, source_supplier_id,
            canonical_supplier_id, original_uom, resolution
          ) values (
            request_line.company_id, request_line.id, duplicate_supplier.id,
            canonical_supplier.id, request_line.uom, line_resolution
          ) on conflict (purchase_request_line_id, source_supplier_id, canonical_supplier_id) do nothing;
          update public.purchase_request_lines
          set suggested_supplier_id = null,
              remarks = left(concat_ws(
                ' ',
                nullif(trim(request_line.remarks), ''),
                format('Supplier %s (%s) was merged; choose a mapped supplier for %s.', duplicate_supplier.name, duplicate_supplier.supplier_code, request_line.uom)
              ), 2000),
              updated_at = now()
          where id = request_line.id;
        end if;
      end loop;

      update public.purchase_requests
      set assigned_supplier_id = canonical_supplier.id, updated_at = now()
      where assigned_supplier_id = duplicate_supplier.id;
      update public.purchase_orders set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.goods_receivings set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.purchase_returns set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.supplier_invoices set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;
      update public.items set supplier_id = canonical_supplier.id where supplier_id = duplicate_supplier.id;

      update public.suppliers
      set status = 'inactive', deleted_at = now(), updated_at = now()
      where id = duplicate_supplier.id;
    end loop;

    if code_supplier.id is not null and code_supplier.supplier_code is distinct from canonical_supplier.supplier_code then
      update public.suppliers
      set supplier_code = code_supplier.supplier_code, updated_at = now()
      where id = canonical_supplier.id;
    end if;
  end loop;
end;
$$;

create unique index if not exists suppliers_company_normalized_name_active_idx
  on public.suppliers(company_id, upper(regexp_replace(trim(name), '\s+', ' ', 'g')))
  where deleted_at is null;
