-- =============================================================================
-- Esquema tabla `trades` alineado con SQLite local (Trading Journal)
-- Ejecutar UNA VEZ en Supabase → SQL Editor (ver README o mensaje del PR)
--
-- ADVERTENCIA: DROP TABLE borra todos los datos existentes en `public.trades`.
-- =============================================================================

DROP TABLE IF EXISTS public.trades CASCADE;

CREATE TABLE public.trades (
  id BIGSERIAL PRIMARY KEY,
  date TEXT,
  asset TEXT,
  result TEXT,
  pnl REAL,
  strategy TEXT,
  account TEXT,
  lotaje REAL,
  commission REAL,
  pnl_net REAL,
  image_before TEXT,
  image_after TEXT
);
