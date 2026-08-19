const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
let electronApp = null;
try {
  // Puede no estar disponible fuera de Electron (p.ej. scripts/tests en Node puro).
  ({ app: electronApp } = require('electron'));
} catch (err) {
  electronApp = null;
}

/**
 * CRÍTICO: la ruta de trades.db debe ser SIEMPRE la misma entre versiones de la app.
 * Antes se abría con la ruta relativa 'trades.db', que depende del cwd del proceso.
 * Squirrel.Windows instala cada actualización en una carpeta versionada distinta
 * (app-1.0.5, app-1.0.6, ...), así que con una ruta relativa cada actualización creaba
 * un trades.db nuevo y vacío en la carpeta de la nueva versión, perdiendo todo el caché
 * local de retiros/gastos/cuentas ya introducidos. Ahora se ancla a userData, que es
 * estable entre instalaciones y actualizaciones.
 */
function resolveTradesDbPath() {
  const userDataDir = electronApp && typeof electronApp.getPath === 'function'
    ? electronApp.getPath('userData')
    : null;
  if (!userDataDir) {
    // Fallback (tests / Node fuera de Electron): mantener el comportamiento anterior.
    return 'trades.db';
  }
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
  } catch (err) {
    console.warn('No se pudo asegurar el directorio userData:', err);
  }
  const targetPath = path.join(userDataDir, 'trades.db');
  migrateLegacyTradesDbIfNeeded(targetPath, userDataDir);
  return targetPath;
}

/**
 * Migración de una sola vez: si el trades.db "bueno" (en userData) todavía no existe,
 * busca un trades.db legacy (creado con la ruta relativa de versiones anteriores, en el
 * cwd del proceso o junto al ejecutable) y lo copia, para no perder el caché local de
 * quien actualiza desde una versión afectada por este bug.
 */
function findLegacySquirrelCandidates() {
  // Squirrel.Windows instala cada versión en <LOCALAPPDATA>\<AppId>\app-X.Y.Z\. Con la ruta
  // relativa antigua, trades.db se creaba dentro de esa carpeta versionada. Al actualizar, la
  // app pasa a ejecutarse desde una carpeta app-X.Y.Z distinta, así que hay que rastrear TODAS
  // las carpetas app-* hermanas (no solo la actual) para encontrar el trades.db de versiones
  // anteriores.
  try {
    if (!process.execPath) return [];
    // process.execPath packaged suele ser <LOCALAPPDATA>\<AppId>\app-X.Y.Z\TradingJournal.exe
    const versionDir = path.dirname(process.execPath); // .../app-X.Y.Z
    const appRoot = path.dirname(versionDir); // .../<AppId>
    if (!fs.existsSync(appRoot)) return [];
    const entries = fs.readdirSync(appRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('app-'))
      .map((entry) => path.join(appRoot, entry.name, 'trades.db'))
      .filter((candidate) => candidate !== path.join(versionDir, 'trades.db'));
  } catch (err) {
    console.warn('[database] Fallo rastreando carpetas app-* de Squirrel:', err);
    return [];
  }
}

function migrateLegacyTradesDbIfNeeded(targetPath, userDataDir) {
  try {
    if (fs.existsSync(targetPath)) return;
    const candidates = [
      path.join(process.cwd(), 'trades.db'),
      electronApp && electronApp.isPackaged && process.resourcesPath
        ? path.join(process.resourcesPath, '..', 'trades.db')
        : null,
      electronApp && process.execPath ? path.join(path.dirname(process.execPath), 'trades.db') : null,
      ...findLegacySquirrelCandidates(),
    ].filter(Boolean);
    // Si hay varios candidatos existentes, nos quedamos con el modificado más recientemente
    // (lo más probable es que sea el que tiene el caché más completo).
    const existing = candidates.filter((candidate) => candidate !== targetPath && fs.existsSync(candidate));
    if (existing.length > 1) {
      existing.sort((a, b) => {
        try {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        } catch (err) {
          return 0;
        }
      });
    }
    for (const candidate of existing.length ? [existing[0]] : candidates) {
      if (candidate !== targetPath && fs.existsSync(candidate)) {
        fs.copyFileSync(candidate, targetPath);
        // Copiar también los archivos WAL/SHM si existen, para no perder writes recientes.
        for (const ext of ['-wal', '-shm']) {
          const src = `${candidate}${ext}`;
          if (fs.existsSync(src)) {
            try {
              fs.copyFileSync(src, `${targetPath}${ext}`);
            } catch (err) {
              console.warn(`No se pudo copiar ${src}:`, err);
            }
          }
        }
        console.log(`[database] trades.db legacy migrado desde ${candidate} a ${targetPath}`);
        return;
      }
    }
  } catch (err) {
    console.warn('[database] Fallo comprobando trades.db legacy:', err);
  }
}

