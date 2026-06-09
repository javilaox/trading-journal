/**
 * Horarios operativos de estrategias y duración de trades.
 */

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function parseTimeToMinutes(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatMinutesAsHm(totalMinutes) {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) return '—';
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h > 0) return `${h}h ${rest}m`;
  return `${rest}m`;
}

function parseOperatingHours(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw.map(normalizeOperatingHourRange).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeOperatingHourRange).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeOperatingHourRange(range) {
  if (!range || typeof range !== 'object') return null;
  const start = String(range.start || '').trim();
  const end = String(range.end || '').trim();
  if (!start || !end) return null;
  const out = { start, end };
  if (Array.isArray(range.days) && range.days.length) {
    out.days = range.days.map((d) => String(d).toLowerCase()).filter((d) => DAY_KEYS.includes(d));
  }
  return out;
}

function validateOperatingHoursList(hours) {
  const list = parseOperatingHours(hours);
  for (const r of list) {
    const start = parseTimeToMinutes(r.start);
    const end = parseTimeToMinutes(r.end);
    if (start == null || end == null) {
      return { valid: false, error: 'INVALID_TIME' };
    }
    if (start === end) {
      return { valid: false, error: 'START_EQUALS_END' };
    }
  }
  return { valid: true, hours: list };
}

function getWeekdayKeyFromDate(dateStr) {
  if (!dateStr) return null;
  const iso = String(dateStr).slice(0, 10);
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return DAY_KEYS[d.getDay()];
}

function isMinutesInRange(mins, start, end) {
  if (mins == null || start == null || end == null) return false;
  if (start < end) {
    return mins >= start && mins <= end;
  }
  return mins >= start || mins <= end;
}

/**
 * @returns {boolean|null} true dentro, false fuera, null sin datos / sin horario aplicable
 */
function isEntryWithinOperatingHours(entryTime, operatingHours, tradeDate) {
  const mins = parseTimeToMinutes(entryTime);
  if (mins == null) return null;

  const ranges = parseOperatingHours(operatingHours);
  if (!ranges.length) return null;

  const dayKey = getWeekdayKeyFromDate(tradeDate);

  for (const range of ranges) {
    if (range.days?.length && dayKey && !range.days.includes(dayKey)) continue;
    const start = parseTimeToMinutes(range.start);
    const end = parseTimeToMinutes(range.end);
    if (isMinutesInRange(mins, start, end)) return true;
  }
  return false;
}

function computeDurationMinutes(entryTime, exitTime) {
  const entry = parseTimeToMinutes(entryTime);
  const exit = parseTimeToMinutes(exitTime);
  if (entry == null || exit == null) return null;
  if (exit >= entry) return exit - entry;
  return 24 * 60 - entry + exit;
}

function normalizeStrategyFromRow(row) {
  const name = String(row?.name || '').trim();
  if (!name) return null;
  const scheduleRaw = row?.schedule_enabled ?? row?.scheduleEnabled ?? 0;
  const schedule_enabled =
    scheduleRaw === true || scheduleRaw === 1 || scheduleRaw === '1' || scheduleRaw === 'true';
  return {
    name,
    client_uuid: row?.client_uuid ? String(row.client_uuid) : null,
    remote_id: row?.remote_id != null && row.remote_id !== '' ? String(row.remote_id) : null,
    id: row?.id != null && row.id !== '' ? row.id : null,
    description: String(row?.description || '').trim(),
    schedule_enabled,
    operating_hours: parseOperatingHours(row?.operating_hours ?? row?.operatingHours ?? '[]'),
    previous_names: Array.isArray(row?.previous_names) ? row.previous_names.map(String) : [],
  };
}

function buildStrategyByNameMap(rows) {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const rec = normalizeStrategyFromRow(row);
    if (rec?.name) map.set(rec.name, rec);
  });
  return map;
}

function formatOperatingHoursSummary(hours) {
  const list = parseOperatingHours(hours);
  if (!list.length) return '';
  return list.map((r) => `${r.start}–${r.end}`).join(', ');
}

function resolveStrategyByNameMap(strategies) {
  if (strategies instanceof Map) return strategies;
  if (Array.isArray(strategies)) return buildStrategyByNameMap(strategies);
  return new Map();
}

function resolveStrategyRecord(strategyOrMap, trade) {
  if (strategyOrMap && typeof strategyOrMap === 'object' && strategyOrMap.name && !strategyOrMap.get) {
    return strategyOrMap;
  }
  const map = resolveStrategyByNameMap(strategyOrMap);
  const name = String(trade?.strategy || '').trim();
  if (!name) return null;
  return map.get(name) || null;
}

function strategyHasEvaluableSchedule(strategy) {
  if (!strategy?.schedule_enabled) return false;
  return parseOperatingHours(strategy.operating_hours).length > 0;
}

function resolveReferenceStrategy(strategyByName, selectedStrategyName) {
  if (!selectedStrategyName) return null;
  const name = String(selectedStrategyName).trim();
  if (!name) return null;
  const map = resolveStrategyByNameMap(strategyByName);
  return map.get(name) || null;
}

