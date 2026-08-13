-- Categorías de gasto sincronizadas.
--
-- Hasta ahora la lista de categorías vivía solo en el navegador del equipo (localStorage), con
-- dos consecuencias: no viajaba entre ordenadores y el móvil no podía ofrecerla, así que había
-- que escribirla a mano y acababan apareciendo duplicados ("Reset" y "reset").
--
-- Misma estructura que expense_props, que ya resolvió esto mismo para las props.
--
-- Importante: los gastos NO se tocan. `real_account_expenses.category` sigue siendo texto y
-- conserva exactamente lo que tenga cada gasto; esta tabla es solo la lista de nombres
-- disponibles al rellenar el formulario. Nada de lo ya registrado cambia.
--
-- Incremental y NO destructivo: solo crea una tabla nueva.

create table if not exists public.expense_categories (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_uuid uuid,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists expense_categories_user_client_uuid_unique
  on public.expense_categories(user_id, client_uuid)
  where client_uuid is not null;

-- Sin duplicados por usuario, ignorando mayúsculas: es justo el problema que se quiere evitar.
create unique index if not exists expense_categories_user_name_unique
  on public.expense_categories(user_id, lower(name))
  where deleted_at is null;

create index if not exists expense_categories_user_id_idx
  on public.expense_categories(user_id);

alter table public.expense_categories enable row level security;

drop policy if exists "Users can see own expense categories" on public.expense_categories;
create policy "Users can see own expense categories"
  on public.expense_categories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own expense categories" on public.expense_categories;
create policy "Users can insert own expense categories"
  on public.expense_categories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own expense categories" on public.expense_categories;
create policy "Users can update own expense categories"
  on public.expense_categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own expense categories" on public.expense_categories;
create policy "Users can delete own expense categories"
  on public.expense_categories for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