const db = new Database(resolveTradesDbPath());

// Rendimiento: WAL permite lecturas concurrentes con escrituras y acelera commits.
// synchronous=NORMAL es seguro con WAL (sin riesgo de corrupción ante crash de app).
try {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
} catch (err) {
  console.warn('SQLite pragma setup fallo (no crítico):', err);
}

function getTableColumns(tableName) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return new Set((rows || []).map((r) => String(r?.name || '').trim()).filter(Boolean));
  } catch (err) {
    console.warn(`SQLite PRAGMA table_info(${tableName}) fallo:`, err);
    return new Set();
  }
}

function addColumnIfMissing(tableName, columnName, columnDefSql) {
  const cols = getTableColumns(tableName);
  if (cols.has(columnName)) return;
  try {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefSql}`).run();
    console.log(`SQLite migrate: ${tableName} + ${columnName}`);
  } catch (err) {
    const msg = String(err?.message || err);
    // tolerante por si otra ruta ya la añadió
    if (msg.toLowerCase().includes('duplicate column') || msg.toLowerCase().includes('already exists')) return;
    throw err;
  }
}

function ensureTradesSchema() {
  // Asegurar columnas antes de crear índices o queries que las usen
  addColumnIfMissing('trades', 'user_id', 'user_id TEXT');
  addColumnIfMissing('trades', 'updated_at', 'updated_at TEXT');
  addColumnIfMissing('trades', 'be_after_result', 'be_after_result TEXT');
  addColumnIfMissing('trades', 'client_uuid', 'client_uuid TEXT');
  addColumnIfMissing('trades', 'remote_id', 'remote_id INTEGER');
  addColumnIfMissing('trades', 'sync_status', "sync_status TEXT DEFAULT 'synced'");
  addColumnIfMissing('trades', 'deleted_at', 'deleted_at TEXT');
  addColumnIfMissing('trades', 'entry_time', 'entry_time TEXT');
  addColumnIfMissing('trades', 'exit_time', 'exit_time TEXT');
  addColumnIfMissing('trades', 'is_composite_position', 'is_composite_position INTEGER DEFAULT 0');
  addColumnIfMissing('trades', 'position_legs', "position_legs TEXT DEFAULT '[]'");
  // Dirección (LONG/SHORT) y métricas personalizadas por estrategia. Opcionales en BD para no
  // invalidar los trades ya guardados sin estos datos.
  addColumnIfMissing('trades', 'direction', 'direction TEXT');
  addColumnIfMissing('trades', 'custom_metrics', "custom_metrics TEXT DEFAULT '{}'");
  // Operación registrada pero NO ejecutada («live testing»): la señal estaba y se apunta para
  // medir la estrategia, pero no se entró, así que no mueve dinero. Por defecto 0 = ejecutada,
  // que es lo que son todas las que ya existen.
  addColumnIfMissing('trades', 'live_testing', 'live_testing INTEGER DEFAULT 0');

  // Índice único solo después de asegurar client_uuid
  const cols = getTableColumns('trades');
  if (cols.has('client_uuid') && cols.has('user_id')) {
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS trades_user_client_uuid_unique
      ON trades(user_id, client_uuid)
      WHERE client_uuid IS NOT NULL
    `).run();
  }

  // Índices de rendimiento (todas las lecturas filtran por user_id)
  if (cols.has('user_id')) {
    db.prepare(`CREATE INDEX IF NOT EXISTS trades_user_idx ON trades(user_id)`).run();
  }
  if (cols.has('user_id') && cols.has('remote_id')) {
    db.prepare(`CREATE INDEX IF NOT EXISTS trades_user_remote_idx ON trades(user_id, remote_id)`).run();
  }
}

