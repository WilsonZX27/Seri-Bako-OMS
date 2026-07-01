-- =========================================================
-- Sprint 6.6B Staff Invitation & First Password Setup
-- Invitation lifecycle fields and staff email uniqueness.
-- =========================================================

alter type public.record_status add value if not exists 'invited';
alter type public.record_status add value if not exists 'disabled';

alter table public.staffs
add column if not exists invited_at timestamptz;

alter table public.staffs
add column if not exists invited_by uuid references public.staffs(id);

alter table public.staffs
add column if not exists accepted_at timestamptz;

alter table public.staffs
add column if not exists last_login_at timestamptz;

alter table public.staffs
add column if not exists invite_email text;

create unique index if not exists staffs_company_email_active_idx
on public.staffs(company_id, lower(email))
where email is not null and deleted_at is null;

create index if not exists staffs_auth_user_id_idx on public.staffs(auth_user_id);
create index if not exists staffs_invite_email_idx on public.staffs(lower(invite_email));
