-- A reviewer may correct the complete PR line set at the review step they own.
-- Canonical supplier enforcement remains in the line trigger, and every add
-- remains idempotent and recorded in document_line_revisions/activity_logs.

create or replace function public.add_purchase_request_line_during_review(
  target_purchase_request_id uuid, target_item_id uuid, target_qty numeric, target_uom text,
  target_supplier_id uuid, target_unit_cost numeric, change_reason text, request_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  new_line public.purchase_request_lines%rowtype;
  revision_id uuid;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  select * into request_row from public.purchase_requests where id = target_purchase_request_id and deleted_at is null for update;
  if request_row.id is null or request_row.company_id is distinct from actor.company_id then raise exception 'Purchase request not found.'; end if;
  if not (
    (request_row.status = 'manager_review' and public.has_permission('pr.manager_approve'))
    or (request_row.status = 'admin_review' and public.has_permission('pr.admin_review'))
  ) then raise exception 'Only the active Manager or Purchasing reviewer can add a line.'; end if;
  if target_qty <= 0 or length(trim(coalesce(target_uom,''))) = 0 then raise exception 'Quantity and UOM are required.'; end if;
  if length(trim(coalesce(change_reason,''))) < 3 then raise exception 'Explain why this line is being added.'; end if;
  select id into revision_id from public.document_line_revisions where company_id = actor.company_id and idempotency_key = request_idempotency_key;
  if revision_id is not null then return jsonb_build_object('revision_id', revision_id, 'already_applied', true); end if;
  if not exists (select 1 from public.items where id = target_item_id and company_id = actor.company_id and status = 'active' and deleted_at is null) then raise exception 'Selected item is not active.'; end if;
  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks)
  values(request_row.id,target_item_id,target_qty,trim(target_uom),greatest(coalesce(target_unit_cost,0),0),target_supplier_id,trim(change_reason),'Added during review') returning * into new_line;
  insert into public.document_line_revisions(company_id,document_type,document_id,line_id,action,before_snapshot,after_snapshot,reason,status,idempotency_key,requested_by,reviewed_by,resolved_at)
  values(actor.company_id,'purchase_request',request_row.id,new_line.id,'add','{}'::jsonb,to_jsonb(new_line),trim(change_reason),'applied',request_idempotency_key,actor.id,actor.id,now()) returning id into revision_id;
  update public.purchase_requests set updated_by = actor.id, updated_at = now() where id = request_row.id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'purchase_request',request_row.id,'line_add','Purchase request line added during review',jsonb_build_object('line_id',new_line.id,'revision_id',revision_id,'reason',trim(change_reason),'review_status',request_row.status),actor.id);
  return jsonb_build_object('revision_id',revision_id,'line_id',new_line.id,'already_applied',false);
end;
$$;

revoke all on function public.add_purchase_request_line_during_review(uuid,uuid,numeric,text,uuid,numeric,text,uuid) from public, anon;
grant execute on function public.add_purchase_request_line_during_review(uuid,uuid,numeric,text,uuid,numeric,text,uuid) to authenticated;
