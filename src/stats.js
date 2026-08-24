let chartInstances = [];
let allTradesCache = [];
let compareMode = false;
const DATE_FILTER_KEY = 'statsDateFilter';
const INCLUDE_BE_KEY = 'statsIncludeBE';
const EXCLUDE_SCHEDULE_KEY_PREFIX = 'stats_exclude_out_of_schedule';
let datePickerStart = null;
let datePickerEnd = null;
let datePickerViewMonth = new Date();
let datePickerSelecting = 'start';
/**
 * Atajo de periodo elegido: 'month' | 'lastMonth' | 'year' | 'all' | 'custom'.
 *
 * Se guarda junto al rango porque hace falta al volver a abrir la aplicación. Si solo se
 * guardaran las fechas, un rango elegido en julio con el atajo «Este mes» seguiría mostrando
 * julio en agosto. Con el atajo apuntado, todo lo que no sea un rango elegido a mano se vuelve
 * a calcular con el calendario en la mano.
 */
let dateRangePreset = 'month';
const { Chart: ChartJS, registerables } = require('chart.js');
const {
  tradeAccountNames,
  tradeMatchesAccount,
  tradePnlForAccount,
  parseAccountExecutions,
} = require('./services/accountExecutions');
const {
  loadLanguage,
  t,
  detectUserLanguage,
  initLanguageSwitcher,
  getCurrentLanguage
} = require('./i18n');
const { formatDateEs, formatDateRangeEs } = require('./dateDisplay.js');
const {
  buildStrategyByNameMap,
  getTradeScheduleStatus,
  strategyHasEvaluableSchedule,
  computeDurationMinutes,
  formatMinutesAsHm,
  filterTradesByScheduleCompliance,
  buildScheduleInsights,
} = require('./services/scheduleUtils');
const { navigateTo } = require('./navigation.js');
const { logout } = require('./auth.js');
const { getLastOfflineUser } = require('./services/offlineAuth.js');
const { calculateWithdrawalMetrics } = require('./services/realAccountWithdrawals');
const {
  buildDirectionStats,
  buildStrategyMetricStats,
  parseStrategyMetricNames,
} = require('./services/tradeBreakdownStats');
const { buildStatsReport } = require('./services/exportReports');
const { renderDailyStopCard } = require('./services/dailyStopCard');
const {
  openTradeListModal,
  timeLabel: tradeListTimeLabel,
} = require('./services/tradeListModal');

const isStandaloneStatsPage = () => document.body.classList.contains('route-stats');
let statsEventsBound = false;
let statsInitialized = false;
let statsLoading = false;
let statsLangChangeHandler = null;
let statsDocClickHandler = null;
const zeroLinePlugin = {
  id: 'zeroLine',
  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart || {};
    if (!ctx || !chartArea || !scales?.y) return;
    const yZero = scales.y.getPixelForValue(0);
    if (Number.isNaN(yZero)) return;
    if (yZero < chartArea.top || yZero > chartArea.bottom) return;

    const isLight = document.body.classList.contains('light');
    const fallback = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
    const cssColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chartArea.left, yZero);
    ctx.lineTo(chartArea.right, yZero);
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssColor || fallback;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.restore();
  }
};

ChartJS.register(...registerables, zeroLinePlugin);
if (typeof window.Chart === 'undefined') {
  window.Chart = ChartJS;
}
const chartDpr = window.devicePixelRatio || 1;
ChartJS.defaults.devicePixelRatio = chartDpr;
ChartJS.defaults.font.family = 'Inter, system-ui';
ChartJS.defaults.font.size = 12;
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
console.log('Chart disponible:', typeof window.Chart);

const MONTH_I18N_KEYS_STATS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];

const DOW_INITIAL_KEYS_STATS = ['dow_mon', 'dow_tue', 'dow_wed', 'dow_thu', 'dow_fri', 'dow_sat', 'dow_sun'];

function formatMonthYearStats(year, monthIndex) {
  const key = MONTH_I18N_KEYS_STATS[monthIndex];
  return key ? `${t(key)} ${year}` : `${year}`;
}

function getBackendApi() {
  return window.api || window.electronAPI;
}

/**
 * Cuentas/estrategias del usuario actual leídas del mismo localStorage scoped
 * que usa Dashboard (`real_accounts_<userId>`, `real_strategies_<userId>`).
 */
async function getCurrentUserIdForFilters() {
  if (typeof window !== 'undefined' && window.currentUser?.id) {
    return window.currentUser.id;
  }
  const api = getBackendApi();
  if (api && typeof api.getCurrentUserId === 'function') {
    try {
      const id = await api.getCurrentUserId();
      if (id) return id;
    } catch (err) {
      console.warn('No se pudo obtener user_id para filtros stats:', err);
    }
  }
  return localStorage.getItem('user_id') || null;
}

function readScopedList(baseKey, userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${baseKey}_${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`Error leyendo ${baseKey}_${userId}:`, err);
    return [];
  }
}

async function getUserScopedRealAccountsAndStrategies() {
  const userId = await getCurrentUserIdForFilters();
  const api = getBackendApi();

  // Fuente preferida: SQLite via IPC (evita problemas de localStorage entre vistas/páginas).
  if (api?.getRealAccountsLocal && api?.getRealStrategiesLocal && userId) {
    try {
      console.log('Loading real accounts for user:', userId);
      const rowsA = await api.getRealAccountsLocal();
      const rowsS = await api.getRealStrategiesLocal();

      const accounts = (Array.isArray(rowsA) ? rowsA : [])
        .map((r) => String(r?.name || '').trim())
        .filter(Boolean);
      const strategies = (Array.isArray(rowsS) ? rowsS : [])
        .map((r) => String(r?.name || '').trim())
        .filter(Boolean);

      console.log('Real accounts loaded from SQLite:', accounts.length);
      console.log('Real strategies loaded from SQLite:', strategies.length);
      return { accounts, strategies };
    } catch (err) {
      console.warn('Stats real lists SQLite failed, fallback localStorage:', err);
    }
  }

  const accountsRaw = readScopedList('real_accounts', userId);
  const strategiesRaw = readScopedList('real_strategies', userId);

  const accounts = accountsRaw
    .map((account) => (typeof account === 'string' ? account : String(account?.name || '').trim()))
    .filter(Boolean);
  const strategies = strategiesRaw
    .map((strategy) => String(strategy || '').trim())
    .filter(Boolean);

  return { accounts, strategies };
}

async function getStrategyMetaByName() {
  const userId = await getCurrentUserIdForFilters();
  const api = getBackendApi();
  if (api?.getRealStrategiesLocal && userId) {
    try {
      const rows = await api.getRealStrategiesLocal();
      return buildStrategyByNameMap(rows);
    } catch (err) {
      console.warn('Stats strategy meta SQLite failed:', err);
    }
  }
  const raw = readScopedList('real_strategies', userId);
  const rows = raw.map((s) => (typeof s === 'string' ? { name: s } : s));
  return buildStrategyByNameMap(rows);
}

function getSelectedStatsStrategyName() {
  const selected =
    document.getElementById('filterStrategy')?.value ||
    document.getElementById('filterEstrategia')?.value ||
    '';
  const allLabel = t('all_strategies', 'Todas las estrategias');
  if (!selected || selected === 'Todas las estrategias' || selected === allLabel) return null;
  return String(selected).trim();
}

function resolveScheduleContext(strategyByName) {
  const selectedStrategyName = getSelectedStatsStrategyName();
  const referenceStrategy = selectedStrategyName
    ? strategyByName.get(selectedStrategyName) || null
    : null;
  const useSelectedReference = Boolean(
    referenceStrategy && strategyHasEvaluableSchedule(referenceStrategy)
  );
  return { selectedStrategyName, referenceStrategy, useSelectedReference };
}

function classifyTradeForStats(trade, strategyByName, context) {
  if (context.useSelectedReference) {
    return getTradeScheduleStatus(trade, null, { referenceStrategy: context.referenceStrategy });
  }
  const strategyName = String(trade?.strategy || trade?.estrategia || '').trim();
  const meta = strategyByName.get(strategyName);
  return getTradeScheduleStatus(trade, meta);
}

