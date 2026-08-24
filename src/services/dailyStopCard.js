/**
 * Tarjeta «Parar el día tras varios SL».
 *
 * Vive aparte porque la usan dos sitios con dueños distintos: las estadísticas reales, que las
 * dibuja stats.js con las operaciones ya filtradas, y las de backtesting, que las dibuja
 * renderer.js. Tenerla en uno de los dos obligaría al otro a importarlo, y ahí ya hay una
 * dependencia en un solo sentido (renderer.js usa stats.js) que no conviene cerrar en círculo.
 *
 * Los cálculos están en dailyStopAnalysis.js; aquí solo está la presentación.
 *
 * @module dailyStopCard
 */

const { buildDailyStopAnalysis } = require('./dailyStopAnalysis');

/** Preferencia por vista: contar los SL seguidos o todos los del día. */
const DAILY_STOP_CONSECUTIVE_KEY = 'daily_stop_consecutive';

function isDailyStopConsecutive(scope) {
  return localStorage.getItem(`${DAILY_STOP_CONSECUTIVE_KEY}_${scope}`) === 'true';
}

function setDailyStopConsecutive(scope, value) {
  localStorage.setItem(`${DAILY_STOP_CONSECUTIVE_KEY}_${scope}`, value ? 'true' : 'false');
}

