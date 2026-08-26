-- Close three operational gaps found during authenticated Production review:
-- 1. Purchasing can cancel an unposted purchase request.
-- 2. Repair the two precisely identified CK @ PJS10 supplier mappings.
-- 3. Carry a PO attachment into the draft GRN so the Delivery Order is not
--    uploaded twice after the pre-receiving attachment gate.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'pr.cancel'
where r.role_code = 'purchasing'
  and r.status = 'active'
  and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

do $$
declare
  target_item public.items%rowtype;
  target_branch public.branches%rowtype;
  target_supplier_item public.supplier_items%rowtype;
  preferred_supplier_item public.supplier_items%rowtype;
  alternate_supplier_item public.supplier_items%rowtype;
  matching_count integer;
begin
  select * into target_item
  from public.items
  where id = '74c7eccc-6604-4f87-9e8b-0c5e2ba207ff'::uuid;

  if target_item.id is not null then
    if target_item.item_code <> 'FROMPNG00006'
       or target_item.supplier_id <> '5e868b4f-afa7-42bf-8563-daabb090df86'::uuid
       or target_item.deleted_at is not null then
      raise exception 'Migration 224 refused the FROMPNG00006 repair because the canonical item identity changed.';
    end if;

    select * into target_branch
    from public.branches
    where id = 'ae64b7fc-adc8-4a58-ad48-91f078270eaf'::uuid;

    if target_branch.id is null
       or target_branch.company_id <> target_item.company_id
       or target_branch.branch_name <> 'CK @ PJS10'
       or target_branch.deleted_at is not null then
      raise exception 'Migration 224 refused the FROMPNG00006 repair because the CK @ PJS10 identity changed.';
    end if;

    select count(*), (array_agg(si.id))[1] into matching_count, target_supplier_item.id
    from public.supplier_items si
    join public.suppliers s on s.id = si.supplier_id
    where si.item_id = target_item.id
      and si.supplier_id = target_item.supplier_id
      and si.company_id = target_item.company_id
      and si.status = 'active'
      and si.deleted_at is null
      and s.supplier_code = 'FROMPNG'
      and s.status = 'active'
      and s.deleted_at is null;

    if matching_count <> 1
       or target_supplier_item.id <> '6bb45968-d91e-4396-8af0-bd636fecd3a4'::uuid then
      raise exception 'Migration 224 expected exactly one canonical FROMPNG supplier-item relationship.';
    end if;

    update public.branch_supplier_items
    set is_preferred = false
    where branch_id = target_branch.id
      and item_id = target_item.id
      and status = 'active'
      and deleted_at is null;

    insert into public.branch_supplier_items (
      branch_id, supplier_item_id, item_id, is_preferred, status
    ) values (
      target_branch.id, target_supplier_item.id, target_item.id, true, 'active'
    )
    on conflict (branch_id, supplier_item_id) do update
    set item_id = excluded.item_id,
        is_preferred = true,
        status = 'active',
        deleted_at = null;
  end if;

  select * into target_item
  from public.items
  where id = 'e01e839f-9230-45b4-9a63-10c78d58c2de'::uuid;

  if target_item.id is not null then
    if target_item.item_code <> 'QUIKGROC00025'
       or target_item.supplier_id <> 'a6b00607-a679-402d-9ed7-0765d894eb7d'::uuid
       or target_item.deleted_at is not null then
      raise exception 'Migration 224 refused the QUIKGROC00025 repair because the canonical item identity changed.';
    end if;

    select * into target_branch
    from public.branches
    where id = 'ae64b7fc-adc8-4a58-ad48-91f078270eaf'::uuid;

    select si.* into preferred_supplier_item
    from public.supplier_items si
    join public.suppliers s on s.id = si.supplier_id
    where si.id = '009d5fdd-5b88-448e-b117-5965f81f9a30'::uuid
      and si.item_id = target_item.id
      and s.supplier_code = '400-Q001'
      and si.status = 'active' and si.deleted_at is null
      and s.status = 'active' and s.deleted_at is null;

    select si.* into alternate_supplier_item
    from public.supplier_items si
    join public.suppliers s on s.id = si.supplier_id
    where si.id = '6f74ce55-9f88-4848-abca-09cb83f37005'::uuid
      and si.item_id = target_item.id
      and s.supplier_code = 'ORIENTAL'
      and si.status = 'active' and si.deleted_at is null
      and s.status = 'active' and s.deleted_at is null;

    if target_branch.id is null
       or target_branch.company_id <> target_item.company_id
       or target_branch.branch_name <> 'CK @ PJS10'
       or preferred_supplier_item.id is null
       or alternate_supplier_item.id is null then
      raise exception 'Migration 224 refused the QUIKGROC00025 repair because its canonical mapping set changed.';
    end if;

    select count(*) into matching_count
    from public.branch_supplier_items
    where branch_id = target_branch.id
      and item_id = target_item.id
      and status = 'active'
      and deleted_at is null;

    if matching_count <> 2 then
      raise exception 'Migration 224 expected exactly two active QUIKGROC00025 mappings at CK @ PJS10.';
    end if;

    update public.branch_supplier_items
    set is_preferred = (supplier_item_id = preferred_supplier_item.id)
    where branch_id = target_branch.id
      and item_id = target_item.id
      and supplier_item_id in (preferred_supplier_item.id, alternate_supplier_item.id)
      and status = 'active'
      and deleted_at is null;
  end if;
end
$$;

create or replace function public.inherit_purchase_order_attachments_on_receiving()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_document_id uuid;
begin
  if new.document_id is null or new.purchase_order_id is null then
    return new;
  end if;

  select po.document_id into source_document_id
  from public.purchase_orders po
  where po.id = new.purchase_order_id
    and po.company_id = new.company_id
    and po.deleted_at is null;

  if source_document_id is null then
    return new;
  end if;

  insert into public.attachments (
    company_id, entity_type, entity_id, file_name, file_path, file_type,
    file_size, storage_path, file_url, status, uploaded_by,
    created_by, updated_by
  )
  select
    a.company_id, 'document', new.document_id, a.file_name, a.file_path,
    a.file_type, a.file_size, a.storage_path, a.file_url, 'active',
    a.uploaded_by, a.created_by, a.updated_by
  from public.attachments a
  where a.entity_type = 'document'
    and a.entity_id = source_document_id
    and a.status = 'active'
    and a.deleted_at is null;

  return new;
end
$$;

drop trigger if exists inherit_purchase_order_attachments_on_receiving
  on public.goods_receivings;
create trigger inherit_purchase_order_attachments_on_receiving
after insert on public.goods_receivings
for each row execute function public.inherit_purchase_order_attachments_on_receiving();

revoke all on function public.inherit_purchase_order_attachments_on_receiving()
from public, anon, authenticated;

comment on function public.inherit_purchase_order_attachments_on_receiving() is
  'Carries active PO document attachments into a new draft GRN so receiving retains one auditable Delivery Order upload.';

notify pgrst, 'reload schema';
