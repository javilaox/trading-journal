const {
  getTradeScheduleStatus,
  filterTradesByScheduleCompliance,
  computeDurationMinutes,
  strategyHasEvaluableSchedule,
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
  const durationsIn = [];
  const durationsOut = [];
  const durationsAll = [];

  list.forEach((trade) => {
    const pnl = Number(trade?.pnl ?? trade?.pnl_estimated ?? 0) || 0;
    const entryTime = trade?.entry_time ?? trade?.entryTime ?? null;
    const exitTime = trade?.exit_time ?? trade?.exitTime ?? null;
    const status = classifyBacktestingTrade(trade, classifyCtx);

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
    } else if (status === 'outside') {
      tradesOut += 1;
      pnlOut += pnl;
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
    avgDurationIn: avg(durationsIn),
    avgDurationOut: avg(durationsOut),
    avgDurationTotal: avg(durationsAll),
    hasEvaluableDiscipline: disciplineTotal > 0,
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
