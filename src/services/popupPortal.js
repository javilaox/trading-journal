/**
 * Sacar un panel desplegable del contenedor que lo recorta.
 *
 * El problema se repite en toda la aplicación y siempre por lo mismo: un panel `position:absolute`
 * vive dentro de su campo, y basta con que cualquier ancestro tenga `overflow` distinto de
 * `visible` -una tarjeta, una zona con desplazamiento, un modal- para que el panel quede cortado
 * por ese borde. Subir el `z-index` no arregla nada, porque no es cuestión de quién va delante:
 * lo que hay es un recorte.
 *
 * La solución que ya usaban el calendario y el buscador de props, aquí en un solo sitio: mientras
 * está abierto, el panel se cuelga del <body> con `position:fixed` y se coloca a mano con las
 * coordenadas reales del campo en pantalla. Colgando del body no queda ningún ancestro que pueda
 * recortarlo, en ningún formulario.
 *
 * Se voltea hacia arriba cuando no cabe por debajo, para que un desplegable abierto cerca del
 * borde inferior no se salga de la ventana.
 *
 * @module popupPortal
 */

/** Margen con los bordes de la ventana, para que nunca quede pegado al filo. */
const MARGEN = 12;
/** Separación entre el campo y su panel. */
const SEPARACION = 6;

/** Estado de los paneles abiertos: dónde vivía cada uno, para devolverlo a su sitio al cerrar. */
const abiertos = new Map();

/**
 * ¿Sigue viéndose el campo al que está pegado el panel?
 *
 * Con un margen de cortesía: mientras asome un poco, el panel se queda; en cuanto el campo se ha
 * ido de la pantalla, mantenerlo abierto solo deja una lista flotando en mitad de la nada, sin
 * nada a lo que pertenecer.
 */
function triggerVisible(rect) {
  const asomaAlgo = 8;
  return rect.bottom > asomaAlgo && rect.top < window.innerHeight - asomaAlgo;
}

function colocar(trigger, panel, options) {
  if (!trigger?.isConnected || !panel) return;
  const rect = trigger.getBoundingClientRect();

  // El campo ya no se ve: se avisa a quien abrió para que cierre como cierra siempre (quitando su
  // clase, devolviendo el panel a su sitio...). Cerrar desde aquí dejaría el desplegable «abierto»
  // para el resto de la aplicación.
  if (!triggerVisible(rect)) {
    options.onDismiss?.();
    return;
  }

  const ancho = options.matchTriggerWidth
    ? Math.max(Number(options.minWidth) || 0, Math.round(rect.width))
    : panel.offsetWidth;
  if (options.matchTriggerWidth) panel.style.width = `${ancho}px`;

  // Se mide DESPUÉS de fijar el ancho: con otro ancho, el contenido envuelve distinto y el alto
  // cambia, así que medir antes daría una altura que no es la que va a tener.
  const alto = panel.offsetHeight || 0;
  const cabeDebajo = rect.bottom + SEPARACION + alto <= window.innerHeight - MARGEN;

  const izquierda = Math.min(
    Math.max(MARGEN, rect.left),
    Math.max(MARGEN, window.innerWidth - ancho - MARGEN)
  );
  panel.style.left = `${Math.round(izquierda)}px`;
  panel.style.top = cabeDebajo
    ? `${Math.round(rect.bottom + SEPARACION)}px`
    : `${Math.round(Math.max(MARGEN, rect.top - alto - SEPARACION))}px`;
  panel.style.bottom = '';
  panel.style.right = '';
}

/**
 * Abre el panel colgándolo del <body>.
 *
 * @param {HTMLElement} trigger el campo al que se pega el panel
 * @param {HTMLElement} panel
 * @param {object} [options]
 * @param {boolean} [options.matchTriggerWidth=true] el panel toma el ancho del campo
 * @param {number} [options.minWidth=0]
 * @param {number} [options.maxHeight] tope de alto; si no, se respeta el del CSS
 * @param {Function} [options.onDismiss] se llama cuando el campo se sale de la pantalla al
 *   desplazar, para que quien lo abrió lo cierre por su camino habitual
 */
function openPortalPanel(trigger, panel, options = {}) {
  if (!trigger || !panel) return;
  const opts = { matchTriggerWidth: true, minWidth: 0, ...options };

  if (!abiertos.has(panel)) {
    abiertos.set(panel, { parent: panel.parentNode, next: panel.nextSibling });
  }
  if (panel.parentElement !== document.body) document.body.appendChild(panel);

  panel.classList.add('is-portaled');
  panel.style.position = 'fixed';
  if (Number.isFinite(opts.maxHeight)) panel.style.maxHeight = `${opts.maxHeight}px`;

  // El orden importa: primero se deja el estado y los escuchadores montados, y solo después se
  // coloca. Colocar puede acabar avisando de que el campo no se ve, y ese aviso cierra el panel,
  // lo que borra el estado; si se leyera el estado después, ya no existiría y esto reventaría.
  // Pasaba de verdad al abrir un desplegable con su campo fuera de la pantalla.
  //
  // `capture` para enterarse también del desplazamiento de contenedores interiores, que no
  // burbujea.
  const seguir = () => colocar(trigger, panel, opts);
  const estado = abiertos.get(panel);
  if (estado) estado.seguir = seguir;
  window.addEventListener('scroll', seguir, true);
  window.addEventListener('resize', seguir);

  colocar(trigger, panel, opts);
}

/** Cierra el panel y lo devuelve exactamente al sitio del que salió. */
function closePortalPanel(panel) {
  const estado = panel && abiertos.get(panel);
  if (!estado) return;

  if (estado.seguir) {
    window.removeEventListener('scroll', estado.seguir, true);
    window.removeEventListener('resize', estado.seguir);
  }
  if (estado.parent) estado.parent.insertBefore(panel, estado.next);

  panel.classList.remove('is-portaled');
  panel.style.position = '';
  panel.style.top = '';
  panel.style.left = '';
  panel.style.width = '';
  panel.style.maxHeight = '';
  abiertos.delete(panel);
}

/** ¿Está este panel colgado del body ahora mismo? */
function isPortaled(panel) {
  return Boolean(panel && abiertos.has(panel));
}

module.exports = { openPortalPanel, closePortalPanel, isPortaled };
