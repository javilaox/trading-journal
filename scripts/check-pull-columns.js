/**
 * Que ninguna columna que la bajada ESCRIBE se quede fuera de lo que se PIDE al servidor.
 *
 * La bajada de datos pide las columnas por su nombre, una a una, en vez de un `*`. Esa lista es
 * fácil de olvidar al añadir una columna nueva, y el olvido no da ningún error: el servidor
 * devuelve la fila sin ese campo, la fila local se reescribe con el valor por defecto y el dato
 * del usuario desaparece solo. Pasó con `expense_kind`, que al sincronizar devolvía a «prop» cada
 * gasto marcado como formación.
 *
 * La regla es la del daño real, no la de la simetría: una columna solo es un problema si la
 * bajada la escribe. Las que no toca -las que solo se llenan desde el equipo- pueden faltar en el
 * select sin que se pierda nada, y avisar de ellas solo enseñaría a ignorar este aviso.
 */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const mainJs = fs.readFileSync(path.join(raiz, 'src', 'main.js'), 'utf8');

/** El trozo de main.js que baja los datos. */
function regionDeLaBajada() {
  const desde = mainJs.indexOf('async function pullRemoteData');
  if (desde < 0) return '';
  const hasta = mainJs.indexOf('\n}\n', desde);
  return hasta > 0 ? mainJs.slice(desde, hasta) : mainJs.slice(desde);
}

/** Los servicios que la bajada usa para escribir en local (upsert...IntoLocal). */
function codigoDeLosServicios() {
  const dir = path.join(raiz, 'src', 'services');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
    .filter((src) => /function upsert\w*IntoLocal/.test(src))
    .join('\n');
}

/** Columnas que una tabla recibe al escribirse desde el servidor. */
function columnasQueSeEscriben(codigo, tabla) {
  const cols = new Set();

  // En un INSERT solo cuentan las columnas cuyo valor es un `?`: las que van con un literal
  // -un `1`, un `'synced'`- no toman nada del servidor, así que no las puede perder.
  const reInsert = new RegExp(`INSERT INTO ${tabla}\\s*\\(([^)]*)\\)\\s*VALUES\\s*\\(([^)]*)\\)`, 'gi');
  let m;
  while ((m = reInsert.exec(codigo))) {
    const nombres = m[1].split(',').map((c) => c.trim());
    const valores = m[2].split(',').map((v) => v.trim());
    nombres.forEach((nombre, i) => {
      if (valores[i] === '?') cols.add(nombre);
    });
  }

  const reUpdate = new RegExp(`UPDATE ${tabla}\\s+SET([\\s\\S]*?)WHERE`, 'gi');
  while ((m = reUpdate.exec(codigo))) {
    m[1].split(',').forEach((trozo) => {
      const asignacion = /^\s*(?:--[^\n]*\n\s*)*([a-z_]+)\s*=/i.exec(trozo);
      if (asignacion) cols.add(asignacion[1]);
    });
  }

  return cols;
}

/** Lo que la sincronización lleva por su cuenta; nunca viene del servidor. */
const CONTABILIDAD_DE_SINCRONIZACION = new Set([
  'id',
  'remote_id',
  'sync_status',
  'user_id',
  'client_uuid',
  'created_at',
  'updated_at',
  'deleted_at',
  'account_client_uuid',
]);

const region = regionDeLaBajada();
if (!region) {
  console.error('❌ No se encuentra pullRemoteData en src/main.js. ¿Ha cambiado de nombre?');
  process.exit(1);
}
const codigo = `${region}\n${codigoDeLosServicios()}`;

const selects = [];
const re = /\.from\('([a-z_]+)'\)[\s\S]{0,600}?\.select\(\s*'([^']+)'\s*\)/g;
let m;
while ((m = re.exec(region))) {
  if (m[2].trim() === '*') continue;
  selects.push({ tabla: m[1], pedidas: new Set(m[2].split(',').map((c) => c.trim())) });
}

if (!selects.length) {
  console.error('❌ La bajada no tiene ningún select con columnas nombradas. ¿Ha cambiado de forma?');
  process.exit(1);
}

let fallos = 0;
selects.forEach(({ tabla, pedidas }) => {
  const escritas = columnasQueSeEscriben(codigo, tabla);
  const enRiesgo = [...escritas].filter(
    (c) => c && !CONTABILIDAD_DE_SINCRONIZACION.has(c) && !pedidas.has(c)
  );
  if (enRiesgo.length) {
    fallos += 1;
    console.error(`❌ ${tabla}: la bajada escribe ${enRiesgo.join(', ')} pero no lo pide al servidor.`);
    console.error('   Ese dato se sobrescribe con su valor por defecto y se pierde, sin dar error.');
    console.error('   Añádelo al .select(...) de pullRemoteData en src/main.js.');
  } else {
    console.log(`   ${tabla}: pide todo lo que escribe`);
  }
});

if (fallos) process.exit(1);
console.log('✅ La bajada pide al servidor todas las columnas que luego escribe.');
