-- add_client_uuid_offline_sync
-- NOTE: migración preparada para STAGING. No ejecutar en Production.

-- 1) client_uuid en tablas principales
alter table public.trades
  add column if not exists client_uuid uuid;

alter table public.real_accounts
  add column if not exists client_uuid uuid;

alter table public.real_strategies
  add column if not exists client_uuid uuid;

alter table public.backtesting_trades
  add column if not exists client_uuid uuid;

alter table public.backtesting_sessions
  add column if not exists client_uuid uuid;

alter table public.backtesting_settings
  add column if not exists client_uuid uuid;

alter table public.backtesting_metrics
  add column if not exists client_uuid uuid;

alter table public.backtesting_custom_metrics
  add column if not exists client_uuid uuid;

-- 2) índices únicos parciales (evitan duplicidad por user_id + client_uuid)
create unique index if not exists trades_user_client_uuid_unique
on public.trades(user_id, client_uuid)
where client_uuid is not null;

create unique index if not exists real_accounts_user_client_uuid_unique
on public.real_accounts(user_id, client_uuid)
where client_uuid is not null;

create unique index if not exists real_strategies_user_client_uuid_unique
on public.real_strategies(user_id, client_uuid)
where client_uuid is not null;

create unique index if not exists backtesting_trades_user_client_uuid_unique
on public.backtesting_trades(user_id, client_uuid)
where client_uuid is not null;

create unique index if not exists backtesting_sessions_user_client_uuid_unique
on public.backtesting_sessions(user_id, client_uuid)
where client_uuid is not null;

create unique index if not exists backtesting_settings_user_client_uuid_unique
on public.backtesting_settings(user_id, client_uuid)
where client_uuid is not null;

create unique index if not exists backtesting_metrics_user_client_uuid_unique
on public.backtesting_metrics(user_id, client_uuid)
where client_uuid is not null;

create unique index if not exists backtesting_custom_metrics_user_client_uuid_unique
on public.backtesting_custom_metrics(user_id, client_uuid)
where client_uuid is not null;

