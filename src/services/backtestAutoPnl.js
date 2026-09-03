/**
 * El importe que debería dar una operación de backtesting según su estrategia.
 *
 * La cuenta es sencilla: el riesgo es lo que se pierde en un SL, y en un TP se gana ese riesgo
 * multiplicado por el RR objetivo. Con 50.000€ de capital, 1% de riesgo y RR 0,6, un SL son 500€
 * y un TP son 300€.
 *
 * Lo que no era sencillo es enterarse de por qué a veces no salía ningún número. El cálculo
 * necesita cuatro datos -riesgo, unidad, capital y RR- y cualquiera de ellos a cero lo dejaba en
 * nada, sin decir cuál faltaba: el campo se quedaba vacío y no había forma de saber si el
 * problema era la estrategia, la sesión o el propio formulario. Por eso esta función no devuelve
 * un número suelto sino también el motivo, para que la interfaz pueda decir qué falta.
 *
 * @module backtestAutoPnl
 */

/** Motivos por los que no se puede calcular. Se traducen en la interfaz, no aquí. */
const MOTIVOS = {
  OK: 'ok',
  SIN_RESULTADO: 'sin-resultado',
  SIN_RIESGO: 'sin-riesgo',
  SIN_CAPITAL: 'sin-capital',
  SIN_RR: 'sin-rr',
};

function numero(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {object} params
 * @param {string} params.result 'TP', 'SL', 'BE'...
 * @param {number|string} params.riskValue el riesgo de la estrategia, en su unidad
 * @param {string} params.riskUnit 'percent' o 'eur'
 * @param {number|string} params.capital capital de la sesión; solo hace falta si el riesgo va en %
 * @param {number|string} params.rr RR objetivo de la estrategia; solo hace falta para el TP
 * @param {string} [params.mode] 'money' (por defecto) o 'percent', según cómo se escriba el PnL
 * @returns {{amount:number, riskEuro:number, rr:number, reason:string}}
 */
function computeAutoPnl({ result, riskValue, riskUnit, capital, rr, mode = 'money' } = {}) {
  const vacio = { amount: 0, riskEuro: 0, rr: 0, reason: MOTIVOS.SIN_RESULTADO };

  const res = String(result || '').trim().toUpperCase();
  // Un BE es cero de verdad, no un cálculo que falta: no hay nada que rellenar ni que explicar.
  if (res !== 'TP' && res !== 'SL') return vacio;

  const riesgo = numero(riskValue);
  if (riesgo <= 0) return { ...vacio, reason: MOTIVOS.SIN_RIESGO };

  const esPorcentaje = String(riskUnit || '').toLowerCase() === 'percent';
  const cap = numero(capital);
  // El riesgo en % no significa nada sin saber sobre cuánto: es el caso que más despista, porque
  // la estrategia parece bien configurada y lo que falta es el capital de la sesión.
  if (esPorcentaje && cap <= 0) return { ...vacio, reason: MOTIVOS.SIN_CAPITAL };

  const riskEuro = esPorcentaje ? cap * (riesgo / 100) : riesgo;
  if (riskEuro <= 0) return { ...vacio, reason: MOTIVOS.SIN_RIESGO };

  const ratio = numero(rr);
  // El RR solo hace falta para el TP: el SL es el riesgo, pase lo que pase.
  if (res === 'TP' && ratio <= 0) return { ...vacio, riskEuro, reason: MOTIVOS.SIN_RR };

  const importeEuro = res === 'TP' ? riskEuro * ratio : riskEuro;

  // Si el PnL se escribe en %, se devuelve en % del capital. Sin capital no hay conversión
  // posible, aunque el riesgo estuviera en euros.
  if (String(mode) === 'percent') {
    if (cap <= 0) return { ...vacio, riskEuro, rr: ratio, reason: MOTIVOS.SIN_CAPITAL };
    return { amount: (importeEuro / cap) * 100, riskEuro, rr: ratio, reason: MOTIVOS.OK };
  }

  return { amount: importeEuro, riskEuro, rr: ratio, reason: MOTIVOS.OK };
}

module.exports = { computeAutoPnl, MOTIVOS };