function ensureOfflineTables() {
  // Si por cualquier razón existiesen parcialmente, aseguramos columnas clave.
  const safeEnsure = (tableName, specs) => {
    const cols = getTableColumns(tableName);
    if (cols.size === 0) return; // si no existe aún, la creará el CREATE TABLE IF NOT EXISTS de abajo
    for (const [name, def] of specs) {
      addColumnIfMissing(tableName, name, def);
    }
  };

  safeEnsure('real_accounts', [
    ['user_id', 'user_id TEXT'],
    ['client_uuid', 'client_uuid TEXT'],
    ['remote_id', 'remote_id TEXT'],
    ['name', 'name TEXT'],
    ['prop_name', 'prop_name TEXT'],
    ['account_type', 'account_type TEXT'],
    ['account_number', 'account_number TEXT'],
    ['challenge_passed', 'challenge_passed INTEGER DEFAULT 0'],
    ['disabled_by_max_dd', 'disabled_by_max_dd INTEGER DEFAULT 0'],
    ["sync_status", "sync_status TEXT DEFAULT 'synced'"],
    ['deleted_at', 'deleted_at TEXT'],
    ['updated_at', 'updated_at TEXT'],
  ]);

  safeEnsure('real_strategies', [
    ['user_id', 'user_id TEXT'],
    ['client_uuid', 'client_uuid TEXT'],
    ['remote_id', 'remote_id TEXT'],
    ['name', 'name TEXT'],
    ['description', 'description TEXT'],
    ['schedule_enabled', 'schedule_enabled INTEGER DEFAULT 0'],
    ["operating_hours", "operating_hours TEXT DEFAULT '[]'"],
    // Checklist de métricas propio de cada estrategia (JSON).
    ["custom_metrics", "custom_metrics TEXT DEFAULT '[]'"],
    ["sync_status", "sync_status TEXT DEFAULT 'synced'"],
    ['deleted_at', 'deleted_at TEXT'],
    ['updated_at', 'updated_at TEXT'],
  ]);

  safeEnsure('sync_queue', [
    ['user_id', 'user_id TEXT'],
    ['entity_type', 'entity_type TEXT'],
    ['entity_local_id', 'entity_local_id TEXT'],
    ['action', 'action TEXT'],
    ['status', "status TEXT DEFAULT 'pending'"],
    ['payload_json', 'payload_json TEXT'],
    ['created_at', 'created_at TEXT'],
    ['updated_at', 'updated_at TEXT'],
    ['synced_at', 'synced_at TEXT'],
  ]);

  safeEnsure('backtesting_trades_local', [
    ['entry_time', 'entry_time TEXT'],
    ['exit_time', 'exit_time TEXT'],
  ]);

  safeEnsure('real_account_withdrawals', [
    ['user_id', 'user_id TEXT'],
    ['client_uuid', 'client_uuid TEXT'],
    ['remote_id', 'remote_id TEXT'],
    ['account_id', 'account_id TEXT'],
    ['account_client_uuid', 'account_client_uuid TEXT'],
    ['account_name', 'account_name TEXT'],
    ['amount', 'amount REAL'],
    ['date', 'date TEXT'],
    ['note', 'note TEXT'],
    ['created_at', 'created_at TEXT'],
    ['updated_at', 'updated_at TEXT'],
    ["sync_status", "sync_status TEXT DEFAULT 'synced'"],
    ['deleted_at', 'deleted_at TEXT'],
  ]);

  safeEnsure('real_account_expenses', [
    ['user_id', 'user_id TEXT'],
    ['client_uuid', 'client_uuid TEXT'],
    ['remote_id', 'remote_id TEXT'],
    ['account_id', 'account_id TEXT'],
    ['account_client_uuid', 'account_client_uuid TEXT'],
    ['account_name', 'account_name TEXT'],
    ['account_size', 'account_size TEXT'],
    ['amount', 'amount REAL'],
    ['date', 'date TEXT'],
    ['category', 'category TEXT'],
    ['note', 'note TEXT'],
    ['created_at', 'created_at TEXT'],
    ['updated_at', 'updated_at TEXT'],
    ["sync_status", "sync_status TEXT DEFAULT 'synced'"],
    ['deleted_at', 'deleted_at TEXT'],
  ]);

  safeEnsure('expense_props', [
    ['user_id', 'user_id TEXT'],
    ['client_uuid', 'client_uuid TEXT'],
    ['remote_id', 'remote_id TEXT'],
    ['name', 'name TEXT'],
    ['created_at', 'created_at TEXT'],
    ['updated_at', 'updated_at TEXT'],
    ["sync_status", "sync_status TEXT DEFAULT 'synced'"],
    ['deleted_at', 'deleted_at TEXT'],
  ]);
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_uuid TEXT,
    remote_id INTEGER,
    date TEXT,
    asset TEXT,
    result TEXT,
    be_after_result TEXT,
    pnl REAL,
    strategy TEXT,
    account TEXT,
    lotaje REAL,
    commission REAL,
    pnl_net REAL,
    image_before TEXT,
    image_after TEXT,
    direction TEXT,
    custom_metrics TEXT DEFAULT '{}',
    live_testing INTEGER DEFAULT 0,
    updated_at TEXT,
    user_id TEXT,
    sync_status TEXT,
    deleted_at TEXT
  )
