/**
 * Simulador de challenges de prop firm a partir de los resultados de un backtest.
 *
 * Método: simulación de Monte Carlo sobre la distribución de R **observada** en el backtest.
 * En cada operación simulada se extrae al azar (con reemplazo) una R de las que realmente
 * ocurrieron y se convierte a % de la cuenta multiplicándola por el riesgo por operación de esa
 * fase. Se remuestrea en vez de asumir una distribución teórica porque la forma real de los
 * resultados (rachas de BE, algún outlier) no se parece a una normal y asumirla daría números
 * bonitos pero falsos.
 *
 * Una fase termina de tres formas: se alcanza el objetivo, se toca la pérdida máxima, o se agota
 * el límite de operaciones sin resolver. La pérdida máxima es imprescindible: sin ella, con
 * cualquier esperanza positiva la probabilidad de aprobar tiende a 100% y el dato no diría nada.
 *
 * Limitaciones que el resultado NO puede ocultar:
 *   - Asume que las operaciones futuras se parecen a las del backtest y son independientes.
 *   - No modela el límite de pérdida diaria ni el mínimo de días operados de cada prop.
 *   - Con pocas operaciones en el backtest, la distribución de partida es pobre y el resultado
 *     es orientativo.
 *
 * La función `simulateChallenge` es autocontenida a propósito: el visor compartido la inserta
 * tal cual con toString(), así que la app y el enlace calculan siempre con el mismo código.
 */

function simulateChallenge(rValues, phases, options) {
  var opts = options || {};
  var runs = opts.runs || 2000;
  var maxTradesPerPhase = opts.maxTradesPerPhase || 1000;

  var rs = (rValues || []).map(Number).filter(function (v) {
    return isFinite(v);
  });
  if (!rs.length || !phases || !phases.length) return null;

  // Generador con semilla: dos ejecuciones seguidas con los mismos datos deben dar el mismo
  // resultado, si no el usuario ve la probabilidad bailando y deja de fiarse.
  var seed = 123456789;
  function rnd() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  var phaseStats = phases.map(function () {
    return { passed: 0, failed: 0, unresolved: 0, trades: [] };
  });
  var fullPass = 0;
  var totalTrades = [];

  for (var run = 0; run < runs; run += 1) {
    var alive = true;
    var tradesThisRun = 0;

    for (var p = 0; p < phases.length && alive; p += 1) {
      var target = Number(phases[p].target) || 0;
      var risk = Number(phases[p].risk) || 0;
      var maxDd = Math.abs(Number(phases[p].maxDrawdown) || 0);

      if (target <= 0 || risk <= 0) {
        phaseStats[p].unresolved += 1;
        alive = false;
        break;
      }

      var equity = 0;
      var peak = 0;
      var n = 0;
      var resolved = false;

      while (n < maxTradesPerPhase) {
        equity += rs[Math.floor(rnd() * rs.length)] * risk;
        n += 1;
        if (equity > peak) peak = equity;

        // La pérdida máxima se mide desde el pico, que es como la aplican las props (trailing).
        if (maxDd > 0 && peak - equity >= maxDd) {
          phaseStats[p].failed += 1;
          resolved = true;
          alive = false;
          break;
        }
        if (equity >= target) {
          phaseStats[p].passed += 1;
          phaseStats[p].trades.push(n);
          resolved = true;
          break;
        }
      }

      tradesThisRun += n;
      if (!resolved) {
        phaseStats[p].unresolved += 1;
        alive = false;
      }
    }

    if (alive) {
      fullPass += 1;
      totalTrades.push(tradesThisRun);
    }
  }

  function median(list) {
    if (!list.length) return null;
    var sorted = list.slice().sort(function (a, b) {
      return a - b;
    });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function percentile(list, q) {
    if (!list.length) return null;
    var sorted = list.slice().sort(function (a, b) {
      return a - b;
    });
    var idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
    return sorted[idx];
  }

  return {
    runs: runs,
    sampleSize: rs.length,
    // Probabilidad de superar cada fase CONDICIONADA a haber llegado a ella.
    phases: phaseStats.map(function (st, i) {
      var reached = st.passed + st.failed + st.unresolved;
      return {
        index: i + 1,
        reached: reached,
        passRate: reached ? (st.passed / reached) * 100 : null,
        medianTrades: median(st.trades),
        p90Trades: percentile(st.trades, 0.9),
      };
    }),
    overallPassRate: (fullPass / runs) * 100,
    medianTradesTotal: median(totalTrades),
    p90TradesTotal: percentile(totalTrades, 0.9),
  };
}

/** Operaciones por día operado en el backtest, para traducir operaciones a tiempo. */
function tradesPerTradingDay(trades) {
  var list = (trades || []).filter(function (t) {
    return t && t.date;
  });
  if (!list.length) return 0;
  var days = {};
  list.forEach(function (t) {
    days[String(t.date).slice(0, 10)] = true;
  });
  var n = Object.keys(days).length;
  return n ? list.length / n : 0;
}

/** Configuración por defecto: un challenge de 2 fases al uso (8% y 5%, 10% de pérdida máxima). */
function defaultChallengeConfig() {
  return {
    phases: [
      { target: 8, risk: 1, maxDrawdown: 10 },
      { target: 5, risk: 1, maxDrawdown: 10 },
    ],
  };
}

function normalizeChallengeConfig(raw) {
  var cfg = raw && typeof raw === 'object' ? raw : {};
  var phases = Array.isArray(cfg.phases) ? cfg.phases : [];
  if (!phases.length) return defaultChallengeConfig();
  return {
    phases: phases.slice(0, 3).map(function (p) {
      return {
        target: Number(p && p.target) || 0,
        risk: Number(p && p.risk) || 0,
        maxDrawdown: Number(p && p.maxDrawdown) || 0,
      };
    }),
  };
}

module.exports = {
  simulateChallenge,
  tradesPerTradingDay,
  defaultChallengeConfig,
  normalizeChallengeConfig,
};
