-- Lista de "props" reutilizable en el formulario de Gastos (independiente de las cuentas
-- reales configuradas). Persiste aunque se borren todos los gastos que la usan.

create table if not exists public.expense_props (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_uuid uuid,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists expense_props_user_client_uuid_unique
  on public.expense_props(user_id, client_uuid)
  where client_uuid is not null;

create unique index if not exists expense_props_user_name_unique
  on public.expense_props(user_id, lower(name))
  where deleted_at is null;

create index if not exists expense_props_user_id_idx
  on public.expense_props(user_id);

alter table public.expense_props enable row level security;

create policy "Users can see own expense props"
  on public.expense_props for select
  using (auth.uid() = user_id);

create policy "Users can insert own expense props"
  on public.expense_props for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expense props"
  on public.expense_props for update
  using (auth.uid() = user_id);

create policy "Users can delete own expense props"
  on public.expense_props for delete
  using (auth.uid() = user_id);
