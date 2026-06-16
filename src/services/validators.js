const { isCompositeFromLegCount, validatePositionLegs } = require('./positionLegsUtils');

/**
 * Validación centralizada de trades (renderer / futuro web).
 */
export function validateTrade(trade) {
  if (!trade.asset) return 'Falta asset';
  if (!trade.user_id) return 'Usuario no válido';

  const legCheck = validatePositionLegs(trade.position_legs ?? trade.positionLegs ?? [], {
    requireAtLeastOne: false,
  });
  const legs = legCheck.legs || [];

  if (legs.length > 0) {
    if (!legCheck.valid) {
      if (legCheck.error === 'NO_LEGS') {
        return 'Añade al menos una entrada';
      }
      return 'Revisa los PnL de las entradas';
    }
    if (!Number.isFinite(legCheck.totalPnl)) return 'PnL inválido';
    if (isCompositeFromLegCount(legs) && legs.length < 2) {
      return 'Revisa las entradas de la posición';
    }
    return null;
  }

  if (isNaN(trade.pnl)) return 'PnL inválido';
  return null;
}
