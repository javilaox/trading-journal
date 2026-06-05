-- Estrategias: descripción y horarios operativos
-- Trades: hora de entrada/salida opcional

alter table public.real_strategies
add column if not exists description text;

alter table public.real_strategies
add column if not exists schedule_enabled boolean default false;

alter table public.real_strategies
add column if not exists operating_hours jsonb default '[]'::jsonb;

alter table public.trades
add column if not exists entry_time time;

alter table public.trades
add column if not exists exit_time time;
