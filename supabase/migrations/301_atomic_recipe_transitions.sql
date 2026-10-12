-- Keep Recipe, its universal Document, revisions, activity and single-active
-- product invariant inside one transaction. The workflow shape can become
-- configurable later; these state and tenant invariants remain mandatory.

create or replace function public.transition_recipe_atomic(
  p_recipe_id uuid,
  p_action text,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  recipe_row public.recipes%rowtype;
  prior_active public.recipes%rowtype;
  required_permission text;
  next_status public.recipe_status;
  next_approval public.approval_status;
  next_document_status public.document_status;
  next_step text;
  activity_type text;
  activity_message text;
  revision_number integer;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'An active staff profile is required.'; end if;

  required_permission := case
    when p_action = 'submit' then 'recipes.submit'
    when p_action in ('approve', 'activate', 'reject') then 'recipes.approve'
    when p_action = 'archive' then 'recipes.archive'
    else null
  end;
  if required_permission is null then raise exception 'Unsupported recipe transition.'; end if;
  if not public.has_permission(required_permission) then raise exception 'Missing permission: %', required_permission; end if;

  select * into recipe_row
  from public.recipes
  where id = p_recipe_id and company_id = actor.company_id and deleted_at is null
  for update;
  if recipe_row.id is null then raise exception 'Recipe was not found in your company.'; end if;

  if p_action = 'submit' then
    if recipe_row.status = 'pending_approval' then return jsonb_build_object('id', recipe_row.id, 'status', recipe_row.status, 'already_applied', true); end if;
    if recipe_row.status <> 'draft' then raise exception 'Only a draft recipe can be submitted.'; end if;
    next_status := 'pending_approval'; next_approval := 'pending'; next_document_status := 'pending_approval'; next_step := 'Manager approval'; activity_type := 'submitted';
  elsif p_action = 'approve' then
    if recipe_row.status = 'approved' then return jsonb_build_object('id', recipe_row.id, 'status', recipe_row.status, 'already_applied', true); end if;
    if recipe_row.status <> 'pending_approval' then raise exception 'Only a pending recipe can be approved.'; end if;
    next_status := 'approved'; next_approval := 'approved'; next_document_status := 'approved'; next_step := 'Approved'; activity_type := 'approved';
  elsif p_action = 'activate' then
    if recipe_row.status = 'active' then return jsonb_build_object('id', recipe_row.id, 'status', recipe_row.status, 'already_applied', true); end if;
    if recipe_row.status <> 'approved' then raise exception 'Only an approved recipe can be activated.'; end if;
    next_status := 'active'; next_approval := 'approved'; next_document_status := 'approved'; next_step := 'Active recipe'; activity_type := 'activated';
  elsif p_action = 'reject' then
    if recipe_row.status <> 'pending_approval' or nullif(btrim(p_remarks), '') is null then raise exception 'Only a pending recipe can be rejected with remarks.'; end if;
    next_status := 'rejected'; next_approval := 'rejected'; next_document_status := 'rejected'; next_step := 'Rejected'; activity_type := 'rejected';
  elsif p_action = 'archive' then
    if recipe_row.status = 'archived' then return jsonb_build_object('id', recipe_row.id, 'status', recipe_row.status, 'already_applied', true); end if;
    if recipe_row.status not in ('approved', 'active') then raise exception 'Only an approved or active recipe can be archived.'; end if;
    next_status := 'archived'; next_approval := 'approved'; next_document_status := 'closed'; next_step := 'Archived'; activity_type := 'archived';
  end if;

  -- Lock and archive every prior active version before activating this one.
  -- The partial unique index remains the final concurrent-write guard.
  if p_action = 'activate' then
    for prior_active in
      select * from public.recipes
      where company_id = actor.company_id and product_id = recipe_row.product_id
        and status = 'active' and deleted_at is null and id <> recipe_row.id
      for update
    loop
      update public.recipes
      set status = 'archived', approval_status = 'approved', archived_at = now(), updated_at = now(), updated_by = actor.id
      where id = prior_active.id;
      if prior_active.document_id is not null then
        update public.documents
        set status = 'closed', approval_status = 'approved', current_step = 'Superseded by active recipe',
            revision_no = revision_no + 1, closed_at = now(), updated_by = actor.id
        where id = prior_active.document_id and company_id = actor.company_id
        returning revision_no into revision_number;
        if revision_number is not null then
          insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
          values (prior_active.document_id, revision_number, 'Recipe superseded by a newly activated version.', actor.id);
        end if;
      end if;
    end loop;
  end if;

  update public.recipes
  set status = next_status,
      approval_status = next_approval,
      updated_at = now(),
      updated_by = actor.id,
      submitted_at = case when next_status = 'pending_approval' then now() else submitted_at end,
      approved_at = case when next_status in ('approved', 'active') then coalesce(approved_at, now()) else approved_at end,
      activated_at = case when next_status = 'active' then now() else activated_at end,
      rejected_at = case when next_status = 'rejected' then now() else rejected_at end,
      archived_at = case when next_status = 'archived' then now() else archived_at end
  where id = recipe_row.id;

  activity_message := case
    when activity_type = 'rejected' then 'Recipe ' || recipe_row.recipe_no || ' rejected: ' || btrim(p_remarks)
    else 'Recipe ' || recipe_row.recipe_no || ' ' || activity_type
  end;

  if recipe_row.document_id is not null then
    update public.documents
    set status = next_document_status,
        approval_status = next_approval,
        current_step = next_step,
        revision_no = revision_no + 1,
        updated_by = actor.id,
        submitted_at = case when next_document_status = 'pending_approval' then now() else submitted_at end,
        closed_at = case when next_document_status = 'closed' then now() else closed_at end
    where id = recipe_row.document_id and company_id = actor.company_id
    returning revision_no into revision_number;
    if revision_number is null then raise exception 'The linked recipe document is unavailable.'; end if;

    insert into public.document_revisions(document_id, revision_no, change_summary, changed_by)
    values (recipe_row.document_id, revision_number, coalesce(nullif(btrim(p_remarks), ''), activity_message || '.'), actor.id);
    insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
    values (actor.company_id, 'document', recipe_row.document_id, activity_type, activity_message,
      jsonb_build_object('recipe_id', recipe_row.id, 'from_status', recipe_row.status, 'to_status', next_status), actor.id);
  end if;

  return jsonb_build_object(
    'id', recipe_row.id,
    'recipe_no', recipe_row.recipe_no,
    'status', next_status,
    'approval_status', next_approval,
    'document_id', recipe_row.document_id,
    'already_applied', false
  );
end;
$$;

revoke all on function public.transition_recipe_atomic(uuid, text, text) from public, anon;
grant execute on function public.transition_recipe_atomic(uuid, text, text) to authenticated;
