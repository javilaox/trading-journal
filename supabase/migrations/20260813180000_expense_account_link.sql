-- Vínculo estable entre un gasto y la cuenta que se creó al registrarlo.
--
-- `real_account_expenses.account_id` ya existía, pero apunta al id que genera Supabase, y ese id
-- no se conoce mientras la cuenta esté pendiente de sincronizar (la aplicación funciona sin
-- conexión). Por eso el vínculo real se guarda con el `client_uuid` de la cuenta, que la app
-- conoce desde el primer momento y no cambia nunca.
--
-- La columna ya existe en la copia local (SQLite); esto la añade también en Supabase para que la
-- relación viaje entre dispositivos y el móvil la vea igual que el ordenador.
--
-- Incremental y NO destructivo: columna opcional. Los gastos ya registrados se quedan con
-- account_client_uuid nulo, que simplemente significa "sin cuenta asociada".

alter table public.real_account_expenses
  add column if not exists account_client_uuid uuid;

create index if not exists real_account_expenses_account_client_uuid_idx
  on public.real_account_expenses(account_client_uuid);

-- Los retiros ya tenían el mismo hueco: se añade por coherencia, para que ambos movimientos
-- puedan apuntar a una cuenta de la misma forma.
alter table public.real_account_withdrawals
  add column if not exists account_client_uuid uuid;

create index if not exists real_account_withdrawals_account_client_uuid_idx
  on public.real_account_withdrawals(account_client_uuid);

notify pgrst, 'reload schema';
