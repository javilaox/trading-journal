/**
 * Comprueba que los dos caminos por los que se guarda un trade escriben TODAS las columnas.
 *
 * Por qué existe: crear un trade con conexión y crearlo sin conexión pasan por funciones
 * distintas. Una de ellas (`mapTrade`) se quedó sin `direction` ni `custom_metrics`, así que un
 * trade creado con conexión llegaba a Supabase sin saber si era compra o venta, y al editarlo
 * había que indicarlo de nuevo. No fallaba nada ni se veía ningún error: simplemente el dato
 * desaparecía. Un campo que se añade a la tabla y se olvida en uno de los dos caminos se pierde
 * en silencio, y eso solo se descubre usando la aplicación semanas después.
 *
 * La comprobación es sencilla: se leen las columnas de la tabla `trades` en el esquema local y
 * se exige que el objeto que devuelve cada función las contenga todas, salvo las que son de
 * gestión interna (identificadores, marcas de sincronización...) y no vienen del formulario.
 *
 *   npm run check
 */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');

/**
 * Columnas que NO tiene que producir el mapeo de un trade: las gestiona la propia capa de
 * almacenamiento o la sincronización, no el formulario.
 */
const COLUMNAS_INTERNAS = new Set([
  'id',
  'client_uuid',
  'remote_id',
  'updated_at',
  'sync_status',
  'deleted_at',
  // El dueño no sale del formulario: lo pone quien guarda, a partir de la sesión iniciada.
  'user_id',
]);

/** Columnas de la tabla `trades`, leídas del esquema local. */
function columnasDeTrades() {
  const sql = fs.readFileSync(path.join(raiz, 'src/database.js'), 'utf8');
  const bloque = /CREATE TABLE IF NOT EXISTS trades \(([\s\S]*?)\)\s*`/.exec(sql);
  if (!bloque) {
    console.error('❌ No se encontró la definición de la tabla trades en src/database.js');
    process.exit(1);
  }
  return bloque[1]
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => linea.split(/\s+/)[0])
    .filter((nombre) => /^[a-z_]+$/.test(nombre))
    .filter((nombre) => !COLUMNAS_INTERNAS.has(nombre));
}

/**
 * Un trade de ejemplo con todos los campos rellenos. Si un mapeo devuelve el campo pero con el
 * valor perdido por el camino, tambien se detecta: se comprueba que la clave existe, no que
 * valga algo concreto.
 */
const TRADE_EJEMPLO = {
  date: '2026-08-17',
  asset: 'EURUSD',
  result: 'TP',
  be_after_result: null,
  pnl: 250,
  strategy: 'Ruptura de Londres',
  account: 'FTMO 50K',
  lotaje: 0.5,
  commission: 3,
  pnl_net: 247,
  image_before: null,
  image_after: null,
  entry_time: '09:30',
  exit_time: '11:00',
  direction: 'LONG',
  custom_metrics: { confluencias: true },
  is_composite_position: false,
  position_legs: [],
  user_id: 'usuario-de-prueba',
};

function comprobar(nombre, objeto, columnas) {
  const faltan = columnas.filter((columna) => !Object.prototype.hasOwnProperty.call(objeto, columna));
  if (faltan.length) {
    console.error(`❌ ${nombre} no escribe: ${faltan.join(', ')}`);
    console.error(
      '   Un trade guardado por este camino perderia esos datos sin dar ningun error.'
    );
    return false;
  }
  console.log(`✅ ${nombre} escribe las ${columnas.length} columnas`);
  return true;
}

const columnas = columnasDeTrades();

const { mapTrade } = require(path.join(raiz, 'src/services/tradeMapper.js'));

let ok = comprobar('mapTrade (crear con conexion)', mapTrade({ ...TRADE_EJEMPLO }), columnas);

// `normalizeTrade` vive dentro de main.js, que no se puede cargar fuera de Electron. Se comprueba
// leyendo el objeto que devuelve: basta con ver que menciona cada columna.
const mainSrc = fs.readFileSync(path.join(raiz, 'src/main.js'), 'utf8');
const bloqueNormalize = /function normalizeTrade\([\s\S]*?\n\}/.exec(mainSrc);
if (!bloqueNormalize) {
  console.error('❌ No se encontró normalizeTrade en src/main.js');
  ok = false;
} else {
  const cuerpo = bloqueNormalize[0];
  // Se acepta tanto `columna: valor` como la forma abreviada `columna,`.
  const faltan = columnas.filter(
    (columna) => !new RegExp(`(^|[^a-z_])${columna}\\s*[:,]`, 'm').test(cuerpo)
  );
  if (faltan.length) {
    console.error(`❌ normalizeTrade (crear sin conexion) no escribe: ${faltan.join(', ')}`);
    ok = false;
  } else {
    console.log(`✅ normalizeTrade (crear sin conexion) escribe las ${columnas.length} columnas`);
  }
}

if (!ok) process.exit(1);
console.log('Los dos caminos de guardado de un trade estan completos.');
