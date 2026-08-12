-- Migration: currency, primary_kpi, reach

alter table public.campaigns
  add column if not exists currency text not null default 'RUB'
    check (currency in ('RUB', 'USD', 'EUR', 'UZS', 'KZT', 'GBP'));

alter table public.campaigns
  add column if not exists primary_kpi text not null default 'impressions'
    check (primary_kpi in (
      'impressions', 'reach', 'clicks', 'spend', 'conversions', 'video_views'
    ));

alter table public.daily_metrics
  add column if not exists reach numeric check (reach is null or reach >= 0);

-- Ensure reach is allowed in campaign_kpis (recreate check if needed)
alter table public.campaign_kpis drop constraint if exists campaign_kpis_kpi_type_check;
alter table public.campaign_kpis
  add constraint campaign_kpis_kpi_type_check
  check (kpi_type in (
    'impressions', 'reach', 'clicks', 'spend', 'conversions', 'video_views',
    'leads', 'installs', 'vtr', 'ctr', 'cpc', 'cpm', 'cpa'
  ));
