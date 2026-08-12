/**
 * Rachas de resultados: cuántos TP seguidos y cuántos SL seguidos como máximo.
 *
 * Dos decisiones que condicionan el número y conviene tener explícitas:
 *
 *   1. **El orden es cronológico**, no el de la tabla. Las operaciones se ordenan por fecha y,
 *      dentro del mismo día, por hora de entrada. Sin esto la "racha" dependería de cómo estén
 *      ordenados los datos en pantalla y sería un número inventado.
 *
 *   2. **El BE no cuenta ni corta.** Una operación que sale a break-even no es una ganada ni una
 *      perdida: es una operación que no ocurrió en términos de resultado. Cortar la racha con un
 *      BE haría que el mismo sistema mostrara rachas distintas según el usuario mueva o no el
 *      stop, que es justo lo que no queremos medir aquí.
 *
 * Se devuelve también la racha en curso (la del final de la serie) porque es la que responde a
 * "¿cuántas llevo seguidas ahora mismo?".
 */

function computeResultStreaks(trades) {
  // Las dos ayudantes van dentro a proposito: el visor compartido inserta esta funcion con
  // toString(), asi que todo lo que necesite tiene que viajar con ella.
  function normalizeResult(trade) {
    return String((trade && trade.result) || '').toUpperCase();
  }

  // Clave de orden: fecha + hora de entrada. Las que no tienen hora van al final de su dia.
  function chronologicalKey(trade) {
    const date = String((trade && trade.date) || '').slice(0, 10);
    const time = String((trade && trade.entry_time) || '99:99').slice(0, 5);
    return date + ' ' + time;
  }

  const list = (Array.isArray(trades) ? trades : []).filter(Boolean);
  const sorted = list.slice().sort(function (a, b) {
    const ka = chronologicalKey(a);
    const kb = chronologicalKey(b);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    // Desempate estable por id para que dos ejecuciones den siempre lo mismo.
    return String((a && a.id) || '').localeCompare(String((b && b.id) || ''));
  });

  let maxTp = 0;
  let maxSl = 0;
  let runTp = 0;
  let runSl = 0;

  sorted.forEach(function (trade) {
    const res = normalizeResult(trade);
    if (res === 'TP') {
      runTp += 1;
      runSl = 0;
      if (runTp > maxTp) maxTp = runTp;
    } else if (res === 'SL') {
      runSl += 1;
      runTp = 0;
      if (runSl > maxSl) maxSl = runSl;
    }
    // BE: no toca ninguna de las dos rachas.
  });

  return {
    maxTp: maxTp,
    maxSl: maxSl,
    currentTp: runTp,
    currentSl: runSl,
    evaluated: sorted.filter(function (t) {
      const r = normalizeResult(t);
      return r === 'TP' || r === 'SL';
    }).length,
  };
}

module.exports = { computeResultStreaks };
