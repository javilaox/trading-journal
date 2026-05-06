-- Pares permitidos por sesión de backtesting (multi-selección en UI)
alter table public.backtesting_sessions
  add column if not exists pairs jsonb not null default '[]'::jsonb;

comment on column public.backtesting_sessions.pairs is 'Lista de símbolos (ej. EURUSD, XAUUSD). Legacy: asset conserva el primero para compatibilidad.';
