/**
 * Lee un Excel de operaciones de backtesting y lo convierte en filas listas para guardar.
 *
 * No guarda nada: solo lee, valida y devuelve el resultado separado en dos montones, las filas
 * que entran y las que no, con el número de fila y el motivo del rechazo. Quien decide es el
 * usuario, en la pantalla de vista previa.
 *
 * Las columnas se localizan por su cabecera (ver `backtestImportSpec.js`), nunca por su posición,
 * para que reordenar o intercalar columnas en la plantilla no rompa la importación.
 */

const {
  COLUMNS,
  SHEETS,
  buildHeaderIndex,
  normalizeHeader,
  resolveAsset,
  resolveDirection,
  resolveResult,
} = require('./backtestImportSpec');

/** Máximo de filas que se leen de un archivo. Evita que un Excel gigante bloquee la aplicación. */
const MAX_ROWS = 5000;

/* --------------------------------------------------------------- lectura de celdas */

/**
 * Excel guarda las fechas de tres maneras distintas según cómo se hayan escrito: como objeto
 * fecha, como número de serie o como texto. Aquí se aceptan las tres y se devuelve siempre
 * AAAA-MM-DD, que es el formato en el que la aplicación guarda las operaciones.
 */
function readDate(value) {
  if (value == null || value === '') return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Las fechas de Excel llegan en UTC; se leen en UTC para no restar un día por zona horaria.
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Número de serie de Excel: días desde el 30/12/1899.
    const ms = Math.round(value * 86400000);
    const date = new Date(Date.UTC(1899, 11, 30) + ms);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const text = String(value).trim();

  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  // DD/MM/AAAA y DD-MM-AAAA, que es como se escribe una fecha aquí.
  const euro = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (euro) {
    return `${euro[3]}-${euro[2].padStart(2, '0')}-${euro[1].padStart(2, '0')}`;
  }

  return '';
}

/** Comprueba que una fecha AAAA-MM-DD existe de verdad (rechaza 2026-02-30). */
function isRealDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
  );
}

/**
 * Devuelve HH:MM. Acepta texto ('9:30', '09:30:00') y también la hora como número de Excel
 * (fracción de día), que es lo que pasa si alguien formatea la celda como hora.
 */
function readTime(value) {
  if (value == null || value === '') return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const fraction = value - Math.floor(value);
    const minutesTotal = Math.round(fraction * 24 * 60);
    const h = Math.floor(minutesTotal / 60) % 24;
    const mi = minutesTotal % 60;
    return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  }

  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null; // null = había algo escrito pero no es una hora
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

/**
 * Lee un número admitiendo la coma decimal, que es lo natural al escribir en español, y los
 * separadores de millar. Devuelve null si la celda está vacía y NaN si hay algo que no es un
 * número.
 */
function readNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

  let text = String(value).trim().replace(/[€$\s]/g, '');
  if (!text) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // El separador decimal es el que aparece más a la derecha; el otro es de millares.
    if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
  } else if (lastComma >= 0) {
    text = text.replace(',', '.');
  }

  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

/** Texto de una celda, resolviendo los casos en los que exceljs devuelve un objeto. */
function readText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return '';
  if (typeof value === 'object') {
    // Celda con fórmula o con texto enriquecido.
    if (value.result != null) return readText(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('').trim();
    if (value.text != null) return String(value.text).trim();
    if (value.hyperlink && value.text) return String(value.text).trim();
  }
  return '';
}

/* --------------------------------------------------------------- validación */

/**
 * Convierte una fila del Excel en una operación, o explica por qué no se puede.
 * Devuelve { ok: true, trade } o { ok: false, reasons: [...] }.
 */
