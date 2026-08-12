-- Campaign Monitor schema for Supabase / PostgreSQL
-- Run in Supabase SQL Editor or via supabase db push

create extension if not exists "pgcrypto";

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null default 'employee',
  created_at timestamptz not null default now()
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Platforms (stored in DB, not hardcoded in UI)
create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete restrict,
  name text not null,
  start_date date not null,
  end_date date not null,
  currency text not null default 'RUB'
    check (currency in ('RUB', 'USD', 'EUR', 'UZS', 'KZT', 'GBP')),
  primary_kpi text not null default 'impressions'
    check (primary_kpi in (
      'impressions', 'reach', 'clicks', 'spend', 'conversions', 'video_views'
    )),
  status text not null default 'attention'
    check (status in ('on_track', 'attention', 'critical', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_dates_valid check (end_date >= start_date)
);

-- Flexible KPI plans
create table if not exists public.campaign_kpis (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  kpi_type text not null
    check (kpi_type in (
      'impressions', 'reach', 'clicks', 'spend', 'conversions', 'video_views',
      'leads', 'installs', 'vtr', 'ctr', 'cpc', 'cpm', 'cpa'
    )),
  planned_value numeric not null check (planned_value >= 0),
  created_at timestamptz not null default now(),
  unique (campaign_id, kpi_type)
);

-- Daily actuals
create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  date date not null,
  impressions numeric check (impressions is null or impressions >= 0),
  reach numeric check (reach is null or reach >= 0),
  clicks numeric check (clicks is null or clicks >= 0),
  spend numeric check (spend is null or spend >= 0),
  conversions numeric check (conversions is null or conversions >= 0),
  video_views numeric check (video_views is null or video_views >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, date)
);

create index if not exists idx_campaigns_client on public.campaigns(client_id);
create index if not exists idx_campaigns_platform on public.campaigns(platform_id);
create index if not exists idx_campaigns_dates on public.campaigns(start_date, end_date);
create index if not exists idx_daily_metrics_campaign_date on public.daily_metrics(campaign_id, date);
create index if not exists idx_campaign_kpis_campaign on public.campaign_kpis(campaign_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_metrics_updated_at on public.daily_metrics;
create trigger trg_daily_metrics_updated_at
  before update on public.daily_metrics
  for each row execute function public.set_updated_at();
