-- Retiros de cuentas reales (Staging / incremental; no tocar 001_initial_schema.sql)
-- account_id referencia real_accounts.id (uuid en este proyecto)

create table if not exists public.real_account_withdrawals (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.real_accounts(id) on delete set null,
  account_name text not null,
  client_uuid uuid,
  amount numeric not null check (amount > 0),
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists real_account_withdrawals_user_client_uuid_unique
  on public.real_account_withdrawals(user_id, client_uuid)
  where client_uuid is not null;

create index if not exists real_account_withdrawals_user_id_idx
  on public.real_account_withdrawals(user_id);

create index if not exists real_account_withdrawals_account_id_idx
  on public.real_account_withdrawals(account_id);

create index if not exists real_account_withdrawals_date_idx
  on public.real_account_withdrawals(date);

alter table public.real_account_withdrawals enable row level security;

create policy "Users can see own withdrawals"
  on public.real_account_withdrawals for select
  using (auth.uid() = user_id);

create policy "Users can insert own withdrawals"
  on public.real_account_withdrawals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own withdrawals"
  on public.real_account_withdrawals for update
  using (auth.uid() = user_id);

create policy "Users can delete own withdrawals"
  on public.real_account_withdrawals for delete
  using (auth.uid() = user_id);
