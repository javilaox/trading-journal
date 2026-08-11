-- Configuración del simulador de challenges y su inclusión en los informes compartidos.
--
-- Se guarda en `backtesting_settings` (una fila por usuario) porque es configuración, no datos:
-- así viaja entre dispositivos y el informe en vivo puede leerla para mostrar el mismo análisis
-- en el enlace compartido.
--
-- Incremental y NO destructivo: añade una columna con valor por defecto y reemplaza una función.

alter table public.backtesting_settings
  add column if not exists challenge_config jsonb not null default '{}'::jsonb;

-- Se reemplaza para incluir `challenge` en el payload en vivo. El resto es idéntico.
create or replace function public.build_backtest_live_payload(r public.backtest_reports)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with sel as (
    select t.*
    from public.backtesting_trades t
    where t.user_id = r.user_id
      and (
        cardinality(r.session_ids) = 0
        or t.session_id = any (r.session_ids)
      )
  )
  select jsonb_build_object(
    'trades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'date', s.date,
        'session_id', s.session_id,
        'asset', s.asset,
        'strategy', s.strategy,
        'direction', s.direction,
        'result', s.result,
        'pnl', s.pnl,
        'rr_planned', s.rr_planned,
        'rr_result', s.rr_result,
        'entry_time', s.entry_time,
        'exit_time', s.exit_time,
        'notes', s.notes,
        'custom_metrics', (s.custom_metrics - 'risk_eur'),
        'image_before', s.image_before,
        'image_after', s.image_after
      ) order by s.date, s.id)
      from sel s
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.start_date)
      from public.backtesting_sessions b
      where b.user_id = r.user_id
        and (cardinality(r.session_ids) = 0 or b.id = any (r.session_ids))
    ), '[]'::jsonb),
    'metrics', to_jsonb(r.metric_names),
    'capital', (
      select b.account_capital
      from public.backtesting_sessions b
      where b.user_id = r.user_id and cardinality(r.session_ids) = 1 and b.id = r.session_ids[1]
    ),
    'challenge', coalesce((
      select st.challenge_config
      from public.backtesting_settings st
      where st.user_id = r.user_id
    ), '{}'::jsonb),
    'range', (
      select case
        when min(s.date) is null then ''
        else to_char(min(s.date), 'DD-MM-YYYY') || ' – ' || to_char(max(s.date), 'DD-MM-YYYY')
      end
      from sel s
    ),
    'live', true
  );
$$;

notify pgrst, 'reload schema';
