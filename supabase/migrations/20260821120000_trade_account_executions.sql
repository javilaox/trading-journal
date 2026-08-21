-- La misma operación tomada en varias cuentas.
--
-- Un setup se coge muchas veces en dos o tres cuentas a la vez. Apuntarlo como dos operaciones
-- duplicaría el winrate y el número de operaciones, cuando la decisión fue una sola; pero el
-- dinero sí es distinto en cada cuenta, porque cada una tiene su tamaño y sus costes.
--
-- Cada elemento es {"account": "...", "pnl": 0, "lotaje": 0}. La lista vacía significa que la
-- operación va en una sola cuenta, que es lo que son todas las que ya existen: se sigue leyendo
-- de la columna `account`, así que nada de lo guardado necesita convertirse ni se toca aquí.
--
-- Aditiva y con valor por defecto: una versión antigua de la aplicación sigue funcionando contra
-- esta tabla sin enterarse de que la columna existe.

alter table public.trades
  add column if not exists account_executions jsonb not null default '[]'::jsonb;

comment on column public.trades.account_executions is
  'Reparto de la operación entre varias cuentas: [{account, pnl, lotaje}]. Vacío = una sola cuenta (columna account).';

notify pgrst, 'reload schema';
