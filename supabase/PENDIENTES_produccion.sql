-- =====================================================================================
-- MIGRACIONES PENDIENTES DE APLICAR EN SUPABASE (PRODUCCIÓN)
-- Generado: 05-08-2026 · versión de la app: 1.0.14
--
-- CÓMO USARLO
--   1. Abre https://supabase.com/dashboard → tu proyecto de PRODUCCIÓN → SQL Editor → New query
--   2. Copia y pega TODO este archivo
--   3. Pulsa "Run"
--
-- SEGURIDAD DE TUS DATOS
--   Todo lo de aquí es ADITIVO: solo añade columnas nuevas (opcionales), cambia una regla de
--   borrado y crea un bucket de imágenes. No hay ni un DELETE, ni un DROP TABLE, ni un UPDATE.
--   Tus retiros, gastos, cuentas y trades NO se tocan.
--
--   Es idempotente: si ya lo ejecutaste antes, puedes volver a ejecutarlo sin problema
--   (usa "if not exists" / "on conflict do nothing" / "drop policy if exists").
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1) Borrar una sesión de backtesting borra también sus trades
--    Antes la FK era ON DELETE SET NULL: los trades sobrevivían con session_id = NULL y
--    seguían contando en las estadísticas globales aunque la sesión ya no existiera.
--    Solo cambia la restricción; no borra ninguna fila.
-- -------------------------------------------------------------------------------------
alter table public.backtesting_trades
drop constraint if exists backtesting_trades_session_id_fkey;

alter table public.backtesting_trades
add constraint backtesting_trades_session_id_fkey
foreign key (session_id)
references public.backtesting_sessions(id)
on delete cascade;


-- -------------------------------------------------------------------------------------
-- 2) Imágenes (antes/después) en los trades de backtesting
-- -------------------------------------------------------------------------------------
alter table public.backtesting_trades
add column if not exists image_before text;

alter table public.backtesting_trades
add column if not exists image_after text;


-- -------------------------------------------------------------------------------------
-- 3) Bucket privado para las capturas de los trades (reales y backtesting)
--    Permite ver las imágenes desde cualquier ordenador. Rutas: <user_id>/<archivo>
--    El bucket es privado; la app accede con signed URLs y cada usuario solo ve su carpeta.
-- -------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trade-images', 'trade-images', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own trade images" on storage.objects;
create policy "Users can read own trade images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload own trade images" on storage.objects;
create policy "Users can upload own trade images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own trade images" on storage.objects;
create policy "Users can update own trade images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own trade images" on storage.objects;
create policy "Users can delete own trade images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trade-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- -------------------------------------------------------------------------------------
-- 4) Trades reales: dirección (Compra/Venta) y métricas personalizadas por estrategia
--    Los trades ya guardados quedan simplemente sin dirección hasta que los edites.
-- -------------------------------------------------------------------------------------
alter table public.trades
add column if not exists direction text;

alter table public.trades
add column if not exists custom_metrics jsonb not null default '{}'::jsonb;

alter table public.real_strategies
add column if not exists custom_metrics jsonb not null default '[]'::jsonb;


-- =====================================================================================
-- COMPROBACIÓN (opcional): ejecútalo DESPUÉS, en una query nueva.
-- Debe devolver 5 filas: las 5 columnas nuevas.
-- =====================================================================================
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and (
--     (table_name = 'trades'               and column_name in ('direction', 'custom_metrics')) or
--     (table_name = 'real_strategies'      and column_name = 'custom_metrics') or
--     (table_name = 'backtesting_trades'   and column_name in ('image_before', 'image_after'))
--   )
-- order by table_name, column_name;

-- Y que el bucket existe (debe devolver 1 fila):
-- select id, name, public from storage.buckets where id = 'trade-images';

-- Y que tus datos siguen ahí (los números deben ser los mismos que antes de migrar):
-- select
--   (select count(*) from public.real_account_withdrawals) as retiros,
--   (select count(*) from public.real_account_expenses)    as gastos,
--   (select count(*) from public.trades)                   as trades;
