/**
 * Listado de operaciones detrás de una cifra.
 *
 * Nace del Análisis BE («BE → SL: 2» y no poder saber cuáles son deja el dato a medias), pero la
 * necesidad es la misma en cualquier cifra contable: ver «1 trade fuera de horario» y querer ir a
 * corregirlo. Por eso vive aparte y no dentro de una vista concreta: lo usan las estadísticas
 * reales, que las dibuja stats.js, y renderer.js.
 *
 * Quien lo abre decide el título, qué operaciones entran, qué distintivo lleva cada fila y qué
 * pasa al elegir una. Este módulo solo pinta y avisa.
 *
 * @module tradeListModal
 */

const OVERLAY_ID = 'tradeListModalOverlay';

function escapeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** 'YYYY-MM-DD' -> 'DD-MM-YYYY'. Deja pasar lo que no reconozca. */
function toEsDate(value) {
  const raw = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.split('-').reverse().join('-') : raw;
}

/** Dinero de una operación: el neto si está guardado, y si no el bruto menos la comisión. */
function defaultPnl(trade) {
  const neto = Number(trade?.pnl_net ?? trade?.pnlNet);
  if (Number.isFinite(neto)) return neto;
  return (Number(trade?.pnl) || 0) - (Number(trade?.commission) || 0);
}

/** Horario «09:30 → 11:15», o solo la hora que haya. Vacío si no hay ninguna. */
function timeLabel(trade) {
  const limpia = (v) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(v ?? '').trim());
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  };
  const entrada = limpia(trade?.entry_time ?? trade?.entryTime);
  const salida = limpia(trade?.exit_time ?? trade?.exitTime);
  if (entrada && salida) return `${entrada} → ${salida}`;
  return entrada || salida || '';
}

/** Mismo orden que el resto de la aplicación: por día, hora de entrada y orden de guardado. */
function sortChronologically(list) {
  const hora = (value) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '99:99';
  };
  const key = (t) => `${String(t?.date || '').slice(0, 10)} ${hora(t?.entry_time ?? t?.entryTime)}`;
  return [...(list || [])].sort((a, b) => {
    const diff = key(a).localeCompare(key(b));
    if (diff !== 0) return diff;
    const na = Number(a?.id);
    const nb = Number(b?.id);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

function getOverlay() {
  return document.getElementById(OVERLAY_ID);
}

function isTradeListModalOpen() {
  return Boolean(getOverlay()?.classList.contains('active'));
}

function closeTradeListModal() {
  getOverlay()?.classList.remove('active');
}

/**
 * @param {object} params
 * @param {string} params.title
 * @param {string} [params.subtitle] se antepone el número de operaciones
 * @param {Array} params.trades
 * @param {(trade:object)=>{text:string,tone?:string}|null} [params.badge] distintivo de cada fila
 * @param {(trade:object)=>string} [params.meta] segunda línea; por defecto estrategia y cuenta
 * @param {(trade:object)=>number} [params.getPnl]
 * @param {(id:number|string, trade:object)=>void} params.onSelect qué hacer al elegir una
 * @param {string} [params.emptyText]
 */
function openTradeListModal({
  title,
  subtitle = '',
  trades,
  badge,
  meta,
  getPnl = defaultPnl,
  onSelect,
  emptyText = 'No hay operaciones en este grupo.',
}) {
  const overlay = getOverlay();
  const lista = document.getElementById('tradeListModalList');
  const titleEl = document.getElementById('tradeListModalTitle');
  const subEl = document.getElementById('tradeListModalSubtitle');
  if (!overlay || !lista || !titleEl) return;

  const ordenadas = sortChronologically(trades);
  // Se guardan aquí para que el clic no dependa de que la caché siga igual entre la pulsación y
  // la elección: la lista que se ve es la lista que se usa.
  overlay.__trades = ordenadas;

  titleEl.textContent = title;
  if (subEl) {
    const n = ordenadas.length;
    const cuenta = `${n} ${n === 1 ? 'operación' : 'operaciones'}`;
    subEl.textContent = subtitle ? `${cuenta} · ${subtitle}` : cuenta;
  }

  lista.innerHTML = ordenadas.length
    ? ordenadas
        .map((t) => {
          const pnl = Number(getPnl(t)) || 0;
          const tono = pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : '';
          const distintivo = typeof badge === 'function' ? badge(t) : null;
          const chip = distintivo
            ? `<span class="trade-list-badge ${distintivo.tone || ''}">${escapeText(distintivo.text)}</span>`
            : '';
          const segunda =
            typeof meta === 'function'
              ? meta(t)
              : [t.strategy || 'Sin estrategia', t.account || '', timeLabel(t)]
                  .filter(Boolean)
                  .join(' · ');
          return `
            <li>
              <button type="button" class="trade-list-row" data-trade-list-id="${escapeAttr(String(t.id))}">
                <span class="trade-list-main">
                  <span class="trade-list-title">
                    ${escapeText(toEsDate(t.date))} · ${escapeText(t.asset || '—')}${chip}
                  </span>
                  <span class="trade-list-meta">${escapeText(segunda)}</span>
                </span>
                <span class="trade-list-pnl ${tono}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}€</span>
              </button>
            </li>`;
        })
        .join('')
    : `<li class="muted-label">${escapeText(emptyText)}</li>`;

  overlay.__onSelect = onSelect;
  bindTradeListModal();
  overlay.classList.add('active');
}

function bindTradeListModal() {
  const overlay = getOverlay();
  if (!overlay || overlay.dataset.bound === 'true') return;
  overlay.dataset.bound = 'true';

  document.getElementById('tradeListModalClose')?.addEventListener('click', closeTradeListModal);

  // Pulsar fuera cierra; pulsar dentro no. Sin comprobar el objetivo, soltar el ratón dentro de
  // la lista tras arrastrar la cerraría sin querer.
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) closeTradeListModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isTradeListModalOpen()) closeTradeListModal();
  });

  document.getElementById('tradeListModalList')?.addEventListener('click', (event) => {
    const fila = event.target.closest('[data-trade-list-id]');
    if (!fila) return;
    const raw = fila.getAttribute('data-trade-list-id');
    const trade = (overlay.__trades || []).find((t) => String(t.id) === String(raw)) || null;
    // Se cierra antes de avisar: lo normal es que quien escuche abra el formulario de edición, y
    // dos ventanas apiladas se ven mal y dejarían debajo una lista que ya no representa nada.
    closeTradeListModal();
    const id = Number(raw);
    overlay.__onSelect?.(Number.isFinite(id) ? id : raw, trade);
  });
}

module.exports = {
  openTradeListModal,
  closeTradeListModal,
  isTradeListModalOpen,
  sortChronologically,
  timeLabel,
};
