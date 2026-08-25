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

function colocar(trigger, panel, options) {
  if (!trigger?.isConnected || !panel) return;
  const rect = trigger.getBoundingClientRect();

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

  colocar(trigger, panel, opts);

  // Al desplazar o redimensionar, el campo se mueve y el panel se quedaría flotando donde ya no
  // hay nada. `capture` para enterarse también del desplazamiento de contenedores interiores,
  // que no burbujea.
  const seguir = () => colocar(trigger, panel, opts);
  const estado = abiertos.get(panel);
  estado.seguir = seguir;
  window.addEventListener('scroll', seguir, true);
  window.addEventListener('resize', seguir);
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
