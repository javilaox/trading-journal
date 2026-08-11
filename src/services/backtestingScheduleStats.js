const {
  getTradeScheduleStatus,
  filterTradesByScheduleCompliance,
  computeDurationMinutes,
  strategyHasEvaluableSchedule,
  parseOperatingHours,
  buildScheduleInsights,
} = require('./scheduleUtils');

function normalizeTimeField(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function strategyRecordForSchedule(strategy) {
  if (!strategy) return null;
  return {
    name: String(strategy.name || '').trim(),
    description: String(strategy.description || strategy.notes || '').trim(),
    schedule_enabled: Boolean(strategy.schedule_enabled),
    operating_hours: strategy.operating_hours ?? [],
  };
}

function buildBacktestingStrategyByNameMap(strategies = []) {
  const map = new Map();
  (Array.isArray(strategies) ? strategies : []).forEach((item) => {
    const name = String(item?.name || '').trim();
    if (!name) return;
    map.set(name, strategyRecordForSchedule(item));
  });
  return map;
}

function getBacktestingReferenceStrategyName(selectedSessionIds, sessions = []) {
  if (!Array.isArray(selectedSessionIds) || selectedSessionIds.includes('all')) return null;
  const ids = selectedSessionIds.filter((x) => x !== 'all');
  if (ids.length !== 1) return null;
  const session = sessions.find((s) => String(s.id) === String(ids[0]));
  const name = String(session?.strategy || '').trim();
  return name || null;
}

/**
 * @param {object} ctx
 * @param {Map} ctx.strategyByName
 * @param {string|null} ctx.selectedStrategyName Sesión única filtrada → estrategia de la sesión
 */
function classifyBacktestingTrade(trade, ctx) {
  const { strategyByName, selectedStrategyName } = ctx;
  const refName = selectedStrategyName ? String(selectedStrategyName).trim() : '';
  const refStrategy = refName ? strategyByName.get(refName) : null;

  if (refStrategy && strategyHasEvaluableSchedule(refStrategy)) {
    return getTradeScheduleStatus(trade, null, { referenceStrategy: refStrategy });
  }

  const ownName = String(trade?.strategy || '').trim();
  const own = ownName ? strategyByName.get(ownName) : null;
  return getTradeScheduleStatus(trade, own);
}

/**
 * Rangos horarios que la estrategia de referencia tiene configurados. Si no hay una sesión
 * única filtrada, se usa la primera estrategia con horario evaluable entre las que aparecen en
 * los trades, que es lo más parecido a "mi horario" cuando se miran varias sesiones a la vez.
 */
function resolveConfiguredRanges(strategyByName, selectedStrategyName, trades) {
  const fromStrategy = (strategy) =>
    strategyHasEvaluableSchedule(strategy) ? parseOperatingHours(strategy.operating_hours) : [];

  const refName = selectedStrategyName ? String(selectedStrategyName).trim() : '';
  if (refName) {
    const ranges = fromStrategy(strategyByName.get(refName));
    if (ranges.length) return ranges;
  }

  const names = [...new Set((trades || []).map((t) => String(t?.strategy || '').trim()))].filter(Boolean);
  for (const name of names) {
    const ranges = fromStrategy(strategyByName.get(name));
    if (ranges.length) return ranges;
  }
  return [];
}

function calculateBacktestingScheduleDiscipline(trades, ctx = {}) {
  const strategyByName =
    ctx.strategyByName instanceof Map
      ? ctx.strategyByName
      : buildBacktestingStrategyByNameMap(ctx.strategies || []);
  const selectedStrategyName =
    ctx.selectedStrategyName ??
    getBacktestingReferenceStrategyName(ctx.selectedSessionIds, ctx.sessions);
  const classifyCtx = { strategyByName, selectedStrategyName };
  const list = Array.isArray(trades) ? trades : [];
  let tradesIn = 0;
  let tradesOut = 0;
  let tradesMissingTime = 0;
  let tradesNoSchedule = 0;
  let pnlIn = 0;
  let pnlOut = 0;
  let pnlMissingTime = 0;
  // Se cuentan también los ganadores para poder comparar win rate dentro vs fuera de horario,
  // que es lo que permite decir si "renta" o no operar fuera del horario definido.
  let winsIn = 0;
  let winsOut = 0;
  const durationsIn = [];
  const durationsOut = [];
  const durationsAll = [];
  // Datos crudos para el resumen compartido (winrates + concentración horaria de TP/SL).
  const insightItems = [];

  list.forEach((trade) => {
    const pnl = Number(trade?.pnl ?? trade?.pnl_estimated ?? 0) || 0;
    const entryTime = trade?.entry_time ?? trade?.entryTime ?? null;
    const exitTime = trade?.exit_time ?? trade?.exitTime ?? null;
    const status = classifyBacktestingTrade(trade, classifyCtx);
    insightItems.push({
      status,
      result: String(trade?.result || '').toUpperCase(),
      pnl,
      entryTime,
    });

    if (status === 'no_schedule') {
      tradesNoSchedule += 1;
      return;
    }
    if (status === 'missing_time') {
      tradesMissingTime += 1;
      pnlMissingTime += pnl;
      return;
    }
    if (status === 'inside') {
      tradesIn += 1;
      pnlIn += pnl;
      if (pnl > 0) winsIn += 1;
    } else if (status === 'outside') {
      tradesOut += 1;
      pnlOut += pnl;
      if (pnl > 0) winsOut += 1;
    }

    const dur = computeDurationMinutes(entryTime, exitTime);
    if (dur != null) {
      durationsAll.push(dur);
      if (status === 'inside') durationsIn.push(dur);
      else if (status === 'outside') durationsOut.push(dur);
    }
  });

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const disciplineTotal = tradesIn + tradesOut + tradesMissingTime;

  return {
    tradesIn,
    tradesOut,
    tradesMissingTime,
    tradesNoSchedule,
    compliancePct: disciplineTotal ? (tradesIn / disciplineTotal) * 100 : null,
    pnlIn,
    pnlOut,
    pnlMissingTime,
    winsIn,
    winsOut,
    // Winrates y concentración horaria vienen del helper compartido con Real (TP vs SL, sin BE).
    ...buildScheduleInsights(insightItems),
    avgDurationIn: avg(durationsIn),
    avgDurationOut: avg(durationsOut),
    avgDurationTotal: avg(durationsAll),
    hasEvaluableDiscipline: disciplineTotal > 0,
    // Rangos del horario realmente configurado. Se exponen para que el simulador pueda
    // arrancar precargado con ellos: el punto de partida natural para "ampliar o acortar".
    referenceRanges: resolveConfiguredRanges(strategyByName, selectedStrategyName, list),
  };
}

function filterBacktestingTradesForMetrics(trades, strategies, options = {}) {
  const strategyByName = buildBacktestingStrategyByNameMap(strategies);
  const selectedStrategyName =
    options.selectedStrategyName ?? getBacktestingReferenceStrategyName(options.selectedSessionIds, options.sessions);

  if (!options.excludeOutside) {
    return {
      includedTrades: [...(Array.isArray(trades) ? trades : [])],
      excludedTrades: [],
      strategyByName,
      selectedStrategyName,
    };
  }

  const hasReference =
    selectedStrategyName && strategyHasEvaluableSchedule(strategyByName.get(selectedStrategyName));

  const result = filterTradesByScheduleCompliance(trades, strategyByName, {
    excludeOutside: true,
    selectedStrategyName: hasReference ? selectedStrategyName : null,
  });

  return {
    ...result,
    strategyByName,
    selectedStrategyName: hasReference ? selectedStrategyName : null,
    useSessionReference: Boolean(hasReference),
  };
}

module.exports = {
  normalizeTimeField,
  buildBacktestingStrategyByNameMap,
  getBacktestingReferenceStrategyName,
  calculateBacktestingScheduleDiscipline,
  filterBacktestingTradesForMetrics,
  classifyBacktestingTrade,
};
