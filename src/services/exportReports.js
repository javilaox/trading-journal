/**
 * Construcción de informes exportables (Excel y PDF).
 *
 * Todo se reduce a una única estructura intermedia, para que Excel y PDF partan exactamente de
 * los mismos números y no haya que mantener dos versiones de cada informe:
 *
 *   {
 *     title:    'Gestión · Retiros y gastos',
 *     subtitle: 'Trading Journal',
 *     meta:     [{ label: 'Filtros', value: 'Cuenta: Apex 50k' }, ...],
 *     sheets:   [{
 *       name:    'Retiros',
 *       columns: [{ key, header, type: 'text'|'number'|'money'|'percent'|'date' }],
 *       rows:    [{ ...valores por key }],
 *       totals:  { key: valor } | null,
 *       summary: [{ label, value }] | null   // tarjetas de resumen antes de la tabla
 *     }]
 *   }
 *
 * Este módulo NO toca el DOM: recibe datos ya filtrados y devuelve el informe. Así se puede
 * ejecutar y verificar sin abrir la app.
 */

const { tradeAccountNames } = require('./accountExecutions');

const COL = (key, header, type = 'text') => ({ key, header, type });

/** 'YYYY-MM-DD' -> 'DD-MM-YYYY', el formato que usa la app. Deja pasar lo que no reconozca. */
function toEsDate(value) {
  const raw = String(value || '').slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(value || '');
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Suma redondeada a dos decimales. El redondeo evita que los totales salgan con ruido de coma
 * flotante (-173.95999999999998 en vez de -173.96) al guardarlos en la celda.
 */
function sumBy(rows, key) {
  const total = (rows || []).reduce((acc, row) => acc + num(row?.[key]), 0);
  return Math.round(total * 100) / 100;
}

/** Descripción legible de los filtros aplicados, para que el informe no sea ambiguo. */
function buildFilterMeta(filters = {}) {
  const entries = Object.entries(filters)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([label, value]) => `${label}: ${value}`);
  return entries.length ? entries.join('  ·  ') : 'Sin filtros (todos los datos)';
}

function baseMeta(filters, extra = []) {
  return [
    { label: 'Generado', value: toEsDate(new Date().toISOString()) },
    { label: 'Filtros', value: buildFilterMeta(filters) },
    ...extra,
  ];
}

/* ------------------------------------------------------------------ Gestión */

function buildManagementReport({ withdrawals = [], expenses = [], filters = {} } = {}) {
  const withdrawalRows = withdrawals.map((w) => ({
    date: toEsDate(w.date),
    account: w.account_name || w.accountName || '',
    amount: num(w.amount),
    note: w.note || '',
  }));

  // Los gastos se guardan como importe positivo, pero en un informe restan: se exportan con
  // signo negativo para que se lean de un vistazo (y en rojo, tanto en Excel como en PDF).
  const expenseRows = expenses.map((e) => ({
    date: toEsDate(e.date),
    account: e.account_name || e.accountName || '',
    size: e.account_size || '',
    category: e.category || '',
    amount: -Math.abs(num(e.amount)),
    note: e.note || '',
  }));

  const totalWithdrawn = sumBy(withdrawalRows, 'amount');
  const totalSpent = sumBy(expenseRows, 'amount'); // ya viene en negativo

  return {
    title: 'Gestión · Retiros y gastos',
    subtitle: 'Trading Journal',
    meta: baseMeta(filters, [
      { label: 'Balance (retirado - gastado)', value: `${(totalWithdrawn + totalSpent).toFixed(2)} €` },
    ]),
    sheets: [
      {
        name: 'Retiros',
        columns: [
          COL('date', 'Fecha', 'date'),
          COL('account', 'Prop / Broker'),
          COL('amount', 'Importe', 'money'),
          COL('note', 'Nota'),
        ],
        rows: withdrawalRows,
        totals: { amount: totalWithdrawn },
        summary: [
          { label: 'Retiros', value: String(withdrawalRows.length) },
          { label: 'Total retirado', value: `${totalWithdrawn.toFixed(2)} €` },
          {
            label: 'Retiro medio',
            value: `${(withdrawalRows.length ? totalWithdrawn / withdrawalRows.length : 0).toFixed(2)} €`,
          },
        ],
      },
      {
        name: 'Gastos',
        columns: [
          COL('date', 'Fecha', 'date'),
          COL('account', 'Prop / Broker'),
          COL('size', 'Tamaño cuenta'),
          COL('category', 'Categoría'),
          COL('amount', 'Importe', 'money'),
          COL('note', 'Nota'),
        ],
        rows: expenseRows,
        totals: { amount: totalSpent },
        summary: [
          { label: 'Gastos', value: String(expenseRows.length) },
          { label: 'Total gastado', value: `${totalSpent.toFixed(2)} €` },
          {
            label: 'Gasto medio',
            value: `${(expenseRows.length ? totalSpent / expenseRows.length : 0).toFixed(2)} €`,
          },
        ],
      },
    ],
  };
}

