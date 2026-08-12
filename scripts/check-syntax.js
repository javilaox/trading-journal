/**
 * Comprobación de sintaxis equivalente a la que hace el empaquetado.
 *
 * `node --check` no basta: en modo laxo declarar dos veces la misma función es legal, así que
 * un duplicado pasaba la comprobación y reventaba después en `npm run make`, cuando webpack
 * analiza el archivo en modo estricto. Este script usa el mismo analizador que webpack (acorn)
 * con `sourceType: 'module'`, que es justo lo que detecta esos casos.
 *
 *   npm run check
 */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const FILES = [
  'src/renderer.js',
  'src/main.js',
  'src/preload.js',
  'src/stats.js',
];

// Todo lo de services/ y scripts/ entra automáticamente: así un archivo nuevo no se queda fuera.
for (const dir of ['src/services', 'scripts']) {
  const abs = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs)) {
    if (name.endsWith('.js')) FILES.push(`${dir}/${name}`);
  }
}

let failed = 0;
for (const rel of FILES) {
  const file = path.resolve(__dirname, '..', rel);
  if (!fs.existsSync(file)) continue;
  try {
    acorn.parse(fs.readFileSync(file, 'utf8'), {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowReturnOutsideFunction: true,
    });
  } catch (err) {
    failed += 1;
    console.error(`✗ ${rel}:${err.loc ? `${err.loc.line}:${err.loc.column}` : ''} ${err.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} archivo(s) con errores. El empaquetado fallaría igual.`);
  process.exit(1);
}
console.log(`Sintaxis correcta en ${FILES.length} archivos.`);
