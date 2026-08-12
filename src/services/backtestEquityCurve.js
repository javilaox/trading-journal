/**
 * Curva de crecimiento del capital de un backtest.
 *
 * Recibe operaciones ya reducidas a `{ date, entry_time, id, pnl }` para que el cálculo no
 * dependa de cómo la app resuelva el PnL (riesgo por estrategia, comisiones, etc.): aquí solo se
 * acumula.
 *
 * Detalles que cambian el dibujo y conviene tener claros:
 *
 *   - **Orden cronológico**, no el de la tabla. Igual que en las rachas: una curva construida en
 *     el orden en que estén los datos en pantalla no significa nada.
 *   - **Se parte del capital de la sesión** cuando se conoce, para que el eje hable en dinero
 *     real. Si hay varias sesiones seleccionadas (capitales distintos) se parte de 0 y la curva
 *     pasa a ser PnL acumulado, que es lo único honesto que se puede dibujar ahí.
 *   - El **drawdown máximo** se mide desde el pico anterior, en euros y en porcentaje sobre ese
 *     pico. Es la caída que habrías tenido que aguantar, que es la pregunta real detrás de la
 *     curva.
 */

function buildEquityCurve(trades, options) {
  const opts = options || {};
  const start = Number(opts.startingCapital) || 0;

  const list = (Array.isArray(trades) ? trades : []).filter(Boolean);
  const sorted = list.slice().sort((a, b) => {
    const ka = `${String(a.date || '').slice(0, 10)} ${String(a.entry_time || '99:99').slice(0, 5)}`;
    const kb = `${String(b.date || '').slice(0, 10)} ${String(b.entry_time || '99:99').slice(0, 5)}`;
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  const points = [{ index: 0, date: null, equity: start, pnl: 0 }];
  let equity = start;
  let peak = start;
  let maxDd = 0;
  let maxDdPct = 0;
  let peakAtMaxDd = start;

  sorted.forEach((trade, i) => {
    const pnl = Number(trade.pnl) || 0;
    equity += pnl;
    points.push({ index: i + 1, date: String(trade.date || '').slice(0, 10), equity, pnl });

    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) {
      maxDd = dd;
      peakAtMaxDd = peak;
      // El porcentaje solo tiene sentido si hay un capital de referencia por encima de cero.
      maxDdPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  });

  return {
    points,
    startingCapital: start,
    finalEquity: equity,
    peakEquity: peak,
    maxDrawdown: maxDd,
    maxDrawdownPct: maxDdPct,
    peakAtMaxDrawdown: peakAtMaxDd,
    totalPnl: equity - start,
    trades: sorted.length,
  };
}

module.exports = { buildEquityCurve };
