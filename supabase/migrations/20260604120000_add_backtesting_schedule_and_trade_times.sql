-- Backtesting: horas de entrada/salida en trades.
-- Horarios operativos viven en backtesting_settings.strategies (jsonb), sin tabla nueva.

alter table public.backtesting_trades
add column if not exists entry_time time;

alter table public.backtesting_trades
add column if not exists exit_time time;
