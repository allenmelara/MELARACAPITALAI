create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  module text not null check (module in ('company', 'document', 'wealth', 'real_estate')),
  input jsonb not null default '{}'::jsonb,
  output text not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can read their reports"
on public.reports for select
using (auth.uid() = user_id);

create policy "Users can create their reports"
on public.reports for insert
with check (auth.uid() = user_id);

create policy "Users can delete their reports"
on public.reports for delete
using (auth.uid() = user_id);
