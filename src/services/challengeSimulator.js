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
 * El motor simula **días**, no solo operaciones, porque dos reglas muy reales dependen del día:
 *
 *   1. **Regla de consistencia**: el mejor día no puede superar cierto % del objetivo (si el
 *      objetivo son 3.000 € y la consistencia es del 50%, ningún día puede dar más de 1.500 €).
 *      Eso obliga a repartir el challenge en varios días y a dejar de operar cuando ya has
 *      ganado bastante, aunque el sistema siguiera dando señales. No es un detalle cosmético:
 *      alarga el challenge y cambia la probabilidad de pasarlo.
 *
 *   2. **Rotación de cuentas**: con varios challenges comprados se opera uno solo a la vez y se
 *      salta al siguiente en cuanto llega un SL. Las pérdidas se reparten entre todas las
 *      cuentas y las rachas ganadoras se concentran en la que esté en juego, así que cada cuenta
 *      aguanta mejor la pérdida máxima que si se operase una sola hasta quemarla.
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
  var accountCount = Math.max(1, Math.round(Number(opts.accounts) || 1));
  var rotateOnLoss = opts.rotateOnLoss === true && accountCount > 1;
  // Qué hacer cuando la consistencia obliga a parar una cuenta: seguir el día en la siguiente
  // cuenta (por defecto) o dar el día por terminado en todas. Es una decisión real de gestión y
  // no hay una respuesta obvia, por eso se puede comparar.
  var continueOnConsistencyStop = opts.continueOnConsistencyStop !== false;
  // Operaciones por día operado: sin este dato no se pueden simular días y, por tanto, tampoco
  // la regla de consistencia. En ese caso el motor funciona como antes, operación a operación.
  var perDay = Number(opts.tradesPerDay) || 0;
  var dayModel = perDay > 0;
  var maxDays = opts.maxDays || 1500;

  var rs = (rValues || []).map(Number).filter(function (v) {
    return isFinite(v);
  });
  if (!rs.length || !phases || !phases.length) return null;

  var maxR = 0;
  for (var k = 0; k < rs.length; k += 1) if (rs[k] > maxR) maxR = rs[k];

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
  var anyPass = 0;
  var passedPerRun = [];
  var tradesToFirstPass = [];
  var daysToFirstPass = [];
  var consistencyStops = [];

  function newAccount() {
    return {
      phase: 0,
      equity: 0,
      peak: 0,
      state: 'alive',
      phaseTrades: 0,
      dayPnl: 0,
      blockedToday: false,
    };
  }

  for (var run = 0; run < runs; run += 1) {
    var accounts = [];
    for (var a = 0; a < accountCount; a += 1) accounts.push(newAccount());

    var cursor = 0;
    var tradesThisRun = 0;
    var stopsThisRun = 0;
    var firstPassTrades = null;
    var firstPassDays = null;
    var day = 0;

    while (day < maxDays) {
      day += 1;

      var alive = 0;
      for (var i = 0; i < accounts.length; i += 1) {
        accounts[i].dayPnl = 0;
        accounts[i].blockedToday = false;
        if (accounts[i].state === 'alive') alive += 1;
      }
      if (!alive) break;

      // Cuántas operaciones caben hoy. Con 2,4 op/día se opera 2 la mayoría de días y 3 el 40%
      // de ellos, en vez de fingir un ritmo constante que no existe.
      var capacity = dayModel ? Math.floor(perDay) + (rnd() < perDay - Math.floor(perDay) ? 1 : 0) : 1;
      if (dayModel && capacity < 1) capacity = 1;

      for (var slot = 0; slot < capacity; slot += 1) {
        // Se busca la siguiente cuenta operable empezando por la que toca.
        var acc = null;
        for (var hop = 0; hop < accounts.length; hop += 1) {
          var cand = accounts[(cursor + hop) % accounts.length];
          if (cand.state === 'alive' && !cand.blockedToday) {
            acc = cand;
            cursor = (cursor + hop) % accounts.length;
            break;
          }
        }
        if (!acc) break;

        var ph = phases[acc.phase] || {};
        var target = Number(ph.target) || 0;
        var risk = Number(ph.risk) || 0;
        var maxDd = Math.abs(Number(ph.maxDrawdown) || 0);
        var consistency = Math.abs(Number(ph.consistency) || 0);

        if (target <= 0 || risk <= 0) {
          phaseStats[acc.phase].unresolved += 1;
          acc.state = 'failed';
          continue;
        }

        // Tope de consistencia del día, en las mismas unidades que el objetivo (% de cuenta).
        if (dayModel && consistency > 0) {
          var cap = (target * consistency) / 100;
          // Se para el día si ya se ha alcanzado el tope, o si con lo ya ganado la siguiente
          // operación podría rebasarlo. La segunda condición exige haber ganado algo antes: en
          // un día en blanco siempre se opera, si no un tope muy bajo bloquearía el challenge
          // entero en vez de solo repartirlo.
          if (acc.dayPnl >= cap || (acc.dayPnl > 0 && acc.dayPnl + maxR * risk > cap)) {
            acc.blockedToday = true;
            stopsThisRun += 1;

            // Parar en seco: el día se acaba para todas las cuentas. Mañana se sigue donde se
            // dejó. Es lo contrario a aprovechar el resto del día en otra cuenta.
            if (!continueOnConsistencyStop) break;

            slot -= 1; // el hueco del día lo aprovecha otra cuenta, si la hay
            var otherFree = false;
            for (var j = 0; j < accounts.length; j += 1) {
              if (accounts[j].state === 'alive' && !accounts[j].blockedToday) otherFree = true;
            }
            if (!otherFree) break;
            continue;
          }
        }

        var delta = rs[Math.floor(rnd() * rs.length)] * risk;
        acc.equity += delta;
        acc.dayPnl += delta;
        acc.phaseTrades += 1;
        tradesThisRun += 1;
        if (acc.equity > acc.peak) acc.peak = acc.equity;

        // La pérdida máxima se mide desde el pico, que es como la aplican las props (trailing).
        if (maxDd > 0 && acc.peak - acc.equity >= maxDd) {
          phaseStats[acc.phase].failed += 1;
          acc.state = 'failed';
          cursor = (cursor + 1) % accounts.length;
          continue;
        }

        if (acc.equity >= target) {
          phaseStats[acc.phase].passed += 1;
          phaseStats[acc.phase].trades.push(acc.phaseTrades);
          acc.phase += 1;
          if (acc.phase >= phases.length) {
            acc.state = 'passed';
            if (firstPassTrades == null) {
              firstPassTrades = tradesThisRun;
              firstPassDays = day;
            }
            cursor = (cursor + 1) % accounts.length;
          } else {
            acc.equity = 0;
            acc.peak = 0;
            acc.phaseTrades = 0;
          }
          continue;
        }

        if (acc.phaseTrades >= maxTradesPerPhase) {
          phaseStats[acc.phase].unresolved += 1;
          acc.state = 'failed';
          cursor = (cursor + 1) % accounts.length;
          continue;
        }

        if (rotateOnLoss && delta < 0) cursor = (cursor + 1) % accounts.length;
      }
    }

    var passedCount = 0;
    for (var m = 0; m < accounts.length; m += 1) {
      if (accounts[m].state === 'passed') passedCount += 1;
      // Las cuentas que se quedaron a medias al agotar los días cuentan como no resueltas.
      else if (accounts[m].state === 'alive') phaseStats[accounts[m].phase].unresolved += 1;
    }
    passedPerRun.push(passedCount);
    consistencyStops.push(stopsThisRun);
    if (passedCount > 0) {
      anyPass += 1;
      tradesToFirstPass.push(firstPassTrades);
      if (dayModel) daysToFirstPass.push(firstPassDays);
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

  function mean(list) {
    if (!list.length) return 0;
    var s = 0;
    for (var i2 = 0; i2 < list.length; i2 += 1) s += list[i2];
    return s / list.length;
  }

  // Reparto en numeros enteros: que porcentaje de las veces se acaba con 0, 1, 2... challenges
  // pasados. Es lo unico que de verdad puede ocurrir (no existe "medio challenge pasado"), asi
  // que es lo que se enseña; la media queda como dato de apoyo para comparar dos gestiones.
  var distribution = [];
  for (var d = 0; d <= accountCount; d += 1) distribution.push(0);
  passedPerRun.forEach(function (v) {
    distribution[v] += 1;
  });
  var passedDistribution = distribution.map(function (count, k) {
    return { passed: k, pct: runs ? (count / runs) * 100 : 0 };
  });
  var mostLikely = passedDistribution.reduce(function (a, b) {
    return b.pct > a.pct ? b : a;
  }, passedDistribution[0]);

  // Aviso de consistencia imposible: si UNA sola operación ganadora ya supera el tope del día,
  // la regla no se puede cumplir por mucho que se reparta, hay que bajar el riesgo. Sin este
  // aviso la simulación seguiría dando un número razonable para un plan que la prop invalidaría.
  var consistencyIssues = [];
  phases.forEach(function (ph2, idx) {
    var cns = Math.abs(Number(ph2 && ph2.consistency) || 0);
    if (!cns || !dayModel) return;
    var cap2 = ((Number(ph2.target) || 0) * cns) / 100;
    var win = maxR * (Number(ph2.risk) || 0);
    if (cap2 > 0 && win > cap2) {
      consistencyIssues.push({
        index: idx + 1,
        cap: cap2,
        maxWin: win,
        // Riesgo máximo compatible con la regla, para poder decir qué hacer y no solo qué falla.
        suggestedRisk: maxR > 0 ? cap2 / maxR : 0,
      });
    }
  });

  return {
    runs: runs,
    sampleSize: rs.length,
    accounts: accountCount,
    rotateOnLoss: rotateOnLoss,
    continueOnConsistencyStop: continueOnConsistencyStop,
    consistencyIssues: consistencyIssues,
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
    // Con una sola cuenta es "probabilidad de pasar el challenge"; con varias, "probabilidad de
    // pasar al menos uno", que es la pregunta real cuando compras varios.
    overallPassRate: (anyPass / runs) * 100,
    // Pasarlos todos y el reparto por numero entero de challenges pasados.
    passAllRate: passedDistribution[accountCount] ? passedDistribution[accountCount].pct : 0,
    passedDistribution: passedDistribution,
    mostLikelyPassed: mostLikely ? mostLikely.passed : 0,
    mostLikelyPct: mostLikely ? mostLikely.pct : 0,
    avgAccountsPassed: mean(passedPerRun),
    medianTradesTotal: median(tradesToFirstPass),
    p90TradesTotal: percentile(tradesToFirstPass, 0.9),
    medianDaysTotal: dayModel ? median(daysToFirstPass) : null,
    p90DaysTotal: dayModel ? percentile(daysToFirstPass, 0.9) : null,
    avgConsistencyStops: mean(consistencyStops),
  };
}

/**
 * Misma simulación repetida para 1, 2, ... N challenges comprados, y en cada caso con las dos
 * formas de gestionarlos, para responder a "¿me compensa comprar otro?" y "¿rotar sirve de algo?":
 *
 *   - rotando: se salta a la siguiente cuenta en cuanto hay un SL;
 *   - seguidas: se opera una hasta que pasa o se quema, y solo entonces se empieza la siguiente.
 *
 * Devuelve una fila por número de cuentas con ambos resultados al lado.
 */
function compareChallengeAccounts(rValues, phases, options, maxAccounts) {
  var top = Math.max(1, Math.min(10, Math.round(Number(maxAccounts) || 4)));
  var rows = [];
  for (var n = 1; n <= top; n += 1) {
    var made = [null, null];
    for (var mode = 0; mode < 2; mode += 1) {
      var opts = {};
      for (var key in options || {}) opts[key] = options[key];
      opts.accounts = n;
      opts.rotateOnLoss = mode === 0;
      made[mode] = simulateChallenge(rValues, phases, opts);
      if (!made[mode]) return [];
    }
    rows.push({
      accounts: n,
      rotating: {
        anyPassRate: made[0].overallPassRate,
        passAllRate: made[0].passAllRate,
        mostLikelyPassed: made[0].mostLikelyPassed,
        mostLikelyPct: made[0].mostLikelyPct,
        passedDistribution: made[0].passedDistribution,
        avgAccountsPassed: made[0].avgAccountsPassed,
        medianTrades: made[0].medianTradesTotal,
        medianDays: made[0].medianDaysTotal,
      },
      sequential: {
        anyPassRate: made[1].overallPassRate,
        passAllRate: made[1].passAllRate,
        mostLikelyPassed: made[1].mostLikelyPassed,
        mostLikelyPct: made[1].mostLikelyPct,
        passedDistribution: made[1].passedDistribution,
        avgAccountsPassed: made[1].avgAccountsPassed,
        medianTrades: made[1].medianTradesTotal,
        medianDays: made[1].medianDaysTotal,
      },
    });
  }
  return rows;
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
      { target: 8, risk: 1, maxDrawdown: 10, consistency: 0 },
      { target: 5, risk: 1, maxDrawdown: 10, consistency: 0 },
    ],
    accounts: 1,
    continue_on_consistency_stop: true,
  };
}

