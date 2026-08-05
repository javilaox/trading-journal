-- Trades reales: dirección (compra/venta) y métricas personalizadas.
--
-- direction: 'LONG' | 'SHORT'. Permite sacar estadísticas separadas de compras y ventas.
-- custom_metrics: valores del checklist definido en la estrategia del trade (jsonb, igual que
--   ya hace backtesting_trades).
--
-- Incremental y NO destructivo: ambas columnas son opcionales, así que los trades ya guardados
-- siguen siendo válidos (quedan sin dirección hasta que se editen).

alter table public.trades
add column if not exists direction text;

alter table public.trades
add column if not exists custom_metrics jsonb not null default '{}'::jsonb;

-- Checklist de métricas propio de cada estrategia real (se guarda en la propia estrategia para
-- que las métricas aparezcan solo al elegir esa estrategia en el formulario del trade).
alter table public.real_strategies
add column if not exists custom_metrics jsonb not null default '[]'::jsonb;
