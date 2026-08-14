/**
 * Genera la plantilla de Excel que el usuario descarga para preparar sus operaciones antes de
 * importarlas.
 *
 * El objetivo es que se pueda rellenar sin haber leído ninguna documentación: cada columna trae
 * su explicación, los campos con lista cerrada traen desplegable, y hay una hoja de instrucciones
 * y una fila de ejemplo. Cuanto mejor sea la plantilla, menos filas rechazadas al importar.
 *
 * Las columnas salen de `backtestImportSpec.js`, el mismo archivo que usa el lector.
 */

const { COLUMNS, SHEETS, FIRST_DATA_ROW, RESULT_VALUES, DIRECTION_LABELS } = require('./backtestImportSpec');
const { ASSET_CATALOG } = require('./assetCatalog');

const HEADER_BG = 'FF0F172A';
const HEADER_TEXT = 'FFFFFFFF';
const EXAMPLE_TEXT = 'FF94A3B8';
const NOTE_BG = 'FFF1F5F9';

/** Letra de columna de Excel a partir del índice (1 -> A, 27 -> AA). */
function columnLetter(index) {
  let n = index;
  let letters = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Todos los pares del catálogo, en una sola lista plana. */
function allAssets() {
  const list = [];
  ASSET_CATALOG.forEach((group) => {
    (group.assets || []).forEach((asset) => list.push(asset.value));
  });
  return list;
}

/**
 * Última fila hasta la que se aplican los desplegables y los formatos. Excel obliga a dar un
 * rango concreto, así que se cubre un número generoso de filas: quien pegue 3000 operaciones
 * las tiene validadas, y a quien meta 20 no le molesta.
 */
const LAST_TEMPLATE_ROW = 3000;

function writeListsSheet(workbook, assets) {
  const ws = workbook.addWorksheet(SHEETS.lists);
  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 14;
  ws.getCell('A1').value = 'Pares';
  ws.getCell('B1').value = 'Dirección';
  ws.getCell('C1').value = 'Resultado';
  [ws.getCell('A1'), ws.getCell('B1'), ws.getCell('C1')].forEach((cell) => {
    cell.font = { bold: true };
  });

  assets.forEach((asset, i) => {
    ws.getCell(`A${i + 2}`).value = asset;
  });
  DIRECTION_LABELS.forEach((label, i) => {
    ws.getCell(`B${i + 2}`).value = label;
  });
  RESULT_VALUES.forEach((value, i) => {
    ws.getCell(`C${i + 2}`).value = value;
  });

  // Se oculta porque es maquinaria interna: el usuario no tiene que tocarla, solo usar los
  // desplegables que salen de ella.
  ws.state = 'veryHidden';
  return ws;
}

function writeHelpSheet(workbook) {
  const ws = workbook.addWorksheet(SHEETS.help);
  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 96;

  const title = ws.addRow(['Cómo rellenar esta plantilla']);
  title.font = { bold: true, size: 14 };
  ws.addRow([]);

  [
    ['1', 'Escribe una operación por fila en la hoja «' + SHEETS.trades + '», debajo de la cabecera.'],
    ['2', 'No cambies los nombres de la fila 1: son los que la app usa para reconocer cada columna.'],
    ['3', 'Puedes borrar la fila gris de ejemplo, o escribir encima de ella.'],
    ['4', 'Las columnas marcadas como obligatorias no pueden quedar vacías.'],
    ['5', 'Al importar verás cuántas filas entran y, si alguna falla, el motivo exacto. Nada se guarda hasta que lo confirmes.'],
  ].forEach(([n, text]) => {
    const row = ws.addRow([n, text]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  });

  ws.addRow([]);
  const columnsTitle = ws.addRow(['Las columnas']);
  columnsTitle.font = { bold: true, size: 12 };

  COLUMNS.forEach((column) => {
    const row = ws.addRow([
      column.header + (column.required ? ' (obligatoria)' : ''),
      column.help,
    ]);
    row.getCell(1).font = { bold: column.required };
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  });

  ws.addRow([]);
  const note = ws.addRow([
    'Ojo',
    'Los pares tienen lista cerrada a propósito: si se pudieran escribir libres, «EURUSD» y ' +
      '«eurusd» acabarían contando como dos activos distintos y las estadísticas quedarían ' +
      'partidas sin que se notara.',
  ]);
  note.getCell(1).font = { bold: true };
  note.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  note.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } };
  });

  return ws;
}

function writeTradesSheet(workbook, assets) {
  const ws = workbook.addWorksheet(SHEETS.trades);

  const headerRow = ws.getRow(1);
  COLUMNS.forEach((column, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = column.header + (column.required ? ' *' : '');
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    // El comentario sale al pasar el ratón por encima: la explicación está donde hace falta,
    // sin obligar a ir a la hoja de instrucciones.
    cell.note = {
      texts: [{ text: column.help + (column.required ? '\n\nObligatoria.' : '\n\nOpcional.') }],
    };
    ws.getColumn(i + 1).width = column.width;
  });
  headerRow.height = 22;
  headerRow.commit();

  // Fila de ejemplo, en gris y en cursiva para que se vea que no es un dato real.
  const exampleRow = ws.getRow(FIRST_DATA_ROW);
  COLUMNS.forEach((column, i) => {
    const cell = exampleRow.getCell(i + 1);
    cell.value = column.example;
    cell.font = { italic: true, color: { argb: EXAMPLE_TEXT } };
  });
  exampleRow.commit();

  // Cabecera siempre visible al desplazarse: con 200 operaciones, si no, no se sabe qué columna
  // se está rellenando.
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const listsRef = `'${SHEETS.lists}'`;

  COLUMNS.forEach((column, i) => {
    const letter = columnLetter(i + 1);
    const range = `${letter}${FIRST_DATA_ROW}:${letter}${LAST_TEMPLATE_ROW}`;

    if (column.type === 'date') {
      ws.getColumn(i + 1).numFmt = 'yyyy-mm-dd';
    }
    if (column.type === 'time') {
      // Texto, no hora de Excel: así «09:30» se queda como se escribe y no se convierte en un
      // número decimal que luego habría que interpretar.
      ws.getColumn(i + 1).numFmt = '@';
    }
    if (column.key === 'pnl' || column.key === 'risk_eur') {
      ws.getColumn(i + 1).numFmt = '#,##0.00';
    }

    let formulae = null;
    if (column.type === 'asset') formulae = [`${listsRef}!$A$2:$A$${assets.length + 1}`];
    if (column.type === 'direction') formulae = [`${listsRef}!$B$2:$B$${DIRECTION_LABELS.length + 1}`];
    if (column.type === 'result') formulae = [`${listsRef}!$C$2:$C$${RESULT_VALUES.length + 1}`];

    if (formulae) {
      ws.dataValidations.add(range, {
        type: 'list',
        allowBlank: !column.required,
        formulae,
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Valor no válido',
        error: 'Elige uno de la lista. Los valores de fuera se rechazan al importar.',
      });
    }
  });

  return ws;
}

/**
 * Escribe la plantilla en `destination` y devuelve la ruta.
 */
async function writeBacktestTemplate(destination) {
  // Carga perezosa, igual que en las exportaciones: exceljs pesa y solo hace falta aquí.
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trading Journal';
  workbook.created = new Date();

  const assets = allAssets();

  writeTradesSheet(workbook, assets);
  writeHelpSheet(workbook);
  writeListsSheet(workbook, assets);

  await workbook.xlsx.writeFile(destination);
  return destination;
}

module.exports = {
  writeBacktestTemplate,
  columnLetter,
  LAST_TEMPLATE_ROW,
};
