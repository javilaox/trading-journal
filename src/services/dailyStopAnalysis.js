/**
 * ¿Compensa dejar de operar el día que saltan varios SL?
 *
 * La pregunta es de las que solo se pueden responder mirando lo que ya pasó: se toman los días
 * tal como ocurrieron y se recorta cada uno en el punto donde habría saltado el stop, para
 * comparar el dinero que se llevó de verdad con el que se habría llevado parando.
 *
 * Dos advertencias que la interfaz debe trasladar, porque el número por sí solo engaña:
 *
 *   1. Esto es mirar hacia atrás sobre los mismos datos con los que se decide. Si el umbral que
 *      sale mejor solo afectó a tres días, la diferencia puede ser casualidad y no una regla.
 *   2. Recortar el día supone que las operaciones que venían después habrían ocurrido igual. Es
 *      lo más razonable que se puede suponer, pero no deja de ser un supuesto: en la vida real,
 *      parar cambia también el estado de ánimo con el que se opera al día siguiente.
 *
 * @module dailyStopAnalysis
 */

/** Un SL es un SL; TP, BE y cualquier otra cosa no lo son. */
function isStopLoss(trade) {
  return String(trade?.result || '').trim().toUpperCase() === 'SL';
}

/** Resultado de una operación en las cuatro cestas que interesan al contar lo que se evitó. */
function resultBucket(trade) {
  const r = String(trade?.result || '').trim().toUpperCase();
  if (r === 'SL' || r === 'TP' || r === 'BE') return r.toLowerCase();
  return 'other';
}

/**
 * Orden dentro del día: por hora de entrada y, a igualdad, por el orden en que se guardaron.
 *
 * Es la misma regla que usa el resto de la aplicación, y aquí es imprescindible: el análisis
 * consiste en cortar el día por un punto, así que si el orden no es el real, el corte cae donde
 * no toca. Las operaciones sin hora se van al final, que es donde menos daño hacen.
 */
