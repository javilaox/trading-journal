-- Añade a real_accounts los campos de tipo/estado de cuenta (Challenge, Fondeada, Capital
-- propio; nº de cuenta; si superó el challenge; si se quemó por máximo DD), para poder calcular
-- el % de challenges superados/quemados y el retiro medio por cuenta fondeada.
-- Incremental y no destructivo: todas las columnas son opcionales (NULL/false por defecto), así
-- que las cuentas ya existentes no se ven afectadas.

alter table public.real_accounts
add column if not exists account_type text;

alter table public.real_accounts
add column if not exists account_number text;

alter table public.real_accounts
add column if not exists challenge_passed boolean not null default false;

alter table public.real_accounts
add column if not exists disabled_by_max_dd boolean not null default false;