function calculateScheduleAndDurationStats(trades, strategyByName) {
  const context = resolveScheduleContext(strategyByName);
  let tradesIn = 0;
  let tradesOut = 0;
  let tradesMissingTime = 0;
  let tradesNoSchedule = 0;
  let pnlIn = 0;
  let pnlOut = 0;
  let pnlMissingTime = 0;
  const durationsIn = [];
  const durationsOut = [];
  // Datos crudos para el resumen compartido con Backtesting (winrates + concentración horaria).
  const insightItems = [];
  // Las operaciones de cada grupo, no solo cuántas son: la tabla lleva a su listado y desde ahí
  // se van a corregir. Contarlas y luego tener que volver a clasificarlas para enseñarlas
  // arriesgaría a que el listado no coincidiera con el número de al lado.
  const tradesByStatus = { inside: [], outside: [], missing_time: [], no_schedule: [] };

  (Array.isArray(trades) ? trades : []).forEach((trade) => {
    const pnl = Number(trade?.pnl ?? 0) || 0;
    const entryTime = trade?.entry_time ?? trade?.entryTime ?? null;
    const exitTime = trade?.exit_time ?? trade?.exitTime ?? null;
    const status = classifyTradeForStats(trade, strategyByName, context);
    insightItems.push({
      status,
      result: String(trade?.result || '').toUpperCase(),
      pnl,
      entryTime,
    });

    if (tradesByStatus[status]) tradesByStatus[status].push(trade);

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
    if (dur == null) return;
    if (status === 'inside') durationsIn.push(dur);
    else if (status === 'outside') durationsOut.push(dur);
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
    ...buildScheduleInsights(insightItems),
    avgDurationIn: avg(durationsIn),
    avgDurationOut: avg(durationsOut),
    hasDisciplineData: disciplineTotal > 0 || tradesNoSchedule > 0,
    useSelectedReference: context.useSelectedReference,
    selectedStrategyName: context.selectedStrategyName,
    tradesByStatus,
  };
}

/**
 * Interruptor de live testing.
 *
 * Apagado (por defecto) se ven solo las operaciones ejecutadas, que es el resultado real.
 * Encendido se añaden las de live testing, para ver cómo habría ido la estrategia si no se
 * hubiera escapado ninguna. Empieza apagado a propósito: mezclarlas sin querer daría un
 * resultado mejor del que se tuvo en la cuenta.
 */
function isIncludeLiveTestingEnabled() {
  return document.getElementById('includeLiveTesting')?.checked === true;
}

const INCLUDE_LIVE_TESTING_KEY_PREFIX = 'stats_include_live_testing';

async function loadIncludeLiveTestingState() {
  const el = document.getElementById('includeLiveTesting');
  if (!el) return;
  const userId = await getCurrentUserIdForFilters();
  if (!userId) return;
  const saved = localStorage.getItem(`${INCLUDE_LIVE_TESTING_KEY_PREFIX}_${userId}`);
  if (saved !== null) el.checked = saved === 'true';
}

async function saveIncludeLiveTestingState() {
  const userId = await getCurrentUserIdForFilters();
  if (!userId) return;
  const el = document.getElementById('includeLiveTesting');
  localStorage.setItem(`${INCLUDE_LIVE_TESTING_KEY_PREFIX}_${userId}`, el?.checked ? 'true' : 'false');
}

/** Switch ON = excluir fuera/sin hora según reglas; OFF = no tocar el listado de trades. */
function isExcludeOutOfScheduleEnabled() {
  const el = document.getElementById('excludeOutOfSchedule');
  if (!el) return false;
  return el.checked === true;
}

async function getExcludeScheduleStorageKey() {
  const userId = await getCurrentUserIdForFilters();
  return userId ? `${EXCLUDE_SCHEDULE_KEY_PREFIX}_${userId}` : null;
}

async function loadExcludeScheduleState() {
  const el = document.getElementById('excludeOutOfSchedule');
  if (!el) return;
  const key = await getExcludeScheduleStorageKey();
  if (key) {
    const saved = localStorage.getItem(key);
    if (saved !== null) el.checked = saved === 'true';
  }
}

async function saveExcludeScheduleState() {
  const key = await getExcludeScheduleStorageKey();
  if (!key) return;
  const el = document.getElementById('excludeOutOfSchedule');
  localStorage.setItem(key, el?.checked ? 'true' : 'false');
}

function updateScheduleFilterUi({ active = false, excludedCount = 0, useSelectedReference = false } = {}) {
  const notice = document.getElementById('statsScheduleFilterNotice');
  const hint = document.getElementById('statsScheduleExcludedHint');
  if (notice) {
    notice.classList.toggle('show', active);
    if (!active) {
      notice.textContent = '';
    } else if (active) {
      if (excludedCount > 0) {
        const key = useSelectedReference
          ? 'stats_schedule_filter_active_selected'
          : 'stats_schedule_filter_active';
        const fallback = useSelectedReference
          ? 'Vista filtrada: {count} trades fuera de horario o sin hora ocultos.'
          : 'Vista filtrada: {count} trades fuera de horario ocultos. Los trades sin horario evaluable se mantienen.';
        notice.textContent = t(key, fallback).replace('{count}', String(excludedCount));
      } else {
        notice.textContent = t(
          'stats_schedule_filter_active_none',
          'No hay trades fuera de horario para ocultar.'
        );
      }
    }
  }
  if (hint) {
    hint.hidden = true;
    hint.textContent = '';
  }
}

async function getScheduleFilteredTradesForMetrics() {
  const base = getFilteredTrades();
  const strategyByName = await getStrategyMetaByName();
  const selectedStrategyName = getSelectedStatsStrategyName();
  const excludeEnabled = isExcludeOutOfScheduleEnabled();

  console.log('[stats-schedule] selectedStrategyId', selectedStrategyName || '(none)');
  const ref = selectedStrategyName ? strategyByName.get(selectedStrategyName) : null;
  if (ref) {
    console.log('[stats-schedule] selectedStrategy operating_hours', ref.operating_hours);
  }
  console.log('[stats-schedule] trades before schedule filter', base.length);
  console.log('[stats-schedule] exclude switch', excludeEnabled ? 'ON' : 'OFF');

  if (!excludeEnabled) {
    updateScheduleFilterUi({ active: false, excludedCount: 0 });
    console.log('[stats-schedule] switch OFF — no schedule exclusion, showing', base.length, 'trades');
    return { trades: base, strategyByName, scheduleFilterActive: false };
  }

  const result = filterTradesByScheduleCompliance(base, strategyByName, {
    excludeOutside: true,
    selectedStrategyName,
  });

  console.log('[stats-schedule] inside/outside/missing_time/no_schedule', {
    inside: result.insideCount,
    outside: result.outsideCount,
    missing_time: result.missingTimeCount,
    no_schedule: result.noScheduleCount,
  });
  console.log('[stats-schedule] trades after schedule filter', result.includedTrades.length);

  updateScheduleFilterUi({
    active: true,
    excludedCount: result.excludedTrades.length,
    useSelectedReference: result.useSelectedReference,
  });
  return {
    trades: result.includedTrades,
    strategyByName,
    scheduleFilterActive: true,
  };
}

function closeAllCustomSelects(exceptElement = null) {
  document.querySelectorAll('.custom-select.open').forEach((select) => {
    if (!exceptElement || select !== exceptElement) {
      select.classList.remove('open');
    }
  });
}

function refreshCustomSelectForNative(nativeSelect) {
  if (!nativeSelect || nativeSelect.tagName !== 'SELECT') return;

  let custom = nativeSelect.nextElementSibling;
  if (!custom || !custom.classList.contains('custom-select')) {
    custom = document.createElement('div');
    custom.className = 'custom-select';
    custom.dataset.for = nativeSelect.id || '';
    custom.innerHTML = `
      <div class="select-selected"></div>
      <div class="select-options"></div>
    `;
    nativeSelect.insertAdjacentElement('afterend', custom);
  }

  nativeSelect.classList.add('native-select-hidden');

  const selected = custom.querySelector('.select-selected');
  const optionsContainer = custom.querySelector('.select-options');
  if (!selected || !optionsContainer) return;

  const currentOption = nativeSelect.options[nativeSelect.selectedIndex] || nativeSelect.options[0];
  selected.textContent = (currentOption?.textContent || '').trim();
  custom.dataset.value = nativeSelect.value || '';

  if (!nativeSelect.dataset.customSelectSyncBound) {
    nativeSelect.addEventListener('change', () => {
      const option = nativeSelect.options[nativeSelect.selectedIndex] || nativeSelect.options[0];
      selected.textContent = (option?.textContent || '').trim();
      custom.dataset.value = nativeSelect.value || '';
      custom.querySelectorAll('.select-option').forEach((node) => {
        node.classList.toggle('active', node.dataset.value === nativeSelect.value);
      });
    });
    nativeSelect.dataset.customSelectSyncBound = 'true';
  }

  optionsContainer.innerHTML = '';
  let grupoActual = null;
  Array.from(nativeSelect.options).forEach((option) => {
    // Los grupos (<optgroup>) se pintan como cabecera no pulsable. Hoy ningún desplegable de
    // Estadísticas usa grupos, pero recorrer `options` los pierde en silencio, así que se
    // contempla aquí igual que en el resto de la aplicación para que no vuelva a pasar.
    const grupo = option.parentElement?.tagName === 'OPTGROUP' ? option.parentElement.label : null;
    if (grupo && grupo !== grupoActual) {
      grupoActual = grupo;
      const cabecera = document.createElement('div');
      cabecera.className = 'select-group-label';
      cabecera.textContent = grupo;
      optionsContainer.appendChild(cabecera);
    } else if (!grupo) {
      grupoActual = null;
    }

    const optionElement = document.createElement('div');
    optionElement.className = 'select-option';
    optionElement.dataset.value = option.value;
    optionElement.textContent = (option.textContent || '').trim();
    if (option.value === nativeSelect.value) optionElement.classList.add('active');
    if (option.disabled) optionElement.classList.add('disabled');

    optionElement.addEventListener('click', (event) => {
      event.stopPropagation();
      if (option.disabled) return;
      nativeSelect.value = option.value;
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      selected.textContent = optionElement.textContent;
      custom.dataset.value = option.value;
      optionsContainer.querySelectorAll('.select-option').forEach((node) => node.classList.remove('active'));
      optionElement.classList.add('active');
      custom.classList.remove('open');
    });
    optionsContainer.appendChild(optionElement);
  });

  selected.onclick = (event) => {
    event.stopPropagation();
    const willOpen = !custom.classList.contains('open');
    closeAllCustomSelects(custom);
    custom.classList.toggle('open', willOpen);
  };
}

function initCustomSelects(root = document) {
  root.querySelectorAll('select').forEach((select) => refreshCustomSelectForNative(select));
}

function formatDate(dateInput) {
  if (!dateInput) return '';
  const s = formatDateEs(dateInput);
  return s === '—' ? '' : s;
}

function getCurrentTheme() {
  return document.body.classList.contains('light') ? 'light' : 'dark';
}

function getChartGridColor() {
  return getCurrentTheme() === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
}

function updateThemeIcon() {
  const host = document.getElementById('themeIcon');
  if (!host) return;
  const isLight = document.body.classList.contains('light');
  const iconName = isLight ? 'sun' : 'moon';
  host.innerHTML = `<i data-lucide="${iconName}" aria-hidden="true"></i>`;
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light', isLight);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.checked = isLight;
  updateThemeIcon();
  // La barra de título integrada la pinta el proceso principal, que no ve las clases CSS.
  try {
    getBackendApi()?.setTitleBarTheme?.(isLight ? 'light' : 'dark');
  } catch (_err) {
    /* No disponible fuera de Electron/Windows: no es crítico. */
  }
}

function showStatsBootError(message, err) {
  const el = document.getElementById('stats-boot-error');
  if (el) {
    el.hidden = false;
    el.textContent = message;
  }
  console.error('Stats error:', err || message);
}

function getAllTrades() {
  return Array.isArray(allTradesCache) ? allTradesCache : [];
}

function normalizeDate(dateValue) {
  const raw = String(dateValue || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function normalizePnl(trade) {
  const pnlNetRaw = trade?.pnl_net ?? trade?.pnlNet;

  if (pnlNetRaw !== undefined && pnlNetRaw !== null && pnlNetRaw !== '') {
    if (typeof pnlNetRaw === 'string') {
      return Number(pnlNetRaw.replace(',', '.')) || 0;
    }
    return Number(pnlNetRaw) || 0;
  }

  const pnlRaw = trade?.pnl ?? 0;
  const commissionRaw = trade?.commission ?? 0;

  const pnl = typeof pnlRaw === 'string'
    ? Number(pnlRaw.replace(',', '.')) || 0
    : Number(pnlRaw) || 0;

  const commission = typeof commissionRaw === 'string'
    ? Number(commissionRaw.replace(',', '.')) || 0
    : Number(commissionRaw) || 0;

  return pnl - commission;
}

function calculateTotalCommissions(trades) {
  return (Array.isArray(trades) ? trades : []).reduce((sum, trade) => {
    return sum + (Number(trade?.commission ?? 0) || 0);
  }, 0);
}

function normalizeTrades(trades) {
  return (Array.isArray(trades) ? trades : [])
    .map((trade) => ({
      ...trade,
      account: trade?.account ?? trade?.cuenta ?? '',
      account_executions: parseAccountExecutions(trade?.account_executions),
      strategy: trade?.strategy ?? trade?.estrategia ?? '',
      date: normalizeDate(trade?.date),
      pnl: normalizePnl(trade),
      entry_time: trade?.entry_time ?? null,
      exit_time: trade?.exit_time ?? null,
    }))
    .filter((trade) => Boolean(trade.date));
}

function sortTradesByDate(trades) {
  return [...trades].sort((a, b) => {
    const dateA = new Date((a.date || '').slice(0, 10)).getTime();
    const dateB = new Date((b.date || '').slice(0, 10)).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function pnlByAccount(trades) {
  const map = {};
  trades.forEach((trade) => {
    // Repartida entre varias cuentas, cada una suma lo suyo. Si se atribuyera el total a la
    // primera, ese desglose diría que todo el dinero salió de una cuenta en la que solo pasó
    // una parte.
    const ejecuciones = parseAccountExecutions(trade?.account_executions);
    if (ejecuciones.length >= 2) {
      ejecuciones.forEach((e) => {
        const clave = e.account || 'Sin cuenta';
        map[clave] = (map[clave] || 0) + (Number(e.pnl) || 0);
      });
      return;
    }
    const key = trade.account || 'Sin cuenta';
    map[key] = (map[key] || 0) + Number(trade.pnl || 0);
  });

  return {
    labels: Object.keys(map),
    data: Object.values(map).map((value) => Number(value.toFixed(2)))
  };
}

function pnlByStrategy(trades) {
  const map = {};
  trades.forEach((trade) => {
    const key = trade.strategy || t('no_strategy');
    map[key] = (map[key] || 0) + Number(trade.pnl || 0);
  });

  return {
    labels: Object.keys(map),
    data: Object.values(map).map((value) => Number(value.toFixed(2)))
  };
}

/**
 * Pinta el color y la linea de apoyo de las cinco tarjetas de arriba.
 *
 * Una cifra sola no dice gran cosa: un 60% de aciertos no significa lo mismo con 5 operaciones
 * que con 300, y un PnL en verde tampoco se lee igual sin saber cuantas operaciones lo han
 * producido. La linea de debajo da ese contexto, y el color deja claro de un vistazo si la
 * cifra suma o resta.
 */
function renderStatBoxContext(trades, stats, results, totalCommissions) {
  const list = Array.isArray(trades) ? trades : [];
  const [tp = 0, sl = 0, be = 0] = Array.isArray(results) ? results : [];
  const total = list.length;

  const setSub = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  };
  const setTone = (id, tone) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('positive', 'negative', 'neutral');
    el.classList.add(tone);
  };

  const ops = (n) => `${n} ${n === 1 ? t('stats_op_one', 'operación') : t('stats_op_many', 'operaciones')}`;

  const pnl = Number(stats?.pnl) || 0;
  setTone('statPnL', pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral');
  setSub('statPnLSub', total ? ops(total) : t('stats_no_trades_range', 'Sin operaciones en este periodo'));

  // Sin operaciones no hay nada que juzgar: un 0% en rojo daría a entender que se ha ido mal,
  // cuando lo que pasa es que no hay datos en ese periodo.
  setTone('statWinrate', !total ? 'neutral' : Number(stats?.winrate) >= 50 ? 'positive' : 'negative');
  setSub(
    'statWinrateSub',
    total
      ? `${tp} TP · ${sl} SL${be ? ` · ${be} BE` : ''}`
      : ''
  );

  const returns = Number(stats?.returns) || 0;
  setTone('statReturns', returns > 0 ? 'positive' : returns < 0 ? 'negative' : 'neutral');
  setSub('statReturnsSub', total ? t('stats_returns_sub', 'Sobre el capital de las cuentas') : '');

  // El factor de beneficio se lee con una referencia: por encima de 1 se gana.
  const pf = stats?.pf;
  if (pf == null) {
    setTone('statPF', 'neutral');
    setSub('statPFSub', stats?.pfHasProfitNoLoss ? t('stats_pf_no_losses', 'Aún sin pérdidas') : '');
  } else {
    setTone('statPF', Number(pf) >= 1 ? 'positive' : 'negative');
    setSub(
      'statPFSub',
      Number(pf) >= 1
        ? t('stats_pf_good', 'Por encima de 1: ganas más de lo que pierdes')
        : t('stats_pf_bad', 'Por debajo de 1: pierdes más de lo que ganas')
    );
  }

  const com = Number(totalCommissions) || 0;
  setTone('statCommissions', com > 0 ? 'negative' : 'neutral');
  setSub(
    'statCommissionsSub',
    com > 0 && total
      ? `${(com / total).toFixed(2)}€ ${t('stats_per_trade', 'por operación')}`
      : ''
  );
}

function resultDistribution(trades) {
  let tp = 0;
  let sl = 0;
  let be = 0;

  trades.forEach((trade) => {
    if (trade.result === 'TP') tp += 1;
    else if (trade.result === 'SL') sl += 1;
    else be += 1;
  });

  return [tp, sl, be];
}

function calculateWinrate(trades) {
  const wins = trades.filter((trade) => trade.result === 'TP').length;
  return trades.length === 0 ? 0 : Number(((wins / trades.length) * 100).toFixed(1));
}

function calculateStats(trades) {
  let wins = 0;
  let losses = 0;
  let be = 0;
  let profit = 0;
  let loss = 0;

  trades.forEach((trade) => {
    const pnl = Number(trade.pnl || 0);
    if (trade.result === 'TP') {
      wins += 1;
      profit += pnl;
    } else if (trade.result === 'SL') {
      losses += 1;
      loss += Math.abs(pnl);
    } else {
      be += 1;
      if (pnl > 0) profit += pnl;
      if (pnl < 0) loss += Math.abs(pnl);
    }
  });

  const total = wins + losses + be;
  const winrate = total ? (wins / total) * 100 : 0;
  const totalPnl = profit - loss;
  const returnsBase = profit + loss;
  const returns = returnsBase ? (totalPnl / returnsBase) * 100 : 0;
  const pf = loss > 0 ? profit / loss : null;
  const pfHasProfitNoLoss = loss === 0 && profit > 0;

  return {
    winrate,
    pnl: totalPnl,
    returns,
    pf,
    pfHasProfitNoLoss
  };
}

function calculateAdvancedStats(trades) {
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let bestTrade = 0;
  let worstTrade = 0;

  const sorted = sortTradesByDate(Array.isArray(trades) ? trades : []);
  sorted.forEach((trade) => {
    const pnl = Number(trade.pnl ?? 0) || 0;

    if (pnl > bestTrade) bestTrade = pnl;
    if (pnl < worstTrade) worstTrade = pnl;

    if (pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
    } else if (pnl < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
  });

  return { maxWinStreak, maxLossStreak, bestTrade, worstTrade };
}

function calculateProMetrics(trades) {
  if (!Array.isArray(trades) || !trades.length) {
    return {
      avgWin: 0,
      avgLoss: 0,
      rr: 0,
      expectancy: 0,
      maxDrawdown: 0,
      consistency: 0,
      profitDays: 0,
      lossDays: 0,
      bestDay: 0,
      worstDay: 0
    };
  }

  const sorted = sortTradesByDate(trades);
  const wins = [];
  const losses = [];
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const dailyMap = {};

  sorted.forEach((trade) => {
    const pnl = Number(trade.pnl ?? 0) || 0;
    const date = trade.date || '';
    if (pnl > 0) wins.push(pnl);
    if (pnl < 0) losses.push(pnl);

    equity += pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (!dailyMap[date]) dailyMap[date] = 0;
    dailyMap[date] += pnl;
  });

  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  const winRate = wins.length / sorted.length;
  const expectancy = (winRate * avgWin) + ((1 - winRate) * avgLoss);

  const days = Object.values(dailyMap);
  const profitDays = days.filter((value) => value > 0).length;
  const lossDays = days.filter((value) => value < 0).length;
  const bestDay = days.length ? Math.max(...days) : 0;
  const worstDay = days.length ? Math.min(...days) : 0;
  const consistency = profitDays + lossDays > 0 ? (profitDays / (profitDays + lossDays)) * 100 : 0;

  return {
    avgWin,
    avgLoss,
    rr,
    expectancy,
    maxDrawdown,
    consistency,
    profitDays,
    lossDays,
    bestDay,
    worstDay
  };
}

function groupTradesByDay(trades) {
  const grouped = {};

  (Array.isArray(trades) ? trades : []).forEach((trade) => {
    const normalized = normalizeDate(trade?.date);
    const parsedDate = normalized ? new Date(`${normalized}T00:00:00`) : new Date(trade?.date);
    if (Number.isNaN(parsedDate.getTime())) return;
    const key = normalized || parsedDate.toISOString().split('T')[0];
    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        pnl: 0,
        trades: 0
      };
    }
    grouped[key].pnl += Number(trade?.pnl || 0);
    grouped[key].trades += 1;
  });

  return Object.values(grouped)
    .map((item) => ({ ...item, pnl: Number(item.pnl.toFixed(2)) }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getDailyPnL(dailyData) {
  const rows = Array.isArray(dailyData) ? dailyData : [];
  return {
    labels: rows.map((row) => formatDate(row.date)),
    data: rows.map((row) => Number(row.pnl || 0))
  };
}

function getEquityCurve(dailyData) {
  const rows = Array.isArray(dailyData) ? dailyData : [];
  let cumulative = 0;
  const data = rows.map((row) => {
    cumulative += Number(row.pnl || 0);
    return Number(cumulative.toFixed(2));
  });
  return {
    labels: rows.map((row) => formatDate(row.date)),
    data
  };
}

function getDrawdownSeries(dailyData, equityData = []) {
  const rows = Array.isArray(dailyData) ? dailyData : [];
  let peak = 0;
  let minDrawdown = 0;
  const drawdownData = (Array.isArray(equityData) ? equityData : []).map((value) => {
    const current = Number(value || 0);
    if (current > peak) peak = current;
    const drawdown = Number((current - peak).toFixed(2));
    if (drawdown < minDrawdown) minDrawdown = drawdown;
    return drawdown;
  });

  return {
    labels: rows.map((row) => formatDate(row.date)),
    data: drawdownData,
    maxDrawdown: Math.abs(minDrawdown)
  };
}

function calculateWinrateByStrategy(trades) {
  const map = {};

  trades.forEach((trade) => {
    const key = trade.strategy || t('no_strategy');
    if (!map[key]) {
      map[key] = { wins: 0, total: 0 };
    }
    map[key].total += 1;
    if (trade.result === 'TP') map[key].wins += 1;
  });

  return Object.entries(map)
    .map(([strategy, values]) => ({
      strategy,
      winrate: values.total ? Number(((values.wins / values.total) * 100).toFixed(1)) : 0,
      total: values.total
    }))
    .sort((a, b) => b.winrate - a.winrate);
}

function formatMoney(value) {
  const numeric = Number(value) || 0;
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(2)}€`;
}

function renderStrategyWinrateList(items) {
  const list = document.getElementById('strategyWinrateList');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<li class="strategy-item"><span class="muted">${t('no_data_short')}</span><span class="muted">-</span></li>`;
    return;
  }

  list.innerHTML = items
    .map((item) => `
      <li class="strategy-item">
        <span>${item.strategy}</span>
        <span>${item.winrate.toFixed(1)}% (${item.total})</span>
      </li>
    `)
    .join('');
}

function destroyCharts() {
  while (chartInstances.length) {
    const chart = chartInstances.pop();
    chart?.destroy();
  }
}

function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  console.log(`Canvas ${canvasId}:`, canvas);
  console.log(`Parent ${canvasId}:`, canvas?.parentElement);
  if (!canvas || typeof window.Chart === 'undefined') return;

  try {
    const dpr = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    const displayWidth = Math.max(1, Math.floor(bounds.width || canvas.clientWidth || 1));
    const displayHeight = Math.max(1, Math.floor(bounds.height || canvas.clientHeight || 1));
    canvas.width = Math.max(1, Math.floor(displayWidth * dpr));
    canvas.height = Math.max(1, Math.floor(displayHeight * dpr));
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    const instance = new window.Chart(ctx, config);
    chartInstances.push(instance);
  } catch (error) {
    console.error(`ERROR RENDER ${canvasId}:`, error);
  }
}

function getAxisColorOptions(axis = 'x') {
  const mutedColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
  const isXAxis = axis === 'x';
  const baseGridColor = getChartGridColor();
  return {
    grid: isXAxis
      ? { display: false }
      : {
        color: (context) => {
          const value = Number(context?.tick?.value);
          if (!Number.isNaN(value) && value === 0) return 'rgba(0,0,0,0)';
          return baseGridColor;
        }
      },
    ticks: {
      color: mutedColor,
      font: { size: 11 }
    }
  };
}

function createVerticalGradient(canvasId, topColor, bottomColor) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas?.getContext('2d');
  if (!ctx) return topColor;
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}

function mergeChartPlugins(basePlugins, pluginOverrides = {}) {
  return {
    ...basePlugins,
    ...pluginOverrides,
    legend: {
      ...(basePlugins.legend || {}),
      ...(pluginOverrides.legend || {}),
      labels: {
        ...(basePlugins.legend?.labels || {}),
        ...(pluginOverrides.legend?.labels || {})
      }
    },
    tooltip: {
      ...(basePlugins.tooltip || {}),
      ...(pluginOverrides.tooltip || {}),
      callbacks: {
        ...(basePlugins.tooltip?.callbacks || {}),
        ...(pluginOverrides.tooltip?.callbacks || {})
      }
    }
  };
}

function setChartKpi(elementId, text, _isNegative = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = text;

  el.classList.remove('positive', 'negative', 'neutral');

  let s = String(text).replace(/[€+\s]/g, '').replace(',', '.');
  if (s.endsWith('%')) s = s.slice(0, -1);
  const numeric = Number(s);

  if (Number.isFinite(numeric) && numeric > 0) {
    el.classList.add('positive');
  } else if (Number.isFinite(numeric) && numeric < 0) {
    el.classList.add('negative');
  } else {
    el.classList.add('neutral');
  }
}

function renderDonutLegend(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const validItems = (Array.isArray(items) ? items : []).filter((item) => Number(item?.value || 0) > 0);
  if (!validItems.length) {
    container.innerHTML = `<div class="donut-legend-item"><span class="donut-legend-label">${t('no_data_short')}</span></div>`;
    return;
  }

  validItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'donut-legend-item';
    row.innerHTML = `
      <span class="donut-legend-color" style="background:${item.color}"></span>
      <span class="donut-legend-label">${item.label}</span>
      <span class="donut-legend-value">${item.value}</span>
    `;
    container.appendChild(row);
  });
}

function renderPairsLegend(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = [...(Array.isArray(data) ? data : [])]
    .filter((item) => Number(item?.value || 0) > 0)
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

  if (!items.length) {
    container.innerHTML = `<div class="legend-item"><div class="legend-left"><span class="legend-label">${t('no_data_short')}</span></div></div>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="legend-item">
      <div class="legend-left">
        <span class="legend-dot" style="background:${item.color}"></span>
        <span class="legend-label">${item.label}</span>
      </div>
      <span class="legend-value">${item.value}</span>
    </div>
  `).join('');
}

function renderDonut(containerId, data, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const tooltipId = options.tooltipId || 'donutTooltip';
  let tooltip = document.getElementById(tooltipId);
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = tooltipId;
    tooltip.className = 'donut-tooltip';
    document.body.appendChild(tooltip);
  }
  container.innerHTML = '';
  const items = (Array.isArray(data) ? data : []).filter((item) => Number(item?.value || 0) > 0);
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!items.length || total <= 0) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = t('no_data_short');
    container.appendChild(empty);
    return;
  }

  const size = Number(options.size) || 180;
  const radius = Number(options.radius) || 70;
  const strokeWidth = Number(options.strokeWidth) || 14;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.style.transform = 'rotate(-90deg)';
  svg.style.transformOrigin = 'center';
  svg.style.filter = 'drop-shadow(0 6px 14px rgba(0,0,0,0.25))';

  const baseRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  baseRing.setAttribute('cx', center);
  baseRing.setAttribute('cy', center);
  baseRing.setAttribute('r', radius);
  baseRing.setAttribute('fill', 'none');
  baseRing.setAttribute('stroke', 'rgba(148,163,184,0.15)');
  baseRing.setAttribute('stroke-width', String(strokeWidth));
  svg.appendChild(baseRing);

  items.forEach((item, index) => {
    const valueRatio = Number(item.value || 0) / total;
    const dash = valueRatio * circumference;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', center);
    circle.setAttribute('cy', center);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', item.color);
    circle.setAttribute('stroke-width', String(strokeWidth));
    circle.setAttribute('stroke-linecap', 'round');
    circle.setAttribute('stroke-dasharray', `0 ${circumference}`);
    circle.setAttribute('stroke-dashoffset', String(-offset));

    requestAnimationFrame(() => {
      setTimeout(() => {
        circle.style.transition = 'stroke-dasharray 0.8s ease';
        circle.setAttribute('stroke-dasharray', `${dash} ${circumference}`);
      }, index * 120);
    });

    circle.addEventListener('mouseenter', () => {
      circle.setAttribute('stroke-width', String(strokeWidth + 4));
      tooltip.style.opacity = '1';
      tooltip.innerHTML = `
        <strong>${item.label}</strong><br>
        ${item.value} trades<br>
        ${(valueRatio * 100).toFixed(1)}%
      `;
    });
    circle.addEventListener('mousemove', (event) => {
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY + 10}px`;
    });
    circle.addEventListener('mouseleave', () => {
      circle.setAttribute('stroke-width', String(strokeWidth));
      tooltip.style.opacity = '0';
    });

    svg.appendChild(circle);
    offset += dash;
  });

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '50%');
  text.setAttribute('y', '50%');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.style.fill = 'var(--text)';
  text.setAttribute('font-size', String(options.fontSize || 14));
  text.setAttribute('font-weight', '600');
  text.style.transform = 'rotate(90deg)';
  text.style.transformOrigin = 'center';
  text.textContent = `${total} ${options.centerLabel || t('word_trades')}`;
  svg.appendChild(text);

  container.appendChild(svg);
}

function getGlowPlugin(shadowColor) {
  return {
    id: `datasetGlow-${shadowColor.replace(/[^a-z0-9]/gi, '')}`,
    beforeDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = shadowColor;
    },
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.restore();
    }
  };
}

const doughnutCenterTextPlugin = {
  id: 'centerText',
  beforeDraw(chart, _args, pluginOptions) {
    const options = pluginOptions || {};
    const text = options.text || '';
    if (!text) return;
    const color = options.color || '#e2e8f0';
    const { width, height, ctx } = chart;
    const dpr = chart.currentDevicePixelRatio || window.devicePixelRatio || 1;
    ctx.save();
    ctx.font = `600 ${12 * dpr}px Inter, system-ui`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    ctx.restore();
  }
};

function getPairValue(trade) {
  return String(trade?.pair ?? trade?.asset ?? '').trim() || 'Sin par';
}

function getPairStats(trades) {
  const map = {};
  (Array.isArray(trades) ? trades : []).forEach((trade) => {
    const pair = getPairValue(trade);
    if (!map[pair]) {
      map[pair] = {
        pair,
        count: 0,
        pnl: 0
      };
    }
    map[pair].count += 1;
    map[pair].pnl += Number(trade.pnl || 0);
  });

  return Object.values(map).map((item) => ({
    pair: item.pair,
    count: item.count,
    pnl: Number(item.pnl.toFixed(2))
  }));
}

function setCompareSectionVisibility(isVisible) {
  const compareSection = document.getElementById('compareCharts');
  if (!compareSection) return;
  compareSection.classList.toggle('hidden', !isVisible);
}

// Pestañas de Estadísticas (Resumen / Gráficas / Retiros / Horario): los filtros y toggles
// se quedan siempre visibles arriba, solo se reparte el contenido en pestañas para que la
// página no sea un scroll interminable.
function switchStatsTab(tab) {
  const target = tab || 'summary';
  document.querySelectorAll('.stats-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-stats-tab') === target);
  });
  document.querySelectorAll('.stats-tab-panel').forEach((panel) => {
    panel.hidden = panel.getAttribute('data-stats-tab') !== target;
  });
}

function initStatsTabs() {
  document.querySelectorAll('.stats-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchStatsTab(btn.getAttribute('data-stats-tab')));
  });
  switchStatsTab('summary');
  mountStatsExportButtons();
}

function refreshLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function resetSummary() {
  const statWinrateEl = document.getElementById('statWinrate');
  const statPnlEl = document.getElementById('statPnL');
  const statReturnsEl = document.getElementById('statReturns');
  const statPfEl = document.getElementById('statPF');
  const statCommissionsEl = document.getElementById('statCommissions');
  if (statWinrateEl) statWinrateEl.textContent = '0%';
  if (statPnlEl) statPnlEl.textContent = '0€';
  if (statReturnsEl) statReturnsEl.textContent = '0%';
  if (statPfEl) statPfEl.textContent = '0';
  if (statCommissionsEl) statCommissionsEl.textContent = '0.00€';
  // Sin datos no hay contexto que dar: se limpian las lineas de apoyo y los colores, para que
  // no se queden los del periodo anterior.
  renderStatBoxContext([], { pnl: 0, winrate: 0, returns: 0, pf: null }, [0, 0, 0], 0);
  const maxWinStreakEl = document.getElementById('statMaxWinStreak');
  const maxLossStreakEl = document.getElementById('statMaxLossStreak');
  const bestTradeEl = document.getElementById('statBestTrade');
  const worstTradeEl = document.getElementById('statWorstTrade');
  const avgWinEl = document.getElementById('statAvgWin');
  const avgLossEl = document.getElementById('statAvgLoss');
  const rrEl = document.getElementById('statRR');
  const expectancyEl = document.getElementById('statExpectancy');
  const maxDrawdownEl = document.getElementById('statMaxDrawdown');
  const consistencyEl = document.getElementById('statConsistency');
  const profitDaysEl = document.getElementById('statProfitDays');
  const lossDaysEl = document.getElementById('statLossDays');
  const bestDayEl = document.getElementById('statBestDay');
  const worstDayEl = document.getElementById('statWorstDay');
  if (maxWinStreakEl) maxWinStreakEl.textContent = '0';
  if (maxLossStreakEl) maxLossStreakEl.textContent = '0';
  if (bestTradeEl) bestTradeEl.textContent = '+0.00€';
  if (worstTradeEl) worstTradeEl.textContent = '0.00€';
  if (avgWinEl) avgWinEl.textContent = '+0.00€';
  if (avgLossEl) avgLossEl.textContent = '0.00€';
  if (rrEl) rrEl.textContent = '0.00';
  if (expectancyEl) expectancyEl.textContent = '0.00€';
  if (maxDrawdownEl) maxDrawdownEl.textContent = '-0.00€';
  if (consistencyEl) consistencyEl.textContent = '0.0%';
  if (profitDaysEl) profitDaysEl.textContent = '0';
  if (lossDaysEl) lossDaysEl.textContent = '0';
  if (bestDayEl) bestDayEl.textContent = '+0.00€';
  if (worstDayEl) worstDayEl.textContent = '0.00€';
  const schedIds = [
    'statTradesInSchedule',
    'statTradesOutSchedule',
    'statTradesMissingTime',
    'statTradesNoSchedule',
    'statScheduleCompliance',
    'statPnlInSchedule',
    'statPnlOutSchedule',
    'statPnlMissingTime',
    'statAvgDurationInSchedule',
    'statAvgDurationOutSchedule',
  ];
  schedIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = id.includes('Pnl') ? '0.00€' : id.includes('Compliance') || id.includes('Duration') ? '—' : '0';
  });
  const scheduleEmpty = document.getElementById('scheduleStatsEmpty');
  const scheduleMetrics = document.getElementById('scheduleStatsMetrics');
  if (scheduleEmpty) scheduleEmpty.hidden = false;
  if (scheduleMetrics) scheduleMetrics.hidden = false;
  const missingEl = document.getElementById('statTradesMissingTime');
  const noSchedEl = document.getElementById('statTradesNoSchedule');
  if (missingEl) missingEl.textContent = '0';
  if (noSchedEl) noSchedEl.textContent = '0';
  setChartKpi('equityChartKpi', '0.00€', false);
  setChartKpi('dailyChartKpi', '0.00€', false);
  setChartKpi('drawdownChartKpi', '0.00€', true);
  setChartKpi('resultChartKpi', '0.0%', false);
  setChartKpi('pairsDistributionChartKpi', '-', false);
  setChartKpi('pairPerformanceChartKpi', '0.00€', false);
  renderDonut('resultDonut', []);
  renderDonut('pairsDonut', []);
  renderDonutLegend('resultDonutLegend', []);
  renderPairsLegend('pairsLegend', []);
  const pairsTotalEl = document.getElementById('pairsTotalTrades');
  if (pairsTotalEl) pairsTotalEl.textContent = t('pairs_total').replace('{count}', '0');
}

function setEmptyState(isVisible) {
  const empty = document.getElementById('statsEmptyState');
  if (!empty) return;
  empty.classList.toggle('show', Boolean(isVisible));
}

function setEmptyStateMessage(message) {
  const empty = document.getElementById('statsEmptyState');
  if (!empty) return;
  empty.textContent = message || t('no_data_filters', 'No hay datos para los filtros seleccionados.');
}

function clearSelect(selectId, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return null;
  select.innerHTML = '';
  const baseOption = document.createElement('option');
  baseOption.value = '';
  baseOption.textContent = placeholder;
  select.appendChild(baseOption);
  refreshCustomSelectForNative(select);
  return select;
}

function appendOptions(select, values) {
  if (!select) return;
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  refreshCustomSelectForNative(select);
}

// Nombres de cuenta que cumplen el filtro de tipo. null = sin filtro (todas).
// Se cachea al cargar filtros porque getFilteredTrades() es síncrona y se llama muy a menudo.
let accountNamesByTypeFilter = null;

async function refreshAccountTypeScope() {
  const selected = document.getElementById('filterAccountType')?.value || '';
  if (!selected) {
    accountNamesByTypeFilter = null;
    return;
  }
  const objects = await getUserScopedRealAccountObjects();
  accountNamesByTypeFilter = new Set(
    objects.filter((a) => String(a.account_type || '') === selected).map((a) => a.name)
  );
}

async function loadFilters() {
  // Solo cuentas/estrategias creadas por el usuario actual (alineado con Dashboard).
  const { accounts: scopedAccounts, strategies: scopedStrategies } =
    await getUserScopedRealAccountsAndStrategies();

  await refreshAccountTypeScope();

  // El desplegable de Cuenta se acota al tipo elegido, para no ofrecer combinaciones vacías.
  const visibleAccounts = accountNamesByTypeFilter
    ? scopedAccounts.filter((name) => accountNamesByTypeFilter.has(name))
    : scopedAccounts;

  const accounts = [...new Set(visibleAccounts)].sort((a, b) => a.localeCompare(b));
  const strategies = [...new Set(scopedStrategies)].sort((a, b) => a.localeCompare(b));

  const accountPlaceholder = t('all_accounts', 'Todas las cuentas');
  const strategyPlaceholder = t('all_strategies', 'Todas las estrategias');
  // Se recuerda lo que hubiera elegido el usuario ANTES de vaciar los desplegables. Al
  // reconstruirlos se pierde la seleccion, y como los filtros se recargan cada vez que se entra
  // en Estadisticas (y tambien al cambiar el tipo de cuenta), sin esto el filtro de Cuenta o de
  // Estrategia se volvia a «Todas» a espaldas del usuario.
  const seleccionCuenta =
    document.getElementById('filterAccount')?.value ||
    document.getElementById('filterCuenta')?.value ||
    '';
  const seleccionEstrategia =
    document.getElementById('filterStrategy')?.value ||
    document.getElementById('filterEstrategia')?.value ||
    '';

  const accountSelect = clearSelect('filterAccount', accountPlaceholder)
    || clearSelect('filterCuenta', accountPlaceholder);
  const strategySelect = clearSelect('filterStrategy', strategyPlaceholder)
    || clearSelect('filterEstrategia', strategyPlaceholder);

  appendOptions(accountSelect, accounts);
  appendOptions(strategySelect, strategies);

  // Se devuelve la seleccion solo si esa opcion sigue existiendo. Si ya no esta (por ejemplo la
  // cuenta no pertenece al tipo que se acaba de elegir), se queda en «Todas», que es lo honesto:
  // dejar escrito un filtro que no se puede aplicar enseñaria unos numeros que no le
  // corresponden.
  const restaurar = (select, valor) => {
    if (!select || !valor) return;
    if ([...select.options].some((o) => o.value === valor)) {
      select.value = valor;
      refreshCustomSelectForNative(select);
    }
  };
  restaurar(accountSelect, seleccionCuenta);
  restaurar(strategySelect, seleccionEstrategia);
}

function getFilteredTrades() {
  const trades = getAllTrades();
  const selectedAccount = document.getElementById('filterCuenta')?.value
    || document.getElementById('filterAccount')?.value
    || '';
  const selectedStrategy = document.getElementById('filterEstrategia')?.value
    || document.getElementById('filterStrategy')?.value
    || '';

  const filtered = trades.filter((trade) => {
    const account = String(trade.account ?? trade.cuenta ?? '').trim();
    const strategy = String(trade.strategy ?? trade.estrategia ?? '').trim();
    // Una operación tomada en varias cuentas pertenece a todas: tiene que salir al filtrar por
    // cualquiera de ellas, no solo por la primera.
    const accountMatch =
      !selectedAccount ||
      selectedAccount === 'Todas las cuentas' ||
      tradeMatchesAccount(trade, selectedAccount);
    const allStrategiesLabel = t('all_strategies', 'Todas las estrategias');
    const strategyMatch =
      !selectedStrategy ||
      selectedStrategy === 'Todas las estrategias' ||
      selectedStrategy === allStrategiesLabel ||
      strategy === selectedStrategy;
    // Filtro por tipo de cuenta (challenge / fondeada / capital propio).
    const typeMatch =
      !accountNamesByTypeFilter ||
      tradeAccountNames(trade).some((n) => accountNamesByTypeFilter.has(n));
    return accountMatch && strategyMatch && typeMatch;
  });

  let nextTrades = filterTradesByDate(filtered);
  // Filtrando por UNA cuenta, el dinero que se enseña es el de esa cuenta. El PnL de una
  // operación repartida es la suma de todas, así que dejarlo tal cual mostraría en «Lucid 25K»
  // dinero que en realidad se ganó en las otras dos. Sin filtro no se toca nada: ahí el total
  // sumado es justo lo que se quiere ver.
  if (selectedAccount && selectedAccount !== 'Todas las cuentas') {
    nextTrades = nextTrades.map((trade) => {
      if (parseAccountExecutions(trade?.account_executions).length < 2) return trade;
      return { ...trade, pnl: tradePnlForAccount(trade, selectedAccount) };
    });
  }
  nextTrades = filterBE(nextTrades);
  // Las de live testing solo entran si se pide: son señales que no se llegaron a operar.
  if (!isIncludeLiveTestingEnabled()) {
    nextTrades = nextTrades.filter((trade) => !trade?.live_testing);
  }
  return normalizeTrades(nextTrades);
}

function getDatePickerElements() {
  return {
    button: document.getElementById('datePickerBtn'),
    label: document.getElementById('datePickerLabel'),
    dropdown: document.getElementById('datePickerDropdown'),
    calendar: document.getElementById('calendarContainer'),
    clearBtn: document.getElementById('clearDates'),
    applyBtn: document.getElementById('applyDates')
  };
}

function startOfDay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseIsoDate(value) {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(`${value}T00:00:00`);
  return startOfDay(parsed);
}

function toIsoDate(date) {
  const normalized = startOfDay(date);
  if (!normalized) return '';
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  const da = startOfDay(a);
  const db = startOfDay(b);
  if (!da || !db) return false;
  return da.getTime() === db.getTime();
}

function isDateInRange(date, startDate, endDate) {
  const day = startOfDay(date);
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (!day || !start || !end) return false;
  return day.getTime() > start.getTime() && day.getTime() < end.getTime();
}

function formatDateFilterLabel(date) {
  if (!date) return '';
  return formatDateEs(date);
}

function formatDateFilterRangeLabel(startDate, endDate) {
  if (!startDate || !endDate) return '';
  return formatDateRangeEs(startDate, endDate);
}

function hasActiveDateFilter() {
  return Boolean(datePickerStart || datePickerEnd);
}

function updateDatePickerLabel() {
  const { label } = getDatePickerElements();
  if (label) {
    if (!datePickerStart && !datePickerEnd) {
      label.textContent = t('stats_range_all', 'Todo el historial');
    } else if (datePickerStart && !datePickerEnd) {
      label.textContent = formatDateFilterLabel(datePickerStart);
    } else {
      label.textContent = formatDateFilterRangeLabel(datePickerStart, datePickerEnd);
    }
  }
  updateRangePresetButtons();
}

/** Marca el atajo que corresponde al rango que hay puesto. */
function updateRangePresetButtons() {
  document.querySelectorAll('[data-range-preset]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-range-preset') === dateRangePreset);
  });
}

/** Aplica un atajo de periodo y refresca la pagina. */
function applyRangePreset(preset) {
  const range = getRangeForPreset(preset);
  dateRangePreset = preset;
  datePickerStart = range.start;
  datePickerEnd = range.end;
  datePickerSelecting = 'start';
  datePickerViewMonth = datePickerStart
    ? new Date(datePickerStart.getFullYear(), datePickerStart.getMonth(), 1)
    : new Date();
  updateDatePickerLabel();
  renderDatePickerCalendar();
  saveDateFilterState();
  applyFilters();
}

function setDatePickerOpen(isOpen) {
  const { dropdown } = getDatePickerElements();
  if (!dropdown) return;
  dropdown.classList.toggle('hidden', !isOpen);
}

/** Fechas de cada atajo. 'all' devuelve el rango vacío, que significa «sin filtrar». */
function getRangeForPreset(preset) {
  const today = startOfDay(new Date());
  if (!today) return { start: null, end: null };
  const y = today.getFullYear();
  const m = today.getMonth();

  if (preset === 'all') return { start: null, end: null };
  if (preset === 'lastMonth') {
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
  }
  if (preset === 'year') return { start: new Date(y, 0, 1), end: today };
  // 'month' y cualquier valor desconocido: el mes en curso, hasta hoy.
  return { start: new Date(y, m, 1), end: today };
}

/** Devuelve el atajo cuyo rango coincide con el dado, o 'custom' si no coincide ninguno. */
function detectRangePreset(start, end) {
  const iso = (d) => toIsoDate(d) || '';
  for (const preset of ['month', 'lastMonth', 'year', 'all']) {
    const r = getRangeForPreset(preset);
    if (iso(r.start) === iso(start) && iso(r.end) === iso(end)) return preset;
  }
  return 'custom';
}

function getDefaultDateRange() {
  return getRangeForPreset('month');
}

function shiftDatePickerMonth(offset) {
  datePickerViewMonth = new Date(
    datePickerViewMonth.getFullYear(),
    datePickerViewMonth.getMonth() + offset,
    1
  );
  renderDatePickerCalendar();
}

function handleDateSelection(dayDate) {
  const selected = startOfDay(dayDate);
  if (!selected) return;

  if (datePickerSelecting === 'start') {
    datePickerStart = selected;
    datePickerEnd = null;
    datePickerSelecting = 'end';
    updateDatePickerLabel();
    renderDatePickerCalendar();
    return;
  }

  datePickerEnd = selected;
  if (datePickerStart && datePickerEnd && datePickerEnd.getTime() < datePickerStart.getTime()) {
    const tmp = datePickerStart;
    datePickerStart = datePickerEnd;
    datePickerEnd = tmp;
  }
  datePickerSelecting = 'start';
  // Fechas elegidas a mano: deja de seguir a ningun atajo, y por tanto no se recalculan al
  // volver a abrir la aplicacion.
  dateRangePreset = detectRangePreset(datePickerStart, datePickerEnd);
  updateDatePickerLabel();
  renderDatePickerCalendar();
  saveDateFilterState();
  setDatePickerOpen(false);
  applyFilters();
}

function renderDatePickerCalendar() {
  const { calendar } = getDatePickerElements();
  if (!calendar) return;

  const currentMonth = new Date(
    datePickerViewMonth.getFullYear(),
    datePickerViewMonth.getMonth(),
    1
  );
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthTitle = formatMonthYearStats(year, month);
  const weekDays = DOW_INITIAL_KEYS_STATS.map((k) => t(k));
  const totalCells = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;

  const dayCells = [];
  for (let i = 0; i < totalCells; i += 1) {
    if (i < firstWeekDay || i >= firstWeekDay + daysInMonth) {
      dayCells.push('<button type="button" class="calendar-day empty" tabindex="-1"></button>');
      continue;
    }
    const dayNumber = i - firstWeekDay + 1;
    const dayDate = new Date(year, month, dayNumber);
    const isStart = isSameDay(dayDate, datePickerStart);
    const isEnd = isSameDay(dayDate, datePickerEnd);
    const inRange = isDateInRange(dayDate, datePickerStart, datePickerEnd);
    const classes = [
      'calendar-day',
      isStart ? 'range-start selected-start' : '',
      isEnd ? 'range-end selected-end' : '',
      inRange ? 'in-range' : ''
    ].filter(Boolean).join(' ');

    dayCells.push(
      `<button type="button" class="${classes}" data-role="calendar-day" data-date="${toIsoDate(dayDate)}">${dayNumber}</button>`
    );
  }

  calendar.innerHTML = `
    <div class="calendar-shell">
      <div class="calendar-header">
        <button type="button" class="calendar-nav" data-role="prev-month" aria-label="${t('prev_month_aria')}">‹</button>
        <div class="calendar-title">${monthTitle}</div>
        <button type="button" class="calendar-nav" data-role="next-month" aria-label="${t('next_month_aria')}">›</button>
      </div>
      <div class="calendar-weekdays">${weekDays.map((day) => `<span>${day}</span>`).join('')}</div>
      <div class="calendar-grid">${dayCells.join('')}</div>
    </div>
  `;
}

function saveDateFilterState() {
  localStorage.setItem(
    DATE_FILTER_KEY,
    JSON.stringify({
      startDate: toIsoDate(datePickerStart),
      endDate: toIsoDate(datePickerEnd),
      viewMonth: toIsoDate(datePickerViewMonth),
      preset: dateRangePreset
    })
  );
}

function loadDateFilterState() {
  try {
    const raw = localStorage.getItem(DATE_FILTER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const savedStart = parseIsoDate(parsed?.startDate || '');
    const savedEnd = parseIsoDate(parsed?.endDate || '');
    const savedPreset = parsed?.preset;

    if (savedPreset && savedPreset !== 'custom') {
      // Atajo: se vuelve a calcular con la fecha de hoy. Asi «Este mes» sigue siendo el mes en
      // curso aunque la ultima vez que se abrio la aplicacion fuera el mes pasado.
      dateRangePreset = savedPreset;
      const range = getRangeForPreset(savedPreset);
      datePickerStart = range.start;
      datePickerEnd = range.end;
    } else if (savedStart || savedEnd) {
      // Rango elegido a mano: se respeta tal cual.
      datePickerStart = savedStart;
      datePickerEnd = savedEnd;
      dateRangePreset = savedPreset || detectRangePreset(savedStart, savedEnd);
    } else if (savedPreset === 'custom') {
      // Rango a mano vacio, es decir «todo».
      datePickerStart = null;
      datePickerEnd = null;
      dateRangePreset = 'custom';
    } else {
      const defaults = getDefaultDateRange();
      datePickerStart = defaults.start;
      datePickerEnd = defaults.end;
      dateRangePreset = 'month';
    }
    datePickerViewMonth = parseIsoDate(parsed?.viewMonth || '')
      || datePickerStart
      || new Date();
  } catch (error) {
    console.error('No se pudo cargar el filtro de fechas', error);
    const defaults = getDefaultDateRange();
    datePickerStart = defaults.start;
    datePickerEnd = defaults.end;
    datePickerViewMonth = defaults.start || new Date();
  }
  datePickerSelecting = 'start';
  updateDatePickerLabel();
  renderDatePickerCalendar();
}

function filterTradesByDate(trades) {
  if (!datePickerStart && !datePickerEnd) return Array.isArray(trades) ? trades : [];

  return (Array.isArray(trades) ? trades : []).filter((trade) => {
    const tradeDate = startOfDay(new Date(trade.date));
    if (!tradeDate) return false;

    if (datePickerStart && !datePickerEnd) {
      return isSameDay(tradeDate, datePickerStart);
    }

    if (datePickerStart && datePickerEnd) {
      return tradeDate.getTime() >= datePickerStart.getTime()
        && tradeDate.getTime() <= datePickerEnd.getTime();
    }

    return true;
  });
}

function filterBE(trades) {
  const include = document.getElementById('includeBE')?.checked ?? true;
  if (include) return Array.isArray(trades) ? trades : [];
  return (Array.isArray(trades) ? trades : []).filter((trade) => String(trade?.result || '').toUpperCase() !== 'BE');
}

function saveIncludeBeState() {
  const include = document.getElementById('includeBE')?.checked ?? true;
  localStorage.setItem(INCLUDE_BE_KEY, include ? 'true' : 'false');
}

function loadIncludeBeState() {
  const includeBE = document.getElementById('includeBE');
  if (!includeBE) return;
  const saved = localStorage.getItem(INCLUDE_BE_KEY);
  if (saved !== null) includeBE.checked = saved === 'true';
}

function formatWithdrawalEuro(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? '' : ''}${n.toFixed(2)}€`;
}

async function getUserScopedRealAccountObjects() {
  const userId = await getCurrentUserIdForFilters();
  const api = getBackendApi();
  if (api?.getRealAccountsLocal && userId) {
    try {
      const rows = await api.getRealAccountsLocal();
      return (Array.isArray(rows) ? rows : []).map((r) => ({
        name: String(r?.name || '').trim(),
        capital: Number(r?.balance ?? 0) || 0,
        // Necesario para poder filtrar las estadísticas por tipo (challenge/fondeada/propio).
        account_type: String(r?.account_type || '').trim(),
        prop_name: String(r?.prop_name || '').trim(),
      }));
    } catch (err) {
      console.warn('Stats account objects SQLite failed:', err);
    }
  }
  const raw = readScopedList('real_accounts', userId);
  return raw.map((a) =>
    typeof a === 'string'
      ? { name: a, capital: 0, account_type: '', prop_name: '' }
      : {
          name: String(a?.name || '').trim(),
          capital: Number(a?.capital ?? 0) || 0,
          account_type: String(a?.account_type || '').trim(),
          prop_name: String(a?.prop_name || '').trim(),
        }
  );
}

function filterWithdrawalsForStats(withdrawals) {
  const selectedAccount =
    document.getElementById('filterCuenta')?.value ||
    document.getElementById('filterAccount')?.value ||
    '';
  const start = datePickerStart ? String(datePickerStart).slice(0, 10) : '';
  const end = datePickerEnd ? String(datePickerEnd).slice(0, 10) : '';

  return (Array.isArray(withdrawals) ? withdrawals : []).filter((w) => {
    const account = String(w.account_name || w.accountName || '').trim();
    const date = String(w.date || '').slice(0, 10);
    if (selectedAccount && account !== selectedAccount) return false;
    if (start && date && date < start) return false;
    if (end && date && date > end) return false;
    return true;
  });
}

async function renderWithdrawalStats(trades) {
  const backend = getBackendApi();
  let withdrawals = [];
  if (backend?.getWithdrawalsLocal) {
    try {
      withdrawals = await backend.getWithdrawalsLocal();
    } catch (err) {
      console.warn('No se pudieron cargar retiros para stats:', err);
    }
  }

  const filteredWithdrawals = filterWithdrawalsForStats(withdrawals);
  const accounts = await getUserScopedRealAccountObjects();
  const metrics = calculateWithdrawalMetrics(filteredWithdrawals, trades, accounts);

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  set('withdrawalStatTotal', formatWithdrawalEuro(metrics.total));
  set('withdrawalStatCount', String(metrics.count));
  set('withdrawalStatAvg', formatWithdrawalEuro(metrics.average));
  set(
    'withdrawalStatLast',
    metrics.last ? `${formatWithdrawalEuro(metrics.last.amount)} · ${formatDateEs(metrics.last.date)}` : '—'
  );
  set('withdrawalStatOperationalPnl', formatWithdrawalEuro(metrics.operationalNet));
  set('withdrawalStatEstimatedBalance', formatWithdrawalEuro(metrics.estimatedBalanceGlobal));

  const byAccountEl = document.getElementById('withdrawalStatByAccount');
  if (byAccountEl) {
    const entries = Object.entries(metrics.byAccount || {}).sort((a, b) => b[1].total - a[1].total);
    byAccountEl.innerHTML = entries.length
      ? entries
          .map(
            ([name, data]) =>
              `<li><span>${name} (${data.count})</span><strong>${formatWithdrawalEuro(data.total)}</strong></li>`
          )
          .join('')
      : '<li>—</li>';
  }

  const byMonthEl = document.getElementById('withdrawalStatByMonth');
  if (byMonthEl) {
    // 'AAAA-MM' → 'MM-AAAA', coherente con el formato DD-MM-AAAA del resto de la app.
    const monthLabel = (key) => {
      const m = /^(\d{4})-(\d{2})$/.exec(String(key || '').trim());
      return m ? `${m[2]}-${m[1]}` : String(key || '');
    };
    const entries = Object.entries(metrics.byMonth || {}).sort((a, b) => b[0].localeCompare(a[0]));
    byMonthEl.innerHTML = entries.length
      ? entries
          .map(([month, total]) => `<li><span>${monthLabel(month)}</span><strong>${formatWithdrawalEuro(total)}</strong></li>`)
          .join('')
      : '<li>—</li>';
  }
}

async function renderScheduleStats(trades) {
  const strategyByName = await getStrategyMetaByName();
  const sched = calculateScheduleAndDurationStats(trades, strategyByName);
  const emptyEl = document.getElementById('scheduleStatsEmpty');
  const metricsEl = document.getElementById('scheduleStatsMetrics');

  if (metricsEl) {
    metricsEl.hidden = false;
    // El contenido ya no es una rejilla de tarjetas: debe fluir en bloque (ver CSS).
    metricsEl.style.display = '';
  }
  const showEmptyMessage =
    sched.useSelectedReference &&
    sched.tradesIn + sched.tradesOut + sched.tradesMissingTime === 0;
  if (emptyEl) emptyEl.hidden = !showEmptyMessage;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('statTradesInSchedule', String(sched.tradesIn));
  set('statTradesOutSchedule', String(sched.tradesOut));
  set('statTradesMissingTime', String(sched.tradesMissingTime));
  bindScheduleTradeLists(sched);
  set('statTradesNoSchedule', String(sched.tradesNoSchedule));
  set(
    'statScheduleCompliance',
    sched.compliancePct == null ? '—' : `${sched.compliancePct.toFixed(1)}%`
  );
  set('statPnlInSchedule', `${sched.pnlIn >= 0 ? '+' : ''}${sched.pnlIn.toFixed(2)}€`);
  set('statPnlOutSchedule', `${sched.pnlOut >= 0 ? '+' : ''}${sched.pnlOut.toFixed(2)}€`);
  set(
    'statPnlMissingTime',
    `${sched.pnlMissingTime >= 0 ? '+' : ''}${sched.pnlMissingTime.toFixed(2)}€`
  );
  set('statAvgDurationInSchedule', formatMinutesAsHm(sched.avgDurationIn));
  set('statAvgDurationOutSchedule', formatMinutesAsHm(sched.avgDurationOut));
  set('statAvgDurationTotal', formatMinutesAsHm(sched.avgDurationTotal));

  // Columna Total de la comparativa: suma de dentro + fuera + sin hora.
  set('statTradesTotal', String(sched.tradesIn + sched.tradesOut + sched.tradesMissingTime));
  const pnlTotal = sched.pnlIn + sched.pnlOut + sched.pnlMissingTime;
  set('statPnlTotal', `${pnlTotal >= 0 ? '+' : ''}${pnlTotal.toFixed(2)}€`);

  const pctOrDash = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);
  set('statWinrateInSchedule', pctOrDash(sched.winRateIn));
  set('statWinrateOutSchedule', pctOrDash(sched.winRateOut));
  set('statWinrateTotal', pctOrDash(sched.winRateTotal));

  renderStatsHourConcentration(sched);
}

/**
 * Las cifras de la fila «Trades» llevan al listado de esas operaciones.
 *
 * Ver «1 fuera de horario» y no poder saber cuál es deja el dato a medias: lo que se quiere hacer
 * al verlo es ir a corregir esa operación. Una celda a cero no lleva a ninguna parte: no hay nada
 * que enseñar y anunciar un listado vacío es peor que no ofrecerlo.
 */
const SCHEDULE_LIST_CELLS = [
  {
    id: 'statTradesInSchedule',
    status: 'inside',
    titulo: 'Operaciones dentro de horario',
    subtitulo: 'Entraron dentro del horario configurado en su estrategia.',
    tono: 'sl',
  },
  {
    id: 'statTradesOutSchedule',
    status: 'outside',
    titulo: 'Operaciones fuera de horario',
    subtitulo: 'Entraron fuera del horario configurado en su estrategia.',
    tono: 'warn',
  },
  {
    id: 'statTradesMissingTime',
    status: 'missing_time',
    titulo: 'Operaciones sin hora registrada',
    subtitulo: 'No se puede saber si respetaron el horario: les falta la hora de entrada.',
    tono: 'warn',
  },
];

function bindScheduleTradeLists(sched) {
  const porEstado = sched?.tradesByStatus || {};

  SCHEDULE_LIST_CELLS.forEach((cfg) => {
    const celda = document.getElementById(cfg.id);
    if (!celda) return;
    const lista = Array.isArray(porEstado[cfg.status]) ? porEstado[cfg.status] : [];

    celda.classList.toggle('is-clickable', lista.length > 0);
    if (lista.length) {
      celda.setAttribute('role', 'button');
      celda.setAttribute('tabindex', '0');
      celda.setAttribute('title', 'Ver estas operaciones');
    } else {
      celda.removeAttribute('role');
      celda.removeAttribute('tabindex');
      celda.removeAttribute('title');
    }

    // Un solo escuchador por celda: el contenido se reescribe en cada dibujado, pero la celda
    // es siempre la misma, así que sin esta marca se irían acumulando.
    if (celda.dataset.scheduleListBound !== 'true') {
      celda.dataset.scheduleListBound = 'true';
      const abrir = () => {
        const actuales = celda.__trades || [];
        if (!actuales.length) return;
        openTradeListModal({
          title: cfg.titulo,
          subtitle: cfg.subtitulo,
          trades: actuales,
          badge: (t) => {
            const hora = tradeListTimeLabel(t);
            return hora ? { text: hora, tone: cfg.tono } : { text: 'Sin hora', tone: 'warn' };
          },
          getPnl: (t) => {
            const neto = Number(t?.pnl_net ?? t?.pnlNet);
            if (Number.isFinite(neto)) return neto;
            return (Number(t?.pnl) || 0) - (Number(t?.commission) || 0);
          },
          onSelect: (id) => {
            if (typeof window.openTradeForEdit === 'function') void window.openTradeForEdit(id);
          },
        });
      };
      celda.addEventListener('click', abrir);
      celda.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        abrir();
      });
    }
    // Las operaciones se guardan en la celda para que el listado sea siempre el del último
    // dibujado, sin depender de que quien escucha se haya vuelto a crear.
    celda.__trades = lista;
  });
}

