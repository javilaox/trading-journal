const {
  applyCompositeToTradeFields,
  positionLegsForStorage,
  parsePositionLegs,
} = require('./positionLegsUtils');
const {
  accountExecutionsForStorage,
  sumExecutionsPnl,
  sumExecutionsLot,
} = require('./accountExecutions');

/** Dirección: solo LONG (compra) o SHORT (venta); cualquier otra cosa queda a null. */
function normalizeDirection(value) {
  const v = String(value || '').trim().toUpperCase();
  return v === 'LONG' || v === 'SHORT' ? v : null;
}

/** Checklist de la estrategia. Siempre un objeto plano (nunca array ni null). */
function normalizeCustomMetrics(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return { ...value };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Normaliza un trade al shape de columnas Supabase (sin renombrar columnas).
 *
 * OJO: lo que no aparezca en el objeto que se devuelve se pierde. Esta función es la que usa la
 * creación de un trade con conexión, y le faltaban `direction` y `custom_metrics`: el trade se
 * guardaba en Supabase sin ellas y, al volver, la copia local se quedaba igual. Por eso al editar
 * un trade recién creado había que indicar otra vez si era compra o venta. Al crear sin conexión
 * no pasaba, porque ese camino usa otra función que sí las incluía.
 */
function mapTrade(raw) {
  const legsRaw = raw.position_legs ?? raw.positionLegs ?? [];
  const applied = applyCompositeToTradeFields({
    ...raw,
    position_legs: legsRaw,
  });
  // La misma operación tomada en varias cuentas. Cuando las hay, el PnL y el lotaje de la
  // operación son la suma de lo de cada cuenta: es el único número que puede ser, y así el total
  // nunca se contradice con el desglose.
  const ejecuciones = accountExecutionsForStorage(raw.account_executions ?? raw.accountExecutions);
  const gross = ejecuciones.length
    ? sumExecutionsPnl(ejecuciones)
    : Number(applied.pnl ?? raw.pnl) || 0;
  const commission = Number(raw.commission) || 0;
  const pnlNet = ejecuciones.length
    ? gross - commission
    : raw.pnl_net !== undefined && raw.pnl_net !== null && raw.pnl_net !== ''
      ? Number(raw.pnl_net)
      : gross - commission;
  return {
    date: raw.date,
    asset: raw.asset,
    result: raw.result,
    be_after_result: raw.result === 'BE' ? (raw.be_after_result ?? null) : null,
    pnl: gross,
    strategy: raw.strategy,
    account: raw.account,
    lotaje: ejecuciones.length
      ? sumExecutionsLot(ejecuciones)
      : Number(applied.lotaje ?? raw.lotaje) || 0,
    commission,
    pnl_net: Number.isFinite(pnlNet) ? pnlNet : gross - commission,
    image_before: raw.image_before || null,
    image_after: raw.image_after || null,
    entry_time: raw.entry_time || null,
    exit_time: raw.exit_time || null,
    direction: normalizeDirection(raw.direction),
    custom_metrics: normalizeCustomMetrics(raw.custom_metrics),
    // Operación apuntada pero no ejecutada. Se guarda siempre como booleano para que la columna
    // no acabe con unos, ceros, cadenas y nulos mezclados según por dónde entrara el dato.
    live_testing: Boolean(raw.live_testing),
    account_executions: ejecuciones,
    is_composite_position: Boolean(applied.is_composite_position),
    position_legs: positionLegsForStorage(applied.position_legs),
    user_id: raw.user_id,
  };
}

module.exports = { mapTrade };