function normalizeChallengeConfig(raw) {
  var cfg = raw && typeof raw === 'object' ? raw : {};
  var phases = Array.isArray(cfg.phases) ? cfg.phases : [];
  var accounts = Math.max(1, Math.min(10, Math.round(Number(cfg.accounts) || 1)));
  if (!phases.length) {
    var def = defaultChallengeConfig();
    def.accounts = accounts;
    def.continue_on_consistency_stop = cfg.continue_on_consistency_stop !== false;
    return def;
  }
  return {
    // Al tocar el tope de consistencia: seguir el día en la siguiente cuenta (true, por defecto)
    // o dar el día por terminado en todas (false).
    continue_on_consistency_stop: cfg.continue_on_consistency_stop !== false,
    phases: phases.slice(0, 3).map(function (p) {
      return {
        target: Number(p && p.target) || 0,
        risk: Number(p && p.risk) || 0,
        maxDrawdown: Number(p && p.maxDrawdown) || 0,
        // 0 = sin regla de consistencia. Se guarda como % del objetivo de la fase.
        consistency: Number(p && p.consistency) || 0,
      };
    }),
    accounts: accounts,
  };
}

module.exports = {
  simulateChallenge,
  compareChallengeAccounts,
  tradesPerTradingDay,
  defaultChallengeConfig,
  normalizeChallengeConfig,
};
