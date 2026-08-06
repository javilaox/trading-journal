/**
 * Escritura de los informes a disco. Vive en el proceso principal porque necesita `fs` y, en el
 * caso del PDF, una ventana de Electron.
 *
 * Recibe siempre la estructura que produce services/exportReports.js, así que Excel y PDF
 * muestran exactamente los mismos números.
 */

const fs = require('fs');

// La segunda sección del formato (tras el ';') es la de los números negativos: se pintan en
// rojo y con su signo, para que un gasto o una pérdida se distingan de un ingreso sin leer.
const MONEY_FORMAT = '#,##0.00 "€";[Red]-#,##0.00 "€"';
const NUMBER_FORMAT = '#,##0.00;[Red]-#,##0.00';
const PERCENT_FORMAT = '0.0"%";[Red]-0.0"%"';

/** Nombre de hoja válido para Excel: máx. 31 caracteres y sin : \ / ? * [ ] */
function safeSheetName(name, index) {
  const cleaned = String(name || `Hoja ${index + 1}`).replace(/[:\\/?*[\]]/g, '-');
  return cleaned.slice(0, 31) || `Hoja ${index + 1}`;
}

function numFormatFor(type) {
  if (type === 'money') return MONEY_FORMAT;
  if (type === 'number') return NUMBER_FORMAT;
  if (type === 'percent') return PERCENT_FORMAT;
  return null;
}

async function writeReportXlsx(report, destination) {
  // Carga perezosa: exceljs es pesado y solo hace falta cuando el usuario exporta.
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trading Journal';
  workbook.created = new Date();

  (report.sheets || []).forEach((sheet, index) => {
    const ws = workbook.addWorksheet(safeSheetName(sheet.name, index));
    const columns = sheet.columns || [];

    // Cabecera del informe: título y filtros aplicados, para que la hoja se entienda sola.
    const titleRow = ws.addRow([report.title || '']);
    titleRow.font = { bold: true, size: 14 };
    (report.meta || []).forEach((m) => {
      ws.addRow([`${m.label}: ${m.value}`]).font = { size: 9, color: { argb: 'FF6B7280' } };
    });
    ws.addRow([]);

    const headerRow = ws.addRow(columns.map((c) => c.header));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle' };
    });
    ws.views = [{ state: 'frozen', ySplit: headerRow.number }];

    (sheet.rows || []).forEach((row) => {
      const added = ws.addRow(columns.map((c) => row[c.key] ?? (c.type === 'text' ? '' : null)));
      columns.forEach((c, i) => {
        const fmt = numFormatFor(c.type);
        if (fmt) added.getCell(i + 1).numFmt = fmt;
      });
    });

    if (sheet.totals) {
      const values = columns.map((c, i) => {
        if (i === 0) return 'TOTAL';
        return Object.prototype.hasOwnProperty.call(sheet.totals, c.key) ? sheet.totals[c.key] : null;
      });
      const totalRow = ws.addRow(values);
      totalRow.font = { bold: true };
      columns.forEach((c, i) => {
        const fmt = numFormatFor(c.type);
        if (fmt) totalRow.getCell(i + 1).numFmt = fmt;
      });
      totalRow.eachCell((cell) => {
        cell.border = { top: { style: 'thin', color: { argb: 'FF9CA3AF' } } };
      });
    }

    // Ancho aproximado por contenido: sin esto sale todo con el ancho por defecto y hay que
    // ajustar las columnas a mano en cada exportación.
    columns.forEach((c, i) => {
      const lengths = [String(c.header).length].concat(
        (sheet.rows || []).slice(0, 200).map((r) => String(r[c.key] ?? '').length)
      );
      ws.getColumn(i + 1).width = Math.min(46, Math.max(10, Math.max(...lengths) + 2));
    });

    if (columns.length) {
      ws.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to: { row: headerRow.number, column: columns.length },
      };
    }
  });

  await workbook.xlsx.writeFile(destination);
  return destination;
}

/* ------------------------------------------------------------------ PDF */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCell(value, type) {
  if (value == null || value === '') return type === 'text' || !type ? '' : '—';
  if (type === 'money') return `${Number(value).toFixed(2)} €`;
  if (type === 'number') return Number(value).toFixed(2);
  if (type === 'percent') return `${Number(value).toFixed(1)} %`;
  return String(value);
}

/** Clase de color para los importes: en un informe impreso el signo se lee mejor con color. */
function toneClass(value, type) {
  if (type !== 'money' && type !== 'number') return '';
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return n > 0 ? 'pos' : 'neg';
}

