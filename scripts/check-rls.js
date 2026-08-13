/**
 * Auditoría de aislamiento entre usuarios sobre las migraciones de Supabase.
 *
 * Comprueba, leyendo el SQL del repositorio, que:
 *   1. Toda tabla de datos tiene RLS activado.
 *   2. Ninguna política es permisiva sin condición (`USING (true)` / `WITH CHECK (true)`), que es
 *      el fallo que dejó la tabla `trades` abierta a todos: las políticas permisivas se combinan
 *      con OR, así que una sola con `true` anula a todas las correctas.
 *   3. Cada tabla tiene política para SELECT, INSERT, UPDATE y DELETE atada a auth.uid().
 *
 * Es una comprobación estática: no sustituye a mirar la base real (una política puede haberse
 * creado a mano desde el panel de Supabase), pero evita que se cuele un descuido nuevo desde el
 * repositorio.
 *
 *   npm run check:rls
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'supabase', 'migrations');

// Tablas que no guardan datos de usuario o cuyo acceso se controla por otra vía (RPC con
// contraseña), con el motivo por el que se excluyen del requisito de las cuatro políticas.
const EXCEPCIONES = {
  backtest_reports: 'informes compartidos: una sola política ALL para el dueño',
  backtest_report_devices: 'solo lectura del dueño; el alta la hace la función open_backtest_report',
};

function leerSql() {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(DIR, f), 'utf8'))
    .join('\n');
}

function auditar(sql) {
  const problemas = [];

  const tablas = [...sql.matchAll(/create table if not exists "?public"?\."?(\w+)"?/gi)].map((m) => m[1]);
  const conRls = new Set(
    [...sql.matchAll(/alter table (?:only )?"?public"?\."?(\w+)"?\s+enable row level security/gi)].map((m) =>
      m[1].toLowerCase()
    )
  );

  /**
   * Las políticas se recorren EN ORDEN, aplicando cada create y cada drop sobre un estado.
   * Hace falta porque el patrón normal de las migraciones es "drop if exists" seguido de
   * "create": mirar solo si existe un drop con ese nombre daría por retirada una política que
   * justo después se vuelve a crear.
   */
  const vigentes = new Map(); // "tabla|nombre" -> { tabla, cmd, atada, abierta }
  const sentencias = [
    ...sql.matchAll(/create policy\s+"([^"]+)"\s+on\s+"?public"?\."?(\w+)"?\s*([\s\S]*?);/gi),
    ...sql.matchAll(/drop policy if exists\s+"([^"]+)"\s+on\s+"?public"?\."?(\w+)"?/gi),
  ].sort((a, b) => a.index - b.index);

  for (const m of sentencias) {
    const esCreate = /^create/i.test(m[0]);
    const clave = `${m[2]}|${m[1]}`;
    if (!esCreate) {
      vigentes.delete(clave);
      continue;
    }
    const cuerpo = m[3] || '';
    const plano = cuerpo.replace(/"/g, '').replace(/\s+/g, '').toLowerCase();
    vigentes.set(clave, {
      tabla: m[2],
      nombre: m[1],
      cmd: (/for\s+(\w+)/i.exec(cuerpo) || [null, 'ALL'])[1].toUpperCase(),
      atada: plano.includes('auth.uid()=user_id') || plano.includes('user_id=auth.uid()'),
      abierta: /using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)/i.test(cuerpo),
    });
  }

  const porTabla = new Map();
  for (const pol of vigentes.values()) {
    if (pol.abierta && !pol.atada) {
      problemas.push(`ABIERTA A TODOS: ${pol.tabla} · ${pol.cmd} · "${pol.nombre}"`);
    }
    if (!porTabla.has(pol.tabla)) porTabla.set(pol.tabla, new Set());
    if (pol.atada) porTabla.get(pol.tabla).add(pol.cmd);
  }

  for (const tabla of tablas) {
    if (!conRls.has(tabla.toLowerCase())) problemas.push(`SIN RLS: ${tabla}`);
    if (EXCEPCIONES[tabla]) continue;
    const cmds = porTabla.get(tabla) || new Set();
    if (cmds.has('ALL')) continue;
    const faltan = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].filter((c) => !cmds.has(c));
    if (faltan.length) problemas.push(`SIN POLÍTICA ${faltan.join('/')}: ${tabla}`);
  }

  return { tablas, problemas };
}

const { tablas, problemas } = auditar(leerSql());

if (problemas.length) {
  console.error('Problemas de aislamiento entre usuarios:\n');
  problemas.forEach((p) => console.error('  ✗ ' + p));
  process.exit(1);
}
console.log(`Aislamiento OK: ${tablas.length} tablas, todas con RLS y políticas por usuario.`);
