/**
 * La misma operación tomada en varias cuentas (trades REAL).
 *
 * Un setup se coge muchas veces en dos o tres cuentas a la vez. Apuntarlo como dos operaciones
 * duplicaría el winrate y el número de operaciones, que es justo lo que no se quiere medir dos
 * veces: la decisión fue una sola. Pero el dinero sí es distinto en cada cuenta, porque cada una
 * tiene su tamaño, su spread y sus comisiones.
 *
 * La solución es una sola operación con una lista de ejecuciones, una por cuenta, cada una con su
 * PnL y su lotaje. La estadística cuenta la operación una vez; el dinero se suma, y cada cuenta
 * solo se lleva lo suyo.
 *
 * Un trade sin ejecuciones -es decir, todos los que ya existían- se comporta exactamente igual
 * que antes: su cuenta es `trade.account` y su dinero es `trade.pnl`. Nada de lo ya guardado
 * necesita convertirse.
 *
 * @module accountExecutions
 */

function parseNumericOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Lista de ejecuciones a partir de lo que venga: texto JSON de SQLite, jsonb de Supabase, array
 * ya montado o basura. Nunca lanza; ante algo ilegible devuelve lista vacía, que equivale a «esta
 * operación va en una sola cuenta».
 *
 * Se descarta lo que no tenga nombre de cuenta: una ejecución sin cuenta no se puede atribuir a
 * nadie, y colarla haría que el dinero no cuadrase con ninguna cuenta.
 *
 * @param {unknown} raw
 * @returns {Array<{account:string,pnl:number,lotaje:number|null}>}
 */
function parseAccountExecutions(raw) {
  let list = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof list === 'string' && list.trim()) {
      try {
        list = JSON.parse(list);
      } catch {
        return [];
      }
    } else {
      break;
    }
  }
  if (list && typeof list === 'object' && !Array.isArray(list)) list = Object.values(list);
  if (!Array.isArray(list)) return [];

  const out = [];
  const vistas = new Set();
  list.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const account = String(item.account ?? item.cuenta ?? '').trim();
    if (!account) return;
    // La misma cuenta dos veces en la misma operación no significa nada y descuadraría su saldo.
    const clave = account.toLowerCase();
    if (vistas.has(clave)) return;
    vistas.add(clave);
    const lot = parseNumericOrNull(item.lotaje ?? item.lot_size ?? item.lotSize);
    out.push({
      account,
      pnl: parseNumericOrNull(item.pnl) ?? 0,
      lotaje: lot,
    });
  });
  return out;
}

function sumExecutionsPnl(executions) {
  return parseAccountExecutions(executions).reduce((sum, e) => sum + (Number(e.pnl) || 0), 0);
}

function sumExecutionsLot(executions) {
  return parseAccountExecutions(executions).reduce(
    (sum, e) => (e.lotaje != null && Number.isFinite(Number(e.lotaje)) ? sum + Number(e.lotaje) : sum),
    0
  );
}

/** Solo se considera repartida entre cuentas a partir de dos: con una, no hay nada que repartir. */
function isMultiAccount(trade) {
  return parseAccountExecutions(trade?.account_executions ?? trade?.accountExecutions).length >= 2;
}

/**
 * Todas las cuentas en las que está esta operación.
 *
 * Sirve para los filtros: una operación tomada en tres cuentas tiene que aparecer al filtrar por
 * cualquiera de las tres, no solo por la primera.
 */
function tradeAccountNames(trade) {
  const ejecuciones = parseAccountExecutions(trade?.account_executions ?? trade?.accountExecutions);
  if (ejecuciones.length) return ejecuciones.map((e) => e.account);
  const suelta = String(trade?.account ?? '').trim();
  return suelta ? [suelta] : [];
}

/** ¿Esta operación está en esa cuenta? Comparación por nombre, sin distinguir mayúsculas. */
function tradeMatchesAccount(trade, accountName) {
  const buscado = String(accountName ?? '').trim().toLowerCase();
  if (!buscado) return false;
  return tradeAccountNames(trade).some((n) => n.toLowerCase() === buscado);
}

/**
 * Dinero que le toca a una cuenta concreta.
 *
 * Es la pieza importante: el saldo de una cuenta no puede usar el PnL total de la operación,
 * porque ese total es la suma de todas las cuentas. Si lo hiciera, una operación en tres cuentas
 * triplicaría el dinero de cada una.
 *
 * @param {object} trade
 * @param {string} accountName
 * @param {{ net?: boolean }} [opts] `net` descuenta la comisión, que se guarda para la operación
 *   entera; se reparte a partes iguales entre las cuentas en las que se tomó.
 */
