/**
 * Formato del Excel para importar operaciones de backtesting.
 *
 * Este archivo es la ÚNICA definición del formato. Lo usan las dos partes del proceso:
 *
 *   - `backtestTemplateWriter.js`, que genera la plantilla que el usuario descarga.
 *   - `backtestImportReader.js`, que lee el archivo que el usuario devuelve relleno.
 *
 * Están juntos a propósito. Si la plantilla y el lector definieran las columnas por separado,
 * bastaría con renombrar una cabecera en un sitio y olvidarlo en el otro para que la importación
 * empezara a descartar filas correctas sin que nadie entendiera por qué.
 *
 * El orden del array es el orden de las columnas en el Excel. Aun así, el lector localiza cada
 * columna por su cabecera y no por su posición, de modo que si alguien reordena o intercala
 * columnas en su copia de la plantilla, la importación sigue funcionando.
 */

const { assetValues } = require('./assetCatalog');

/** Resultados admitidos. Son los mismos que el desplegable del formulario. */
const RESULT_VALUES = ['TP', 'SL', 'BE'];

/** Direcciones admitidas. En el Excel se escriben en castellano y se traducen al guardar. */
const DIRECTION_LABELS = ['Compra', 'Venta'];

const DIRECTION_ALIASES = {
  COMPRA: 'LONG',
  VENTA: 'SHORT',
  LONG: 'LONG',
  SHORT: 'SHORT',
  BUY: 'LONG',
  SELL: 'SHORT',
  L: 'LONG',
  S: 'SHORT',
  ALCISTA: 'LONG',
  BAJISTA: 'SHORT',
};

const RESULT_ALIASES = {
  TP: 'TP',
  SL: 'SL',
  BE: 'BE',
  GANADA: 'TP',
  PERDIDA: 'SL',
  'PÉRDIDA': 'SL',
  WIN: 'TP',
  LOSS: 'SL',
  BREAKEVEN: 'BE',
  'BREAK EVEN': 'BE',
  NEUTRO: 'BE',
};

/**
 * Columnas de la hoja «Operaciones».
 *
 * - `key`      nombre interno del campo.
 * - `header`   texto de la cabecera, tal cual aparece en la fila 1.
 * - `required` si la fila se rechaza cuando el valor falta.
 * - `help`     explicación que se escribe como comentario de la cabecera y en las instrucciones.
 * - `type`     cómo se interpreta el contenido de la celda.
 * - `width`    ancho de la columna, para que la plantilla se lea sin tener que ajustar nada.
 */
const COLUMNS = [
  {
    key: 'date',
    header: 'Fecha',
    required: true,
    type: 'date',
    width: 14,
    example: '2026-01-15',
    help: 'Día de la operación. Vale una fecha de Excel o el texto AAAA-MM-DD.',
  },
  {
    key: 'asset',
    header: 'Par',
    required: true,
    type: 'asset',
    width: 14,
    example: 'EURUSD',
    help: 'Elígelo del desplegable. Si escribes uno que no está en la lista, la fila se rechaza.',
  },
  {
    key: 'strategy',
    header: 'Estrategia',
    required: true,
    type: 'text',
    width: 22,
    example: 'Ruptura de Londres',
    help: 'Si el nombre no coincide con ninguna estrategia tuya, se crea una nueva con ese nombre.',
  },
  {
    key: 'direction',
    header: 'Dirección',
    required: true,
    type: 'direction',
    width: 12,
    example: 'Compra',
    help: 'Compra o Venta.',
  },
  {
    key: 'result',
    header: 'Resultado',
    required: true,
    type: 'result',
    width: 12,
    example: 'TP',
    help: 'TP si acabó en beneficio, SL en pérdida, BE si salió en el punto de entrada.',
  },
  {
    key: 'entry_time',
    header: 'Hora entrada',
    required: false,
    type: 'time',
    width: 14,
    example: '09:30',
    help: 'Opcional, en formato HH:MM (24 horas). Sirve para las estadísticas por franja.',
  },
  {
    key: 'exit_time',
    header: 'Hora salida',
    required: false,
    type: 'time',
    width: 14,
    example: '11:45',
    help: 'Opcional, en formato HH:MM (24 horas).',
  },
  {
    key: 'pnl',
    header: 'PnL estimado (€)',
    required: false,
    type: 'number',
    width: 18,
    example: 400,
    help:
      'Resultado en euros. Si lo dejas vacío se calcula solo con el riesgo y el RR de la ' +
      'estrategia: TP = riesgo x RR, SL = -riesgo, BE = 0. Escríbelo en positivo: el signo lo ' +
      'pone la app según el resultado.',
  },
  {
    key: 'entry_price',
    header: 'Precio entrada',
    required: false,
    type: 'number',
    width: 16,
    example: 1.0850,
    help: 'Opcional. Solo para tener el detalle del trade; no afecta a las estadísticas.',
  },
  {
    key: 'stop_loss',
    header: 'Stop loss',
    required: false,
    type: 'number',
    width: 14,
    example: 1.0820,
    help: 'Opcional.',
  },
  {
    key: 'take_profit',
    header: 'Take profit',
    required: false,
    type: 'number',
    width: 14,
    example: 1.0910,
    help: 'Opcional.',
  },
  {
    key: 'rr_planned',
    header: 'RR previsto',
    required: false,
    type: 'number',
    width: 14,
    example: 2,
    help: 'Opcional. Ratio beneficio/riesgo que buscabas. Si lo dejas vacío se toma el de la estrategia.',
  },
  {
    key: 'risk_eur',
    header: 'Riesgo (€)',
    required: false,
    type: 'number',
    width: 14,
    example: 200,
    help:
      'Opcional. Lo que arriesgabas en esa operación. Si lo dejas vacío se usa el riesgo de la ' +
      'estrategia. Es lo que permite calcular el PnL cuando la columna anterior va vacía.',
  },
  {
    key: 'notes',
    header: 'Notas',
    required: false,
    type: 'text',
    width: 40,
    example: 'Entrada tras barrido de mínimos',
    help: 'Opcional, texto libre.',
  },
];