/**
 * @param {object} [options]
 * @param {object|null} [options.referenceStrategy] Estrategia fija (filtro stats por estrategia)
 * @returns {'inside'|'outside'|'missing_time'|'no_schedule'}
 */
function getTradeScheduleStatus(trade, strategy, options = {}) {
  const evalStrategy =
    options.referenceStrategy !== undefined && options.referenceStrategy !== null
      ? options.referenceStrategy
      : strategy;

  if (!evalStrategy) return 'no_schedule';
  if (!strategyHasEvaluableSchedule(evalStrategy)) return 'no_schedule';

  const entryTime = trade?.entry_time ?? trade?.entryTime;
  if (entryTime == null || String(entryTime).trim() === '') return 'missing_time';

  const within = isEntryWithinOperatingHours(entryTime, evalStrategy.operating_hours, trade?.date);
  if (within === true) return 'inside';
  if (within === false) return 'outside';
  return 'no_schedule';
}

/**
 * @returns {'inside'|'outside'|'missing_time'|'no_schedule'}
 */
function classifyTradeScheduleCompliance(trade, strategyByName, options = {}) {
  const strategy = resolveStrategyRecord(strategyByName, trade);
  return getTradeScheduleStatus(trade, strategy, options);
}

/**
 * @returns {boolean|null} true dentro, false fuera, null no evaluable
 */
function isTradeInsideStrategySchedule(trade, strategy) {
  const status = getTradeScheduleStatus(trade, strategy);
  if (status === 'inside') return true;
  if (status === 'outside') return false;
  return null;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.excludeOutside]
 * @param {string} [options.selectedStrategyName] Nombre de estrategia del filtro de Estadísticas
 * @param {string} [options.selectedStrategyId] Alias de selectedStrategyName
 */
function filterTradesByScheduleCompliance(trades, strategies, options = {}) {
  const strategyByName = resolveStrategyByNameMap(strategies);
  const excludeOutside = options.excludeOutside === true;
  const selectedStrategyName = options.selectedStrategyName ?? options.selectedStrategyId ?? null;
  const list = Array.isArray(trades) ? trades : [];

  if (!excludeOutside) {
    return {
      includedTrades: [...list],
      excludedTrades: [],
      insideTrades: [],
      outsideTrades: [],
      missingTimeTrades: [],
      noScheduleTrades: [],
      insideCount: 0,
      outsideCount: 0,
      missingTimeCount: 0,
      noScheduleCount: 0,
      useSelectedReference: false,
      referenceStrategy: null,
      unknownCount: 0,
      unknownTrades: [],
    };
  }

  const referenceStrategy = resolveReferenceStrategy(strategyByName, selectedStrategyName);
  const useSelectedReference = Boolean(referenceStrategy && strategyHasEvaluableSchedule(referenceStrategy));

  const insideTrades = [];
  const outsideTrades = [];
  const missingTimeTrades = [];
  const noScheduleTrades = [];

  for (const trade of list) {
    let status;
    if (useSelectedReference) {
      status = getTradeScheduleStatus(trade, null, { referenceStrategy });
    } else {
      const ownStrategy = resolveStrategyRecord(strategyByName, trade);
      status = getTradeScheduleStatus(trade, ownStrategy);
    }

    if (status === 'inside') insideTrades.push(trade);
    else if (status === 'outside') outsideTrades.push(trade);
    else if (status === 'missing_time') missingTimeTrades.push(trade);
    else noScheduleTrades.push(trade);
  }

  let includedTrades = [...insideTrades, ...outsideTrades, ...missingTimeTrades, ...noScheduleTrades];
  let excludedTrades = [];

  if (excludeOutside) {
    if (useSelectedReference) {
      includedTrades = [...insideTrades];
      excludedTrades = [...outsideTrades, ...missingTimeTrades];
    } else {
      includedTrades = [...insideTrades, ...noScheduleTrades];
      excludedTrades = [...outsideTrades, ...missingTimeTrades];
    }
  }

  return {
    includedTrades,
    excludedTrades,
    insideTrades,
    outsideTrades,
    missingTimeTrades,
    noScheduleTrades,
    insideCount: insideTrades.length,
    outsideCount: outsideTrades.length,
    missingTimeCount: missingTimeTrades.length,
    noScheduleCount: noScheduleTrades.length,
    useSelectedReference,
    referenceStrategy: useSelectedReference ? referenceStrategy : null,
    /** @deprecated use missingTimeCount + noScheduleCount */
    unknownCount: missingTimeTrades.length + noScheduleTrades.length,
    unknownTrades: [...missingTimeTrades, ...noScheduleTrades],
  };
}

module.exports = {
  DAY_KEYS,
  parseTimeToMinutes,
  formatMinutesAsHm,
  parseOperatingHours,
  validateOperatingHoursList,
  getWeekdayKeyFromDate,
  isEntryWithinOperatingHours,
  computeDurationMinutes,
  normalizeStrategyFromRow,
  buildStrategyByNameMap,
  formatOperatingHoursSummary,
  strategyHasEvaluableSchedule,
  resolveReferenceStrategy,
  getTradeScheduleStatus,
  isTradeInsideStrategySchedule,
  classifyTradeScheduleCompliance,
  filterTradesByScheduleCompliance,
};