/**
 * Concentración horaria de TP/SL en Estadísticas (real). Misma presentación que en Backtesting;
 * ambos parten del mismo objeto calculado por buildScheduleInsights().
 */
function renderStatsHourConcentration(sched) {
  const box = document.getElementById('statHourConcentration');
  if (!box) return;

  const hours = Array.isArray(sched?.hoursWithData) ? sched.hoursWithData : [];
  const decided = hours.filter((h) => h.tp > 0 || h.sl > 0);
  if (!decided.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  const label = (h) => `${String(h).padStart(2, '0')}:00`;
  const range = (h) => `${label(h)}–${label((h + 1) % 24)}`;
  const listOf = (arr, key, cls) =>
    arr.length
      ? arr.map((h) => `<span class="${cls}">${range(h.hour)}</span> (${h[key]})`).join(' · ')
      : '<span class="muted">—</span>';

  const maxTotal = Math.max(...decided.map((h) => h.tp + h.sl), 1);
  const bars = decided
    .map((h) => {
      const total = h.tp + h.sl;
      const height = (total / maxTotal) * 100;
      const tpShare = total ? (h.tp / total) * 100 : 0;
      const slShare = total ? (h.sl / total) * 100 : 0;
      return `
        <div class="hour-bar" title="${range(h.hour)} · ${h.tp} TP · ${h.sl} SL">
          <div class="hour-bar-stack" style="height:${Math.max(10, height)}%">
            <div class="hour-bar-tp" style="height:${tpShare}%"></div>
            <div class="hour-bar-sl" style="height:${slShare}%"></div>
          </div>
          <span class="hour-bar-label">${String(h.hour).padStart(2, '0')}</span>
        </div>`;
    })
    .join('');

  box.innerHTML = `
    <p class="hour-concentration-title">¿A qué horas ganas y a qué horas pierdes?</p>
    <p class="hour-concentration-sub">Por hora de entrada. Verde = TP, rojo = SL (los BE no cuentan).</p>
    <div class="hour-concentration-highlights">
      <span>Más TP: ${listOf(sched.topTpHours || [], 'tp', 'hc-tp')}</span>
      <span>Más SL: ${listOf(sched.topSlHours || [], 'sl', 'hc-sl')}</span>
    </div>
    <div class="hour-bars">${bars}</div>`;
  box.hidden = false;
}

/** Nombres de estrategia/métrica vienen del usuario: se escapan antes de inyectarlos. */
function escapeStatsHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const statsMoney = (v) => `${v >= 0 ? '+' : ''}${Number(v || 0).toFixed(2)}€`;
const statsPct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const statsPnlClass = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : '');

