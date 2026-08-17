/**
 * Comprueba que ninguna etiqueta de la interfaz se quede sin traducir.
 *
 * Por que existe: cuando un `data-i18n="..."` apunta a una clave que no esta en los archivos de
 * idioma, la aplicacion no falla ni avisa: escribe el propio nombre interno en pantalla, y el
 * usuario acaba viendo un boton que pone "stats_range_month". Tampoco se ve al programar, porque
 * en el HTML esta escrito el texto correcto: solo aparece cuando se aplican las traducciones.
 *
 * Ademas compara los dos idiomas entre si, para que anadir una clave en castellano y olvidarla
 * en ingles se detecte aqui y no lo descubra un usuario con la aplicacion en ingles.
 *
 *   npm run check
 */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const es = JSON.parse(fs.readFileSync(path.join(raiz, 'src/i18n/es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(raiz, 'src/i18n/en.json'), 'utf8'));
const html = fs.readFileSync(path.join(raiz, 'src/dashboard.html'), 'utf8');

const ATRIBUTOS = ['data-i18n', 'data-i18n-placeholder', 'data-i18n-title', 'data-i18n-aria-label'];

const usadas = new Set();
ATRIBUTOS.forEach((attr) => {
  const re = new RegExp(`${attr}="([^"]+)"`, 'g');
  let m;
  while ((m = re.exec(html))) usadas.add(m[1]);
});

let ok = true;

const sinEs = [...usadas].filter((k) => !(k in es));
const sinEn = [...usadas].filter((k) => !(k in en));

if (sinEs.length) {
  console.error(`❌ Etiquetas sin traducir en es.json (se verian con su nombre interno): ${sinEs.join(', ')}`);
  ok = false;
}
if (sinEn.length) {
  console.error(`❌ Etiquetas sin traducir en en.json: ${sinEn.join(', ')}`);
  ok = false;
}

const soloEs = Object.keys(es).filter((k) => !(k in en));
const soloEn = Object.keys(en).filter((k) => !(k in es));
if (soloEs.length) {
  console.error(`❌ Claves que estan en castellano y no en ingles: ${soloEs.slice(0, 12).join(', ')}${soloEs.length > 12 ? '…' : ''}`);
  ok = false;
}
if (soloEn.length) {
  console.error(`❌ Claves que estan en ingles y no en castellano: ${soloEn.slice(0, 12).join(', ')}${soloEn.length > 12 ? '…' : ''}`);
  ok = false;
}

if (!ok) process.exit(1);
console.log(`✅ Traducciones completas: ${usadas.size} etiquetas usadas, ${Object.keys(es).length} claves en los dos idiomas.`);
