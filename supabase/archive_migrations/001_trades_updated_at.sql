-- Ejecutar en Supabase SQL Editor (Dashboard → SQL).
-- Añade updated_at y mantiene el valor al actualizar filas.

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE trades SET updated_at = now() WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Si tu proyecto rechaza EXECUTE FUNCTION, prueba en su lugar:
-- EXECUTE PROCEDURE update_updated_at_column();
