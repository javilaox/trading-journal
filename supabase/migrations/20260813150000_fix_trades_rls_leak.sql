-- CRÍTICO: la tabla `trades` tenía políticas heredadas del desarrollo inicial que la abrían a
-- todo el mundo.
--
--   "Allow all select"       FOR SELECT USING (true)
--   "Allow select own trades" FOR SELECT USING (true)   <- el nombre engaña: no filtra nada
--   "Allow all inserts"      FOR INSERT WITH CHECK (true)
--   "Allow insert (no auth)" FOR INSERT WITH CHECK (true)
--
-- En PostgreSQL las políticas permisivas se combinan con OR: basta con que UNA diga `true` para
-- que las demás dejen de importar. Es decir, las políticas correctas (`users_select_own_trades`,
-- etc.) estaban ahí, pero no servían de nada: cualquier usuario autenticado podía leer las
-- operaciones reales de todos los demás, y escribir filas con el user_id de otro.
--
-- Solo afecta a `trades`. El resto de tablas (backtesting, gestión, cuentas, estrategias,
-- props, categorías) ya estaban bien atadas a auth.uid().
--
-- Esto NO borra ni modifica ningún dato: solo retira permisos de más.

drop policy if exists "Allow all select" on public.trades;
drop policy if exists "Allow select own trades" on public.trades;
drop policy if exists "Allow all inserts" on public.trades;
drop policy if exists "Allow insert (no auth)" on public.trades;

-- Se recrean por si acaso las correctas no estuvieran (idempotente y con el mismo criterio que
-- el resto de tablas: cada usuario, sus filas).
drop policy if exists "users_select_own_trades" on public.trades;
create policy "users_select_own_trades"
  on public.trades for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_trades" on public.trades;
create policy "users_insert_own_trades"
  on public.trades for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users_update_own_trades" on public.trades;
create policy "users_update_own_trades"
  on public.trades for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_delete_own_trades" on public.trades;
create policy "users_delete_own_trades"
  on public.trades for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.trades enable row level security;

-- Ninguna fila puede quedarse sin dueño: una fila con user_id nulo no la ve nadie, pero tampoco
-- la protege ninguna política. Si esto devuelve algo, hay que revisarlo a mano.
do $$
declare
  huerfanas int;
begin
  select count(*) into huerfanas from public.trades where user_id is null;
  if huerfanas > 0 then
    raise warning 'Hay % operaciones sin user_id en public.trades: revisar a quién pertenecen.', huerfanas;
  end if;
end
$$;

notify pgrst, 'reload schema';
