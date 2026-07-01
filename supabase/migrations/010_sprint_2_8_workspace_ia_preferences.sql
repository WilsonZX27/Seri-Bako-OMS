-- =========================================================
-- Seri Bako OMS Sprint 2.8 Workspace IA Preferences
-- Scope: user-level UX preferences for navigation, dashboard,
-- favorites, table settings, and future theme support.
-- =========================================================

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  user_id uuid,
  preference_key text not null,
  preference_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_key_not_empty check (length(trim(preference_key)) > 0)
);

create unique index if not exists user_preferences_user_key_idx
  on public.user_preferences(user_id, preference_key);

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "user preferences read own" on public.user_preferences;
create policy "user preferences read own" on public.user_preferences
  for select to authenticated using (user_id = auth.uid() or public.has_permission('company.update'));

drop policy if exists "user preferences manage own" on public.user_preferences;
create policy "user preferences manage own" on public.user_preferences
  for all to authenticated using (user_id = auth.uid() or public.has_permission('company.update'))
  with check (user_id = auth.uid() or public.has_permission('company.update'));
