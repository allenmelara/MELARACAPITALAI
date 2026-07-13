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

create policy "Users can update their reports"
on public.reports for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Only SELECT is exposed to authenticated users. Plan and Stripe fields are
-- written exclusively by the Stripe webhook handler using the service-role
-- key, which bypasses RLS entirely, so there is no insert/update policy for
-- regular users below by design.
create policy "Users can read their profile"
on public.profiles for select
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Append-only log of billable AI calls, used to enforce the monthly
-- reports-per-plan cap. Distinct from public.reports, which only counts
-- reports the user chose to save.
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('analyze')),
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create policy "Users can read their usage"
on public.usage_events for select
using (auth.uid() = user_id);

create policy "Users can record their usage"
on public.usage_events for insert
with check (auth.uid() = user_id);

-- Allow the "chat" usage kind alongside "analyze" (separate, lighter monthly
-- cap — see lib/limits.ts PLAN_LIMITS.chatMessagesPerMonth).
alter table public.usage_events drop constraint if exists usage_events_kind_check;
alter table public.usage_events add constraint usage_events_kind_check check (kind in ('analyze', 'chat'));

-- Per-report AI chat history. Deleting a report cascades to its chat.
create table if not exists public.report_chat_messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.report_chat_messages enable row level security;

create policy "Users can read their report chat messages"
on public.report_chat_messages for select
using (auth.uid() = user_id);

create policy "Users can create their report chat messages"
on public.report_chat_messages for insert
with check (auth.uid() = user_id);

-- Pricing redesign: AI Research Credits as the primary metered resource,
-- plus a separate "document" usage kind (its own monthly cap, decoupled from
-- company-report credits — see lib/limits.ts PLAN_LIMITS).
alter table public.usage_events drop constraint if exists usage_events_kind_check;
alter table public.usage_events add constraint usage_events_kind_check check (kind in ('analyze', 'chat', 'document'));

-- Business-plan white-label PDF export branding. Null on every other plan
-- (and on Business until the user sets it) falls back to standard branding.
alter table public.profiles add column if not exists brand_name text;
alter table public.profiles add column if not exists brand_logo_url text;

-- Portfolio Tracker: manually-entered holdings (no brokerage linking).
-- cost_basis is stored per share; total invested = shares * cost_basis.
create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  shares numeric not null check (shares > 0),
  cost_basis numeric not null check (cost_basis >= 0),
  created_at timestamptz not null default now()
);

alter table public.holdings enable row level security;

create policy "Users can read their holdings"
on public.holdings for select
using (auth.uid() = user_id);

create policy "Users can create their holdings"
on public.holdings for insert
with check (auth.uid() = user_id);

create policy "Users can delete their holdings"
on public.holdings for delete
using (auth.uid() = user_id);

-- One row per user per day, upserted whenever the portfolio page is loaded,
-- so the performance chart accumulates real history from today onward
-- (there's no way to backfill true historical portfolio value for free).
create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_value numeric not null,
  total_cost_basis numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

alter table public.portfolio_snapshots enable row level security;

create policy "Users can read their portfolio snapshots"
on public.portfolio_snapshots for select
using (auth.uid() = user_id);

create policy "Users can record their portfolio snapshots"
on public.portfolio_snapshots for insert
with check (auth.uid() = user_id);

create policy "Users can update their portfolio snapshots"
on public.portfolio_snapshots for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Dividend income (deferred from the initial Portfolio Tracker build):
-- annual dividend per share, entered manually alongside a holding.
alter table public.holdings add column if not exists annual_dividend_per_share numeric not null default 0;
alter table public.holdings drop constraint if exists holdings_dividend_check;
alter table public.holdings add constraint holdings_dividend_check check (annual_dividend_per_share >= 0);

-- Optional, skippable "Personal Financial Profile" onboarding (Phase 1 of the
-- AI-financial-operating-system rollout). Every financial field is a coarse
-- range/enum rather than an exact figure or account identifier, by design —
-- this table never holds account numbers, balances, or credentials. Unlike
-- public.profiles (select-only for users), this row is fully user-writable
-- since it's self-service personal data, not billing state.
create table if not exists public.financial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_range text check (age_range in ('under_25','25_34','35_44','45_54','55_64','65_plus')),
  income_range text check (income_range in ('under_50k','50k_100k','100k_150k','150k_250k','250k_plus')),
  monthly_expenses_range text check (monthly_expenses_range in ('under_2k','2k_4k','4k_6k','6k_10k','10k_plus')),
  savings_range text check (savings_range in ('under_10k','10k_50k','50k_150k','150k_500k','500k_plus')),
  debts_range text check (debts_range in ('none','under_10k','10k_50k','50k_150k','150k_plus')),
  goals jsonb not null default '[]'::jsonb,
  emergency_fund_goal_months numeric check (emergency_fund_goal_months >= 0),
  retirement_goal_age integer check (retirement_goal_age > 0),
  time_horizon text check (time_horizon in ('short','medium','long')),
  risk_tolerance text check (risk_tolerance in ('conservative','moderate','aggressive')),
  investment_experience text check (investment_experience in ('none','beginner','intermediate','advanced')),
  real_estate_interest boolean,
  business_ownership_interest boolean,
  used_estimated_values boolean not null default false,
  consent_given_at timestamptz,
  consent_version text,
  onboarding_completed_at timestamptz,
  onboarding_skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_profiles enable row level security;

create policy "Users can read their financial profile"
on public.financial_profiles for select
using (auth.uid() = user_id);

create policy "Users can create their financial profile"
on public.financial_profiles for insert
with check (auth.uid() = user_id);

create policy "Users can update their financial profile"
on public.financial_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their financial profile"
on public.financial_profiles for delete
using (auth.uid() = user_id);
