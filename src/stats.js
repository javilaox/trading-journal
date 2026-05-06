let chartInstances = [];
let allTradesCache = [];
let compareMode = false;
const DATE_FILTER_KEY = 'statsDateFilter';
const INCLUDE_BE_KEY = 'statsIncludeBE';
let datePickerStart = null;
let datePickerEnd = null;
let datePickerViewMonth = new Date();
let datePickerSelecting = 'start';
const { Chart: ChartJS, registerables } = require('chart.js');
const {
  loadLanguage,
  t,
  detectUserLanguage,
  initLanguageSwitcher,
  getCurrentLanguage
} = require('./i18n');
const { formatDateEs, formatDateRangeEs } = require('./dateDisplay.js');
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
  Array.from(nativeSelect.options).forEach((option) => {
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
}

function navigateTo(page) {
  const target = String(page || '').toLowerCase();
  const isFileProtocol = window.location.protocol === 'file:';
  if (!target) return;

  if (isFileProtocol) {
    window.location.href = `${target}.html`;
    return;
  }

  if (target === 'stats') {
    window.location.href = `${window.location.origin}/stats`;
    return;
  }

  if (target === 'dashboard') {
    window.location.href = `${window.location.origin}/main_window`;
    return;
  }

  if (target === 'trade' || target === 'config' || target === 'backtesting' || target === 'backtestingconfig') {
    const fragment = target === 'backtestingconfig' ? 'backtestingconfig' : target;
    window.location.href = `${window.location.origin}/main_window#${fragment}`;
    return;
  }

  window.location.href = `${window.location.origin}/${target}`;
}

window.navigateTo = navigateTo;

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
      strategy: trade?.strategy ?? trade?.estrategia ?? '',
      date: normalizeDate(trade?.date),
      pnl: normalizePnl(trade)
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

function loadFilters() {
  const trades = getAllTrades();

  const accounts = [...new Set(
    trades.map((trade) => String(trade.account ?? trade.cuenta ?? '').trim()).filter((value) => Boolean(value))
  )].sort((a, b) => a.localeCompare(b));
  const strategies = [...new Set(
    trades.map((trade) => String(trade.strategy ?? trade.estrategia ?? '').trim()).filter((value) => Boolean(value))
  )].sort((a, b) => a.localeCompare(b));

  const accountPlaceholder = t('all_accounts', 'Todas las cuentas');
  const strategyPlaceholder = t('all_strategies', 'Todas las estrategias');
  const accountSelect = clearSelect('filterAccount', accountPlaceholder)
    || clearSelect('filterCuenta', accountPlaceholder);
  const strategySelect = clearSelect('filterStrategy', strategyPlaceholder)
    || clearSelect('filterEstrategia', strategyPlaceholder);

  appendOptions(accountSelect, accounts);
  appendOptions(strategySelect, strategies);
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
    const accountMatch = !selectedAccount || selectedAccount === 'Todas las cuentas' || account === selectedAccount;
    const strategyMatch = !selectedStrategy || selectedStrategy === 'Todas las estrategias' || strategy === selectedStrategy;
    return accountMatch && strategyMatch;
  });

  let nextTrades = filterTradesByDate(filtered);
  nextTrades = filterBE(nextTrades);
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
  if (!label) return;
  if (!datePickerStart && !datePickerEnd) {
    label.textContent = t('select_dates', 'Seleccionar fechas');
    return;
  }
  if (datePickerStart && !datePickerEnd) {
    label.textContent = formatDateFilterLabel(datePickerStart);
    return;
  }
  label.textContent = formatDateFilterRangeLabel(datePickerStart, datePickerEnd);
}

function setDatePickerOpen(isOpen) {
  const { dropdown } = getDatePickerElements();
  if (!dropdown) return;
  dropdown.classList.toggle('hidden', !isOpen);
}

function getDefaultDateRange() {
  const today = startOfDay(new Date());
  const startOfMonth = today
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : null;
  return {
    start: startOfMonth,
    end: today
  };
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
      viewMonth: toIsoDate(datePickerViewMonth)
    })
  );
}

function loadDateFilterState() {
  try {
    const raw = localStorage.getItem(DATE_FILTER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const savedStart = parseIsoDate(parsed?.startDate || '');
    const savedEnd = parseIsoDate(parsed?.endDate || '');
    if (savedStart || savedEnd) {
      datePickerStart = savedStart;
      datePickerEnd = savedEnd;
    } else {
      const defaults = getDefaultDateRange();
      datePickerStart = defaults.start;
      datePickerEnd = defaults.end;
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

function renderAllCharts(trades, compareEnabled = compareMode) {
  console.log('Trades para gráfica:', trades);
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

function applyFilters() {
  const filteredTrades = getFilteredTrades();
  console.log('TRADES FILTRADOS:', filteredTrades);
  saveDateFilterState();
  saveIncludeBeState();
  setCompareSectionVisibility(compareMode);
  destroyCharts();

  if (!filteredTrades.length) {
    setEmptyStateMessage(hasActiveDateFilter()
      ? t('no_data_range', 'No hay datos en este rango')
      : t('no_data_filters', 'No hay datos para los filtros seleccionados.'));
    setEmptyState(true);
    resetSummary();
    renderStrategyWinrateList([]);
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

async function init() {
  initLanguageSwitcher();
  await loadLanguage(detectUserLanguage()).catch((error) => {
    console.error('Error cargando idioma', error);
  });

  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
  refreshLucideIcons();
  initCustomSelects();

  const backend = getBackendApi();
  if (!backend?.getTrades) {
    allTradesCache = [];
    loadFilters();
    applyFilters();
    return;
  }

  try {
    const trades = await backend.getTrades();
    allTradesCache = normalizeTrades(Array.isArray(trades) ? trades : []);
    loadFilters();
  } catch (error) {
    console.error('Error cargando stats:', error);
    allTradesCache = [];
    loadFilters();
  }

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
  const toggleSidebarStats = document.getElementById('toggleSidebarStats');
  const sidebar = document.getElementById('sidebar');
  accountSelect?.addEventListener('change', applyFilters);
  strategySelect?.addEventListener('change', applyFilters);
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
  applyFiltersBtn?.addEventListener('click', applyFilters);
  if (compareToggle) {
    compareMode = Boolean(compareToggle.checked);
    compareToggle.addEventListener('change', (event) => {
      compareMode = Boolean(event.target.checked);
      applyFilters();
    });
  }
  includeBEToggle?.addEventListener('change', applyFilters);
  if (toggleAdvancedBtn && advancedStats) {
    toggleAdvancedBtn.textContent = t('insights_advanced_toggle_show');
    toggleAdvancedBtn.onclick = () => {
      const willOpen = !advancedStats.classList.contains('open');
      advancedStats.classList.toggle('open', willOpen);
      toggleAdvancedBtn.textContent = willOpen ? t('insights_advanced_toggle_hide') : t('insights_advanced_toggle_show');
    };
  }
  toggleSidebarStats?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    refreshLucideIcons();
  });
  themeToggle?.addEventListener('change', () => {
    const nextTheme = themeToggle.checked ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
    applyFilters();
  });

  document.addEventListener('click', (event) => {
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
  });

  loadDateFilterState();
  loadIncludeBeState();
  applyFilters();

  window.addEventListener('app:languagechanged', () => {
    if (toggleAdvancedBtn && advancedStats) {
      const open = advancedStats.classList.contains('open');
      toggleAdvancedBtn.textContent = open ? t('insights_advanced_toggle_hide') : t('insights_advanced_toggle_show');
    }
    applyFilters();
  });
}

window.addEventListener('DOMContentLoaded', init);
