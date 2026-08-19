-- Operaciones de «live testing»: registradas para medir la estrategia, pero NO ejecutadas.
--
-- El caso es este: la señal de tu estrategia aparece y no llegas a entrar (no estabas delante,
-- se escapó...). Esa operación interesa para saber cómo habría ido la estrategia sin fallos de
-- ejecución, pero NO movió dinero, así que no puede contar en el PnL, ni en el balance de la
-- cuenta, ni en los challenges.
--
-- Incremental y NO destructivo: columna nueva con valor por defecto `false`. Todas las
-- operaciones que ya existen quedan marcadas como ejecutadas, que es lo que son.

alter table public.trades
  add column if not exists live_testing boolean not null default false;

-- Las consultas de estadísticas filtran por esta columna junto al usuario.
create index if not exists trades_user_live_testing_idx
  on public.trades(user_id, live_testing);

notify pgrst, 'reload schema';
