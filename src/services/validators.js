/**
 * Validación centralizada de trades (renderer / futuro web).
 */
export function validateTrade(trade) {
  if (!trade.asset) return 'Falta asset';
  if (isNaN(trade.pnl)) return 'PnL inválido';
  if (!trade.user_id) return 'Usuario no válido';
  return null;
}
