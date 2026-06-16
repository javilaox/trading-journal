/**
 * Comisión de trades REAL (normal y posición construida).
 * comisión = lotaje × comisión por lote de la cuenta.
 */

function resolveAccountCommissionPerLot(account) {
  if (!account) return 0;
  if (typeof account === 'string') return 0;
  const raw =
    account.commissionPerLot ??
    account.commission_per_lot ??
    account.commissionPerlot ??
    0;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * @param {{
 *   account?: object|null,
 *   lotSize?: number,
 *   grossPnl?: number,
 *   trade?: object|null,
 *   mode?: string,
 *   commissionPerLot?: number|null,
 * }} params
 */
function calculateTradeCommission({
  account = null,
  lotSize = 0,
  grossPnl = 0,
  trade = null,
  mode = 'pro',
  commissionPerLot = null,
} = {}) {
  const lot =
    Number(
      lotSize ??
        trade?.lotaje ??
        trade?.lotSize ??
        trade?.lot_size ??
        0
    ) || 0;
  const gross = Number(grossPnl ?? trade?.pnl ?? 0) || 0;
  const perLot =
    commissionPerLot != null && Number.isFinite(Number(commissionPerLot))
      ? Number(commissionPerLot)
      : resolveAccountCommissionPerLot(account);
  const isPro = String(mode || '').toLowerCase() === 'pro';
  const hasRate = perLot >= 0 && (Boolean(account && (account.name || account.id)) || commissionPerLot != null);
  const commission = hasRate ? lot * perLot : 0;
  const safeCommission = Number.isFinite(commission) ? commission : 0;

  return {
    commission: safeCommission,
    grossPnl: gross,
    netPnl: gross - safeCommission,
    lotSize: lot,
    commissionPerLot: perLot,
    isPro,
    hasAccount: Boolean(account && (account.name || account.id)),
    canCompute: hasRate && lot >= 0,
  };
}

module.exports = {
  resolveAccountCommissionPerLot,
  calculateTradeCommission,
};
