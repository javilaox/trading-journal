/**
 * Normaliza un trade al shape de columnas Supabase (sin renombrar columnas).
 */
function mapTrade(raw) {
  return {
    date: raw.date,
    asset: raw.asset,
    result: raw.result,
    be_after_result: raw.result === 'BE' ? (raw.be_after_result ?? null) : null,
    pnl: Number(raw.pnl) || 0,
    strategy: raw.strategy,
    account: raw.account,
    lotaje: Number(raw.lotaje) || 0,
    commission: Number(raw.commission) || 0,
    pnl_net: Number(raw.pnl) || 0,
    image_before: raw.image_before || null,
    image_after: raw.image_after || null,
    user_id: raw.user_id
  };
}

module.exports = { mapTrade };
