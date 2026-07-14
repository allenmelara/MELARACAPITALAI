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

-- Phase 4: self-reported insurance coverage flags for the Financial Health
-- Score's "insurance readiness" category. Nullable — unanswered, not "no
-- coverage" — same coarse self-reported philosophy as the rest of this table.
alter table public.financial_profiles add column if not exists has_health_insurance boolean;
alter table public.financial_profiles add column if not exists has_life_insurance boolean;
alter table public.financial_profiles add column if not exists has_disability_insurance boolean;
alter table public.financial_profiles add column if not exists has_home_or_renters_insurance boolean;

-- Phase 2: Personal Finance Dashboard. Every table below is manual-entry
-- (no bank/brokerage linking) and follows the same uuid PK / user_id FK+cascade
-- / full-CRUD-RLS conventions as public.holdings and public.financial_profiles.

create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('checking', 'savings', 'emergency_fund', 'other')),
  balance numeric not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cash_accounts enable row level security;

create policy "Users can read their cash accounts" on public.cash_accounts for select using (auth.uid() = user_id);
create policy "Users can create their cash accounts" on public.cash_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update their cash accounts" on public.cash_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their cash accounts" on public.cash_accounts for delete using (auth.uid() = user_id);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  debt_type text not null check (debt_type in ('credit_card', 'student_loan', 'auto_loan', 'mortgage', 'personal_loan', 'other')),
  balance numeric not null check (balance >= 0),
  interest_rate numeric check (interest_rate >= 0),
  minimum_payment numeric check (minimum_payment >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts enable row level security;

create policy "Users can read their debts" on public.debts for select using (auth.uid() = user_id);
create policy "Users can create their debts" on public.debts for insert with check (auth.uid() = user_id);
create policy "Users can update their debts" on public.debts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their debts" on public.debts for delete using (auth.uid() = user_id);

-- due_day is a day-of-month (1-31); "upcoming" is computed in app code as the
-- next occurrence of that day from today, not stored as a specific date.
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount >= 0),
  due_day integer not null check (due_day between 1 and 31),
  category text,
  autopay boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bills enable row level security;

create policy "Users can read their bills" on public.bills for select using (auth.uid() = user_id);
create policy "Users can create their bills" on public.bills for insert with check (auth.uid() = user_id);
create policy "Users can update their bills" on public.bills for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their bills" on public.bills for delete using (auth.uid() = user_id);

-- Distinct from the /dashboard/real-estate ROI calculator (a one-off tool with
-- no persisted state) — this is a tracked list of owned properties.
create table if not exists public.real_estate_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  estimated_value numeric not null check (estimated_value >= 0),
  mortgage_balance numeric not null default 0 check (mortgage_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.real_estate_holdings enable row level security;

create policy "Users can read their real estate holdings" on public.real_estate_holdings for select using (auth.uid() = user_id);
create policy "Users can create their real estate holdings" on public.real_estate_holdings for insert with check (auth.uid() = user_id);
create policy "Users can update their real estate holdings" on public.real_estate_holdings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their real estate holdings" on public.real_estate_holdings for delete using (auth.uid() = user_id);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table public.watchlist_items enable row level security;

create policy "Users can read their watchlist items" on public.watchlist_items for select using (auth.uid() = user_id);
create policy "Users can create their watchlist items" on public.watchlist_items for insert with check (auth.uid() = user_id);
create policy "Users can delete their watchlist items" on public.watchlist_items for delete using (auth.uid() = user_id);

-- Separate from financial_profiles.goals (Phase 1's flat list of goal
-- *interests* used for onboarding personalization) — this is a trackable
-- goal with a target amount/date and editable progress.
create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text check (category in ('emergency_fund', 'retirement', 'home', 'debt_payoff', 'education', 'business', 'general')),
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_goals enable row level security;

create policy "Users can read their financial goals" on public.financial_goals for select using (auth.uid() = user_id);
create policy "Users can create their financial goals" on public.financial_goals for insert with check (auth.uid() = user_id);
create policy "Users can update their financial goals" on public.financial_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their financial goals" on public.financial_goals for delete using (auth.uid() = user_id);

-- One row per user per month, hand-entered via a "log this month" form — a
-- lightweight budget check-in, not a transaction ledger.
create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  income numeric not null default 0 check (income >= 0),
  categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.monthly_budgets enable row level security;

create policy "Users can read their monthly budgets" on public.monthly_budgets for select using (auth.uid() = user_id);
create policy "Users can create their monthly budgets" on public.monthly_budgets for insert with check (auth.uid() = user_id);
create policy "Users can update their monthly budgets" on public.monthly_budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their monthly budgets" on public.monthly_budgets for delete using (auth.uid() = user_id);

-- Mirrors public.portfolio_snapshots exactly: upserted once/day on dashboard
-- load so net-worth history accumulates organically from today onward.
create table if not exists public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  net_worth numeric not null,
  total_assets numeric not null,
  total_debt numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

alter table public.net_worth_snapshots enable row level security;

create policy "Users can read their net worth snapshots" on public.net_worth_snapshots for select using (auth.uid() = user_id);
create policy "Users can create their net worth snapshots" on public.net_worth_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update their net worth snapshots" on public.net_worth_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cached AI-generated recommendation cards, regenerated at most once per day
-- (the unique constraint below is what enforces that, independent of any
-- in-memory cache/instance-restart concerns) — unmetered against
-- aiResearchCredits, same treatment as the News Feed.
create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_date date not null,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, generated_date)
);

