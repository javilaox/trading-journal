-- Al borrar una sesión de backtesting, sus trades deben borrarse con ella.
-- La FK original era ON DELETE SET NULL, así que los trades sobrevivían con session_id = NULL:
-- quedaban "sueltos" (no se ven desde ninguna sesión, pero seguían contando en las estadísticas
-- globales de backtesting). Se cambia a ON DELETE CASCADE.
--
-- Incremental y NO destructivo: solo cambia la restricción, no toca ni una fila.
-- NOTA: no afecta a los trades reales (tabla 'trades'), solo a 'backtesting_trades'.
--
-- IMPORTANTE: a propósito NO se borran aquí los trades con session_id IS NULL. La app permite
-- guardar trades de backtesting sin sesión asociada, así que un session_id nulo no implica que
-- sea basura del bug. La limpieza de los que sí quedaron huérfanos debe revisarse a mano
-- (ver consulta comentada al final).

alter table public.backtesting_trades
drop constraint if exists backtesting_trades_session_id_fkey;

alter table public.backtesting_trades
add constraint backtesting_trades_session_id_fkey
foreign key (session_id)
references public.backtesting_sessions(id)
on delete cascade;

-- Para revisar manualmente los trades sin sesión antes de decidir si borrarlos:
--   select id, date, asset, pnl, created_at
--   from public.backtesting_trades
--   where session_id is null
--   order by created_at desc;
