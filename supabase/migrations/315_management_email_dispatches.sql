-- Server-only delivery log. A unique daily key prevents duplicate management digests.
create table if not exists public.management_email_dispatches (
  dedupe_key text primary key,
  company_id uuid not null references public.companies(id),
  staff_id uuid not null references public.staffs(id),
  recipient_email text not null,
  status text not null default 'claimed' check (status in ('claimed','sent','failed')),
  provider_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists management_email_dispatches_company_created_idx
  on public.management_email_dispatches(company_id, created_at desc);
alter table public.management_email_dispatches enable row level security;
revoke all on public.management_email_dispatches from anon, authenticated;