alter table public.ai_recommendations enable row level security;

create policy "Users can read their AI recommendations" on public.ai_recommendations for select using (auth.uid() = user_id);
create policy "Users can create their AI recommendations" on public.ai_recommendations for insert with check (auth.uid() = user_id);
create policy "Users can update their AI recommendations" on public.ai_recommendations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Phase 3: AI Financial Coach. Persisted conversation for the "Ask Melara AI"
-- widget, but only for signed-in users — mirrors public.report_chat_messages.
-- Anonymous visitors keep the widget's original fully-ephemeral behavior
-- (client-side only, never written here).
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.coach_messages enable row level security;

create policy "Users can read their coach messages" on public.coach_messages for select using (auth.uid() = user_id);
create policy "Users can create their coach messages" on public.coach_messages for insert with check (auth.uid() = user_id);

-- Phase 4: Engagement. Financial Health Score history, in-app notifications
-- (created by the daily cron job and by in-app events), and per-user
-- notification channel/type preferences.

-- Mirrors public.net_worth_snapshots exactly — upserted whenever the score is
-- computed (dashboard load or the daily cron), giving a score-over-time trend
-- for free. overall_score is nullable: null means no category had enough
-- data yet to compute a score at all (shown as a "get started" empty state,
-- never a punishing 0).
create table if not exists public.health_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  overall_score numeric,
  category_scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

alter table public.health_score_snapshots enable row level security;

create policy "Users can read their health score snapshots" on public.health_score_snapshots for select using (auth.uid() = user_id);
create policy "Users can create their health score snapshots" on public.health_score_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update their health score snapshots" on public.health_score_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('daily_checkin', 'weekly_recap', 'monthly_report', 'goal_milestone', 'streak_milestone', 'score_change', 'budget_challenge')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can read their notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can create their notifications" on public.notifications for insert with check (auth.uid() = user_id);
create policy "Users can update their notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their notifications" on public.notifications for delete using (auth.uid() = user_id);

-- One row per user (like public.financial_profiles) — every toggle defaults
-- true, but nothing is actually sent anywhere until the cron job (Part G)
-- and email (Part H) ship, so enabling everything today is a no-op.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_checkin boolean not null default true,
  weekly_recap boolean not null default true,
  monthly_report boolean not null default true,
  goal_milestone boolean not null default true,
  streak_milestone boolean not null default true,
  score_change boolean not null default true,
  budget_challenge boolean not null default true,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can read their notification preferences" on public.notification_preferences for select using (auth.uid() = user_id);
create policy "Users can create their notification preferences" on public.notification_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update their notification preferences" on public.notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Phase 5: Autopilot Tier 1. Two new proactive notification types (bill
-- reminders, watchlist price moves) plus a dedupe mechanism so one-time
-- events (a goal completing, a streak milestone, a score jump) fire exactly
-- once ever instead of every cron run. dedupe_key is a PLAIN (non-partial)
-- unique constraint deliberately — a partial unique index can't be used as
-- a Postgres/PostgREST upsert conflict target, but a plain constraint works
-- correctly since Postgres treats every NULL as distinct from every other
-- NULL, so the existing daily_checkin/weekly_recap/monthly_report rows
-- (dedupe_key left null) never spuriously conflict with each other.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('daily_checkin', 'weekly_recap', 'monthly_report', 'goal_milestone', 'streak_milestone', 'score_change', 'budget_challenge', 'price_alert', 'bill_due'));
alter table public.notifications add column if not exists dedupe_key text;
alter table public.notifications add constraint notifications_user_dedupe_key_unique unique (user_id, dedupe_key);

alter table public.notification_preferences add column if not exists price_alerts boolean not null default true;
alter table public.notification_preferences add column if not exists bill_reminders boolean not null default true;

-- Per-symbol move threshold that triggers a price_alert notification.
-- Defaults on (5%) rather than requiring opt-in, consistent with this
-- phase's "least manual" goal.
alter table public.watchlist_items add column if not exists alert_threshold_pct numeric not null default 5;

-- watchlist_items never had an update policy (only select/insert/delete) —
-- with RLS enabled and no matching policy, an UPDATE silently affects zero
-- rows instead of erroring, so this was needed the moment the table gained
-- an editable column (alert_threshold_pct) rather than being purely add/delete.
create policy "Users can update their watchlist items" on public.watchlist_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
