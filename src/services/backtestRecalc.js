/**
 * Recálculo de PnL y R de las operaciones de backtesting.
 *
 * Por qué hace falta: el PnL se calcula al crear cada operación y se guarda tal cual. Si después
 * cambias el RR de la estrategia o el capital de la sesión, las operaciones antiguas se quedan
 * con los números viejos. Esto permite ponerlas al día.
 *
 * Reglas (las mismas que usa el formulario al crear un trade):
 *   riesgo = capital de la sesión × riesgo% de la estrategia   (o el riesgo fijo en €)
 *   TP  →  pnl = +riesgo × RR      R = +RR
 *   SL  →  pnl = −riesgo           R = −1
 *   BE  →  pnl = 0                 R = 0
 *
 * Es una función pura que NO escribe nada: devuelve la lista de cambios para poder enseñarlos
 * antes de aplicar. Reescribir PnL a ciegas es justo lo que no se debe hacer con datos ajenos.
 */

/** Riesgo en € de un trade según su estrategia y el capital de su sesión. 0 si no se puede saber. */
function resolveRiskEuro(trade, { strategyByName, sessionById }) {
  const strategy = strategyByName.get(String(trade?.strategy || '').trim());
  if (!strategy) return 0;

  const unit =
    String(strategy.risk_unit ?? strategy.riskUnit ?? 'eur').toLowerCase() === 'percent'
      ? 'percent'
      : 'eur';
  const value = Number(
    strategy.risk_value ?? strategy.riskValue ?? strategy.risk ?? strategy.risk_per_trade ?? 0
  );
  if (!value || value <= 0) return 0;

  if (unit !== 'percent') return value;

  const session = sessionById.get(String(trade?.session_id));
  const capital = Number(session?.account_capital ?? 0);
  if (!capital || capital <= 0) return 0;
  return capital * (value / 100);
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

/**
 * @returns {{changes: Array, skipped: Array, total: number}}
 *   changes: [{ id, date, asset, strategy, result, from:{pnl,r}, to:{pnl,r}, risk }]
 *   skipped: operaciones que no se pueden recalcular, con el motivo
 */
function planBacktestRecalc(trades, strategies, sessions) {
  const strategyByName = new Map(
    (Array.isArray(strategies) ? strategies : [])
      .map((s) => [String(s?.name || '').trim(), s])
      .filter(([name]) => name)
  );
  const sessionById = new Map(
    (Array.isArray(sessions) ? sessions : []).map((s) => [String(s?.id), s])
  );

  const changes = [];
  const skipped = [];

  (Array.isArray(trades) ? trades : []).forEach((trade) => {
    const result = String(trade?.result || '').toUpperCase();
    const strategyName = String(trade?.strategy || '').trim();
    const strategy = strategyByName.get(strategyName);

    if (!strategyName || !strategy) {
      skipped.push({ trade, reason: 'Sin estrategia asociada' });
      return;
    }

    const risk = resolveRiskEuro(trade, { strategyByName, sessionById });
    if (!risk) {
      skipped.push({ trade, reason: 'No se puede calcular el riesgo (falta capital o riesgo)' });
      return;
    }

    const rr = Number(strategy.rr) > 0 ? Number(strategy.rr) : null;
    if (rr == null && result === 'TP') {
      skipped.push({ trade, reason: 'La estrategia no tiene RR objetivo' });
      return;
    }

    let pnl;
    let r;
    if (result === 'TP') {
      pnl = round2(risk * rr);
      r = round2(rr);
    } else if (result === 'SL') {
      pnl = round2(-risk);
      r = -1;
    } else {
      pnl = 0;
      r = 0;
    }

    const currentPnl = round2(trade?.pnl);
    const currentR = round2(trade?.rr_result);
    if (currentPnl === pnl && currentR === r) return;

    changes.push({
      id: trade.id,
      date: String(trade.date || '').slice(0, 10),
      asset: trade.asset || '',
      strategy: strategyName,
      result,
      risk: round2(risk),
      from: { pnl: currentPnl, r: currentR },
      to: { pnl, r },
    });
  });

  return { changes, skipped, total: (trades || []).length };
}

module.exports = { planBacktestRecalc, resolveRiskEuro };