function tradePnlForAccount(trade, accountName, opts = {}) {
  const ejecuciones = parseAccountExecutions(trade?.account_executions ?? trade?.accountExecutions);
  const buscado = String(accountName ?? '').trim().toLowerCase();

  if (!ejecuciones.length) {
    if (!buscado || String(trade?.account ?? '').trim().toLowerCase() !== buscado) return 0;
    const bruto = Number(trade?.pnl) || 0;
    if (!opts.net) return bruto;
    const neto = Number(trade?.pnl_net);
    return Number.isFinite(neto) ? neto : bruto - (Number(trade?.commission) || 0);
  }

  const suya = ejecuciones.find((e) => e.account.toLowerCase() === buscado);
  if (!suya) return 0;
  const bruto = Number(suya.pnl) || 0;
  if (!opts.net) return bruto;
  const comision = Number(trade?.commission) || 0;
  return bruto - comision / ejecuciones.length;
}

/** Lotaje de una cuenta concreta. Sin ejecuciones, el de la operación entera. */
function tradeLotForAccount(trade, accountName) {
  const ejecuciones = parseAccountExecutions(trade?.account_executions ?? trade?.accountExecutions);
  const buscado = String(accountName ?? '').trim().toLowerCase();
  if (!ejecuciones.length) {
    if (!buscado || String(trade?.account ?? '').trim().toLowerCase() !== buscado) return 0;
    return Number(trade?.lotaje) || 0;
  }
  const suya = ejecuciones.find((e) => e.account.toLowerCase() === buscado);
  return suya && suya.lotaje != null ? Number(suya.lotaje) || 0 : 0;
}

/**
 * Deja la lista lista para guardar.
 *
 * Con menos de dos cuentas devuelve lista vacía a propósito: una operación en una sola cuenta se
 * guarda como siempre (columna `account`), y así no se crean dos maneras distintas de decir lo
 * mismo. Solo se guarda la lista cuando de verdad hay reparto.
 */
function accountExecutionsForStorage(executions) {
  const list = parseAccountExecutions(executions);
  return list.length >= 2 ? list : [];
}

function serializeAccountExecutionsForStorage(executions) {
  return JSON.stringify(accountExecutionsForStorage(executions));
}

/**
 * Comprobaciones antes de guardar. Que haya cuenta y que los números sean números; el PnL en cero
 * es válido (una operación puede cerrarse a cero en una cuenta y no en otra).
 */
function validateAccountExecutions(executions) {
  const list = parseAccountExecutions(executions);
  if (list.length === 1) return { valid: false, error: 'NEEDS_TWO', executions: list };
  for (const e of list) {
    if (!Number.isFinite(Number(e.pnl))) return { valid: false, error: 'INVALID_PNL', executions: list };
    if (e.lotaje != null && !Number.isFinite(Number(e.lotaje))) {
      return { valid: false, error: 'INVALID_LOT', executions: list };
    }
  }
  return {
    valid: true,
    executions: list,
    totalPnl: sumExecutionsPnl(list),
    totalLot: sumExecutionsLot(list),
  };
}

/**
 * Deja el trade coherente para la interfaz y la caché: cuando hay ejecuciones, el PnL y el lotaje
 * de la operación son la suma de las cuentas, y `account` apunta a la primera para que todo lo
 * que ya leía esa columna siga encontrando algo con sentido.
 */
function hydrateTradeAccountFields(trade = {}) {
  const ejecuciones = parseAccountExecutions(trade.account_executions ?? trade.accountExecutions);
  if (ejecuciones.length < 2) {
    return { ...trade, account_executions: [], accountExecutions: [] };
  }
  const totalLot = sumExecutionsLot(ejecuciones);
  return {
    ...trade,
    account: String(trade.account || '').trim() || ejecuciones[0].account,
    account_executions: ejecuciones,
    accountExecutions: ejecuciones,
    pnl: sumExecutionsPnl(ejecuciones),
    lotaje: totalLot > 0 ? totalLot : Number(trade.lotaje ?? 0) || 0,
  };
}

module.exports = {
  parseAccountExecutions,
  sumExecutionsPnl,
  sumExecutionsLot,
  isMultiAccount,
  tradeAccountNames,
  tradeMatchesAccount,
  tradePnlForAccount,
  tradeLotForAccount,
  accountExecutionsForStorage,
  serializeAccountExecutionsForStorage,
  validateAccountExecutions,
  hydrateTradeAccountFields,
};
