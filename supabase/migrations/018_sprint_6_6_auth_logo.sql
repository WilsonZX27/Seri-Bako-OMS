-- =========================================================
-- Sprint 6.6 Auth/Branding Support
-- Company logo columns and Supabase Storage bucket policies.
-- =========================================================

alter table public.companies
add column if not exists logo_url text;

alter table public.companies
add column if not exists logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company assets public read" on storage.objects;
create policy "company assets public read"
on storage.objects for select
to public
using (bucket_id = 'company-assets');

drop policy if exists "company assets admin insert" on storage.objects;
create policy "company assets admin insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-assets'
  and public.has_permission('company.update')
);

drop policy if exists "company assets admin update" on storage.objects;
create policy "company assets admin update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-assets'
  and public.has_permission('company.update')
)
with check (
  bucket_id = 'company-assets'
  and public.has_permission('company.update')
);

drop policy if exists "company assets admin delete" on storage.objects;
create policy "company assets admin delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-assets'
  and public.has_permission('company.update')
);