/** Nombres de las hojas del libro. */
const SHEETS = {
  trades: 'Operaciones',
  help: 'Instrucciones',
  lists: 'Listas',
};

/** Fila donde empiezan los datos (la 1 es la cabecera). */
const FIRST_DATA_ROW = 2;

/**
 * Normaliza una cabecera para compararla: sin acentos, sin mayúsculas, sin espacios de sobra y
 * sin lo que vaya entre paréntesis. Así «PnL estimado (€)», «pnl estimado» y «PNL Estimado (EUR)»
 * se reconocen todas como la misma columna, que es justo lo que hace un usuario al retocar la
 * plantilla en su ordenador.
 */
function normalizeHeader(value) {
  return String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Índice de cabecera normalizada -> definición de columna. */
function buildHeaderIndex() {
  const map = new Map();
  COLUMNS.forEach((column) => {
    map.set(normalizeHeader(column.header), column);
  });
  return map;
}

/**
 * Normaliza el nombre de un par para compararlo con el catálogo: fuera espacios, barras, guiones
 * y minúsculas. Con esto «eur/usd», «EUR USD» y «eurusd» acaban siendo «EURUSD», que es un error
 * de escritura evidente y no tiene sentido rechazar. Lo que no se parezca a nada del catálogo sí
 * se rechaza: el par es la clave con la que se agrupan las estadísticas y un par inventado las
 * parte en dos sin que se note.
 */
function normalizeAssetCandidate(value) {
  return String(value == null ? '' : value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

let assetLookup = null;

function getAssetLookup() {
  if (!assetLookup) {
    assetLookup = new Map();
    assetValues().forEach((asset) => {
      assetLookup.set(normalizeAssetCandidate(asset), asset);
    });
  }
  return assetLookup;
}

/**
 * Devuelve el par del catálogo equivalente al texto dado, o '' si no hay ninguno.
 * No adivina por parecido: solo ignora la forma de escribirlo.
 */
function resolveAsset(value) {
  const candidate = normalizeAssetCandidate(value);
  if (!candidate) return '';
  return getAssetLookup().get(candidate) || '';
}

function resolveDirection(value) {
  const key = String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
  return DIRECTION_ALIASES[key] || '';
}

function resolveResult(value) {
  const key = String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
  return RESULT_ALIASES[key] || '';
}

module.exports = {
  COLUMNS,
  SHEETS,
  FIRST_DATA_ROW,
  RESULT_VALUES,
  DIRECTION_LABELS,
  normalizeHeader,
  buildHeaderIndex,
  resolveAsset,
  resolveDirection,
  resolveResult,
};