`).run();

// Migración local: SIEMPRE antes de cualquier query que use columnas nuevas.
ensureTradesSchema();

// Entidades reales (offline cache + sync)
db.prepare(`
  CREATE TABLE IF NOT EXISTS real_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id TEXT,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0,
    commission_per_lot REAL DEFAULT 0,
    free_swap INTEGER DEFAULT 0,
    prop_name TEXT,
    account_type TEXT,
    account_number TEXT,
    challenge_passed INTEGER DEFAULT 0,
    disabled_by_max_dd INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT,
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS real_strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id TEXT,
    name TEXT NOT NULL,
    risk_type TEXT,
    risk_value REAL,
    rr REAL,
    notes TEXT,
    custom_metrics TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT,
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

// Backtesting (offline cache + sync)
db.prepare(`
  CREATE TABLE IF NOT EXISTS backtesting_trades_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id INTEGER,
    session_remote_id INTEGER,
    session_client_uuid TEXT,
    date TEXT,
    asset TEXT,
    strategy TEXT,
    session TEXT,
    direction TEXT,
    result TEXT,
    entry_price REAL,
    stop_loss REAL,
    take_profit REAL,
    rr_planned REAL,
    rr_result REAL,
    pnl REAL,
    notes TEXT,
    custom_metrics_json TEXT,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT,
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS backtesting_sessions_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id INTEGER,
    name TEXT,
    asset TEXT,
    strategy TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT,
    notes TEXT,
    account_capital REAL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT,
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS backtesting_settings_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id INTEGER,
    accounts_json TEXT,
    strategies_json TEXT,
    assets_json TEXT,
    sessions_json TEXT,
    default_account TEXT,
    default_strategy TEXT,
    default_asset TEXT,
    default_risk REAL DEFAULT 0,
    default_rr REAL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT,
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS backtesting_metrics_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id INTEGER,
    name TEXT,
    description TEXT,
    metric_type TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT,
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS backtesting_custom_metrics_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id INTEGER,
    name TEXT,
    description TEXT,
    metric_type TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT,
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS real_account_withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id TEXT,
    account_id TEXT,
    account_client_uuid TEXT,
    account_name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT DEFAULT 'synced',
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS real_account_withdrawals_user_id_idx
  ON real_account_withdrawals(user_id)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS real_account_withdrawals_account_name_idx
  ON real_account_withdrawals(user_id, account_name)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS real_account_withdrawals_date_idx
  ON real_account_withdrawals(user_id, date)
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS real_account_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id TEXT,
    account_id TEXT,
    account_client_uuid TEXT,
    account_name TEXT NOT NULL,
    account_size TEXT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    category TEXT,
    note TEXT,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT DEFAULT 'synced',
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS real_account_expenses_user_id_idx
  ON real_account_expenses(user_id)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS real_account_expenses_account_name_idx
  ON real_account_expenses(user_id, account_name)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS real_account_expenses_date_idx
  ON real_account_expenses(user_id, date)
`).run();

// Lista de "props" reutilizable en el formulario de Gastos: persiste aunque se borren
// todos los gastos que la referencian, y se sincroniza como el resto de entidades.
db.prepare(`
  CREATE TABLE IF NOT EXISTS expense_props (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id TEXT,
    name TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT DEFAULT 'synced',
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS expense_props_user_id_idx
  ON expense_props(user_id)
`).run();

db.prepare(`
  CREATE UNIQUE INDEX IF NOT EXISTS expense_props_user_name_unique
  ON expense_props(user_id, name)
  WHERE deleted_at IS NULL
`).run();

// Categorías de gasto: misma estructura y mismo trato que las props. Antes vivían solo en el
// localStorage del equipo, así que no viajaban a otros ordenadores ni al móvil.
db.prepare(`
  CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    client_uuid TEXT NOT NULL,
    remote_id TEXT,
    name TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT DEFAULT 'synced',
    deleted_at TEXT,
    UNIQUE(user_id, client_uuid)
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS expense_categories_user_id_idx
  ON expense_categories(user_id)
`).run();

db.prepare(`
  CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_user_name_unique
  ON expense_categories(user_id, name)
  WHERE deleted_at IS NULL
`).run();

// Cola de sincronización
db.prepare(`
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_local_id TEXT NOT NULL,
    entity_remote_id TEXT,
    action TEXT NOT NULL,
    payload_json TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_at TEXT
  )
`).run();

ensureOfflineTables();

// Índice de rendimiento para la cola de sync (selección por user_id + status en cada ciclo)
try {
  db.prepare(`
    CREATE INDEX IF NOT EXISTS sync_queue_user_status_idx
    ON sync_queue(user_id, status)
  `).run();
} catch (err) {
  console.warn('SQLite índice sync_queue fallo (no crítico):', err);
}

module.exports = db;
