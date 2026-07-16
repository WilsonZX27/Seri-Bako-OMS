-- Sprint 7.7 follow-up: cancellation-only PRs are intrinsic and deletable.
-- Local only until explicitly approved for remote application. Do not edit 056/057.

alter function public.preview_phase_one_hard_delete(text, uuid) rename to preview_phase_one_hard_delete_v057;
alter function public.hard_delete_phase_one(text, uuid, text) rename to hard_delete_phase_one_v057;

create or replace function public.preview_phase_one_hard_delete(record_type text, record_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  base jsonb; root jsonb; v_document_id uuid; number text; status text; activity_count bigint; invalid_activity bigint; created_count bigint; cancelled_count bigint;
  deps jsonb; safe jsonb; eligible boolean;
begin
  base := public.preview_phase_one_hard_delete_v057(record_type, record_id);
  if record_type <> 'purchase_request' then return base; end if;
  root := base->'snapshot'; v_document_id := (root->>'document_id')::uuid; number := root->>'request_no'; status := root->>'status';
  if v_document_id is null then return base; end if;

  select count(*), count(*) filter (where activity_type='created' and message='Purchase request '||number||' created' and metadata is null), count(*) filter (where activity_type='cancelled' and message='Purchase request '||number||' cancelled' and metadata='{"workflow_step":"draft","next_status":"cancelled"}'::jsonb)
    into activity_count, created_count, cancelled_count from public.activity_logs where entity_type='document' and entity_id=v_document_id;
  invalid_activity := activity_count - created_count - cancelled_count;
  eligible := coalesce((base->'dependencies'->>'purchase_orders')::bigint, 0) = 0
    and coalesce((base->'dependencies'->>'document_comments')::bigint, 0) = 0
    and coalesce((base->'dependencies'->>'attachments')::bigint, 0) = 0
    and coalesce((base->'dependencies'->>'document_revisions')::bigint, 0) = 0
    and invalid_activity = 0 and created_count = 1
    and ((status = 'draft' and cancelled_count = 0) or (status = 'cancelled' and cancelled_count = 1));
  deps := (base->'dependencies') || jsonb_build_object('activity_logs', invalid_activity);
  safe := (base->'cascade_safe') || jsonb_build_object('activity_logs', created_count + cancelled_count);
  return base || jsonb_build_object('eligible', eligible, 'dependencies', deps, 'cascade_safe', safe, 'reason', case when eligible then 'Owner-authorized Phase 1 permanent deletion.' else 'Permanent deletion is blocked by status or meaningful workflow/dependency history.' end);
end $$;

create or replace function public.hard_delete_phase_one(record_type text, record_id uuid, confirmation text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  actor public.staffs%rowtype; p jsonb; root jsonb; expected text; v_document_id uuid; number text; label text; company uuid;
begin
  if record_type <> 'purchase_request' then return public.hard_delete_phase_one_v057(record_type, record_id, confirmation); end if;
  select s.* into actor from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id
    where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;
  select pr.document_id, pr.company_id, pr.request_no into v_document_id, company, number from public.purchase_requests pr where pr.id=record_id for update;
  if v_document_id is null and number is null then raise exception 'Purchase Request was not found.'; end if;
  if company is distinct from actor.company_id then raise exception 'Record belongs to another company.'; end if;
  p := public.preview_phase_one_hard_delete(record_type, record_id); expected := p->>'confirmation';
  if upper(trim(coalesce(confirmation,''))) <> upper(expected) then raise exception 'Typed confirmation does not match.'; end if;
  if not coalesce((p->>'eligible')::boolean, false) then raise exception 'Permanent deletion is blocked by current dependencies or status.'; end if;
  root := p->'snapshot'; label := p->>'display_label';
  insert into public.permanent_deletion_tombstones(actor_id, actor_name, company_id, record_type, record_id, record_number, display_label, deletion_reason, dependency_summary, sanitized_snapshot)
    values(actor.id, actor.full_name, company, record_type, record_id, number, label, 'Owner-confirmed Phase 1 permanent deletion', p->'dependencies', root);
  delete from public.activity_logs where entity_type='document' and entity_id=v_document_id and ((activity_type='created' and message='Purchase request '||number||' created' and metadata is null) or (activity_type='cancelled' and message='Purchase request '||number||' cancelled' and metadata='{"workflow_step":"draft","next_status":"cancelled"}'::jsonb));
  delete from public.document_revisions where document_id=v_document_id and revision_no=1 and change_summary='Initial document created.';
  update public.purchase_requests set document_id=null where id=record_id;
  delete from public.documents where id=v_document_id;
  delete from public.purchase_requests where id=record_id;
  return jsonb_build_object('deleted', true, 'record_type', record_type, 'record_id', record_id);
end $$;

grant execute on function public.preview_phase_one_hard_delete(text, uuid) to authenticated;
grant execute on function public.hard_delete_phase_one(text, uuid, text) to authenticated;
