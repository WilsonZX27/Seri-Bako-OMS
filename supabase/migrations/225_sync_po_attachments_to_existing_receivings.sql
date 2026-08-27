-- Keep Delivery Order evidence visible when it is uploaded to a Purchase Order
-- after the linked Goods Receiving draft has already been created.

create or replace function public.sync_purchase_order_attachment_to_receivings()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.entity_type <> 'document'
    or new.status <> 'active'
    or new.deleted_at is not null then
    return new;
  end if;

  insert into public.attachments (
    company_id, entity_type, entity_id, file_name, file_path, file_type,
    file_size, storage_path, file_url, status, uploaded_by,
    created_by, updated_by
  )
  select
    new.company_id, 'document', gr.document_id, new.file_name, new.file_path,
    new.file_type, new.file_size, new.storage_path, new.file_url, 'active',
    new.uploaded_by, new.created_by, new.updated_by
  from public.purchase_orders po
  join public.goods_receivings gr
    on gr.purchase_order_id = po.id
   and gr.company_id = po.company_id
   and gr.deleted_at is null
  where po.document_id = new.entity_id
    and po.company_id = new.company_id
    and po.deleted_at is null
    and gr.document_id is not null
    and not exists (
      select 1
      from public.attachments existing
      where existing.entity_type = 'document'
        and existing.entity_id = gr.document_id
        and existing.status = 'active'
        and existing.deleted_at is null
        and coalesce(existing.storage_path, '') = coalesce(new.storage_path, '')
        and coalesce(existing.file_url, '') = coalesce(new.file_url, '')
        and existing.file_name = new.file_name
    );

  return new;
end
$$;

drop trigger if exists sync_purchase_order_attachment_to_receivings on public.attachments;
create trigger sync_purchase_order_attachment_to_receivings
after insert or update of status, deleted_at on public.attachments
for each row execute function public.sync_purchase_order_attachment_to_receivings();

revoke all on function public.sync_purchase_order_attachment_to_receivings()
from public, anon, authenticated;

insert into public.attachments (
  company_id, entity_type, entity_id, file_name, file_path, file_type,
  file_size, storage_path, file_url, status, uploaded_by,
  created_by, updated_by
)
select
  source.company_id, 'document', gr.document_id, source.file_name,
  source.file_path, source.file_type, source.file_size, source.storage_path,
  source.file_url, 'active', source.uploaded_by, source.created_by,
  source.updated_by
from public.purchase_orders po
join public.goods_receivings gr
  on gr.purchase_order_id = po.id
 and gr.company_id = po.company_id
 and gr.deleted_at is null
join public.attachments source
  on source.entity_type = 'document'
 and source.entity_id = po.document_id
 and source.status = 'active'
 and source.deleted_at is null
where po.deleted_at is null
  and gr.document_id is not null
  and not exists (
    select 1
    from public.attachments existing
    where existing.entity_type = 'document'
      and existing.entity_id = gr.document_id
      and existing.status = 'active'
      and existing.deleted_at is null
      and coalesce(existing.storage_path, '') = coalesce(source.storage_path, '')
      and coalesce(existing.file_url, '') = coalesce(source.file_url, '')
      and existing.file_name = source.file_name
  );

comment on function public.sync_purchase_order_attachment_to_receivings() is
  'Copies active PO document attachments to every existing linked GRN document and keeps late Delivery Order uploads visible.';

notify pgrst, 'reload schema';