function buildTradeFromRow(values, { knownStrategyNames }) {
  const reasons = [];

  const date = readDate(values.date);
  if (!date) {
    reasons.push(
      readText(values.date) || values.date != null
        ? 'La fecha no se entiende. Usa AAAA-MM-DD o DD/MM/AAAA.'
        : 'Falta la fecha.'
    );
  } else if (!isRealDate(date)) {
    reasons.push(`La fecha ${date} no existe.`);
  }

  const rawAsset = readText(values.asset);
  const asset = resolveAsset(rawAsset);
  if (!rawAsset) reasons.push('Falta el par.');
  else if (!asset) reasons.push(`El par "${rawAsset}" no está en la lista de la aplicación.`);

  const strategy = readText(values.strategy);
  if (!strategy) reasons.push('Falta la estrategia.');

  const rawDirection = readText(values.direction);
  const direction = resolveDirection(rawDirection);
  if (!rawDirection) reasons.push('Falta la dirección.');
  else if (!direction) reasons.push(`"${rawDirection}" no es una dirección. Escribe Compra o Venta.`);

  const rawResult = readText(values.result);
  const result = resolveResult(rawResult);
  if (!rawResult) reasons.push('Falta el resultado.');
  else if (!result) reasons.push(`"${rawResult}" no es un resultado. Escribe TP, SL o BE.`);

  const entryTime = readTime(values.entry_time);
  if (entryTime === null) reasons.push('La hora de entrada no se entiende. Usa HH:MM.');
  const exitTime = readTime(values.exit_time);
  if (exitTime === null) reasons.push('La hora de salida no se entiende. Usa HH:MM.');

  const numericFields = [
    ['pnl', 'PnL estimado'],
    ['entry_price', 'Precio de entrada'],
    ['stop_loss', 'Stop loss'],
    ['take_profit', 'Take profit'],
    ['rr_planned', 'RR previsto'],
    ['risk_eur', 'Riesgo'],
  ];
  const numbers = {};
  numericFields.forEach(([key, label]) => {
    const n = readNumber(values[key]);
    if (Number.isNaN(n)) reasons.push(`${label}: "${readText(values[key])}" no es un número.`);
    numbers[key] = Number.isNaN(n) ? null : n;
  });

  if (reasons.length) return { ok: false, reasons };

  return {
    ok: true,
    trade: {
      date,
      asset,
      strategy,
      direction,
      result,
      entry_time: entryTime || '',
      exit_time: exitTime || '',
      pnl: numbers.pnl,
      entry_price: numbers.entry_price,
      stop_loss: numbers.stop_loss,
      take_profit: numbers.take_profit,
      rr_planned: numbers.rr_planned,
      risk_eur: numbers.risk_eur,
      notes: readText(values.notes),
      // Número de fila del Excel. Se conserva porque quien recibe estas operaciones todavía
      // puede rechazar alguna (por las reglas de la sesión de destino) y necesita poder decir
      // exactamente qué fila del archivo hay que corregir.
      __row: 0,
      // Se marca si la estrategia habrá que crearla, para poder avisar antes de importar.
      strategy_is_new: !knownStrategyNames.has(strategy.toLowerCase()),
    },
  };
}

/* --------------------------------------------------------------- PnL */

/**
 * Riesgo con el que se cuenta esa operación: el de la propia fila si viene escrito y, si no, el
 * de su estrategia. Se calcula aparte porque hace falta dos veces: para deducir el PnL y para
 * saber a cuántas R equivale el resultado.
 */
function riskUsedFor(trade, strategyInfo) {
  if (trade.risk_eur && trade.risk_eur > 0) return trade.risk_eur;
  return strategyInfo.risk > 0 ? strategyInfo.risk : 0;
}

/**
 * Rellena el PnL de las operaciones que lo traen vacío, a partir del riesgo y el RR.
 *
 * TP = riesgo x RR, SL = -riesgo, BE = 0. Es el mismo criterio que aplica el formulario cuando
 * marcas TP o SL y dejas el PnL sin tocar, así que un trade importado y otro escrito a mano con
 * los mismos datos valen lo mismo.
 *
 * El signo lo pone siempre el resultado: si alguien escribe 400 en una operación marcada como SL,
 * se guarda -400. Así no depende de que el usuario se acuerde de poner el menos.
 */
function applyPnl(trade, strategyInfo) {
  const rr = trade.rr_planned && trade.rr_planned > 0 ? trade.rr_planned : strategyInfo.rr;
  const risk = riskUsedFor(trade, strategyInfo);

  let magnitude;
  if (trade.pnl != null) {
    magnitude = Math.abs(trade.pnl);
  } else if (trade.result === 'BE') {
    magnitude = 0;
  } else if (risk > 0) {
    magnitude = trade.result === 'TP' ? risk * (rr > 0 ? rr : 1) : risk;
  } else {
    magnitude = 0;
  }

  if (trade.result === 'SL') return -magnitude;
  if (trade.result === 'BE') return 0;
  return magnitude;
}

/**
 * Riesgo en euros de una estrategia. El riesgo se puede haber configurado en euros o en % del
 * capital; en el segundo caso hace falta el capital de la sesión de destino, igual que hace el
 * formulario de la aplicación.
 */
function strategyRiskEuro(strategy, capital) {
  if (!strategy) return 0;
  const value = Number(strategy.risk_value ?? strategy.risk ?? strategy.risk_per_trade) || 0;
  if (value <= 0) return 0;
  if (strategy.risk_unit === 'percent') {
    const base = Number(capital) || 0;
    return base > 0 ? (base * value) / 100 : 0;
  }
  return value;
}

/* --------------------------------------------------------------- entrada principal */

