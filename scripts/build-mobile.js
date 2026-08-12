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

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY: la página móvil no podría iniciar sesión.');
  process.exit(1);
}

const outDir = path.resolve(__dirname, '..', 'docs');
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'movil.html');
fs.writeFileSync(outFile, buildMobileHtml({ supabaseUrl, supabaseAnonKey }), 'utf8');

console.log('Versión móvil generada en', outFile);
console.log('Publícala (GitHub Pages sobre /docs) y ábrela desde el teléfono.');
