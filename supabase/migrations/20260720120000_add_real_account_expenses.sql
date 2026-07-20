-- Gastos de cuentas reales (props, suscripciones, comisiones externas, etc.)
-- Staging / incremental; no tocar 001_initial_schema.sql. Mismo patrón que real_account_withdrawals.

create table if not exists public.real_account_expenses (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.real_accounts(id) on delete set null,
  account_name text not null,
  client_uuid uuid,
  amount numeric not null check (amount > 0),
  date date not null,
  category text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists real_account_expenses_user_client_uuid_unique
  on public.real_account_expenses(user_id, client_uuid)
  where client_uuid is not null;

create index if not exists real_account_expenses_user_id_idx
  on public.real_account_expenses(user_id);

create index if not exists real_account_expenses_account_id_idx
  on public.real_account_expenses(account_id);

create index if not exists real_account_expenses_date_idx
  on public.real_account_expenses(date);

alter table public.real_account_expenses enable row level security;

create policy "Users can see own expenses"
  on public.real_account_expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on public.real_account_expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expenses"
  on public.real_account_expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on public.real_account_expenses for delete
  using (auth.uid() = user_id);
