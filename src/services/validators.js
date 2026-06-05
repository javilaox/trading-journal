const { isCompositePositionFlag, validatePositionLegs } = require('./positionLegsUtils');

/**
 * Validación centralizada de trades (renderer / futuro web).
 */
export function validateTrade(trade) {
  if (!trade.asset) return 'Falta asset';
  if (!trade.user_id) return 'Usuario no válido';

  const composite = isCompositePositionFlag(trade.is_composite_position ?? trade.isCompositePosition);
  if (composite) {
    const legCheck = validatePositionLegs(trade.position_legs ?? trade.positionLegs ?? [], {
      requireAtLeastOne: true,
    });
    if (!legCheck.valid) {
      if (legCheck.error === 'NO_LEGS') {
        return 'Añade al menos una entrada o desactiva Construir posición';
      }
      return 'Revisa los PnL de las entradas parciales';
    }
    if (!Number.isFinite(legCheck.totalPnl)) return 'PnL inválido';
    return null;
  }

  if (isNaN(trade.pnl)) return 'PnL inválido';
  return null;
}
