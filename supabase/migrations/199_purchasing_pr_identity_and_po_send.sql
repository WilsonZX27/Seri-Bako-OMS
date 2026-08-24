-- Purchasing must be able to identify PR submitters and send approved POs.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'po.send'
where r.role_code = 'purchasing'
on conflict (role_id, permission_id) do nothing;

drop policy if exists "pr reviewers read requester identity" on public.staffs;
create policy "pr reviewers read requester identity" on public.staffs
for select to authenticated
using (
  company_id = public.current_staff_company_id()
  and deleted_at is null
  and public.has_any_permission(array[
    'pr.manager_approve',
    'pr.admin_review',
    'pr.purchasing_review',
    'pr.finance_review',
    'pr.view_all'
  ])
);

comment on policy "pr reviewers read requester identity" on public.staffs is
  'Allows PR workflow reviewers to display the submitter name without granting staff-management access.';

create or replace function public.prevent_pr_progress_with_pending_line_revisions()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.status in ('finance_review', 'ready_to_convert', 'converted_to_po')
    and old.status is distinct from new.status
    and exists (
      select 1 from public.document_line_revisions
      where document_type = 'purchase_request'
        and document_id = new.id
        and status = 'pending'
    ) then
    raise exception 'Resolve every pending purchase request line revision before continuing.';
  end if;
  return new;
end;
$$;

drop trigger if exists block_pr_progress_with_pending_line_revisions on public.purchase_requests;
create trigger block_pr_progress_with_pending_line_revisions
before update of status on public.purchase_requests
for each row execute function public.prevent_pr_progress_with_pending_line_revisions();

alter table public.purchase_requests
  add column if not exists autocount_po_no text;

alter table public.purchase_requests
  drop constraint if exists purchase_requests_autocount_po_no_length;
alter table public.purchase_requests
  add constraint purchase_requests_autocount_po_no_length
  check (autocount_po_no is null or length(trim(autocount_po_no)) between 1 and 160);

create or replace function public.set_purchase_request_autocount_po_no(target_purchase_request_id uuid, target_po_no text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'An active staff account is required.'; end if;
  select * into request_row from public.purchase_requests where id = target_purchase_request_id and deleted_at is null for update;
  if request_row.id is null or request_row.company_id is distinct from actor.company_id then raise exception 'Purchase request not found.'; end if;
  if request_row.status <> 'admin_review' or not public.has_permission('pr.admin_review') then raise exception 'AutoCount PO Number is recorded during Purchasing Review.'; end if;
  if length(trim(coalesce(target_po_no,''))) not between 1 and 160 then raise exception 'AutoCount PO Number is required and must be 160 characters or fewer.'; end if;
  update public.purchase_requests set autocount_po_no = trim(target_po_no), updated_by = actor.id, updated_at = now() where id = request_row.id;
end;
$$;

revoke all on function public.set_purchase_request_autocount_po_no(uuid,text) from public, anon;
grant execute on function public.set_purchase_request_autocount_po_no(uuid,text) to authenticated;

alter table public.document_line_revisions
  drop constraint if exists document_line_revisions_action_check;
alter table public.document_line_revisions
  add constraint document_line_revisions_action_check check (action in ('add','update','replace','remove'));

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
  if request_row.status <> 'admin_review' or not public.has_permission('pr.admin_review') then raise exception 'Only Purchasing can add a line during Purchasing Review.'; end if;
  if target_qty <= 0 or length(trim(coalesce(target_uom,''))) = 0 then raise exception 'Quantity and UOM are required.'; end if;
  if length(trim(coalesce(change_reason,''))) < 3 then raise exception 'Explain why this line is being added.'; end if;
  select id into revision_id from public.document_line_revisions where company_id = actor.company_id and idempotency_key = request_idempotency_key;
  if revision_id is not null then return jsonb_build_object('revision_id', revision_id, 'already_applied', true); end if;
  if not exists (select 1 from public.items where id = target_item_id and company_id = actor.company_id and status = 'active' and deleted_at is null) then raise exception 'Selected item is not active.'; end if;
  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks)
  values(request_row.id,target_item_id,target_qty,trim(target_uom),greatest(coalesce(target_unit_cost,0),0),target_supplier_id,trim(change_reason),'Added during Purchasing Review') returning * into new_line;
  insert into public.document_line_revisions(company_id,document_type,document_id,line_id,action,before_snapshot,after_snapshot,reason,status,idempotency_key,requested_by,reviewed_by,resolved_at)
  values(actor.company_id,'purchase_request',request_row.id,new_line.id,'add','{}'::jsonb,to_jsonb(new_line),trim(change_reason),'applied',request_idempotency_key,actor.id,actor.id,now()) returning id into revision_id;
  update public.purchase_requests set updated_by = actor.id, updated_at = now() where id = request_row.id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'purchase_request',request_row.id,'line_add','Purchase request line added during review',jsonb_build_object('line_id',new_line.id,'revision_id',revision_id,'reason',trim(change_reason)),actor.id);
  return jsonb_build_object('revision_id',revision_id,'line_id',new_line.id,'already_applied',false);
end;
$$;

revoke all on function public.add_purchase_request_line_during_review(uuid,uuid,numeric,text,uuid,numeric,text,uuid) from public, anon;
grant execute on function public.add_purchase_request_line_during_review(uuid,uuid,numeric,text,uuid,numeric,text,uuid) to authenticated;
