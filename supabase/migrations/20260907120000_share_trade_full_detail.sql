-- El informe compartido lleva ahora la operación entera: niveles, estrategia y horario.
--
-- Al montar los enlaces se decidió dejar fuera los precios de entrada, stop y objetivo, por no
-- enseñar los niveles exactos a quien tuviera el enlace. Se cambia esa decisión a petición del
-- dueño de los datos: quien comparte quiere que el informe sirva para revisar operación por
-- operación, y sin los niveles no se puede.
--
-- Conviene tenerlo presente: un enlace es público con contraseña, así que a partir de aquí quien
-- lo reciba puede reconstruir la estrategia. Compartir sigue siendo una decisión deliberada.
--
-- De paso se arregla un olvido: `be_after_result` estaba en los informes congelados pero no en los
-- que se arman en vivo, que son los que se crean por defecto. El visor lo usa para el análisis de
-- BE -si la operación habría acabado en TP o en SL después de mover a break even-, así que ese
-- bloque salía vacío en todos los enlaces nuevos.
--
-- Solo se reemplaza una función. No se toca ninguna tabla ni ningún dato ya guardado, y los
-- enlaces que ya existen siguen abriéndose igual (los congelados con su copia, los de en vivo con
-- este payload, que ahora trae más campos).

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
        -- Qué habría pasado después de mover a break even. Sin esto el visor no puede decir si el
        -- BE protegió una pérdida o cortó una ganancia.
        'be_after_result', s.be_after_result,
        'pnl', s.pnl,
        -- Los niveles de la operación. Es lo que permite revisarla de verdad y no solo contarla.
        'entry_price', s.entry_price,
        'stop_loss', s.stop_loss,
        'take_profit', s.take_profit,
        'rr_planned', s.rr_planned,
        'rr_result', s.rr_result,
        'entry_time', s.entry_time,
        'exit_time', s.exit_time,
        'notes', s.notes,
        -- El riesgo en euros se sigue quitando: dice el tamaño de la cuenta de quien comparte, que
        -- no es asunto del informe.
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