/**
 * Compras vs Ventas. Se pintan dos tarjetas enfrentadas + una conclusión en una frase, en vez
 * de una tabla: el usuario tiene que poder decidir «opero mejor largo o corto» de un vistazo.
 */
function renderDirectionStats(trades) {
  const section = document.getElementById('statsDirectionSection');
  if (!section) return;
  const cardsEl = document.getElementById('statsDirectionCards');
  const emptyEl = document.getElementById('statsDirectionEmpty');
  const verdictEl = document.getElementById('statsDirectionVerdict');
  const missingEl = document.getElementById('statsDirectionMissing');

  const stats = buildDirectionStats(trades);

  if (emptyEl) emptyEl.hidden = stats.hasData;
  if (cardsEl) cardsEl.hidden = !stats.hasData;
  if (!stats.hasData) {
    if (cardsEl) cardsEl.innerHTML = '';
    if (verdictEl) verdictEl.hidden = true;
    if (missingEl) missingEl.hidden = true;
    return;
  }

  const card = (kind, label, s) => `
    <div class="direction-card is-${kind}">
      <div class="direction-card-head">
        <span class="direction-card-title"><span class="direction-dot"></span>${escapeStatsHtml(label)}</span>
        <span class="direction-card-ops">${s.n} ${s.n === 1 ? 'op' : 'ops'}</span>
      </div>
      <div class="direction-card-pnl ${statsPnlClass(s.pnl)}">${s.n ? statsMoney(s.pnl) : '—'}</div>
      <div class="direction-bar"><span style="width:${s.winrate == null ? 0 : Math.max(0, Math.min(100, s.winrate))}%"></span></div>
      <div class="direction-card-rows">
        <div><span>${t('stats_direction_winrate', 'Acierto')}</span><strong>${statsPct(s.winrate)}</strong></div>
        <div><span>${t('stats_direction_avg', 'Media por op.')}</span><strong class="${statsPnlClass(s.avgPnl)}">${s.n ? statsMoney(s.avgPnl) : '—'}</strong></div>
        <div><span>TP / SL / BE</span><strong>${s.wins} / ${s.losses} / ${s.be}</strong></div>
        <div><span>${t('profit_factor', 'Factor de beneficio')}</span><strong>${s.profitFactor == null ? '—' : s.profitFactor.toFixed(2)}</strong></div>
      </div>
    </div>`;

  if (cardsEl) {
    cardsEl.innerHTML =
      card('long', t('stats_direction_long', 'Compras (Long)'), stats.long) +
      card('short', t('stats_direction_short', 'Ventas (Short)'), stats.short);
  }

  if (verdictEl) {
    if (!stats.comparable) {
      verdictEl.hidden = false;
      verdictEl.className = 'direction-verdict muted';
      verdictEl.textContent = t(
        'stats_direction_need_both',
        'Aún no hay trades en las dos direcciones para poder compararlas.'
      );
    } else {
      const diff = stats.long.pnl - stats.short.pnl;
      verdictEl.hidden = false;
      if (diff === 0) {
        verdictEl.className = 'direction-verdict muted';
        verdictEl.textContent = t('stats_direction_tie', 'Compras y ventas te dan el mismo resultado.');
      } else {
        const better = diff > 0 ? t('stats_direction_long', 'Compras (Long)') : t('stats_direction_short', 'Ventas (Short)');
        verdictEl.className = 'direction-verdict good';
        verdictEl.textContent = `${t('stats_direction_better', 'Te va mejor en')} ${better} (${statsMoney(Math.abs(diff))} ${t('stats_direction_of_difference', 'de diferencia')}).`;
      }
    }
  }

  if (missingEl) {
    if (stats.unknown.n > 0) {
      missingEl.hidden = false;
      missingEl.textContent = `${stats.unknown.n} ${t('stats_direction_missing', 'trades sin dirección no entran en esta comparación (son anteriores a este campo).')}`;
    } else {
      missingEl.hidden = true;
    }
  }
}

