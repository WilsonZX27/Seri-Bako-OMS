-- Correct the external AutoCount document number exactly as supplied.

do $$
declare
  target public.purchase_orders%rowtype;
begin
  select * into target
  from public.purchase_orders
  where po_no = 'PO - 000207' and deleted_at is null
  limit 1;

  if target.id is null then return; end if;

  if exists (
    select 1 from public.purchase_orders
    where company_id = target.company_id and po_no = 'PO-000207'
      and id <> target.id and deleted_at is null
  ) or exists (
    select 1 from public.documents
    where company_id = target.company_id and document_no = 'PO-000207'
      and id <> target.document_id and deleted_at is null
  ) then
    raise exception 'Cannot correct PO - 000207: PO-000207 already exists.';
  end if;

  update public.purchase_orders
  set po_no = 'PO-000207', updated_at = now()
  where id = target.id;

  if target.document_id is not null then
    update public.documents
    set document_no = 'PO-000207', title = 'Purchase Order PO-000207', updated_at = now()
    where id = target.document_id and company_id = target.company_id;

    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    select target.document_id, coalesce(max(revision_no), 0) + 1,
      'Corrected AutoCount PO number spacing from PO - 000207 to PO-000207.', target.updated_by
    from public.document_revisions where document_id = target.document_id;
  end if;

  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values(target.company_id, 'purchase_order', target.id, 'corrected',
    'AutoCount PO number corrected to PO-000207',
    jsonb_build_object('from_po_no','PO - 000207','to_po_no','PO-000207'), target.updated_by);
end $$;