/**
 * Lee el archivo y devuelve:
 *   { success, sheet, totalRows, valid: [...], errors: [{row, reasons}], newStrategies: [...] }
 *
 * `strategies` es la lista de estrategias que el usuario ya tiene, para saber cuáles habría que
 * crear y de cuáles se puede tomar el riesgo y el RR al calcular el PnL.
 */
async function readBacktestImportFile(
  filePath,
  { strategies = [], capital = 0, defaultRisk = 0, defaultRr = 0 } = {}
) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // La hoja de la plantilla; si el usuario la ha renombrado, se usa la primera visible.
  let sheet = workbook.getWorksheet(SHEETS.trades);
  if (!sheet) {
    sheet = workbook.worksheets.find((ws) => ws.state !== 'veryHidden' && ws.state !== 'hidden');
  }
  if (!sheet) {
    return { success: false, error: 'EMPTY_FILE' };
  }

  // Cabeceras: se busca la primera fila que contenga al menos una columna reconocible, para
  // aguantar que alguien haya dejado un título encima de la tabla.
  const headerIndex = buildHeaderIndex();
  let headerRowNumber = 0;
  let columnByKey = null;

  for (let r = 1; r <= Math.min(20, sheet.rowCount); r += 1) {
    const row = sheet.getRow(r);
    const found = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const column = headerIndex.get(normalizeHeader(readText(cell.value)));
      if (column && found[column.key] == null) found[column.key] = colNumber;
    });
    if (Object.keys(found).length >= 3) {
      headerRowNumber = r;
      columnByKey = found;
      break;
    }
  }

  if (!headerRowNumber || !columnByKey) {
    return { success: false, error: 'NO_HEADERS' };
  }

  const missingRequired = COLUMNS.filter((c) => c.required && columnByKey[c.key] == null).map(
    (c) => c.header
  );
  if (missingRequired.length) {
    return { success: false, error: 'MISSING_COLUMNS', missing: missingRequired };
  }

  const knownStrategyNames = new Set(
    strategies.map((s) => String(s?.name || '').trim().toLowerCase()).filter(Boolean)
  );
  const strategyByName = new Map();
  strategies.forEach((s) => {
    const name = String(s?.name || '').trim().toLowerCase();
    if (name) strategyByName.set(name, s);
  });

  const valid = [];
  const errors = [];
  const newStrategies = new Set();
  let totalRows = 0;

  const lastRow = Math.min(sheet.rowCount, headerRowNumber + MAX_ROWS);

  for (let r = headerRowNumber + 1; r <= lastRow; r += 1) {
    const row = sheet.getRow(r);

    const values = {};
    COLUMNS.forEach((column) => {
      const colNumber = columnByKey[column.key];
      values[column.key] = colNumber ? row.getCell(colNumber).value : null;
    });

    // Fila totalmente vacía: se salta sin contarla ni como error. Es lo normal al final de la
    // hoja, y avisar de ello solo sería ruido.
    const hasAnything = COLUMNS.some((c) => {
      const v = values[c.key];
      return v != null && String(readText(v) || v).trim() !== '';
    });
    if (!hasAnything) continue;

    totalRows += 1;

    const built = buildTradeFromRow(values, { knownStrategyNames });
    if (!built.ok) {
      errors.push({ row: r, reasons: built.reasons });
      continue;
    }

    const trade = built.trade;
    trade.__row = r;
    const known = strategyByName.get(trade.strategy.toLowerCase());
    if (!known) newStrategies.add(trade.strategy);

    // Para una estrategia que todavía no existe se usan el riesgo y el RR por defecto de la
    // configuración, que son exactamente los que se le van a poner al crearla. Si no, el PnL de
    // esas filas saldría 0 y habría que recalcularlas a mano justo después de importarlas.
    const strategyInfo = {
      rr: Number(known?.rr) > 0 ? Number(known.rr) : Number(defaultRr) || 0,
      risk: known ? strategyRiskEuro(known, capital) : Number(defaultRisk) || 0,
    };
    trade.pnl = applyPnl(trade, strategyInfo);
    // Riesgo efectivo de la operación. Se guarda para poder calcular a cuántas R equivale el
    // resultado sin depender de que la sesión de destino esté ya cargada en la aplicación: al
    // crear una sesión nueva todavía no lo está, y el cálculo saldría 0.
    trade.risk_used = riskUsedFor(trade, strategyInfo);

    valid.push(trade);
  }

  return {
    success: true,
    sheet: sheet.name,
    totalRows,
    valid,
    errors,
    newStrategies: [...newStrategies],
  };
}

module.exports = {
  readBacktestImportFile,
  // Se exportan para poder probarlos por separado.
  readDate,
  readTime,
  readNumber,
  applyPnl,
  isRealDate,
  strategyRiskEuro,
};
