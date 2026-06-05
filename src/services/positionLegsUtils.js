/**
 * Posición compuesta / promediada (trades REAL).
 * @module positionLegsUtils
 */

function makeLegId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `leg-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function parseNumericOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} raw
 * @returns {Array<{id:string,label:string,lot_size:number|null,pnl:number,comment:string}>}
 */
function parsePositionLegs(raw) {
  let list = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof list === 'string' && list.trim()) {
      try {
        list = JSON.parse(list);
      } catch {
        return [];
      }
    } else {
      break;
    }
  }
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    list = Object.values(list);
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const pnl = parseNumericOrNull(item.pnl);
    if (pnl === null) return;
    const lotRaw = item.lot_size ?? item.lotSize ?? item.lotaje;
    const lotNum = parseNumericOrNull(lotRaw);
    out.push({
      id: String(item.id || makeLegId()),
      label: String(item.label || `Entrada ${idx + 1}`).trim() || `Entrada ${idx + 1}`,
      lot_size: lotNum,
      pnl,
      comment: String(item.comment || '').trim(),
    });
  });
  return out;
}

function sumLegsPnl(legs) {
  return parsePositionLegs(legs).reduce((sum, leg) => sum + (Number(leg.pnl) || 0), 0);
}

function sumLegsLotSize(legs) {
  return parsePositionLegs(legs).reduce((sum, leg) => {
    const lot = leg.lot_size;
    return lot != null && Number.isFinite(Number(lot)) ? sum + Number(lot) : sum;
  }, 0);
}

/**
 * @param {Array} legs
 * @param {{ requireAtLeastOne?: boolean }} [opts]
 */
function validatePositionLegs(legs, opts = {}) {
  const list = parsePositionLegs(legs);
  if (opts.requireAtLeastOne && list.length === 0) {
    return { valid: false, error: 'NO_LEGS', legs: [] };
  }
  for (const leg of list) {
    if (!Number.isFinite(Number(leg.pnl))) {
      return { valid: false, error: 'INVALID_PNL', legs: list };
    }
    if (leg.lot_size != null && !Number.isFinite(Number(leg.lot_size))) {
      return { valid: false, error: 'INVALID_LOT', legs: list };
    }
  }
  return { valid: true, legs: list, totalPnl: sumLegsPnl(list), totalLot: sumLegsLotSize(list) };
}

function serializePositionLegsForStorage(legs) {
  const list = parsePositionLegs(legs);
  return JSON.stringify(list);
}

function parsePositionLegsFromRow(row) {
  if (!row) return [];
  const raw = row.position_legs ?? row.positionLegs ?? '[]';
  return parsePositionLegs(raw);
}

/**
 * Normaliza flags y legs para UI/caché (SQLite string, Supabase jsonb, objeto suelto).
 */
function hydrateTradeCompositeFields(trade = {}) {
  const legs = parsePositionLegs(trade.position_legs ?? trade.positionLegs ?? []);
  const composite =
    isCompositePositionFlag(trade.is_composite_position ?? trade.isCompositePosition) || legs.length > 0;
  const totalPnl = composite ? sumLegsPnl(legs) : Number(trade.pnl ?? 0) || 0;
  const totalLot = composite ? sumLegsLotSize(legs) : Number(trade.lotaje ?? trade.lotSize ?? 0) || 0;
  return {
    ...trade,
    is_composite_position: composite,
    isCompositePosition: composite,
    position_legs: composite ? legs : [],
    positionLegs: composite ? legs : [],
    pnl: composite && legs.length ? totalPnl : Number(trade.pnl ?? 0) || 0,
    lotaje: composite && totalLot > 0 ? totalLot : Number(trade.lotaje ?? trade.lotSize ?? 0) || 0,
    lotSize: composite && totalLot > 0 ? totalLot : Number(trade.lotSize ?? trade.lotaje ?? 0) || 0,
  };
}

function isCompositePositionFlag(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function createEmptyPositionLeg(index) {
  return {
    id: makeLegId(),
    label: `Entrada ${index}`,
    lot_size: null,
    pnl: 0,
    comment: '',
  };
}

/**
 * Aplica reglas de posición compuesta al payload normalizado.
 */
function applyCompositeToTradeFields(trade = {}) {
  const composite = isCompositePositionFlag(trade.is_composite_position ?? trade.isCompositePosition);
  const legs = parsePositionLegs(trade.position_legs ?? trade.positionLegs ?? []);
  if (!composite) {
    return {
      ...trade,
      is_composite_position: false,
      position_legs: [],
    };
  }
  const totalPnl = sumLegsPnl(legs);
  const totalLot = sumLegsLotSize(legs);
  return {
    ...trade,
    is_composite_position: true,
    position_legs: legs,
    pnl: totalPnl,
    lotaje: totalLot > 0 ? totalLot : Number(trade.lotaje ?? trade.lotSize ?? 0) || 0,
  };
}

function formatPositionLegsSummary(legs) {
  const list = parsePositionLegs(legs);
  if (!list.length) return '';
  const totalPnl = sumLegsPnl(list);
  const totalLot = sumLegsLotSize(list);
  const lotPart = totalLot > 0 ? ` · Lotes: ${totalLot}` : '';
  return `${list.length} entradas · PnL: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€${lotPart}`;
}

module.exports = {
  makeLegId,
  parsePositionLegs,
  validatePositionLegs,
  sumLegsPnl,
  sumLegsLotSize,
  serializePositionLegsForStorage,
  parsePositionLegsFromRow,
  isCompositePositionFlag,
  createEmptyPositionLeg,
  applyCompositeToTradeFields,
  formatPositionLegsSummary,
  hydrateTradeCompositeFields,
};
