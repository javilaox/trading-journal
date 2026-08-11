/**
 * Genera el visor de informes compartidos en docs/visor.html.
 *
 * El visor lo publica el desarrollador UNA vez (GitHub Pages sobre la carpeta docs/, Netlify,
 * Cloudflare Pages...) y su dirección viaja dentro del build en SHARE_VIEWER_URL, de modo que
 * el cliente final no tiene que configurar nada.
 *
 * Se genera con un script y no a mano para que el archivo publicado no se quede atrás cuando
 * cambie el visor: basta con volver a ejecutarlo y subir el resultado.
 *
 *   npm run build:viewer
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

const { buildViewerHtml } = require('../src/services/backtestShareViewer');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY: el visor no podría pedir los datos.');
  process.exit(1);
}

const outDir = path.resolve(__dirname, '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'visor.html');
fs.writeFileSync(outFile, buildViewerHtml({ supabaseUrl, supabaseAnonKey }), 'utf8');

console.log('Visor generado en', outFile);
console.log('Publícalo (GitHub Pages sobre /docs) y define SHARE_VIEWER_URL con su dirección.');