function dailyStopMoney(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}€`;
}

/**
 * @param {object} params
 * @param {'real'|'backtest'} params.scope para recordar el interruptor por separado en cada vista
 * @param {HTMLElement} params.host dónde se cuelga
 * @param {string} params.blockId
 * @param {string} params.className clases del bloque (incluida la de su pestaña)
 * @param {Array} params.trades operaciones ya filtradas
 * @param {(t:object)=>number} params.getPnl
 * @param {boolean} [params.visible] si su pestaña está activa ahora mismo
 * @param {Function} [params.refreshIcons] cada vista tiene la suya; es opcional a propósito,
 *   porque un icono sin dibujar no puede romper la tarjeta
 */
function renderDailyStopCard({
  scope,
  host,
  blockId,
  className,
  trades,
  getPnl,
  visible = true,
  refreshIcons,
}) {
  if (!host) return;
  let block = document.getElementById(blockId);
  if (!block) {
    block = document.createElement('section');
    block.id = blockId;
    block.className = className;
    host.appendChild(block);
  }
  // El bloque se crea sobre la marcha y puede nacer con el usuario en otra pestaña: su
  // visibilidad se fija aquí en vez de esperar al siguiente cambio de pestaña.
  block.hidden = !visible;

  const seguidos = isDailyStopConsecutive(scope);
  const analisis = buildDailyStopAnalysis(trades, { getPnl, consecutive: seguidos });

  const cabecera = `
    <h2 class="section-title title-with-icon">
      <i data-lucide="octagon-x"></i>
      <span>Parar el día tras varios SL</span>
    </h2>
    <p class="muted small">
      Recorta cada día en el punto donde habrías parado y lo compara con lo que hiciste de verdad.
    </p>`;

  if (!analisis.hasData) {
    block.innerHTML = `
      ${cabecera}
      <div class="empty-state">
        ${
          analisis.totalTrades
            ? 'No hay ningún SL en las operaciones filtradas, así que un stop diario no habría cambiado nada.'
            : 'Todavía no hay operaciones con los filtros actuales.'
        }
      </div>`;
    if (typeof refreshIcons === 'function') refreshIcons();
    return;
  }

  /**
   * De lo que te habrías ahorrado, qué era: «12 SL · 5 TP · 2 BE».
   *
   * Es lo que convierte el número en una respuesta. Evitar 19 operaciones no dice nada por sí
   * solo; evitar 12 SL y 5 TP explica de dónde sale la diferencia. Solo se nombra lo que hay:
   * un «0 BE» ocupa sitio y no informa.
   */
  const desglose = (row) => {
    const r = row.skippedByResult || {};
    const partes = [
      [r.sl, 'SL'],
      [r.tp, 'TP'],
      [r.be, 'BE'],
      [r.other, 'sin resultado'],
    ]
      .filter(([n]) => Number(n) > 0)
      .map(([n, etiqueta]) => `${n} ${etiqueta}`);
    return partes.length ? ` · ${partes.join(' · ')}` : '';
  };

  const filas = analisis.rows
    .map((row) => {
      const mejor = row.diff > 0;
      const igual = Math.abs(row.diff) < 0.005;
      // Con pocos días afectados la diferencia puede ser casualidad, no una regla: se dice, en
      // vez de presentarlo como una conclusión firme.
      const pocos = row.daysStopped > 0 && row.daysStopped < 5;
      const veredicto = igual
        ? '<span class="muted">No habría cambiado nada</span>'
        : mejor
          ? `<span class="bt-metric-verdict ${pocos ? '' : 'good'}">Mejor parar${pocos ? ' · pocos días aún' : ''}</span>`
          : `<span class="bt-metric-verdict ${pocos ? '' : 'bad'}">Mejor seguir${pocos ? ' · pocos días aún' : ''}</span>`;
      const destacada = analisis.best && analisis.best.threshold === row.threshold;
      return `
        <tr class="${destacada ? 'is-best' : ''}">
          <td>${row.threshold} SL${destacada ? ' <span class="daily-stop-best-tag">mejor</span>' : ''}</td>
          <td class="bt-metric-cell">
            <strong class="${row.pnl >= 0 ? 'positive' : 'negative'}">${dailyStopMoney(row.pnl)}</strong>
            <span class="bt-metric-sub">frente a ${dailyStopMoney(analisis.realPnl)} reales</span>
          </td>
          <td class="bt-metric-cell">
            <strong class="${row.diff > 0 ? 'positive' : row.diff < 0 ? 'negative' : ''}">${dailyStopMoney(row.diff)}</strong>
            <span class="bt-metric-sub">lo que venía después sumaba ${dailyStopMoney(row.skippedPnl)}</span>
          </td>
          <td class="bt-metric-cell">
            <strong>${row.daysStopped}</strong>
            <span class="bt-metric-sub">${row.tradesSkipped} ${row.tradesSkipped === 1 ? 'operación evitada' : 'operaciones evitadas'}${desglose(row)}</span>
          </td>
          <td>${veredicto}</td>
        </tr>`;
    })
    .join('');

  const resumen = analisis.best
    ? `Parar tras <strong>${analisis.best.threshold} SL</strong> te habría dejado <strong class="positive">${dailyStopMoney(analisis.best.diff)}</strong> más.`
    : 'Ningún umbral habría mejorado el resultado: seguir operando salió a cuenta.';

  block.innerHTML = `
    ${cabecera}
    <div class="daily-stop-head">
      <p class="daily-stop-summary">${resumen}</p>
      <label class="daily-stop-switch">
        <input type="checkbox" ${seguidos ? 'checked' : ''} data-daily-stop-consecutive="${scope}" />
        <span>Solo SL seguidos</span>
      </label>
    </div>
    <p class="muted small daily-stop-context">
      ${analisis.days} ${analisis.days === 1 ? 'día' : 'días'} con operaciones ·
      máximo de ${analisis.maxSlInDay} SL en un mismo día ·
      racha más larga de ${analisis.maxSlStreak} SL seguidos
    </p>
    <div class="table-wrap">
      <table class="bt-metric-analysis-table daily-stop-table">
        <thead>
          <tr>
            <th>Si paras tras</th>
            <th>PnL del periodo</th>
            <th>Diferencia</th>
            <th>Días en que habrías parado</th>
            <th>Conclusión</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <p class="muted small daily-stop-warning">
      Es un repaso de lo que ya pasó: supone que las operaciones posteriores habrían ocurrido
      igual y que la regla se aplica sobre los mismos datos con los que se decide. Cuantos menos
      días afectados, menos fiable es la conclusión.
    </p>`;

  block.querySelector('[data-daily-stop-consecutive]')?.addEventListener('change', (event) => {
    setDailyStopConsecutive(scope, event.target.checked);
    renderDailyStopCard({ scope, host, blockId, className, trades, getPnl, visible, refreshIcons });
  });

  if (typeof refreshIcons === 'function') refreshIcons();
}

/**
 * Análisis BE dentro de la página de Estadísticas.
 *
 * Este bloque se crea desde código y se añade a #statsView. Antes se colgaba sin mas, fuera del
 * sistema de pestañas, y por eso salía en las cinco a la vez. Ahora se declara como un panel más
 * de la pestaña Resumen (`stats-tab-panel` + `data-stats-tab`), que es lo que mira la función que
 * cambia de pestaña.
 *
 * Como se crea sobre la marcha, puede nacer estando el usuario en otra pestaña: por eso su
 * visibilidad se fija tambien aquí, en vez de esperar al siguiente cambio de pestaña.
 *
 * Los estilos salen de las clases de la página (mismas tarjetas que el resto de Estadísticas) en
 * lugar de estar escritos a mano en cada elemento, que era lo que hacía que este bloque se viera
 * distinto de todos los demás.
 */
const BE_ANALYSIS_TAB = 'summary';

module.exports = { renderDailyStopCard, isDailyStopConsecutive, setDailyStopConsecutive };
