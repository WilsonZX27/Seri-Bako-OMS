update public.compliance_records
set review_status = 'approved', reviewed_at = coalesce(reviewed_at, updated_at), review_note = null
where subject_kind = 'outlet'
  and deleted_at is null
  and review_status in ('draft', 'pending_review', 'rejected');

notify pgrst, 'reload schema';