function buildReportHtml(report) {
  const sheets = (report.sheets || [])
    .map((sheet) => {
      const columns = sheet.columns || [];
      const head = columns
        .map((c) => `<th class="${c.type === 'text' || !c.type ? '' : 'right'}">${escapeHtml(c.header)}</th>`)
        .join('');

      const body = (sheet.rows || [])
        .map(
          (row) =>
            `<tr>${columns
              .map((c) => {
                const align = c.type === 'text' || !c.type ? '' : 'right';
                const tone = toneClass(row[c.key], c.type);
                return `<td class="${align} ${tone}">${escapeHtml(formatCell(row[c.key], c.type))}</td>`;
              })
              .join('')}</tr>`
        )
        .join('');

      const totals = sheet.totals
        ? `<tr class="total">${columns
            .map((c, i) => {
              if (i === 0) return '<td>TOTAL</td>';
              const has = Object.prototype.hasOwnProperty.call(sheet.totals, c.key);
              const align = c.type === 'text' || !c.type ? '' : 'right';
              return `<td class="${align} ${has ? toneClass(sheet.totals[c.key], c.type) : ''}">${
                has ? escapeHtml(formatCell(sheet.totals[c.key], c.type)) : ''
              }</td>`;
            })
            .join('')}</tr>`
        : '';

      const summary = (sheet.summary || []).length
        ? `<div class="cards">${sheet.summary
            .map((s) => {
              // Los importes del resumen ya vienen formateados: basta con mirar el signo para
              // colorearlos igual que las celdas de la tabla.
              const text = String(s.value ?? '');
              const tone = text.startsWith('-') ? 'neg' : /^\+?[\d.,]/.test(text) && /€/.test(text) ? 'pos' : '';
              return `<div class="card"><span>${escapeHtml(s.label)}</span><strong class="${tone}">${escapeHtml(text)}</strong></div>`;
            })
            .join('')}</div>`
        : '';

      const empty = (sheet.rows || []).length
        ? ''
        : '<p class="empty">No hay datos con los filtros aplicados.</p>';

      return `
        <section>
          <h2>${escapeHtml(sheet.name)}</h2>
          ${summary}
          ${empty}
          ${
            (sheet.rows || []).length
              ? `<table><thead><tr>${head}</tr></thead><tbody>${body}${totals}</tbody></table>`
              : ''
          }
        </section>`;
    })
    .join('');

  const meta = (report.meta || [])
    .map((m) => `<div><span>${escapeHtml(m.label)}</span> ${escapeHtml(m.value)}</div>`)
    .join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    font-size: 11px;
  }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
  h1 { margin: 0 0 2px; font-size: 20px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 8px; }
  .meta { display: flex; flex-direction: column; gap: 2px; color: #475569; font-size: 10px; }
  .meta span { font-weight: 600; color: #0f172a; }
  /* Cada bloque intenta no partirse entre páginas; si no cabe, al menos la cabecera de la
     tabla se repite arriba (thead + display: table-header-group). */
  section { margin-bottom: 22px; page-break-inside: avoid; }
  h2 { font-size: 14px; margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .cards { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .card {
    border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;
    display: flex; flex-direction: column; min-width: 110px;
  }
  .card span { color: #64748b; font-size: 9px; }
  .card strong { font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th, td { padding: 5px 7px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  th { background: #0f172a; color: #fff; font-size: 10px; }
  td { font-size: 10px; }
  tr { page-break-inside: avoid; }
  .right { text-align: right; font-variant-numeric: tabular-nums; }
  .pos { color: #15803d; }
  .neg { color: #b91c1c; }
  .total td { font-weight: 700; border-top: 2px solid #0f172a; background: #f8fafc; }
  .empty { color: #64748b; font-style: italic; }
</style></head>
<body>
  <header>
    <h1>${escapeHtml(report.title || 'Informe')}</h1>
    <div class="subtitle">${escapeHtml(report.subtitle || '')}</div>
    <div class="meta">${meta}</div>
  </header>
  ${sheets}
</body></html>`;
}

/**
 * Genera el PDF con el propio motor de Chromium (printToPDF) en una ventana oculta, así no hace
 * falta ninguna librería de PDF y el informe se ve exactamente como el HTML.
 */
async function writeReportPdf(report, destination, { BrowserWindow }) {
  const html = buildReportHtml(report);

  // Sin `offscreen: true` a propósito: el renderizado offscreen da problemas con printToPDF en
  // algunas máquinas. Con `show: false` basta para que la ventana no se vea.
  const win = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false },
  });

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: true,
      margins: { top: 0.5, bottom: 0.5, left: 0.4, right: 0.4 },
    });
    fs.writeFileSync(destination, pdf);
    return destination;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/** Nombre de archivo sugerido: título del informe + fecha, sin caracteres problemáticos. */
function suggestedFileName(report, extension) {
  const base = String(report?.title || 'informe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base || 'informe'}_${stamp}${extension}`;
}

module.exports = {
  writeReportXlsx,
  writeReportPdf,
  buildReportHtml,
  suggestedFileName,
  safeSheetName,
  formatCell,
  __testing: { escapeHtml, numFormatFor },
};
