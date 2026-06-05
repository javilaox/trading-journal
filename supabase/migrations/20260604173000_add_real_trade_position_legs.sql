-- Trades REAL: posición compuesta / promediada (Staging)
-- No tocar 001_initial_schema.sql

alter table public.trades
add column if not exists is_composite_position boolean default false;

alter table public.trades
add column if not exists position_legs jsonb default '[]'::jsonb;
