-- Añade el tamaño de cuenta (10K/25K/50K/100K/150K) a los gastos.
-- Incremental y no destructivo; seguro tanto si 20260720120000_add_real_account_expenses.sql
-- ya se aplicó como si se aplica en el mismo despliegue.

alter table public.real_account_expenses
add column if not exists account_size text;
