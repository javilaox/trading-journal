const {
  applyCompositeToTradeFields,
  positionLegsForStorage,
  parsePositionLegs,
} = require('./positionLegsUtils');

/**
 * Normaliza un trade al shape de columnas Supabase (sin renombrar columnas).
 */
function mapTrade(raw) {
  const legsRaw = raw.position_legs ?? raw.positionLegs ?? [];
  const applied = applyCompositeToTradeFields({
    ...raw,
    position_legs: legsRaw,
  });
  const gross = Number(applied.pnl ?? raw.pnl) || 0;
  const commission = Number(raw.commission) || 0;
  const pnlNet =
    raw.pnl_net !== undefined && raw.pnl_net !== null && raw.pnl_net !== ''
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
    lotaje: Number(applied.lotaje ?? raw.lotaje) || 0,
    commission,
    pnl_net: Number.isFinite(pnlNet) ? pnlNet : gross - commission,
    image_before: raw.image_before || null,
    image_after: raw.image_after || null,
    entry_time: raw.entry_time || null,
    exit_time: raw.exit_time || null,
    is_composite_position: Boolean(applied.is_composite_position),
    position_legs: positionLegsForStorage(applied.position_legs),
    user_id: raw.user_id,
  };
}

module.exports = { mapTrade };