/**
 * Análisis por métricas de estrategia. Mismo criterio que en Backtesting: se distingue
 * «sin datos» de «mal resultado», porque una métrica recién creada mostraría ceros y
 * parecería mala cuando en realidad todavía no se ha marcado en ningún trade.
 */
async function renderStrategyMetricStats(trades) {
  const section = document.getElementById('statsMetricsSection');
  if (!section) return;
  const groupsEl = document.getElementById('statsMetricsGroups');
  const emptyEl = document.getElementById('statsMetricsEmpty');

  const strategyByName = await getStrategyMetaByName();
  const groups = buildStrategyMetricStats(trades, strategyByName);

  // Sin tablas hay dos motivos distintos y conviene decir cuál es: o no has creado métricas en
  // ninguna estrategia, o sí las hay pero los filtros de arriba no dejan ninguna operación de
  // esas estrategias. Con un solo mensaje, el segundo caso mandaba a Configuración a crear algo
  // que ya estaba creado.
  if (emptyEl) {
    emptyEl.hidden = groups.length > 0;
    if (!groups.length) {
      const hayMetricas = [...(strategyByName instanceof Map ? strategyByName.values() : [])].some(
        (strategy) => parseStrategyMetricNames(strategy?.custom_metrics).length > 0
      );
      emptyEl.textContent = hayMetricas
        ? t(
            'stats_metrics_empty_filtered',
            'Ninguna operación con los filtros actuales usa una estrategia con métricas.'
          )
        : t(
            'stats_metrics_empty',
            'Ninguna estrategia tiene métricas. Créalas en Configuración › Estrategias.'
          );
    }
  }
  if (!groupsEl) return;
  if (!groups.length) {
    groupsEl.innerHTML = '';
    return;
  }

  // Se ensena la media por operacion junto al total: el total depende de cuantas operaciones
  // tenga cada grupo, y es la media la que se puede comparar entre los dos.
  const cell = (s) =>
    s.n
      ? `<strong class="${statsPnlClass(s.pnl)}">${statsMoney(s.pnl)}</strong>` +
        `<span class="bt-metric-sub">${s.n} ${s.n === 1 ? 'op' : 'ops'} · ${statsMoney(s.avgPnl)}/op · ${statsPct(s.winrate)} ${t('stats_metrics_hit', 'acierto')}</span>`
      : '<span class="muted">—</span>';

  groupsEl.innerHTML = groups
    .map((group) => {
      const rows = group.rows
        .map((row) => {
          if (!row.evaluated) {
            return `<tr>
              <td>${escapeStatsHtml(row.metric)}</td>
              <td colspan="3" class="muted">${t('stats_metrics_no_data', 'Aún sin datos: márcala al registrar o editar tus trades y aparecerá aquí.')}</td>
            </tr>`;
          }
          let verdict = `<span class="muted">${t('stats_metrics_few_data', 'Pocos datos')}</span>`;
          if (row.comparable) {
            // La conclusion mira dos cosas, no una: cuanto dinero cambia y cuanto cambia el
            // ratio de aciertos. Una metrica puede subir el acierto y aun asi dejar menos
            // dinero (o al reves), y con un solo numero eso no se ve.
            // Se compara la media POR OPERACION, no el total. Comparar totales enganaba: si
            // cumples la metrica en 4 operaciones y no la cumples en 2, el primer grupo suma
            // mas dinero por tener el doble de operaciones, y salia «mejor cumpliendola»
            // aunque cada operacion dejara menos.
            const wrDiff = Number(row.yes.winrate || 0) - Number(row.no.winrate || 0);
            const avgDiff = Number(row.avgPnlDiff || 0);
            const detalle = `${statsMoney(avgDiff)} ${t('stats_metrics_per_trade', 'por operación')} · ${wrDiff >= 0 ? '+' : ''}${wrDiff.toFixed(1)} pts ${t('stats_metrics_hit', 'acierto')}`;
            // Con menos de 5 operaciones a cada lado la diferencia puede ser casualidad: se
            // dice, en vez de presentarlo como una conclusion firme.
            const pocas = row.yes.n < 5 || row.no.n < 5;
            const aviso = pocas ? ` · ${t('stats_metrics_low_sample', 'pocos datos aún')}` : '';
            verdict =
              avgDiff > 0
                ? `<span class="bt-metric-verdict ${pocas ? '' : 'good'}">${t('stats_metrics_better', 'Mejor cumpliéndola')} (${detalle}${aviso})</span>`
                : avgDiff < 0
                  ? `<span class="bt-metric-verdict ${pocas ? '' : 'bad'}">${t('stats_metrics_worse', 'Peor cumpliéndola')} (${detalle}${aviso})</span>`
                  : `<span class="muted">${t('stats_metrics_tie', 'Sin diferencia')}</span>`;
          } else if (row.yes.n && !row.no.n) {
            verdict = `<span class="muted">${t('stats_metrics_always', 'Siempre la cumples: no hay con qué comparar')}</span>`;
          } else if (!row.yes.n && row.no.n) {
            verdict = `<span class="muted">${t('stats_metrics_never', 'Nunca la has cumplido')}</span>`;
          }
          return `<tr>
            <td>${escapeStatsHtml(row.metric)}</td>
            <td class="bt-metric-cell">${cell(row.yes)}</td>
            <td class="bt-metric-cell">${cell(row.no)}</td>
            <td>${verdict}</td>
          </tr>`;
        })
        .join('');

      return `
        <div class="stats-metric-group">
          <h3>${escapeStatsHtml(group.strategy)}</h3>
          <p class="stats-metric-group-sub">${group.trades} ${group.trades === 1 ? 'trade' : 'trades'} ${t('stats_metrics_in_filter', 'con los filtros actuales')}</p>
          <div class="table-wrap">
            <table class="bt-metric-analysis-table">
              <thead>
                <tr>
                  <th>${t('stats_metrics_col_metric', 'Métrica')}</th>
                  <th>${t('stats_metrics_col_yes', 'Cumpliéndola')}</th>
                  <th>${t('stats_metrics_col_no', 'Sin cumplirla')}</th>
                  <th>${t('stats_metrics_col_verdict', 'Conclusión')}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    })
    .join('');
}

/* ------------------------------- Exportar Estadísticas ------------------------------- */

/** Agrupa por cuenta o estrategia con el mismo criterio de winrate que el resto de la página. */
function groupTradesFor(trades, keyName) {
  const map = new Map();
  (trades || []).forEach((trade) => {
    const key = String(trade?.[keyName] || '').trim() || '—';
    if (!map.has(key)) map.set(key, { name: key, trades: 0, wins: 0, pnl: 0 });
    const entry = map.get(key);
    entry.trades += 1;
    entry.pnl += Number(trade?.pnl || 0);
    if (trade?.result === 'TP') entry.wins += 1;
  });
  return [...map.values()]
    .map((e) => ({
      name: e.name,
      trades: e.trades,
      pnl: e.pnl,
      winrate: e.trades ? (e.wins / e.trades) * 100 : null,
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

/** Los KPIs se leen del DOM a propósito: así el informe dice exactamente lo que ve el usuario. */
function readStatsKpisFromDom() {
  const read = (id) => document.getElementById(id)?.textContent?.trim() || '—';
  return [
    { label: t('stat_win_rate', 'Ratio de aciertos'), value: read('statWinrate') },
    { label: t('stat_total_pnl', 'PnL total'), value: read('statPnL') },
    { label: t('stat_returns', 'Rentabilidad'), value: read('statReturns') },
    { label: t('stat_profit_factor', 'Factor de beneficio'), value: read('statPF') },
    { label: t('stat_commissions_paid', 'Comisiones pagadas'), value: read('statCommissions') },
    { label: t('advanced_avg_win', 'Avg win'), value: read('statAvgWin') },
    { label: t('advanced_avg_loss', 'Avg loss'), value: read('statAvgLoss') },
    { label: t('advanced_consistency', 'Consistencia'), value: read('statConsistency') },
    { label: t('insight_max_dd', 'Max drawdown'), value: read('statMaxDrawdown') },
    { label: t('insight_expectancy', 'Expectancy'), value: read('statExpectancy') },
  ];
}

async function buildStatsExportReport() {
  const trades = getFilteredTrades();
  const strategyByName = await getStrategyMetaByName();
  const selectText = (id) => {
    const el = document.getElementById(id);
    if (!el) return '';
    return el.options?.[el.selectedIndex]?.textContent?.trim() || el.value || '';
  };

  return buildStatsReport({
    kpis: readStatsKpisFromDom(),
    byAccount: groupTradesFor(trades, 'account'),
    byStrategy: groupTradesFor(trades, 'strategy'),
    direction: buildDirectionStats(trades),
    metricGroups: buildStrategyMetricStats(trades, strategyByName),
    filters: {
      'Tipo de cuenta': selectText('filterAccountType'),
      Cuenta: selectText('filterAccount'),
      Estrategia: selectText('filterStrategy'),
      Fechas: document.getElementById('datePickerLabel')?.textContent?.trim() || '',
    },
  });
}

function mountStatsExportButtons() {
  const bar = document.querySelector('#statsView .filters-row') || document.querySelector('.filters-row');
  if (!bar || document.getElementById('exportStats')) return;

  const group = document.createElement('div');
  group.className = 'export-group';
  group.id = 'exportStats';
  group.innerHTML = `
    <span class="export-group-label">${t('export_label', 'Exportar')}</span>
    <button type="button" class="button button-cancel export-btn" data-format="xlsx">Excel</button>
    <button type="button" class="button button-cancel export-btn" data-format="pdf">PDF</button>`;

  group.querySelectorAll('.export-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const backend = getBackendApi();
      if (!backend?.exportReport) return;
      group.classList.add('is-busy');
      try {
        const report = await buildStatsExportReport();
        const result = await backend.exportReport(report, btn.dataset.format);
        if (result?.cancelled) return;
        if (!result?.success) {
          console.error('❌ Error exportando estadísticas:', result?.error);
          return;
        }
        await backend.openExportedFile?.(result.path);
      } finally {
        group.classList.remove('is-busy');
      }
    });
  });

  bar.appendChild(group);
}

/**
 * «Parar el día tras varios SL» en las estadísticas reales.
 *
 * Se dibuja desde aquí, y no desde renderer.js como el análisis BE, porque aquí es donde están
 * las operaciones YA filtradas: la pregunta es sobre la estrategia y el periodo que se tengan
 * puestos arriba, así que usar el listado completo daría una respuesta que no es la que se
 * está preguntando.
 *
 * Pertenece a la pestaña Resumen. Como la tarjeta se crea sobre la marcha, puede nacer estando
 * el usuario en otra pestaña: por eso se le pone su `data-stats-tab` y se le fija la visibilidad
 * en el mismo momento, en vez de esperar al siguiente cambio de pestaña.
 */
function renderRealDailyStopCard(trades) {
  const host = document.querySelector('#statsView .stats-page')
    || document.querySelector('.stats-page')
    || document.getElementById('statsView');
  if (!host) return;
  const activa =
    document.querySelector('.stats-tab-btn.active')?.getAttribute('data-stats-tab') || 'summary';

  renderDailyStopCard({
    scope: 'real',
    host,
    blockId: 'dailyStopStatsReal',
    className: 'card panel-card stats-tab-panel',
    trades,
    // El dinero real de la operación: neto si está, y si no el bruto menos la comisión.
    getPnl: (t) => {
      const neto = Number(t?.pnl_net ?? t?.pnlNet);
      if (Number.isFinite(neto)) return neto;
      return (Number(t?.pnl) || 0) - (Number(t?.commission) || 0);
    },
    visible: activa === 'summary',
    refreshIcons: refreshLucideIcons,
  });
  document.getElementById('dailyStopStatsReal')?.setAttribute('data-stats-tab', 'summary');
}

function renderAllCharts(trades, compareEnabled = compareMode) {
  console.log('Trades para gráfica:', trades);
  // Disciplina por horario: siempre sobre el listado completo (switch OFF no oculta trades aquí).
  void renderScheduleStats(getFilteredTrades());
  void renderWithdrawalStats(trades);
  renderDirectionStats(trades);
  void renderStrategyMetricStats(trades);
  renderRealDailyStopCard(trades);
  const sortedTrades = sortTradesByDate(trades);
  const dailyData = groupTradesByDay(sortedTrades);
  const daily = getDailyPnL(dailyData);
  const equity = getEquityCurve(dailyData);
  const drawdown = getDrawdownSeries(dailyData, equity.data);
  const results = resultDistribution(sortedTrades);

  const stats = calculateStats(sortedTrades);
  const advanced = calculateAdvancedStats(sortedTrades);
  const pro = calculateProMetrics(sortedTrades);

  const statWinrateEl = document.getElementById('statWinrate');
  const statPnlEl = document.getElementById('statPnL');
  const statReturnsEl = document.getElementById('statReturns');
  const statPfEl = document.getElementById('statPF');
  const statCommissionsEl = document.getElementById('statCommissions');
  const statMaxWinStreakEl = document.getElementById('statMaxWinStreak');
  const statMaxLossStreakEl = document.getElementById('statMaxLossStreak');
  const statBestTradeEl = document.getElementById('statBestTrade');
  const statWorstTradeEl = document.getElementById('statWorstTrade');
  const statAvgWinEl = document.getElementById('statAvgWin');
  const statAvgLossEl = document.getElementById('statAvgLoss');
  const statRrEl = document.getElementById('statRR');
  const statExpectancyEl = document.getElementById('statExpectancy');
  const statMaxDrawdownEl = document.getElementById('statMaxDrawdown');
  const statConsistencyEl = document.getElementById('statConsistency');
  const statProfitDaysEl = document.getElementById('statProfitDays');
  const statLossDaysEl = document.getElementById('statLossDays');
  const statBestDayEl = document.getElementById('statBestDay');
  const statWorstDayEl = document.getElementById('statWorstDay');
  if (statWinrateEl) statWinrateEl.textContent = `${stats.winrate.toFixed(1)}%`;
  if (statPnlEl) statPnlEl.textContent = formatMoney(stats.pnl);
  if (statReturnsEl) statReturnsEl.textContent = `${stats.returns.toFixed(1)}%`;
  if (statPfEl) {
    if (stats.pf == null) {
      statPfEl.textContent = '—';
      if (stats.pfHasProfitNoLoss) statPfEl.title = 'Sin pérdidas registradas';
      else statPfEl.removeAttribute('title');
    } else {
      statPfEl.textContent = Number(stats.pf).toFixed(2);
      statPfEl.removeAttribute('title');
    }
  }
  const totalCommissions = calculateTotalCommissions(sortedTrades);
  if (statCommissionsEl) statCommissionsEl.textContent = `-${totalCommissions.toFixed(2)}€`;

  renderStatBoxContext(sortedTrades, stats, results, totalCommissions);
  if (statMaxWinStreakEl) statMaxWinStreakEl.textContent = String(advanced.maxWinStreak);
  if (statMaxLossStreakEl) statMaxLossStreakEl.textContent = String(advanced.maxLossStreak);
  if (statBestTradeEl) statBestTradeEl.textContent = `${advanced.bestTrade > 0 ? '+' : ''}${advanced.bestTrade.toFixed(2)}€`;
  if (statWorstTradeEl) statWorstTradeEl.textContent = `${advanced.worstTrade.toFixed(2)}€`;
  if (statAvgWinEl) statAvgWinEl.textContent = `+${pro.avgWin.toFixed(2)}€`;
  if (statAvgLossEl) statAvgLossEl.textContent = `${pro.avgLoss.toFixed(2)}€`;
  if (statRrEl) statRrEl.textContent = `${pro.rr.toFixed(2)}`;
  if (statExpectancyEl) {
    statExpectancyEl.textContent = `${pro.expectancy.toFixed(2)}€`;
    statExpectancyEl.classList.toggle('positive', pro.expectancy >= 0);
    statExpectancyEl.classList.toggle('negative', pro.expectancy < 0);
  }
  if (statMaxDrawdownEl) statMaxDrawdownEl.textContent = `-${pro.maxDrawdown.toFixed(2)}€`;
  if (statConsistencyEl) statConsistencyEl.textContent = `${pro.consistency.toFixed(1)}%`;
  if (statProfitDaysEl) statProfitDaysEl.textContent = String(pro.profitDays);
  if (statLossDaysEl) statLossDaysEl.textContent = String(pro.lossDays);
  if (statBestDayEl) statBestDayEl.textContent = `+${pro.bestDay.toFixed(2)}€`;
  if (statWorstDayEl) statWorstDayEl.textContent = `${pro.worstDay.toFixed(2)}€`;

  const axisOptions = { x: getAxisColorOptions('x'), y: getAxisColorOptions('y') };
  const cssVars = getComputedStyle(document.body);
  const textColor = cssVars.getPropertyValue('--text').trim() || '#e2e8f0';
  const mutedColor = cssVars.getPropertyValue('--text-muted').trim() || '#94a3b8';
  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 8,
        right: 8,
        bottom: 4,
        left: 4
      }
    },
    animation: {
      duration: 900,
      easing: 'easeOutQuart'
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'nearest',
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: {
            size: 12,
            weight: '500'
          },
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#cbd5f5',
        displayColors: false,
        cornerRadius: 10,
        callbacks: {
          label: (context) => {
            const raw = Number(context.raw ?? 0);
            return ` ${raw.toFixed(2)}€`;
          }
        }
      }
    }
  };
  const gradientGreen = createVerticalGradient('equityChart', 'rgba(34,197,94,0.5)', 'rgba(34,197,94,0)');
  const gradientRed = createVerticalGradient('drawdownChart', 'rgba(239,68,68,0.45)', 'rgba(239,68,68,0)');
  const gradientBarPositive = createVerticalGradient('dailyChart', 'rgba(34,197,94,0.8)', 'rgba(34,197,94,0.16)');
  const gradientBarNegative = createVerticalGradient('dailyChart', 'rgba(239,68,68,0.8)', 'rgba(239,68,68,0.16)');
  setChartKpi('equityChartKpi', formatMoney(stats.pnl), stats.pnl < 0);
  setChartKpi('resultChartKpi', `${stats.winrate.toFixed(1)}%`, false);
  setChartKpi('dailyChartKpi', formatMoney(Math.max(...daily.data, 0)), false);
  setChartKpi('drawdownChartKpi', `-${drawdown.maxDrawdown.toFixed(2)}€`, true);
  createChart('equityChart', {
    type: 'line',
    plugins: [getGlowPlugin(stats.pnl >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)')],
    data: {
      labels: equity.labels,
      datasets: [{
        label: t('chart_equity'),
        data: equity.data,
        borderColor: '#22c55e',
        backgroundColor: gradientGreen,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        segment: {
          borderColor: (ctx) => (ctx.p0.parsed.y >= 0 ? '#22c55e' : '#ef4444')
        },
        pointRadius: (ctx) => {
          const values = Array.isArray(ctx.dataset.data) ? ctx.dataset.data : [];
          const max = values.length ? Math.max(...values) : 0;
          return ctx.raw === max ? 6 : 2;
        },
        pointHoverRadius: 5,
        pointBackgroundColor: (ctx) => {
          const values = Array.isArray(ctx.dataset.data) ? ctx.dataset.data : [];
          const max = values.length ? Math.max(...values) : 0;
          return ctx.raw === max ? '#22c55e' : '#64748b';
        }
      }]
    },
    options: {
      ...baseChartOptions,
      scales: axisOptions,
      plugins: mergeChartPlugins(baseChartOptions.plugins, {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (context) => context?.[0]?.label || '',
            label: (context) => {
              const raw = Number(context.raw ?? 0);
              const day = dailyData[context.dataIndex];
              const tradesCount = Number(day?.trades || 0);
              return ` ${raw.toFixed(2)}€ (${t('tooltip_trades_count').replace('{count}', String(tradesCount))})`;
            }
          }
        }
      })
    }
  });

  createChart('dailyChart', {
    type: 'bar',
    plugins: [getGlowPlugin(stats.pnl >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)')],
    data: {
      labels: daily.labels,
      datasets: [{
        label: t('chart_pl'),
        data: daily.data,
        backgroundColor: daily.data.map((value) => (value >= 0 ? gradientBarPositive : gradientBarNegative)),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      ...baseChartOptions,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: axisOptions,
      plugins: mergeChartPlugins(baseChartOptions.plugins, {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (context) => context?.[0]?.label || '',
            label: (context) => {
              const raw = Number(context.raw ?? 0);
              const day = dailyData[context.dataIndex];
              const tradesCount = Number(day?.trades || 0);
              return ` ${raw.toFixed(2)}€ (${t('tooltip_trades_count').replace('{count}', String(tradesCount))})`;
            }
          }
        }
      })
    }
  });

  createChart('drawdownChart', {
    type: 'line',
    plugins: [getGlowPlugin('rgba(239,68,68,0.4)')],
    data: {
      labels: drawdown.labels,
      datasets: [{
        label: t('chart_drawdown'),
        data: drawdown.data,
        borderColor: '#ef4444',
        backgroundColor: gradientRed,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        segment: {
          borderColor: (ctx) => (ctx.p0.parsed.y <= 0 ? '#ef4444' : '#22c55e')
        },
        pointRadius: (ctx) => {
          const values = Array.isArray(ctx.dataset.data) ? ctx.dataset.data : [];
          const min = values.length ? Math.min(...values) : 0;
          return ctx.raw === min ? 6 : 2;
        },
        pointHoverRadius: 5,
        pointBackgroundColor: (ctx) => {
          const values = Array.isArray(ctx.dataset.data) ? ctx.dataset.data : [];
          const min = values.length ? Math.min(...values) : 0;
          return ctx.raw === min ? '#ef4444' : '#64748b';
        }
      }]
    },
    options: {
      ...baseChartOptions,
      scales: axisOptions,
      plugins: mergeChartPlugins(baseChartOptions.plugins, {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (context) => context?.[0]?.label || '',
            label: (context) => {
              const raw = Number(context.raw ?? 0);
              const day = dailyData[context.dataIndex];
              const tradesCount = Number(day?.trades || 0);
              return ` ${raw.toFixed(2)}€ (${t('tooltip_trades_count').replace('{count}', String(tradesCount))})`;
            }
          }
        }
      })
    }
  });

  const resultDonutData = [
    { label: 'TP', value: Number(results[0] || 0), color: '#22c55e' },
    { label: 'SL', value: Number(results[1] || 0), color: '#ef4444' },
    { label: 'BE', value: Number(results[2] || 0), color: '#64748b' }
  ];
  renderDonut('resultDonut', resultDonutData, { centerLabel: t('word_trades') });
  renderDonutLegend('resultDonutLegend', resultDonutData);

  const pairStats = getPairStats(sortedTrades);
  const pairByVolume = [...pairStats].sort((a, b) => b.count - a.count);
  const pairByPnl = [...pairStats].sort((a, b) => b.pnl - a.pnl);
  const volumeLabels = pairByVolume.map((item) => item.pair);
  const volumeValues = pairByVolume.map((item) => item.count);
  const pnlLabels = pairByPnl.map((item) => item.pair);
  const pnlValues = pairByPnl.map((item) => item.pnl);
  const pairMetaByLabel = pairStats.reduce((acc, item) => {
    acc[item.pair] = item;
    return acc;
  }, {});
  const topPairByVolume = pairByVolume[0];
  const topPairByPnl = pairByPnl[0];
  setChartKpi(
    'pairsDistributionChartKpi',
    topPairByVolume ? `${topPairByVolume.pair} (${topPairByVolume.count})` : '-'
  );
  setChartKpi(
    'pairPerformanceChartKpi',
    topPairByPnl ? formatMoney(topPairByPnl.pnl) : '0.00€',
    Boolean(topPairByPnl && topPairByPnl.pnl < 0)
  );

  const palette = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#eab308', '#f97316', '#14b8a6', '#8b5cf6'];
  const pairsDonutData = pairByVolume.map((item, index) => ({
    label: item.pair,
    value: Number(item.count || 0),
    color: palette[index % palette.length]
  }));
  renderDonut('pairsDonut', pairsDonutData, { centerLabel: t('word_trades') });
  renderPairsLegend('pairsLegend', pairsDonutData);
  const totalPairTrades = pairsDonutData.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const pairsTotalEl = document.getElementById('pairsTotalTrades');
  if (pairsTotalEl) pairsTotalEl.textContent = t('pairs_total').replace('{count}', String(totalPairTrades));

  createChart('pairPerformanceChart', {
    type: 'bar',
    plugins: [getGlowPlugin(stats.pnl >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)')],
    data: {
      labels: pnlLabels,
      datasets: [{
        data: pnlValues,
        borderRadius: 8,
        borderSkipped: false,
        backgroundColor: pnlValues.map((value) => (value >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)'))
      }]
    },
    options: {
      ...baseChartOptions,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: {
        x: getAxisColorOptions('x'),
        y: getAxisColorOptions('y')
      },
      plugins: mergeChartPlugins(baseChartOptions.plugins, {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const pair = context.label || '';
              const info = pairMetaByLabel[pair] || { pnl: 0, count: 0 };
              return ` ${pair} → ${formatMoney(info.pnl)} (${t('tooltip_trades_count').replace('{count}', String(info.count))})`;
            }
          }
        }
      })
    }
  });

  if (!compareEnabled) {
    renderStrategyWinrateList([]);
    return;
  }

  const byAccount = pnlByAccount(sortedTrades);
  const byStrategy = pnlByStrategy(sortedTrades);
  const strategyWinrates = calculateWinrateByStrategy(sortedTrades);

  createChart('accountChart', {
    type: 'bar',
    plugins: [getGlowPlugin('rgba(59,130,246,0.35)')],
    data: {
      labels: byAccount.labels,
      datasets: [{
        data: byAccount.data,
        backgroundColor: 'rgba(59,130,246,0.8)',
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      ...baseChartOptions,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: axisOptions,
      plugins: mergeChartPlugins(baseChartOptions.plugins, {
        legend: { display: false }
      })
    }
  });

  createChart('strategyChart', {
    type: 'bar',
    plugins: [getGlowPlugin('rgba(168,85,247,0.35)')],
    data: {
      labels: byStrategy.labels,
      datasets: [{
        data: byStrategy.data,
        backgroundColor: 'rgba(168,85,247,0.8)',
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      ...baseChartOptions,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      scales: axisOptions,
      plugins: mergeChartPlugins(baseChartOptions.plugins, {
        legend: { display: false }
      })
    }
  });

  renderStrategyWinrateList(strategyWinrates);
}

async function applyFilters() {
  saveDateFilterState();
  saveIncludeBeState();
  void saveExcludeScheduleState();
  const { trades: filteredTrades } = await getScheduleFilteredTradesForMetrics();
  console.log('TRADES FILTRADOS:', filteredTrades);
  setCompareSectionVisibility(compareMode);
  destroyCharts();

  if (!filteredTrades.length) {
    setEmptyStateMessage(hasActiveDateFilter()
      ? t('no_data_range', 'No hay datos en este rango')
      : t('no_data_filters', 'No hay datos para los filtros seleccionados.'));
    setEmptyState(true);
    resetSummary();
    renderStrategyWinrateList([]);
    void renderScheduleStats(getFilteredTrades());
    void renderWithdrawalStats([]);
    renderDirectionStats([]);
    void renderStrategyMetricStats([]);
    renderRealDailyStopCard([]);
    return;
  }

  setEmptyStateMessage(t('no_data_filters', 'No hay datos para los filtros seleccionados.'));
  setEmptyState(false);
  try {
    renderAllCharts(filteredTrades, compareMode);
    refreshLucideIcons();
  } catch (error) {
    console.error('ERROR RENDER CHARTS:', error);
  }
}

window.applyFilters = applyFilters;
window.renderAllStats = applyFilters;

async function loadStatsTrades() {
  const backend = getBackendApi();
  if (!backend?.getTrades) {
    allTradesCache = [];
    await loadFilters();
    return;
  }
  try {
    const trades = await backend.getTrades();
    allTradesCache = normalizeTrades(Array.isArray(trades) ? trades : []);
    console.log('Stats loaded trades:', allTradesCache.length);
    await loadFilters();
  } catch (error) {
    console.error('Stats error:', error);
    showStatsBootError(
      'No se pudieron cargar las estadísticas. Comprueba la conexión o vuelve al panel.',
      error
    );
    allTradesCache = [];
    await loadFilters();
  }
}

async function bindStatsEventsOnce() {
  if (statsEventsBound) return;
  statsEventsBound = true;

  initLanguageSwitcher();
  initCustomSelects();

  const accountSelect = document.getElementById('filterAccount');
  const strategySelect = document.getElementById('filterStrategy');
  const accountSelectLegacy = document.getElementById('filterCuenta');
  const strategySelectLegacy = document.getElementById('filterEstrategia');
  const applyFiltersBtn = document.getElementById('applyFilters');
  const themeToggle = document.getElementById('themeToggle');
  const compareToggle = document.getElementById('compareMode');
  const includeBEToggle = document.getElementById('includeBE');
  const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
  const advancedStats = document.getElementById('advancedStats');
  const {
    button: datePickerBtn,
    dropdown: datePickerDropdown,
    calendar: calendarContainer,
    clearBtn: clearDatesBtn,
    applyBtn: applyDatesBtn
  } = getDatePickerElements();
  accountSelect?.addEventListener('change', applyFilters);
  strategySelect?.addEventListener('change', applyFilters);
  // Al cambiar el tipo hay que recargar los filtros: el desplegable de Cuenta se acota al tipo.
  document.getElementById('filterAccountType')?.addEventListener('change', () => {
    void (async () => {
      await loadFilters();
      await applyFilters();
    })();
  });
  accountSelectLegacy?.addEventListener('change', applyFilters);
  strategySelectLegacy?.addEventListener('change', applyFilters);
  datePickerBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    const isHidden = datePickerDropdown?.classList.contains('hidden');
    if (isHidden) {
      datePickerViewMonth = datePickerStart
        ? new Date(datePickerStart.getFullYear(), datePickerStart.getMonth(), 1)
        : new Date();
      datePickerSelecting = datePickerEnd ? 'start' : 'end';
    }
    setDatePickerOpen(Boolean(isHidden));
    if (isHidden) renderDatePickerCalendar();
  });
  calendarContainer?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!(event.target instanceof Element)) return;
    const prevBtn = event.target.closest('[data-role="prev-month"]');
    if (prevBtn) {
      shiftDatePickerMonth(-1);
      return;
    }
    const nextBtn = event.target.closest('[data-role="next-month"]');
    if (nextBtn) {
      shiftDatePickerMonth(1);
      return;
    }
    const dayBtn = event.target.closest('[data-role="calendar-day"]');
    if (!dayBtn) return;
    const date = parseIsoDate(dayBtn.getAttribute('data-date') || '');
    handleDateSelection(date);
  });
  clearDatesBtn?.addEventListener('click', () => {
    const defaults = getDefaultDateRange();
    dateRangePreset = 'month';
    datePickerStart = defaults.start;
    datePickerEnd = defaults.end;
    datePickerSelecting = 'start';
    datePickerViewMonth = datePickerStart
      ? new Date(datePickerStart.getFullYear(), datePickerStart.getMonth(), 1)
      : new Date();
    updateDatePickerLabel();
    renderDatePickerCalendar();
    saveDateFilterState();
    applyFilters();
  });
  applyDatesBtn?.addEventListener('click', () => {
    saveDateFilterState();
    setDatePickerOpen(false);
    applyFilters();
  });
  document.querySelectorAll('[data-range-preset]').forEach((btn) => {
    btn.addEventListener('click', () => applyRangePreset(btn.getAttribute('data-range-preset')));
  });
  applyFiltersBtn?.addEventListener('click', applyFilters);
  if (compareToggle) {
    compareMode = Boolean(compareToggle.checked);
    compareToggle.addEventListener('change', (event) => {
      compareMode = Boolean(event.target.checked);
      applyFilters();
    });
  }
  includeBEToggle?.addEventListener('change', applyFilters);
  const excludeScheduleToggle = document.getElementById('excludeOutOfSchedule');
  document.getElementById('includeLiveTesting')?.addEventListener('change', () => {
    void saveIncludeLiveTestingState();
    void applyFilters();
  });
  excludeScheduleToggle?.addEventListener('change', () => {
    console.log(
      '[stats-schedule] toggle changed ->',
      excludeScheduleToggle.checked ? 'ON' : 'OFF'
    );
    void saveExcludeScheduleState();
    void applyFilters();
  });
  if (toggleAdvancedBtn && advancedStats) {
    toggleAdvancedBtn.textContent = t('insights_advanced_toggle_show');
    toggleAdvancedBtn.onclick = () => {
      const willOpen = !advancedStats.classList.contains('open');
      advancedStats.classList.toggle('open', willOpen);
      toggleAdvancedBtn.textContent = willOpen ? t('insights_advanced_toggle_hide') : t('insights_advanced_toggle_show');
    };
  }

  initStatsTabs();

  statsDocClickHandler = (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('.custom-select')) {
      closeAllCustomSelects();
    }
    if (datePickerSelecting === 'end') {
      return;
    }
    if (!event.target.closest('.date-picker-wrapper')) {
      setDatePickerOpen(false);
    }
  };
  document.addEventListener('click', statsDocClickHandler);

  statsLangChangeHandler = () => {
    if (toggleAdvancedBtn && advancedStats) {
      const open = advancedStats.classList.contains('open');
      toggleAdvancedBtn.textContent = open ? t('insights_advanced_toggle_hide') : t('insights_advanced_toggle_show');
    }
    applyFilters();
  };
  window.addEventListener('app:languagechanged', statsLangChangeHandler);

  loadDateFilterState();
  loadIncludeBeState();
  void loadExcludeScheduleState();
  void loadIncludeLiveTestingState();
}

/**
 * Monta Estadísticas dentro del shell SPA (dashboard).
 */
async function mountStatsView(container) {
  if (statsLoading) {
    console.log('[stats] already loading, skip');
    return;
  }

  statsLoading = true;
  console.log('SPA navigate to stats');
  console.log('Stats view rendered inside dashboard shell');
  console.log('Stats current user:', localStorage.getItem('user_id') || '(none)');
  console.log('Stats env:', process.env.APP_ENV);
  console.log('Stats preload available:', Boolean(window.api || window.electronAPI));

  try {
    await bindStatsEventsOnce();
    // Se recargan los trades CADA vez que se entra en Estadísticas.
    //
    // Antes solo se cargaban la primera vez y la lista se quedaba congelada durante toda la
    // sesión: si editabas un trade en el panel, las estadísticas seguían enseñando los datos
    // viejos hasta cerrar y volver a abrir la aplicación. Por ejemplo, corregir la hora de una
    // operación y que siguiera contando como «sin hora registrada».
    //
    // Se hace así, y no avisando desde cada sitio que cambia un trade, porque los sitios que
    // pueden modificar uno son muchos (crear, editar, borrar, deshacer un borrado, importar,
    // sincronizar) y basta con olvidarse de uno para volver a tener el mismo problema, otra vez
    // sin ningún aviso. Recargar al entrar no se puede olvidar.
    await loadStatsTrades();
    statsInitialized = true;
    await applyFilters();
    refreshLucideIcons();
  } catch (error) {
    console.error('Stats error:', error);
    showStatsBootError('Error al cargar Estadísticas.', error);
  } finally {
    statsLoading = false;
  }
}

function unmountStatsView() {
  console.log('Leaving stats view');
  destroyCharts();
  setDatePickerOpen(false);
}

async function initStandaloneStatsPage() {
  const { initSidebar } = require('./sidebar.js');
  require('./sidebar.css');
  require('./stats-layout.css');

  window.navigateTo = navigateTo;

  initSidebar({
    activeView: 'stats',
    mode: 'page',
    onThemeChange: (theme) => {
      applyTheme(theme);
      applyFilters();
    },
    refreshIcons: refreshLucideIcons,
    getUserEmail: async () => getLastOfflineUser()?.email || '',
    onProfile: () => navigateTo('config'),
    onLogout: async () => {
      await logout();
      navigateTo('dashboard');
    }
  });

  await loadLanguage(detectUserLanguage()).catch((error) => {
    console.error('Error cargando idioma', error);
  });
  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
  await mountStatsView(document.querySelector('.stats-page'));
}

if (isStandaloneStatsPage()) {
  window.addEventListener('DOMContentLoaded', () => {
    initStandaloneStatsPage().catch((error) => {
      console.error('Stats error:', error);
      showStatsBootError('Error fatal en Estadísticas.', error);
    });
  });
}

module.exports = {
  mountStatsView,
  unmountStatsView,
  applyFilters
};
