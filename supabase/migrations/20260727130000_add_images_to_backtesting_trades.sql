-- Imágenes (antes/después) en los trades de backtesting, igual que ya existen en los trades
-- reales. Se guarda la RUTA local del archivo (userData/trade-images), no la imagen en sí,
-- que es el mismo enfoque que usa la tabla 'trades'.
-- Incremental y no destructivo: columnas opcionales, las filas existentes no se ven afectadas.

alter table public.backtesting_trades
add column if not exists image_before text;

alter table public.backtesting_trades
add column if not exists image_after text;
