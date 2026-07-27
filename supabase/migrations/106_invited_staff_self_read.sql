-- v7.24.3 — An invited staff member must be able to read only their own
-- profile during the mandatory first-password-change flow. Migration 081
-- recreated this policy with an active-only predicate, which made a valid
-- temporary-password login appear as a missing staff profile.
--
-- This deliberately does not grant invited users tenant access: every other
-- tenant helper and operational policy still requires an active staff record.

drop policy if exists "tenant staffs read" on public.staffs;
drop policy if exists "staffs scoped read" on public.staffs;

create policy "tenant staffs read" on public.staffs for select to authenticated
  using (
    (auth_user_id = auth.uid() and status in ('active', 'invited') and deleted_at is null)
    or (company_id = public.current_staff_company_id() and public.has_permission('staffs.read'))
  );
