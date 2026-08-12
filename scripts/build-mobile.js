/**
 * Genera la versión móvil en docs/movil.html.
 *
 * Mismo planteamiento que el visor de informes: se publica una vez (GitHub Pages sobre docs/) y
 * se regenera con un script para que lo publicado no se quede atrás cuando cambie la página.
 *
 *   npm run build:mobile
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: path.resolve(
    __dirname,
    '..',
    process.env.APP_BUILD_ENV === 'staging' ? '.env.staging' : '.env.production'
  ),
});

const { buildMobileHtml } = require('../src/services/mobileAppPage');
const { assetValues } = require('../src/services/assetCatalog');
const { ACCOUNT_SIZES, CATEGORY_SUGGESTIONS } = require('../src/services/expenseOptions');

/**
 * El catálogo de activos está en dos sitios por necesidad: el desplegable del ordenador vive en
 * dashboard.html (HTML estático) y la versión móvil lo necesita como datos. Para que no se
 * separen en silencio, aquí se comparan y la generación falla si difieren: es preferible un
 * error al publicar que una versión móvil a la que le faltan activos.
 */
function checkAssetCatalog() {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'dashboard.html'), 'utf8');
  const start = html.indexOf('<select id="asset"');
  const block = html.slice(start, html.indexOf('</select>', start));
  const inHtml = [...block.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]).filter(Boolean);
  const inCatalog = assetValues();

  const missing = inHtml.filter((v) => inCatalog.indexOf(v) < 0);
  const extra = inCatalog.filter((v) => inHtml.indexOf(v) < 0);
  if (missing.length || extra.length) {
    console.error('El catálogo de activos no coincide con el desplegable de dashboard.html.');
    if (missing.length) console.error('  Faltan en src/services/assetCatalog.js:', missing.join(', '));
    if (extra.length) console.error('  Sobran en src/services/assetCatalog.js:', extra.join(', '));
    process.exit(1);
  }
  console.log('Catálogo de activos: ' + inCatalog.length + ' activos, coincide con la app.');
}

/** Mismo motivo que el catálogo de activos: las opciones de gastos no pueden separarse. */
function checkExpenseOptions() {
  const root = path.resolve(__dirname, '..', 'src');
  const html = fs.readFileSync(path.join(root, 'dashboard.html'), 'utf8');
  const start = html.indexOf('<select id="expenseFormAccountSize"');
  const block = html.slice(start, html.indexOf('</select>', start));
  const sizesInApp = [...block.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]).filter(Boolean);

  const renderer = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
  const catsLine = /const EXPENSE_CATEGORY_SUGGESTIONS = \[([^\]]*)\]/.exec(renderer);
  const catsInApp = catsLine
    ? catsLine[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
    : [];

  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  if (!same(sizesInApp, ACCOUNT_SIZES)) {
    console.error('Los tamaños de cuenta no coinciden con dashboard.html.');
    console.error('  App:', sizesInApp.join(', '));
    console.error('  services/expenseOptions.js:', ACCOUNT_SIZES.join(', '));
    process.exit(1);
  }
  if (catsInApp.length && !same(catsInApp, CATEGORY_SUGGESTIONS)) {
    console.error('Las categorías sugeridas no coinciden con renderer.js.');
    console.error('  App:', catsInApp.join(', '));
    console.error('  services/expenseOptions.js:', CATEGORY_SUGGESTIONS.join(', '));
    process.exit(1);
  }
  console.log('Opciones de gastos: ' + ACCOUNT_SIZES.length + ' tamaños y ' +
    CATEGORY_SUGGESTIONS.length + ' categorías, coinciden con la app.');
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY: la página móvil no podría iniciar sesión.');
  process.exit(1);
}

checkAssetCatalog();
checkExpenseOptions();

/**
 * Icono para el acceso directo del teléfono.
 *
 * Se extrae del mismo .ico que usa el instalador de Windows (la imagen de 256 px que lleva
 * dentro) en vez de mantener un PNG aparte: así el icono del móvil cambia solo cuando cambie el
 * de la aplicación, sin que nadie tenga que acordarse.
 */
function extractAppIcon(outDir) {
  const ico = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'assets', 'jlx-app-icon.ico'));
  const count = ico.readUInt16LE(4);
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  let best = null;
  for (let i = 0; i < count; i += 1) {
    const entry = 6 + i * 16;
    const width = ico.readUInt8(entry) || 256;
    const size = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    const isPng = ico.subarray(offset, offset + 8).equals(PNG_SIGNATURE);
    if (isPng && (!best || width > best.width)) best = { width, size, offset };
  }
  if (!best) {
    console.warn('El icono .ico no contiene ninguna imagen PNG; el móvil usará el icono genérico.');
    return;
  }

  fs.writeFileSync(path.join(outDir, 'icono.png'), ico.subarray(best.offset, best.offset + best.size));
  console.log('Icono del móvil: ' + best.width + 'x' + best.width + ' extraído del icono de la app.');
}

const outDir = path.resolve(__dirname, '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });
extractAppIcon(outDir);

const outFile = path.join(outDir, 'movil.html');
fs.writeFileSync(outFile, buildMobileHtml({ supabaseUrl, supabaseAnonKey }), 'utf8');

console.log('Versión móvil generada en', outFile);
console.log('Publícala (GitHub Pages sobre /docs) y ábrela desde el teléfono.');
