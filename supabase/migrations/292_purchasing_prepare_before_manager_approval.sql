-- Purchasing can prepare request lines before Manager sign-off.
-- Keep existing validation, auditing and idempotency; do not change approval
-- grants, status transitions, or sign-off fields.
begin;

do $migration$
declare
  target regprocedure;
  definition text;
  old_guard text := $old$(request_row.status = 'manager_review' and public.has_permission('pr.manager_approve'))$old$;
  new_guard text := $new$(request_row.status = 'manager_review' and (
      public.has_permission('pr.manager_approve') or (
        public.has_permission('pr.admin_review')
        and public.current_staff_role_codes() && array['purchasing','super_admin']::text[]
      )
    ))$new$;
begin
  foreach target in array array[
    'public.revise_purchase_request_line(uuid,uuid,text,uuid,numeric,text,uuid,numeric,text,uuid,timestamptz)'::regprocedure,
    'public.add_purchase_request_line_during_review(uuid,uuid,numeric,text,uuid,numeric,text,uuid)'::regprocedure
  ] loop
    definition := pg_get_functiondef(target);
    if position(old_guard in definition) = 0 then
      raise exception 'Unexpected preparation guard in %; review before changing authority', target;
    end if;
    definition := replace(definition, old_guard, new_guard);
    execute definition;
  end loop;

  target := 'public.resolve_purchase_request_unresolved_line(uuid,uuid,uuid)'::regprocedure;
  definition := pg_get_functiondef(target);
  old_guard := $old$if request_row.status::text<>'admin_review' then raise exception 'Non-catalog lines can be matched only during Purchasing Review.'; end if;$old$;
  new_guard := $new$if request_row.status::text not in ('manager_review','admin_review') then
    raise exception 'Non-catalog lines can be matched only during Manager or Purchasing Review.';
  end if;
  if request_row.status::text='manager_review' and not (
    public.has_permission('pr.admin_review')
    and public.current_staff_role_codes() && array['purchasing','super_admin']::text[]
  ) then raise exception 'Only Purchasing can prepare item matches before Manager approval.'; end if;$new$;
  if position(old_guard in definition) = 0 then
    raise exception 'Unexpected item-matching guard; review before changing authority';
  end if;
  execute replace(definition, old_guard, new_guard);
end;
$migration$;

commit;