/* ------------------------------------------------- Historial de trades reales */

const DIRECTION_LABEL = { LONG: 'Compra', SHORT: 'Venta' };

function tradeMetricsToText(trade) {
  const raw = trade?.custom_metrics;
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch (_err) {
      obj = null;
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return '';
  return Object.entries(obj)
    .map(([name, value]) => `${name}: ${value ? 'Sí' : 'No'}`)
    .join(' · ');
}

function buildTradesReport({ trades = [], filters = {} } = {}) {
  const rows = [...trades]
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .map((t) => ({
      date: toEsDate(t.date),
      asset: t.asset || t.pair || '',
      direction: DIRECTION_LABEL[String(t.direction || '').toUpperCase()] || '',
      result: t.result || '',
      pnl: num(t.pnl),
      // Repartida entre varias cuentas, se listan todas: si solo saliera la primera, el informe
      // diría que la operación fue en una cuenta cuando estuvo en tres.
      account: tradeAccountNames(t).join(' · ') || t.account || '',
      strategy: t.strategy || '',
      entry_time: t.entry_time || '',
      exit_time: t.exit_time || '',
      lot: num(t.lot_size ?? t.lotSize),
      commission: num(t.commission),
      metrics: tradeMetricsToText(t),
      notes: t.description || t.notes || '',
    }));

  const wins = rows.filter((r) => r.result === 'TP').length;
  const losses = rows.filter((r) => r.result === 'SL').length;
  const totalPnl = sumBy(rows, 'pnl');

  return {
    title: 'Trades reales',
    subtitle: 'Trading Journal',
    meta: baseMeta(filters),
    sheets: [
      {
        name: 'Trades',
        columns: [
          COL('date', 'Fecha', 'date'),
          COL('asset', 'Activo'),
          COL('direction', 'Dirección'),
          COL('result', 'Resultado'),
          COL('pnl', 'PnL', 'money'),
          COL('account', 'Cuenta'),
          COL('strategy', 'Estrategia'),
          COL('entry_time', 'Entrada'),
          COL('exit_time', 'Salida'),
          COL('lot', 'Lotaje', 'number'),
          COL('commission', 'Comisión', 'money'),
          COL('metrics', 'Métricas'),
          COL('notes', 'Notas'),
        ],
        rows,
        totals: { pnl: totalPnl, commission: sumBy(rows, 'commission') },
        summary: [
          { label: 'Operaciones', value: String(rows.length) },
          { label: 'TP / SL', value: `${wins} / ${losses}` },
          {
            label: 'Ratio de aciertos',
            value: rows.length ? `${((wins / rows.length) * 100).toFixed(1)} %` : '—',
          },
          { label: 'PnL total', value: `${totalPnl.toFixed(2)} €` },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------- Estadísticas */

/**
 * @param {object} params
 * @param {Array}  params.kpis          [{ label, value }] tal cual se ven en pantalla
 * @param {Array}  params.byAccount     [{ name, trades, pnl, winrate }]
 * @param {Array}  params.byStrategy    [{ name, trades, pnl, winrate }]
 * @param {object} params.direction     resultado de buildDirectionStats()
 * @param {Array}  params.metricGroups  resultado de buildStrategyMetricStats()
 */
function buildStatsReport({
  kpis = [],
  byAccount = [],
  byStrategy = [],
  direction = null,
  metricGroups = [],
  filters = {},
} = {}) {
  const groupColumns = [
    COL('name', 'Nombre'),
    COL('trades', 'Operaciones', 'number'),
    COL('pnl', 'PnL', 'money'),
    COL('winrate', 'Acierto', 'percent'),
  ];

  const sheets = [
    {
      name: 'Resumen',
      columns: [COL('label', 'Métrica'), COL('value', 'Valor')],
      rows: kpis.map((k) => ({ label: k.label, value: k.value })),
      totals: null,
    },
    {
      name: 'Por cuenta',
      columns: groupColumns,
      rows: byAccount,
      totals: { trades: sumBy(byAccount, 'trades'), pnl: sumBy(byAccount, 'pnl') },
    },
    {
      name: 'Por estrategia',
      columns: groupColumns,
      rows: byStrategy,
      totals: { trades: sumBy(byStrategy, 'trades'), pnl: sumBy(byStrategy, 'pnl') },
    },
  ];

  if (direction) {
    const line = (label, s) => ({
      name: label,
      trades: s.n,
      pnl: s.pnl,
      winrate: s.winrate == null ? null : s.winrate,
      avg: s.avgPnl,
    });
    sheets.push({
      name: 'Compra vs Venta',
      columns: [...groupColumns, COL('avg', 'Media por op.', 'money')],
      rows: [
        line('Compras (Long)', direction.long),
        line('Ventas (Short)', direction.short),
        line('Sin dirección', direction.unknown),
      ],
      totals: null,
    });
  }

  if (metricGroups.length) {
    const rows = [];
    metricGroups.forEach((group) => {
      group.rows.forEach((row) => {
        rows.push({
          strategy: group.strategy,
          metric: row.metric,
          yes_n: row.yes.n,
          yes_pnl: row.yes.pnl,
          yes_avg: row.yes.n ? row.yes.avgPnl : null,
          no_n: row.no.n,
          no_pnl: row.no.pnl,
          no_avg: row.no.n ? row.no.avgPnl : null,
          // La diferencia se da por operación, no en total: comparar totales engaña cuando un
          // grupo tiene más operaciones que el otro (ver tradeBreakdownStats.js).
          diff: row.evaluated ? row.avgPnlDiff : null,
          verdict: !row.evaluated
            ? 'Sin datos todavía'
            : row.comparable
              ? row.avgPnlDiff > 0
                ? 'Mejor cumpliéndola'
                : row.avgPnlDiff < 0
                  ? 'Peor cumpliéndola'
                  : 'Sin diferencia'
              : row.yes.n
                ? 'Siempre la cumples'
                : 'Nunca la has cumplido',
        });
      });
    });
    sheets.push({
      name: 'Métricas',
      columns: [
        COL('strategy', 'Estrategia'),
        COL('metric', 'Métrica'),
        COL('yes_n', 'Ops cumpliéndola', 'number'),
        COL('yes_pnl', 'PnL cumpliéndola', 'money'),
        COL('yes_avg', 'Media/op cumpliéndola', 'money'),
        COL('no_n', 'Ops sin cumplirla', 'number'),
        COL('no_pnl', 'PnL sin cumplirla', 'money'),
        COL('no_avg', 'Media/op sin cumplirla', 'money'),
        COL('diff', 'Diferencia por operación', 'money'),
        COL('verdict', 'Conclusión'),
      ],
      rows,
      totals: null,
    });
  }

  return {
    title: 'Estadísticas',
    subtitle: 'Trading Journal',
    meta: baseMeta(filters),
    sheets,
  };
}

/* --------------------------------------------------------------- Backtesting */

function buildBacktestingReport({ trades = [], sessions = [], filters = {} } = {}) {
  const sessionNameById = new Map(
    (sessions || []).map((s) => [String(s.id), s.name || `Sesión ${s.id}`])
  );

  const rows = [...trades]
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .map((t) => ({
      date: toEsDate(t.date),
      session: sessionNameById.get(String(t.session_id)) || '',
      asset: t.asset || '',
      direction: DIRECTION_LABEL[String(t.direction || '').toUpperCase()] || '',
      result: t.result || '',
      pnl: num(t.pnl),
      rr_planned: num(t.rr_planned),
      rr_result: num(t.rr_result),
      risk: num(t.risk_eur),
      entry_time: t.entry_time || '',
      exit_time: t.exit_time || '',
      strategy: t.strategy || '',
      notes: t.notes || '',
    }));

  const wins = rows.filter((r) => r.result === 'TP').length;
  const losses = rows.filter((r) => r.result === 'SL').length;
  const totalPnl = sumBy(rows, 'pnl');

  const sheets = [
    {
      name: 'Operaciones',
      columns: [
        COL('date', 'Fecha', 'date'),
        COL('session', 'Sesión'),
        COL('asset', 'Activo'),
        COL('direction', 'Dirección'),
        COL('result', 'Resultado'),
        COL('pnl', 'PnL', 'money'),
        COL('rr_planned', 'RR previsto', 'number'),
        COL('rr_result', 'R obtenida', 'number'),
        COL('risk', 'Riesgo', 'money'),
        COL('entry_time', 'Entrada'),
        COL('exit_time', 'Salida'),
        COL('strategy', 'Estrategia'),
        COL('notes', 'Notas'),
      ],
      rows,
      totals: { pnl: totalPnl, rr_result: sumBy(rows, 'rr_result') },
      summary: [
        { label: 'Operaciones', value: String(rows.length) },
        { label: 'TP / SL', value: `${wins} / ${losses}` },
        {
          label: 'Ratio de aciertos',
          value: rows.length ? `${((wins / rows.length) * 100).toFixed(1)} %` : '—',
        },
        { label: 'PnL total', value: `${totalPnl.toFixed(2)} €` },
        { label: 'R acumulada', value: sumBy(rows, 'rr_result').toFixed(2) },
      ],
    },
  ];

  if (sessions.length) {
    sheets.push({
      name: 'Sesiones',
      columns: [
        COL('name', 'Nombre'),
        COL('asset', 'Pares'),
        COL('strategy', 'Estrategia'),
        COL('start_date', 'Desde', 'date'),
        COL('end_date', 'Hasta', 'date'),
        COL('capital', 'Capital', 'money'),
        COL('status', 'Estado'),
        COL('trades', 'Operaciones', 'number'),
        COL('pnl', 'PnL', 'money'),
      ],
      rows: sessions.map((s) => {
        const own = trades.filter((t) => String(t.session_id) === String(s.id));
        return {
          name: s.name || '',
          asset: s.asset || '',
          strategy: s.strategy || '',
          start_date: toEsDate(s.start_date),
          end_date: toEsDate(s.end_date),
          capital: num(s.account_capital),
          status: s.status || '',
          trades: own.length,
          pnl: sumBy(own, 'pnl'),
        };
      }),
      totals: null,
    });
  }

  return {
    title: 'Backtesting',
    subtitle: 'Trading Journal',
    meta: baseMeta(filters),
    sheets,
  };
}

module.exports = {
  toEsDate,
  buildFilterMeta,
  buildManagementReport,
  buildTradesReport,
  buildStatsReport,
  buildBacktestingReport,
};
