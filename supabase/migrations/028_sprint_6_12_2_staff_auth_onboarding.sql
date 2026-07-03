-- Sprint 6.12.2
-- Staff onboarding can use temporary passwords without relying on rate-limited
-- Supabase email links. Password values are never stored here.

alter table if exists public.staffs
add column if not exists must_change_password boolean not null default false;

alter table if exists public.staffs
add column if not exists password_changed_at timestamptz;

alter table if exists public.staffs
add column if not exists auth_setup_method text;

alter table if exists public.staffs
add column if not exists temp_password_issued_at timestamptz;

alter table if exists public.staffs
add column if not exists invitation_status text;

create index if not exists staffs_must_change_password_idx
on public.staffs(must_change_password)
where must_change_password = true;
