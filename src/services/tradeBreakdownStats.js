/**
 * Desgloses de trades reales por dirección (compra/venta) y por métricas personalizadas
 * de estrategia. Vive en services/ para poder testearse sin DOM y para que Estadísticas y
 * cualquier otra vista partan siempre del mismo cálculo.
 */

/** Acepta objeto, JSON string o null. Nunca lanza. */
function parseTradeMetrics(trade) {
  const raw = trade?.custom_metrics ?? trade?.customMetrics ?? null;
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_err) {
      return {};
    }
  }
  return {};
}

/** Lista de nombres de métricas de una estrategia. Acepta array o JSON string. */
function parseStrategyMetricNames(value) {
  let list = value;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch (_err) {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    const name = String(typeof item === 'string' ? item : item?.name || '').trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push(name);
  });
  return out;
}

function normalizeDirection(trade) {
  const v = String(trade?.direction || '').trim().toUpperCase();
  if (v === 'LONG' || v === 'BUY' || v === 'COMPRA') return 'LONG';
  if (v === 'SHORT' || v === 'SELL' || v === 'VENTA') return 'SHORT';
  return null;
}

/**
 * Resumen de un subconjunto. El winrate excluye BE del numerador pero no del denominador,
 * igual que calculateStats(), para que los números cuadren con el resto de Estadísticas.
 */
function summarizeSubset(trades) {
  const list = Array.isArray(trades) ? trades : [];
  let wins = 0;
  let losses = 0;
  let be = 0;
  let profit = 0;
  let loss = 0;
  list.forEach((trade) => {
    const pnl = Number(trade?.pnl || 0);
    if (trade?.result === 'TP') {
      wins += 1;
      profit += pnl;
    } else if (trade?.result === 'SL') {
      losses += 1;
      loss += Math.abs(pnl);
    } else {
      be += 1;
      if (pnl > 0) profit += pnl;
      if (pnl < 0) loss += Math.abs(pnl);
    }
  });
  const n = list.length;
  return {
    n,
    wins,
    losses,
    be,
    pnl: profit - loss,
    avgPnl: n ? (profit - loss) / n : 0,
    winrate: n ? (wins / n) * 100 : null,
    profitFactor: loss > 0 ? profit / loss : null,
  };
}

/**
 * Compras vs ventas. Los trades sin dirección (anteriores al campo) se devuelven aparte
 * en vez de repartirse, para no ensuciar la comparación.
 */
function buildDirectionStats(trades) {
  const list = Array.isArray(trades) ? trades : [];
  const long = [];
  const short = [];
  const unknown = [];
  list.forEach((trade) => {
    const dir = normalizeDirection(trade);
    if (dir === 'LONG') long.push(trade);
    else if (dir === 'SHORT') short.push(trade);
    else unknown.push(trade);
  });
  const stats = {
    long: summarizeSubset(long),
    short: summarizeSubset(short),
    unknown: summarizeSubset(unknown),
  };
  stats.hasData = stats.long.n > 0 || stats.short.n > 0;
  stats.comparable = stats.long.n > 0 && stats.short.n > 0;
  return stats;
}

/**
 * Análisis por métrica personalizada, agrupado por estrategia. Un trade cuenta en «cumplida»
 * o «no cumplida» solo si la métrica existe en su objeto: si es undefined significa que el
 * trade es anterior a la métrica y no debe contaminar la comparación.
 *
 * Solo salen las estrategias con operaciones entre las recibidas: una estrategia sin ninguna no
 * tiene nada que contar y su tabla saldría entera en blanco.
 */
function buildStrategyMetricStats(trades, strategyByName) {
  const list = Array.isArray(trades) ? trades : [];
  const map =
    strategyByName instanceof Map
      ? strategyByName
      : new Map(
          (Array.isArray(strategyByName) ? strategyByName : []).map((s) => [
            String(s?.name || '').trim(),
            s,
          ])
        );

  const tradesByStrategy = new Map();
  list.forEach((trade) => {
    const name = String(trade?.strategy || '').trim();
    if (!name) return;
    if (!tradesByStrategy.has(name)) tradesByStrategy.set(name, []);
    tradesByStrategy.get(name).push(trade);
  });

  const groups = [];
  map.forEach((strategy, name) => {
    const metrics = parseStrategyMetricNames(strategy?.custom_metrics);
    if (!metrics.length) return;
    const strategyTrades = tradesByStrategy.get(name) || [];
    // Solo las estrategias que aparecen en las operaciones recibidas. Antes se recorrían TODAS
    // las configuradas, así que al filtrar por una estrategia concreta seguían saliendo las
    // demás con «0 trades» y una tabla entera sin una sola cifra. Como las operaciones llegan ya
    // filtradas (estrategia, cuenta, tipo de cuenta, fechas), mirar quién tiene operaciones es
    // exactamente respetar todos esos filtros a la vez, sin tener que consultar ninguno.
    if (!strategyTrades.length) return;
    const rows = metrics.map((metric) => {
      const yes = [];
      const no = [];
      strategyTrades.forEach((trade) => {
        const value = parseTradeMetrics(trade)[metric];
        if (value === true) yes.push(trade);
        else if (value === false) no.push(trade);
      });
      const yesStats = summarizeSubset(yes);
      const noStats = summarizeSubset(no);
      return {
        metric,
        yes: yesStats,
        no: noStats,
        evaluated: yesStats.n + noStats.n,
        comparable: yesStats.n > 0 && noStats.n > 0,
        // Diferencia de totales. NO sirve para comparar: si cumples la métrica en 4 operaciones
        // y no la cumples en 2, el primer grupo suma más dinero por tener el doble de
        // operaciones, no por la métrica. Se conserva porque la exportación ya lo usaba.
        pnlDiff: yesStats.pnl - noStats.pnl,
        // Esta es la que sí se puede comparar: cuánto deja de media CADA operación en un grupo
        // frente al otro. Al dividir entre el número de operaciones, el tamaño de los grupos
        // deja de influir.
        avgPnlDiff: yesStats.avgPnl - noStats.avgPnl,
      };
    });
    groups.push({ strategy: name, trades: strategyTrades.length, rows });
  });

  groups.sort((a, b) => a.strategy.localeCompare(b.strategy));
  return groups;
}

module.exports = {
  parseTradeMetrics,
  parseStrategyMetricNames,
  normalizeDirection,
  summarizeSubset,
  buildDirectionStats,
  buildStrategyMetricStats,
};
