-- Sprint 7.7: PR-owned history is removable; only separate downstream documents block.
-- Forward-only. Do not edit or reapply 056-058. Local until explicitly approved.

alter function public.preview_phase_one_hard_delete(text, uuid) rename to preview_phase_one_hard_delete_v058;
alter function public.hard_delete_phase_one(text, uuid, text) rename to hard_delete_phase_one_v058;

create or replace function public.preview_phase_one_hard_delete(record_type text, record_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  base jsonb; root jsonb; doc_id uuid; pr_no text; company uuid; po_count bigint; po_docs jsonb;
  safe jsonb; deps jsonb; label text; status text;
begin
  base := public.preview_phase_one_hard_delete_v058(record_type, record_id);
  if record_type <> 'purchase_request' then return base; end if;
  root := base->'snapshot'; doc_id := (root->>'document_id')::uuid; pr_no := root->>'request_no'; company := (root->>'company_id')::uuid; label := root->>'request_no'; status := root->>'status';
  select count(*), coalesce(jsonb_agg(jsonb_build_object('po_number', po.po_no, 'document_type', 'purchase_order', 'document_id', po.document_id) order by po.po_no), '[]'::jsonb)
    into po_count, po_docs from public.purchase_orders po where po.purchase_request_id=record_id and po.deleted_at is null;
  deps := jsonb_build_object('purchase_orders', po_count, 'downstream_documents', po_docs);
  safe := jsonb_build_object(
    'purchase_request_lines', (select count(*) from public.purchase_request_lines where purchase_request_id=record_id),
    'document', case when doc_id is null then 0 else 1 end,
    'document_revisions', case when doc_id is null then 0 else (select count(*) from public.document_revisions where document_id=doc_id) end,
    'activity_logs', case when doc_id is null then 0 else (select count(*) from public.activity_logs where entity_type='document' and entity_id=doc_id) end,
    'document_comments', case when doc_id is null then 0 else (select count(*) from public.document_comments where document_id=doc_id) end,
    'attachments', (select count(*) from public.attachments where entity_type='document' and entity_id=coalesce(doc_id, record_id) and deleted_at is null),
    'attachment_storage_cleanup_required', (select count(*) > 0 from public.attachments where entity_type='document' and entity_id=coalesce(doc_id, record_id) and deleted_at is null)
  );
  return base || jsonb_build_object(
    'status', status, 'eligible', po_count=0, 'dependencies', deps, 'cascade_safe', safe,
    'display_label', label,
    'reason', case when po_count > 0 then pr_no||' is linked to '||(po_docs->0->>'document_type')||' '||(po_docs->0->>'po_number')||'. Delete or resolve the linked Purchase Order first.' else 'Owner-authorized permanent deletion of the PR and its internal history.' end);
end $$;

create or replace function public.hard_delete_phase_one(record_type text, record_id uuid, confirmation text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare actor public.staffs%rowtype; p jsonb; root jsonb; expected text; doc_id uuid; company uuid; pr_no text;
begin
  if record_type <> 'purchase_request' then return public.hard_delete_phase_one_v058(record_type, record_id, confirmation); end if;
  select s.* into actor from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id
    where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;
  select pr.document_id, pr.company_id, pr.request_no into doc_id, company, pr_no from public.purchase_requests pr where pr.id=record_id for update;
  if pr_no is null then raise exception 'Purchase Request was not found.'; end if;
  if company is distinct from actor.company_id then raise exception 'Record belongs to another company.'; end if;
  p := public.preview_phase_one_hard_delete(record_type, record_id); expected := p->>'confirmation';
  if upper(trim(coalesce(confirmation,''))) <> upper(expected) then raise exception 'Typed confirmation does not match.'; end if;
  if not coalesce((p->>'eligible')::boolean, false) then raise exception '%', p->>'reason'; end if;
  root := p->'snapshot';
  insert into public.permanent_deletion_tombstones(actor_id, actor_name, company_id, record_type, record_id, record_number, display_label, deletion_reason, dependency_summary, sanitized_snapshot)
    values(actor.id, actor.full_name, company, record_type, record_id, pr_no, pr_no, 'Owner-confirmed PR permanent deletion', p->'dependencies', root);
  if doc_id is not null then
    delete from public.attachments where entity_type='document' and entity_id=doc_id;
    delete from public.activity_logs where entity_type='document' and entity_id=doc_id;
    delete from public.document_comments where document_id=doc_id;
    delete from public.document_revisions where document_id=doc_id;
    update public.purchase_requests set document_id=null where id=record_id;
    delete from public.documents where id=doc_id;
  end if;
  delete from public.purchase_request_lines where purchase_request_id=record_id;
  delete from public.purchase_requests where id=record_id;
  return jsonb_build_object('deleted', true, 'record_type', record_type, 'record_id', record_id);
end $$;

grant execute on function public.preview_phase_one_hard_delete(text, uuid) to authenticated;
grant execute on function public.hard_delete_phase_one(text, uuid, text) to authenticated;
