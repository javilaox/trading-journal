-- Vincula (opcionalmente) una cuenta real configurada a una "prop" (mismo concepto
-- que ya usan Gastos y ahora también Retiros), para conectar cuenta <-> prop y poder
-- calcular el balance estimado de la cuenta incluyendo retiros/gastos de esa prop.
-- Incremental y no destructivo.

alter table public.real_accounts
add column if not exists prop_name text;
