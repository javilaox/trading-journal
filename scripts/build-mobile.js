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

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY: la página móvil no podría iniciar sesión.');
  process.exit(1);
}

checkAssetCatalog();

const outDir = path.resolve(__dirname, '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'movil.html');
fs.writeFileSync(outFile, buildMobileHtml({ supabaseUrl, supabaseAnonKey }), 'utf8');

console.log('Versión móvil generada en', outFile);
console.log('Publícala (GitHub Pages sobre /docs) y ábrela desde el teléfono.');
