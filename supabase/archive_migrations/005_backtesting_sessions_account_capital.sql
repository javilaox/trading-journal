-- Capital de cuenta por sesión de backtesting (rentabilidad % sobre KPIs)
alter table public.backtesting_sessions
  add column if not exists account_capital numeric default 0;

comment on column public.backtesting_sessions.account_capital is 'Capital de referencia para calcular rentabilidad % del backtest.';