function sortWithinDay(trades) {
  const hora = (value) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '99:99';
  };
  return [...trades].sort((a, b) => {
    const diff = hora(a?.entry_time).localeCompare(hora(b?.entry_time));
    if (diff !== 0) return diff;
    const na = Number(a?.id);
    const nb = Number(b?.id);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

function groupByDay(trades) {
  const map = new Map();
  (Array.isArray(trades) ? trades : []).forEach((trade) => {
    const day = String(trade?.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(trade);
  });
  const out = new Map();
  [...map.keys()].sort().forEach((day) => out.set(day, sortWithinDay(map.get(day))));
  return out;
}

/**
 * Índice de la operación a partir de la cual ya no se habría operado ese día, o -1 si el stop no
 * habría saltado. La operación que hace saltar el stop SÍ cuenta: el stop se toca al cerrarla.
 *
 * @param {Array} dayTrades operaciones del día, ya ordenadas
 * @param {number} threshold cuántos SL hacen falta
 * @param {boolean} consecutive true = tienen que ser seguidos (un TP o un BE reinicia la cuenta)
 */
function stopIndexForDay(dayTrades, threshold, consecutive) {
  let count = 0;
  for (let i = 0; i < dayTrades.length; i += 1) {
    if (isStopLoss(dayTrades[i])) {
      count += 1;
      if (count >= threshold) return i + 1;
    } else if (consecutive) {
      count = 0;
    }
  }
  return -1;
}

/** Racha de SL seguidos más larga dentro de un mismo día. */
function maxStreakInDay(dayTrades) {
  let max = 0;
  let run = 0;
  dayTrades.forEach((trade) => {
    if (isStopLoss(trade)) {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  });
  return max;
}

/**
 * @param {Array} trades operaciones YA filtradas por quien llama (estrategia, cuenta, fechas...)
 * @param {object} [options]
 * @param {(trade:object)=>number} [options.getPnl] de dónde sale el dinero de cada operación
 * @param {boolean} [options.consecutive] los SL tienen que ser seguidos
 * @param {number} [options.maxThreshold] tope de filas, por si algún día tuvo muchísimos SL
 */
function buildDailyStopAnalysis(trades, options = {}) {
  const getPnl =
    typeof options.getPnl === 'function' ? options.getPnl : (t) => Number(t?.pnl) || 0;
  const consecutive = Boolean(options.consecutive);
  const topeFilas = Number.isFinite(options.maxThreshold) ? Number(options.maxThreshold) : 10;

  const days = groupByDay(trades);
  const vacio = {
    hasData: false,
    days: 0,
    tradedDays: 0,
    totalTrades: 0,
    realPnl: 0,
    maxSlInDay: 0,
    maxSlStreak: 0,
    rows: [],
    best: null,
  };
  if (!days.size) return vacio;

  let realPnl = 0;
  let totalTrades = 0;
  let maxSlInDay = 0;
  let maxSlStreak = 0;
  days.forEach((dayTrades) => {
    totalTrades += dayTrades.length;
    dayTrades.forEach((t) => {
      realPnl += getPnl(t);
    });
    const sl = dayTrades.filter(isStopLoss).length;
    if (sl > maxSlInDay) maxSlInDay = sl;
    const streak = maxStreakInDay(dayTrades);
    if (streak > maxSlStreak) maxSlStreak = streak;
  });

  // Sin ningún SL no hay nada que analizar: parar tras un SL que nunca llega no cambia nada.
  if (maxSlInDay === 0) {
    return { ...vacio, days: days.size, tradedDays: days.size, totalTrades, realPnl };
  }

  // El tope natural es el mayor número de SL que se han juntado en un día: por encima de eso el
  // stop no habría saltado nunca y la fila sería siempre «igual que ahora».
  const tope = Math.min(consecutive ? maxSlStreak : maxSlInDay, topeFilas);

  const rows = [];
  for (let threshold = 1; threshold <= tope; threshold += 1) {
    let pnl = 0;
    let daysStopped = 0;
    let tradesSkipped = 0;
    let skippedPnl = 0;
    // Cuántas de las evitadas eran cada cosa. Es lo que convierte el número en una respuesta:
    // evitar 19 operaciones no dice nada; evitar 12 SL y 5 TP sí.
    const skippedByResult = { sl: 0, tp: 0, be: 0, other: 0 };

    days.forEach((dayTrades) => {
      const corte = stopIndexForDay(dayTrades, threshold, consecutive);
      const operadas = corte === -1 ? dayTrades : dayTrades.slice(0, corte);
      const evitadas = corte === -1 ? [] : dayTrades.slice(corte);
      if (evitadas.length) daysStopped += 1;
      tradesSkipped += evitadas.length;
      operadas.forEach((t) => {
        pnl += getPnl(t);
      });
      evitadas.forEach((t) => {
        skippedPnl += getPnl(t);
        skippedByResult[resultBucket(t)] += 1;
      });
    });

    rows.push({
      threshold,
      pnl,
      diff: pnl - realPnl,
      daysStopped,
      tradesSkipped,
      // Lo que dejaban las operaciones que no se habrían hecho. Es el mismo número que `diff`
      // cambiado de signo, y se guarda aparte porque leerlo así -«lo que venía después restaba
      // 300€»- explica el resultado mejor que la diferencia a secas.
      skippedPnl,
      skippedByResult,
    });
  }

  // El mejor umbral solo se señala si de verdad mejora: empatar con no hacer nada no es mejorar,
  // y presentarlo como recomendación invitaría a cambiar de forma de operar sin motivo.
  let best = null;
  rows.forEach((row) => {
    if (row.diff > 0 && (!best || row.diff > best.diff)) best = row;
  });

  return {
    hasData: true,
    days: days.size,
    tradedDays: days.size,
    totalTrades,
    realPnl,
    maxSlInDay,
    maxSlStreak,
    rows,
    best,
  };
}

module.exports = {
  buildDailyStopAnalysis,
  isStopLoss,
  resultBucket,
  stopIndexForDay,
  maxStreakInDay,
  sortWithinDay,
  groupByDay,
};
