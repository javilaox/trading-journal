/**
 * Squirrel.Windows: --squirrel-install | --squirrel-updated | --squirrel-uninstall | --squirrel-obsolete
 * Debe ejecutarse antes que el resto de la app (accesos directos, desinstalación, salida rápida).
 */
const { app, BrowserWindow, ipcMain, session, dialog, Menu } = require('electron');

const isDev = !app.isPackaged;
const started = require('electron-squirrel-startup');

if (started) {
  app.quit();
}
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./database');
const { supabase } = require('./services/supabaseClient');
const tradesService = require('./services/tradesService');
const backtestingService = require('./services/backtestingService');
const backtestingSettingsService = require('./services/backtestingSettingsService');
const backtestingSessionsService = require('./services/backtestingSessionsService');
const backtestingMetricsService = require('./services/backtestingMetricsService');
const { mapTrade } = require('./services/tradeMapper');
const {
  parsePositionLegs,
  serializePositionLegsForStorage,
  parsePositionLegsFromRow,
  isCompositePositionFlag,
  applyCompositeToTradeFields,
  sumLegsLotSize,
  hydrateTradeCompositeFields,
} = require('./services/positionLegsUtils');
const { parseOperatingHours } = require('./services/scheduleUtils');
const { getCurrentUserId, setCachedUserId } = require('./services/supabaseAuth');
const {
  claimLegacyTradesForUser,
  isTradeRowHidden,
  getTradesFromLocal,
  upsertTradesIntoLocal,
  loadTradesOfflineFirst
} = require('./services/offlineFirstTrades');
const {
  normalizeWithdrawalInput,
  mapWithdrawalRowToResponse,
  getWithdrawalsFromLocal,
  supabaseRowFromPayload,
  upsertWithdrawalsIntoLocal,
} = require('./services/realAccountWithdrawals');

let mainWindow = null;
let currentUserId = null;

function nowIso() {
  return new Date().toISOString();
}

function makeClientUuid() {
  // UUID v4 simple sin deps (suficiente como client_uuid local)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function stableClientUuidFromText(scope, text) {
  const s = `${String(scope || '')}::${String(text || '').trim().toLowerCase()}`;
  const hex = crypto.createHash('sha1').update(s).digest('hex').slice(0, 32);
  // formateo UUID-like: 8-4-4-4-12
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function enqueueSyncItem({
  userId,
  entityType,
  entityLocalId,
  entityRemoteId = null,
  action,
  payload,
}) {
  const created = nowIso();
  const payloadJson = payload != null ? JSON.stringify(payload) : null;

  // Si ya existe un pending_create para la misma entidad, lo actualizamos (evita duplicidades).
  const existing = db.prepare(`
    SELECT id, action
    FROM sync_queue
    WHERE user_id = ? AND entity_type = ? AND entity_local_id = ? AND status = 'pending'
    ORDER BY id DESC
    LIMIT 1
  `).get(String(userId), String(entityType), String(entityLocalId));

  if (existing && existing.action === 'create' && action === 'delete') {
    db.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(existing.id);
    return null;
  }

  // Evitar duplicados: si ya hay un pending_update para la misma entidad,
  // actualizamos el payload en lugar de insertar otro.
  if (existing && existing.action === 'update' && action === 'update') {
    db.prepare(`
      UPDATE sync_queue
      SET payload_json = ?, updated_at = ?
      WHERE id = ?
    `).run(payloadJson, created, existing.id);
    return existing.id;
  }

  if (existing && existing.action === 'update' && action === 'delete') {
    db.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(existing.id);
  } else if (existing && existing.action === 'delete' && action === 'delete') {
    db.prepare(`
      UPDATE sync_queue
      SET payload_json = ?, updated_at = ?, entity_remote_id = COALESCE(?, entity_remote_id)
      WHERE id = ?
    `).run(payloadJson, created, entityRemoteId != null ? String(entityRemoteId) : null, existing.id);
    return existing.id;
  }

  if (existing && existing.action === 'create' && (action === 'update' || action === 'create')) {
    db.prepare(`
      UPDATE sync_queue
      SET payload_json = ?, updated_at = ?
      WHERE id = ?
    `).run(payloadJson, created, existing.id);
    return existing.id;
  }

  const info = db.prepare(`
    INSERT INTO sync_queue
    (user_id, entity_type, entity_local_id, entity_remote_id, action, payload_json, status, error_message, created_at, updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, NULL)
  `).run(
    String(userId),
    String(entityType),
    String(entityLocalId),
    entityRemoteId != null ? String(entityRemoteId) : null,
    String(action),
    payloadJson,
    created,
    created
  );
  return info.lastInsertRowid;
}

function getSyncPendingCountForUser(userId) {
  if (!userId) return 0;
  const row = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM sync_queue
    WHERE user_id = ? AND status = 'pending'
  `).get(String(userId));
  return Number(row?.cnt || 0);
}

function getSyncFailedCountForUser(userId) {
  if (!userId) return 0;
  const row = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM sync_queue
    WHERE user_id = ? AND status = 'failed'
  `).get(String(userId));
  return Number(row?.cnt || 0);
}

function normalizeBoolInt(v) {
  return v ? 1 : 0;
}

function emitSyncStatus(state, extras = {}) {
  try {
    if (!mainWindow?.webContents) return;
    mainWindow.webContents.send('sync-status-changed', { state, ...extras });
  } catch (err) {
    console.warn('emitSyncStatus error:', err);
  }
}

async function checkInternetConnectionMain({ timeoutMs = 2500 } = {}) {
  const base =
    (process.env.SUPABASE_URL ? String(process.env.SUPABASE_URL) : '').replace(/\/+$/, '');
  const url = base ? `${base}/auth/v1/health` : 'https://www.gstatic.com/generate_204';

  if (typeof fetch !== 'function') return false;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort('timeout'), timeoutMs) : null;

  try {
    await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal
    });
    return true;
  } catch (err) {
    const msg = String(err?.message || err).toLowerCase();
    const looksOffline =
      msg.includes('failed to fetch') ||
      msg.includes('err_name_not_resolved') ||
      msg.includes('err_internet_disconnected') ||
      msg.includes('timeout') ||
      msg.includes('aborted');
    return !looksOffline;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

ipcMain.on('set-user-id', (event, userId) => {
  currentUserId = userId;
  setCachedUserId(userId);
});

ipcMain.handle('set-supabase-session', async (event, sessionData) => {
  try {
    if (!sessionData?.access_token || !sessionData?.refresh_token) {
      return { success: false, error: 'INVALID_SESSION' };
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token
    });

    if (error) {
      console.error('❌ Error seteando sesión Supabase en main:', error);
      return { success: false, error };
    }

    currentUserId = data?.user?.id || currentUserId;

    return { success: true, user_id: currentUserId };
  } catch (err) {
    console.error('❌ Excepción set-supabase-session:', err);
    return { success: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('copy-trade-image', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'INVALID_FILE_PATH' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'FILE_NOT_FOUND' };
    }

    const imagesDir = path.join(app.getPath('userData'), 'trade-images');

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const ext = path.extname(filePath) || '.png';
    const safeName = `trade_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const destination = path.join(imagesDir, safeName);

    fs.copyFileSync(filePath, destination);

    return {
      success: true,
      path: destination
    };
  } catch (error) {
    console.error('❌ Error copiando imagen de trade:', error);
    return { success: false, error: String(error?.message || error) };
  }
});

ipcMain.handle('select-and-copy-trade-image', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar imagen del trade',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    });

    if (result.canceled || !result.filePaths?.[0]) {
      return { success: false, cancelled: true };
    }

    const filePath = result.filePaths[0];

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'FILE_NOT_FOUND' };
    }

    const imagesDir = path.join(app.getPath('userData'), 'trade-images');

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const ext = path.extname(filePath) || '.png';
    const safeName = `trade_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const destination = path.join(imagesDir, safeName);

    fs.copyFileSync(filePath, destination);

    return {
      success: true,
      path: destination,
      originalPath: filePath,
      filename: path.basename(destination)
    };
  } catch (error) {
    console.error('❌ Error seleccionando/copiando imagen:', error);
    return { success: false, error: String(error?.message || error) };
  }
});

ipcMain.handle('read-trade-image', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'INVALID_FILE_PATH' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'FILE_NOT_FOUND' };
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';

    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');

    return {
      success: true,
      src: `data:${mime};base64,${base64}`
    };
  } catch (error) {
    console.error('❌ Error leyendo imagen de trade:', error);
    return { success: false, error: String(error?.message || error) };
  }
});

function resolveWindowIcon() {
  const packagedIcon = path.join(process.resourcesPath, 'jlx-app-icon.ico');
  if (app.isPackaged && fs.existsSync(packagedIcon)) {
    return packagedIcon;
  }
  return path.join(__dirname, '..', 'src', 'assets', 'jlx-app-icon.ico');
}

// 🖥️ Ventana
function createWindow() {
  const hasWebpackEntries = typeof MAIN_WINDOW_WEBPACK_ENTRY !== 'undefined' && typeof MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY !== 'undefined';
  const windowOptions = {
    width: 1200,
    height: 800,
    webPreferences: {
      preload: hasWebpackEntries ? MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY : path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
  if (process.platform === 'win32') {
    const iconPath = resolveWindowIcon();
    if (fs.existsSync(iconPath)) {
      windowOptions.icon = iconPath;
    }
  }
  mainWindow = new BrowserWindow(windowOptions);

  if (!isDev) {
    Menu.setApplicationMenu(null);
    mainWindow.removeMenu();
  }

  if (hasWebpackEntries) {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dashboard.html'));
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

const SUPABASE_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://unpkg.com; img-src 'self' data: blob: file:; style-src 'self' 'unsafe-inline';";

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType !== 'mainFrame' && details.resourceType !== 'subFrame') {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    const responseHeaders = { ...(details.responseHeaders || {}) };
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    responseHeaders['Content-Security-Policy'] = [SUPABASE_CSP];
    callback({ responseHeaders });
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function normalizeTimeField(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
}

function stringifyOperatingHoursForSqlite(hours) {
  return JSON.stringify(parseOperatingHours(hours));
}

function strategyFieldsFromPayload(strategy = {}) {
  const scheduleEnabled =
    strategy.schedule_enabled === true ||
    strategy.schedule_enabled === 1 ||
    strategy.schedule_enabled === '1' ||
    strategy.scheduleEnabled === true;
  return {
    description: strategy.description != null ? String(strategy.description) : '',
    schedule_enabled: scheduleEnabled ? 1 : 0,
    operating_hours: stringifyOperatingHoursForSqlite(strategy.operating_hours ?? strategy.operatingHours ?? '[]'),
  };
}

function strategyFieldsForSupabase(strategy = {}) {
  const fields = strategyFieldsFromPayload(strategy);
  return {
    description: fields.description || null,
    schedule_enabled: Boolean(fields.schedule_enabled),
    operating_hours: parseOperatingHours(fields.operating_hours),
  };
}

function normalizeTrade(trade = {}) {
  const legs = parsePositionLegs(trade.position_legs ?? trade.positionLegs ?? []);
  // La flag is_composite_position se calcula automáticamente en función del número de entradas:
  // - 2+ legs => posición construida
  // - 1 leg => trade normal (pero conservamos position_legs como referencia)
  const applied = applyCompositeToTradeFields({
    ...trade,
    position_legs: legs,
    positionLegs: legs,
  });
  const grossPnl = Number(applied.pnl ?? trade.pnl ?? trade.pnl_net ?? 0) || 0;
  const commission = Number(trade.commission ?? 0) || 0;
  const pnlNet = Number(trade.pnl_net ?? grossPnl - commission) || 0;
  const result = String(trade.result || '').toUpperCase();
  const beAfterRaw = String(trade.be_after_result ?? '').toUpperCase();
  const beAfterResult = result === 'BE' && (beAfterRaw === 'TP' || beAfterRaw === 'SL') ? beAfterRaw : null;
  return {
    date: trade.date || '',
    asset: trade.asset || '',
    result: trade.result || '',
    be_after_result: beAfterResult,
    pnl: grossPnl,
    strategy: trade.strategy || '',
    account: trade.account || '',
    lotaje: Number(applied.lotaje ?? trade.lotaje ?? trade.lotSize ?? 0) || 0,
    commission,
    pnl_net: pnlNet,
    image_before: trade.image_before || trade.beforeImage || '',
    image_after: trade.image_after || trade.afterImage || '',
    entry_time: normalizeTimeField(trade.entry_time ?? trade.entryTime),
    exit_time: normalizeTimeField(trade.exit_time ?? trade.exitTime),
    is_composite_position: Boolean(applied.is_composite_position),
    position_legs: applied.position_legs ?? legs,
  };
}

function mapRowToTradeResponse(row) {
  return hydrateTradeCompositeFields({
    id: row.id,
    client_uuid: row.client_uuid ?? null,
    remote_id: row.remote_id ?? null,
    sync_status: row.sync_status ?? null,
    date: row.date,
    asset: row.asset,
    result: row.result,
    be_after_result: row.be_after_result ?? null,
    pnl: Number(row.pnl ?? 0) || 0,
    strategy: row.strategy,
    account: row.account,
    lotaje: Number(row.lotaje ?? 0) || 0,
    lotSize: Number(row.lotaje ?? 0) || 0,
    commission: Number(row.commission ?? 0) || 0,
    pnl_net: Number(row.pnl_net ?? row.pnl ?? 0) || 0,
    beforeImage: row.image_before || '',
    afterImage: row.image_after || '',
    image_before: row.image_before || '',
    image_after: row.image_after || '',
    entry_time: row.entry_time || null,
    exit_time: row.exit_time || null,
    is_composite_position: row.is_composite_position,
    position_legs: row.position_legs ?? row.positionLegs,
  });
}

/** JWT primero; si falla (p. ej. sin red), usa user_id enviado desde el renderer vía set-user-id. */
async function resolveUserIdForLocalCache() {
  const fromJwt = await getCurrentUserId();
  if (fromJwt) return fromJwt;
  return currentUserId || null;
}

async function loadTradesOfflineFirstMain() {
  const userId = await resolveUserIdForLocalCache();
  const trades = await loadTradesOfflineFirst(
    db,
    tradesService,
    userId,
    mapRowToTradeResponse
  );
  console.log('✅ TRADES LISTOS:', trades.length);
  return trades;
}

ipcMain.handle('get-sync-pending-count', async () => {
  const userId = await resolveUserIdForLocalCache();
  return getSyncPendingCountForUser(userId);
});

ipcMain.handle('sync-pending-changes', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };
  try {
    const result = await syncPendingChanges(String(userId));
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('pull-remote-data', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };
  try {
    const result = await pullRemoteData(String(userId));
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('get-real-accounts-local', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return [];
  return db.prepare(`
    SELECT *
    FROM real_accounts
    WHERE user_id = ?
      AND (deleted_at IS NULL OR deleted_at = '')
    ORDER BY name COLLATE NOCASE ASC
  `).all(String(userId));
});

ipcMain.handle('get-real-strategies-local', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return [];
  return db.prepare(`
    SELECT *
    FROM real_strategies
    WHERE user_id = ?
      AND (deleted_at IS NULL OR deleted_at = '')
    ORDER BY name COLLATE NOCASE ASC
  `).all(String(userId));
});

ipcMain.handle('add-real-account-local', async (_event, account) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };
  const name = String(account?.name || '').trim();
  if (!name) return { success: false, error: 'MISSING_NAME' };

  const clientUuid = account?.client_uuid
    ? String(account.client_uuid)
    : stableClientUuidFromText(`real_account:${userId}`, name);
  const ts = nowIso();

  const existingBefore = db
    .prepare(
      `SELECT sync_status, remote_id FROM real_accounts WHERE user_id = ? AND client_uuid = ? LIMIT 1`
    )
    .get(String(userId), clientUuid);

  const syncAction =
    existingBefore &&
    (existingBefore.remote_id || String(existingBefore.sync_status || '') !== 'pending_create')
      ? 'update'
      : 'create';

  db.prepare(`
    INSERT INTO real_accounts
    (user_id, client_uuid, remote_id, name, balance, commission_per_lot, free_swap, is_active, created_at, updated_at, sync_status, deleted_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, 1, ?, ?, 'pending_create', NULL)
    ON CONFLICT(user_id, client_uuid) DO UPDATE SET
      name = excluded.name,
      balance = excluded.balance,
      commission_per_lot = excluded.commission_per_lot,
      free_swap = excluded.free_swap,
      updated_at = excluded.updated_at,
      sync_status = CASE
        WHEN real_accounts.sync_status LIKE 'pending_%' THEN real_accounts.sync_status
        ELSE 'pending_update'
      END,
      deleted_at = NULL
  `).run(
    String(userId),
    clientUuid,
    name,
    Number(account?.capital ?? account?.balance ?? 0) || 0,
    Number(account?.commissionPerLot ?? account?.commission_per_lot ?? 0) || 0,
    normalizeBoolInt(Boolean(account?.freeSwap ?? account?.free_swap)),
    ts,
    ts
  );

  enqueueSyncItem({
    userId,
    entityType: 'real_account',
    entityLocalId: clientUuid,
    entityRemoteId: existingBefore?.remote_id ? String(existingBefore.remote_id) : null,
    action: syncAction,
    payload: {
      user_id: String(userId),
      client_uuid: clientUuid,
      name,
      balance: Number(account?.capital ?? account?.balance ?? 0) || 0,
    }
  });

  return { success: true, client_uuid: clientUuid };
});

ipcMain.handle('add-real-strategy-local', async (_event, strategy) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };
  const name = String(strategy?.name || strategy || '').trim();
  if (!name) return { success: false, error: 'MISSING_NAME' };

  const clientUuid = strategy?.client_uuid
    ? String(strategy.client_uuid)
    : stableClientUuidFromText(`real_strategy:${userId}`, name);
  const ts = nowIso();
  const meta = strategyFieldsFromPayload({ ...strategy, name });

  const existing = db
    .prepare(
      `SELECT sync_status, remote_id FROM real_strategies WHERE user_id = ? AND client_uuid = ? LIMIT 1`
    )
    .get(String(userId), clientUuid);

  const syncAction =
    existing && String(existing.sync_status || '') !== 'pending_create' && existing.remote_id
      ? 'update'
      : 'create';

  db.prepare(`
    INSERT INTO real_strategies
    (user_id, client_uuid, remote_id, name, description, schedule_enabled, operating_hours, risk_type, risk_value, rr, notes, is_active, created_at, updated_at, sync_status, deleted_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 1, ?, ?, ?, NULL)
    ON CONFLICT(user_id, client_uuid) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      schedule_enabled = excluded.schedule_enabled,
      operating_hours = excluded.operating_hours,
      updated_at = excluded.updated_at,
      sync_status = CASE
        WHEN real_strategies.sync_status LIKE 'pending_%' THEN real_strategies.sync_status
        ELSE 'pending_update'
      END,
      deleted_at = NULL
  `).run(
    String(userId),
    clientUuid,
    name,
    meta.description,
    meta.schedule_enabled,
    meta.operating_hours,
    ts,
    ts,
    syncAction === 'create' ? 'pending_create' : 'pending_update'
  );

  enqueueSyncItem({
    userId,
    entityType: 'real_strategy',
    entityLocalId: clientUuid,
    entityRemoteId: existing?.remote_id ? String(existing.remote_id) : null,
    action: syncAction,
    payload: {
      user_id: String(userId),
      client_uuid: clientUuid,
      name,
      description: meta.description,
      schedule_enabled: Boolean(meta.schedule_enabled),
      operating_hours: parseOperatingHours(meta.operating_hours),
    },
  });

  return { success: true, client_uuid: clientUuid };
});

ipcMain.handle('update-real-account-local', async (_event, account) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  const clientUuid = account?.client_uuid ? String(account.client_uuid).trim() : '';
  const remoteId = account?.remote_id != null && account.remote_id !== '' ? String(account.remote_id).trim() : '';
  const rowId = account?.id != null && account.id !== '' ? account.id : null;
  const oldName = String(account?.oldName ?? account?.old_name ?? account?.originalName ?? '').trim();
  const name = String(account?.name || '').trim();
  if (!name) return { success: false, error: 'MISSING_NAME' };
  if (!clientUuid && !remoteId && rowId == null && !oldName) {
    return { success: false, error: 'MISSING_IDENTITY' };
  }

  const row =
    (clientUuid
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name FROM real_accounts
             WHERE user_id = ? AND client_uuid = ? LIMIT 1`
          )
          .get(String(userId), clientUuid)
      : null) ||
    (remoteId
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name FROM real_accounts
             WHERE user_id = ? AND remote_id = ? LIMIT 1`
          )
          .get(String(userId), remoteId)
      : null) ||
    (rowId != null
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name FROM real_accounts
             WHERE user_id = ? AND id = ? LIMIT 1`
          )
          .get(String(userId), rowId)
      : null) ||
    (oldName
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name FROM real_accounts
             WHERE user_id = ? AND name = ? AND (deleted_at IS NULL OR deleted_at = '')
             LIMIT 1`
          )
          .get(String(userId), oldName)
      : null);

  if (!row?.client_uuid) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const finalUuid = String(row.client_uuid);
  const ts = nowIso();
  const balance = Number(account?.capital ?? account?.balance ?? 0) || 0;
  const commission = Number(account?.commissionPerLot ?? account?.commission_per_lot ?? 0) || 0;
  const freeSwap = normalizeBoolInt(Boolean(account?.freeSwap ?? account?.free_swap));

  const syncAction =
    String(row.sync_status || '') === 'pending_create' && !row.remote_id ? 'create' : 'update';

  db.prepare(
    `UPDATE real_accounts SET
      name = ?,
      balance = ?,
      commission_per_lot = ?,
      free_swap = ?,
      updated_at = ?,
      sync_status = CASE
        WHEN sync_status = 'pending_create' THEN 'pending_create'
        ELSE 'pending_update'
      END,
      deleted_at = NULL
     WHERE user_id = ? AND client_uuid = ?`
  ).run(name, balance, commission, freeSwap, ts, String(userId), finalUuid);

  enqueueSyncItem({
    userId,
    entityType: 'real_account',
    entityLocalId: finalUuid,
    entityRemoteId: row.remote_id ? String(row.remote_id) : null,
    action: syncAction,
    payload: {
      user_id: String(userId),
      client_uuid: finalUuid,
      name,
      balance,
      commission_per_lot: commission,
      free_swap: freeSwap,
    },
  });

  return { success: true, client_uuid: finalUuid };
});

ipcMain.handle('update-real-strategy-local', async (_event, strategy) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  const clientUuid = strategy?.client_uuid ? String(strategy.client_uuid).trim() : '';
  const remoteId = strategy?.remote_id != null && strategy.remote_id !== '' ? String(strategy.remote_id).trim() : '';
  const rowId = strategy?.id != null && strategy.id !== '' ? strategy.id : null;
  const oldName = String(strategy?.oldName ?? strategy?.old_name ?? strategy?.originalName ?? '').trim();
  const name = String(strategy?.name || strategy || '').trim();
  if (!name) return { success: false, error: 'MISSING_NAME' };
  if (!clientUuid && !remoteId && rowId == null && !oldName) {
    return { success: false, error: 'MISSING_IDENTITY' };
  }

  const row =
    (clientUuid
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name, description, schedule_enabled, operating_hours
             FROM real_strategies WHERE user_id = ? AND client_uuid = ? LIMIT 1`
          )
          .get(String(userId), clientUuid)
      : null) ||
    (remoteId
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name, description, schedule_enabled, operating_hours
             FROM real_strategies WHERE user_id = ? AND remote_id = ? LIMIT 1`
          )
          .get(String(userId), remoteId)
      : null) ||
    (rowId != null
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name, description, schedule_enabled, operating_hours
             FROM real_strategies WHERE user_id = ? AND id = ? LIMIT 1`
          )
          .get(String(userId), rowId)
      : null) ||
    (oldName
      ? db
          .prepare(
            `SELECT client_uuid, remote_id, sync_status, name, description, schedule_enabled, operating_hours
             FROM real_strategies
             WHERE user_id = ? AND name = ? AND (deleted_at IS NULL OR deleted_at = '')
             LIMIT 1`
          )
          .get(String(userId), oldName)
      : null);

  if (!row?.client_uuid) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const finalUuid = String(row.client_uuid);
  const ts = nowIso();
  const meta = strategyFieldsFromPayload({ ...strategy, name });
  const syncAction =
    String(row.sync_status || '') === 'pending_create' && !row.remote_id ? 'create' : 'update';

  db.prepare(
    `UPDATE real_strategies SET
      name = ?,
      description = ?,
      schedule_enabled = ?,
      operating_hours = ?,
      updated_at = ?,
      sync_status = CASE
        WHEN sync_status = 'pending_create' THEN 'pending_create'
        ELSE 'pending_update'
      END,
      deleted_at = NULL
     WHERE user_id = ? AND client_uuid = ?`
  ).run(
    name,
    meta.description,
    meta.schedule_enabled,
    meta.operating_hours,
    ts,
    String(userId),
    finalUuid
  );

  enqueueSyncItem({
    userId,
    entityType: 'real_strategy',
    entityLocalId: finalUuid,
    entityRemoteId: row.remote_id ? String(row.remote_id) : null,
    action: syncAction,
    payload: {
      user_id: String(userId),
      client_uuid: finalUuid,
      name,
      description: meta.description,
      schedule_enabled: Boolean(meta.schedule_enabled),
      operating_hours: parseOperatingHours(meta.operating_hours),
    },
  });

  return { success: true, client_uuid: finalUuid };
});

ipcMain.handle('delete-real-account-local', async (_event, clientUuidOrName) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };
  const needle = String(clientUuidOrName || '').trim();
  if (!needle) return { success: false, error: 'MISSING_ID' };
  const ts = nowIso();

  const row = db.prepare(`
    SELECT client_uuid, remote_id, sync_status
    FROM real_accounts
    WHERE user_id = ? AND (client_uuid = ? OR name = ?)
    LIMIT 1
  `).get(String(userId), needle, needle);

  if (!row) return { success: true, skipped: true };

  db.prepare(`
    UPDATE real_accounts
    SET deleted_at = ?, sync_status = 'pending_delete', updated_at = ?
    WHERE user_id = ? AND client_uuid = ?
  `).run(ts, ts, String(userId), String(row.client_uuid));

  enqueueSyncItem({
    userId,
    entityType: 'real_account',
    entityLocalId: String(row.client_uuid),
    entityRemoteId: row.remote_id ? String(row.remote_id) : null,
    action: 'delete',
    payload: { user_id: String(userId), client_uuid: String(row.client_uuid), remote_id: row.remote_id || null }
  });

  return { success: true };
});

function resolveRealAccountMetaForWithdrawal(userId, accountName) {
  const name = String(accountName || '').trim();
  if (!name) return { account_id: null, account_client_uuid: null };
  const row = db
    .prepare(
      `SELECT remote_id, client_uuid FROM real_accounts
       WHERE user_id = ? AND name = ? AND (deleted_at IS NULL OR deleted_at = '')
       LIMIT 1`
    )
    .get(String(userId), name);
  return {
    account_id: row?.remote_id ? String(row.remote_id) : null,
    account_client_uuid: row?.client_uuid ? String(row.client_uuid) : null,
  };
}

ipcMain.handle('get-withdrawals-local', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return [];
  return getWithdrawalsFromLocal(db, userId);
});

ipcMain.handle('add-withdrawal-local', async (_event, raw) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  const clientUuid = raw?.client_uuid ? String(raw.client_uuid) : makeClientUuid();
  const normalized = normalizeWithdrawalInput({ ...raw, client_uuid: clientUuid }, userId);
  if (normalized.error) return { success: false, error: normalized.error };

  const accountMeta = resolveRealAccountMetaForWithdrawal(userId, normalized.account_name);
  const ts = nowIso();

  const info = db
    .prepare(
      `INSERT INTO real_account_withdrawals
       (user_id, client_uuid, remote_id, account_id, account_client_uuid, account_name, amount, date, note, created_at, updated_at, sync_status, deleted_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create', NULL)`
    )
    .run(
      String(userId),
      clientUuid,
      accountMeta.account_id,
      accountMeta.account_client_uuid,
      normalized.account_name,
      normalized.amount,
      normalized.date,
      normalized.note,
      ts,
      ts
    );

  const payload = {
    user_id: String(userId),
    client_uuid: clientUuid,
    account_id: accountMeta.account_id,
    account_name: normalized.account_name,
    amount: normalized.amount,
    date: normalized.date,
    note: normalized.note,
  };

  enqueueSyncItem({
    userId,
    entityType: 'real_account_withdrawal',
    entityLocalId: clientUuid,
    action: 'create',
    payload,
  });

  return {
    success: true,
    client_uuid: clientUuid,
    id: Number(info.lastInsertRowid),
    withdrawal: mapWithdrawalRowToResponse(
      db.prepare(`SELECT * FROM real_account_withdrawals WHERE id = ?`).get(Number(info.lastInsertRowid))
    ),
  };
});

ipcMain.handle('update-withdrawal-local', async (_event, raw) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  const localId = Number(raw?.id ?? raw?.localId);
  const clientUuid = raw?.client_uuid ? String(raw.client_uuid) : '';
  const existing = clientUuid
    ? db
        .prepare(`SELECT * FROM real_account_withdrawals WHERE user_id = ? AND client_uuid = ? LIMIT 1`)
        .get(String(userId), clientUuid)
    : Number.isFinite(localId)
      ? db.prepare(`SELECT * FROM real_account_withdrawals WHERE user_id = ? AND id = ? LIMIT 1`).get(String(userId), localId)
      : null;

  if (!existing) return { success: false, error: 'NOT_FOUND' };

  const normalized = normalizeWithdrawalInput(
    {
      ...raw,
      client_uuid: existing.client_uuid,
      account_name: raw?.account_name ?? raw?.accountName ?? existing.account_name,
      amount: raw?.amount ?? existing.amount,
      date: raw?.date ?? existing.date,
      note: raw?.note !== undefined ? raw.note : existing.note,
    },
    userId
  );
  if (normalized.error) return { success: false, error: normalized.error };

  const accountMeta = resolveRealAccountMetaForWithdrawal(userId, normalized.account_name);
  const ts = nowIso();

  db.prepare(
    `UPDATE real_account_withdrawals SET
      account_id = ?,
      account_client_uuid = ?,
      account_name = ?,
      amount = ?,
      date = ?,
      note = ?,
      updated_at = ?,
      sync_status = CASE
        WHEN sync_status = 'pending_create' THEN 'pending_create'
        ELSE 'pending_update'
      END
     WHERE user_id = ? AND id = ?`
  ).run(
    accountMeta.account_id,
    accountMeta.account_client_uuid,
    normalized.account_name,
    normalized.amount,
    normalized.date,
    normalized.note,
    ts,
    String(userId),
    Number(existing.id)
  );

  const payload = {
    user_id: String(userId),
    client_uuid: String(existing.client_uuid),
    remote_id: existing.remote_id ? String(existing.remote_id) : null,
    account_id: accountMeta.account_id,
    account_name: normalized.account_name,
    amount: normalized.amount,
    date: normalized.date,
    note: normalized.note,
  };

  enqueueSyncItem({
    userId,
    entityType: 'real_account_withdrawal',
    entityLocalId: String(existing.client_uuid),
    entityRemoteId: existing.remote_id ? String(existing.remote_id) : null,
    action: String(existing.sync_status) === 'pending_create' ? 'create' : 'update',
    payload,
  });

  return {
    success: true,
    withdrawal: mapWithdrawalRowToResponse(
      db.prepare(`SELECT * FROM real_account_withdrawals WHERE id = ?`).get(Number(existing.id))
    ),
  };
});

ipcMain.handle('delete-withdrawal-local', async (_event, idOrClientUuid) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };
  const needle = String(idOrClientUuid || '').trim();
  if (!needle) return { success: false, error: 'MISSING_ID' };
  const ts = nowIso();

  let row = db
    .prepare(
      `SELECT id, client_uuid, remote_id, sync_status FROM real_account_withdrawals
       WHERE user_id = ? AND client_uuid = ?
       LIMIT 1`
    )
    .get(String(userId), needle);
  if (!row && /^\d+$/.test(needle)) {
    row = db
      .prepare(
        `SELECT id, client_uuid, remote_id, sync_status FROM real_account_withdrawals
         WHERE user_id = ? AND id = ?
         LIMIT 1`
      )
      .get(String(userId), Number(needle));
  }

  if (!row) return { success: true, skipped: true };

  db.prepare(
    `UPDATE real_account_withdrawals
     SET deleted_at = ?, sync_status = 'pending_delete', updated_at = ?
     WHERE user_id = ? AND id = ?`
  ).run(ts, ts, String(userId), Number(row.id));

  enqueueSyncItem({
    userId,
    entityType: 'real_account_withdrawal',
    entityLocalId: String(row.client_uuid),
    entityRemoteId: row.remote_id ? String(row.remote_id) : null,
    action: 'delete',
    payload: {
      user_id: String(userId),
      client_uuid: String(row.client_uuid),
      remote_id: row.remote_id ? String(row.remote_id) : null,
    },
  });

  return { success: true };
});

ipcMain.handle('delete-real-strategy-local', async (_event, clientUuidOrName) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };
  const needle = String(clientUuidOrName || '').trim();
  if (!needle) return { success: false, error: 'MISSING_ID' };
  const ts = nowIso();

  const row = db.prepare(`
    SELECT client_uuid, remote_id, sync_status
    FROM real_strategies
    WHERE user_id = ? AND (client_uuid = ? OR name = ?)
    LIMIT 1
  `).get(String(userId), needle, needle);

  if (!row) return { success: true, skipped: true };

  db.prepare(`
    UPDATE real_strategies
    SET deleted_at = ?, sync_status = 'pending_delete', updated_at = ?
    WHERE user_id = ? AND client_uuid = ?
  `).run(ts, ts, String(userId), String(row.client_uuid));

  enqueueSyncItem({
    userId,
    entityType: 'real_strategy',
    entityLocalId: String(row.client_uuid),
    entityRemoteId: row.remote_id ? String(row.remote_id) : null,
    action: 'delete',
    payload: { user_id: String(userId), client_uuid: String(row.client_uuid), remote_id: row.remote_id || null }
  });

  return { success: true };
});

ipcMain.handle('add-trade', async (event, trade) => {
  console.log('🔥 ADD-TRADE EJECUTADO');

  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('❌ Sin usuario autenticado (Supabase)');
    return { success: false, error: 'NO_USER_ID' };
  }

  console.log('📥 Trade recibido en main:', trade);

  const mapped = mapTrade({
    ...trade,
    user_id: userId
  });

  const gross = Number(mapped.pnl ?? trade.pnl ?? 0);
  const comm = Number(mapped.commission ?? trade.commission ?? 0);
  const rawNet = trade.pnl_net;
  const explicitNet =
    rawNet !== undefined && rawNet !== null && rawNet !== '' ? Number(rawNet) : NaN;
  const resolvedNet = Number.isFinite(explicitNet) ? explicitNet : gross - comm;

  const supabaseTrade = {
    date: mapped.date ?? trade.date,
    asset: mapped.asset ?? trade.asset,
    result: mapped.result ?? trade.result,
    be_after_result:
      String(mapped.result ?? trade.result ?? '').toUpperCase() === 'BE'
        ? (mapped.be_after_result ?? trade.be_after_result ?? null)
        : null,
    pnl: Number.isFinite(gross) ? gross : 0,
    strategy: mapped.strategy ?? trade.strategy,
    account: mapped.account ?? trade.account ?? null,
    lotaje: Number(mapped.lotaje ?? trade.lotaje ?? 0),
    commission: Number.isFinite(comm) ? comm : 0,
    pnl_net: Number.isFinite(resolvedNet) ? resolvedNet : 0,
    image_before: mapped.image_before ?? trade.image_before ?? null,
    image_after: mapped.image_after ?? trade.image_after ?? null,
    entry_time: mapped.entry_time ?? null,
    exit_time: mapped.exit_time ?? null,
    is_composite_position: Boolean(mapped.is_composite_position),
    // Conservamos position_legs incluso cuando es 1 sola entrada (trade de referencia).
    position_legs: mapped.position_legs || [],
    user_id: userId
  };

  if (isNaN(supabaseTrade.pnl)) {
    console.error('❌ pnl inválido:', trade.pnl);
    return { success: false, error: 'INVALID_PNL' };
  }

  console.log('📤 TRADE FINAL A SUPABASE:', supabaseTrade);

  try {
    const result = await tradesService.addTrade(supabaseTrade);

    console.log('📥 RESPUESTA SUPABASE:', result);

    if (!result.success) {
      console.error('❌ Error Supabase:', result.error);
      return { success: false, error: result.error };
    }

    console.log('✅ INSERT OK');

    const row = Array.isArray(result.data) && result.data[0] ? result.data[0] : null;
    if (row) {
      try {
        upsertTradesIntoLocal(db, [row], userId, '📥 add-trade');
      } catch (cacheErr) {
        console.warn('⚠️ No se pudo cachear trade tras insert online:', cacheErr);
      }
    }
    return { success: true, data: result.data, id: row?.id };
  } catch (err) {
    console.error('❌ EXCEPCIÓN:', err);
    return { success: false, error: err };
  }
});

/**
 * Crear trade OFFLINE:
 * - Inserta en SQLite inmediatamente (id negativo temporal)
 * - Encola acción create en sync_queue (pending)
 */
ipcMain.handle('add-trade-offline', async (event, trade) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  const mapped = normalizeTrade(trade || {});
  const createdAt = nowIso();
  const clientUuid = trade?.client_uuid ? String(trade.client_uuid) : makeClientUuid();

  // ID temporal negativo (evita colisión con ids remotos)
  const tempId = -Math.floor(Date.now());

  try {
    const legsJson = serializePositionLegsForStorage(mapped.position_legs);

    db.prepare(`
      INSERT INTO trades
      (id, client_uuid, remote_id, date, asset, result, be_after_result, pnl, strategy, account, lotaje, commission, pnl_net, image_before, image_after, entry_time, exit_time, is_composite_position, position_legs, updated_at, user_id, sync_status, deleted_at)
      VALUES
      (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      tempId,
      clientUuid,
      mapped.date,
      mapped.asset,
      mapped.result,
      mapped.be_after_result ?? null,
      Number(mapped.pnl ?? 0) || 0,
      mapped.strategy || '',
      mapped.account || '',
      Number(mapped.lotaje ?? 0) || 0,
      Number(mapped.commission ?? 0) || 0,
      Number(mapped.pnl_net ?? mapped.pnl ?? 0) || 0,
      mapped.image_before || '',
      mapped.image_after || '',
      mapped.entry_time,
      mapped.exit_time,
      mapped.is_composite_position ? 1 : 0,
      legsJson,
      createdAt,
      String(userId),
      'pending_create'
    );
  } catch (err) {
    console.error('❌ add-trade-offline sqlite insert:', err);
    return { success: false, error: String(err?.message || err) };
  }

  enqueueSyncItem({
    userId,
    entityType: 'trade',
    entityLocalId: String(tempId),
    action: 'create',
    payload: { ...mapped, user_id: String(userId), client_uuid: clientUuid },
  });

  console.log('✅ Trade guardado offline. Pendiente de sync.', { tempId, userId, clientUuid });
  return { success: true, id: tempId, offline: true };
});

// ------------------------ Sync engine (FASE 2) ------------------------

function parseJsonSafe(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

function markQueueStatus(id, status, { errorMessage = null, syncedAt = null } = {}) {
  const ts = nowIso();
  db.prepare(`
    UPDATE sync_queue
    SET status = ?, error_message = ?, updated_at = ?, synced_at = COALESCE(?, synced_at)
    WHERE id = ?
  `).run(String(status), errorMessage, ts, syncedAt, Number(id));
}

function selectQueueItems(userId) {
  return db.prepare(`
    SELECT *
    FROM sync_queue
    WHERE user_id = ?
      AND status IN ('pending', 'failed')
    ORDER BY datetime(created_at) ASC, id ASC
  `).all(String(userId));
}

function getLocalTradeById(userId, localId) {
  return db.prepare(`
    SELECT *
    FROM trades
    WHERE user_id = ? AND id = ?
    LIMIT 1
  `).get(String(userId), Number(localId));
}

async function upsertTradeRemote({ userId, payload }) {
  const client_uuid = payload?.client_uuid ? String(payload.client_uuid) : null;
  const row = {
    user_id: String(userId),
    client_uuid,
    date: payload.date || '',
    asset: payload.asset || '',
    result: payload.result || '',
    be_after_result: payload.be_after_result ?? null,
    pnl: Number(payload.pnl ?? 0) || 0,
    strategy: payload.strategy || '',
    account: payload.account || null,
    lotaje: Number(payload.lotaje ?? 0) || 0,
    commission: Number(payload.commission ?? 0) || 0,
    pnl_net: Number(payload.pnl_net ?? payload.pnl ?? 0) || 0,
    image_before: payload.image_before ?? null,
    image_after: payload.image_after ?? null,
    entry_time: normalizeTimeField(payload.entry_time) ?? null,
    exit_time: normalizeTimeField(payload.exit_time) ?? null,
    is_composite_position: Boolean(payload.is_composite_position),
    // Conservamos position_legs incluso cuando no es posición construida.
    position_legs: payload.position_legs || [],
    updated_at: nowIso(),
  };

  const { data, error } = await supabase.from('trades').insert(row).select('id, client_uuid').single();
  if (!error) return { id: data?.id, client_uuid: data?.client_uuid || client_uuid };

  const msg = String(error?.message || '').toLowerCase();
  const isConflict = msg.includes('duplicate key') || msg.includes('unique') || error?.code === '23505';
  if (isConflict && client_uuid) {
    const lookup = await supabase
      .from('trades')
      .select('id, client_uuid')
      .eq('user_id', String(userId))
      .eq('client_uuid', client_uuid)
      .maybeSingle();
    if (!lookup.error && lookup.data?.id) return { id: lookup.data.id, client_uuid };
  }
  throw error;
}

async function updateTradeRemote({ userId, payload, remoteId }) {
  const id = Number(remoteId);
  const client_uuid = payload?.client_uuid ? String(payload.client_uuid) : null;
  const legs = parsePositionLegs(payload.position_legs ?? payload.positionLegs ?? []);
  // Se recalcula en función de la cantidad de legs (2+ => posición construida)
  const composite = legs.length >= 2;
  const patch = {
    client_uuid,
    date: payload.date || '',
    asset: payload.asset || '',
    result: payload.result || '',
    be_after_result: payload.be_after_result ?? null,
    pnl: Number(payload.pnl ?? 0) || 0,
    strategy: payload.strategy || '',
    account: payload.account || null,
    lotaje: Number(payload.lotaje ?? 0) || 0,
    commission: Number(payload.commission ?? 0) || 0,
    pnl_net: Number(payload.pnl_net ?? payload.pnl ?? 0) || 0,
    image_before: payload.image_before ?? null,
    image_after: payload.image_after ?? null,
    entry_time: normalizeTimeField(payload.entry_time) ?? null,
    exit_time: normalizeTimeField(payload.exit_time) ?? null,
    is_composite_position: composite,
    position_legs: legs,
    updated_at: nowIso(),
  };

  console.log('[updateTrade] payload position_legs', composite ? legs.length : 0, composite ? legs : []);

  if (Number.isFinite(id) && id > 0) {
    const { data, error } = await supabase
      .from('trades')
      .update(patch)
      .eq('id', id)
      .eq('user_id', String(userId))
      .select('*')
      .single();
    if (error) throw error;
    return { row: data, id: data?.id, client_uuid: data?.client_uuid || client_uuid };
  }

  if (client_uuid) {
    const { data, error } = await supabase
      .from('trades')
      .update(patch)
      .eq('user_id', String(userId))
      .eq('client_uuid', client_uuid)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return { row: data, id: data.id, client_uuid: data.client_uuid || client_uuid };
  }

  throw new Error('REMOTE_ID_NOT_FOUND');
}

async function deleteTradeRemote({ userId, remoteId, clientUuid }) {
  const id = Number(remoteId);
  if (Number.isFinite(id) && id > 0) {
    const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', String(userId));
    if (error) throw error;
    return;
  }
  if (clientUuid) {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', String(userId))
      .eq('client_uuid', String(clientUuid));
    if (error) throw error;
  }
}

async function syncPendingChanges(userId) {
  const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);
  if (!online) {
    emitSyncStatus('offline', { pending: getSyncPendingCountForUser(userId), failed: getSyncFailedCountForUser(userId) });
    return { skipped: true, reason: 'OFFLINE' };
  }

  emitSyncStatus('syncing', { pending: getSyncPendingCountForUser(userId) });

  const items = selectQueueItems(userId);
  let ok = 0;
  let failed = 0;

  for (const item of items) {
    markQueueStatus(item.id, 'syncing');
    const entityType = String(item.entity_type || '');
    const action = String(item.action || '');
    const payload = parseJsonSafe(item.payload_json, {});

    try {
      if (entityType === 'trade') {
        const localId = String(item.entity_local_id || '');
        const localRow = getLocalTradeById(userId, localId);
        const clientUuid = payload?.client_uuid || localRow?.client_uuid || null;
        const remoteId = item.entity_remote_id || localRow?.remote_id || null;

        if (action === 'create') {
          const res = await upsertTradeRemote({ userId, payload: { ...payload, client_uuid: clientUuid } });
          db.prepare(`
            UPDATE trades
            SET remote_id = ?, client_uuid = COALESCE(?, client_uuid), sync_status = 'synced', updated_at = ?
            WHERE user_id = ? AND id = ?
          `).run(Number(res.id), res.client_uuid, nowIso(), String(userId), Number(localId));
          db.prepare(`UPDATE sync_queue SET entity_remote_id = ? WHERE id = ?`).run(String(res.id), Number(item.id));
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }

        if (action === 'update') {
          const syncPayload = normalizeTrade({ ...payload, client_uuid: clientUuid });
          console.log('[sync_queue] pending_update position_legs', parsePositionLegs(syncPayload.position_legs).length);
          const res = await updateTradeRemote({ userId, payload: syncPayload, remoteId });
          const ts = nowIso();
          writeTradeUpdateToSqlite(userId, Number(localId), syncPayload, 'synced', ts);
          if (res?.row) {
            upsertTradesIntoLocal(db, [res.row], userId, '📥 sync-update');
          }
          db.prepare(`
            UPDATE trades
            SET remote_id = COALESCE(?, remote_id), client_uuid = COALESCE(?, client_uuid), sync_status = 'synced', updated_at = ?
            WHERE user_id = ? AND id = ?
          `).run(Number(res.id), res.client_uuid, ts, String(userId), Number(localId));
          db.prepare(`UPDATE sync_queue SET entity_remote_id = COALESCE(entity_remote_id, ?) WHERE id = ?`).run(String(res.id), Number(item.id));
          markQueueStatus(item.id, 'synced', { syncedAt: ts });
          ok += 1;
          continue;
        }

        if (action === 'delete') {
          if (String(localRow?.sync_status || '') === 'pending_create' && !localRow?.remote_id && !item.entity_remote_id) {
            db.prepare(`
              UPDATE trades
              SET deleted_at = ?, sync_status = 'synced'
              WHERE user_id = ? AND id = ?
            `).run(nowIso(), String(userId), Number(localId));
            markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
            ok += 1;
            continue;
          }

          await deleteTradeRemote({ userId, remoteId, clientUuid });
          db.prepare(`
            UPDATE trades
            SET deleted_at = ?, sync_status = 'synced'
            WHERE user_id = ? AND id = ?
          `).run(nowIso(), String(userId), Number(localId));
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }
      }

      if (entityType === 'real_account') {
        const clientUuid = String(item.entity_local_id || '');
        const remoteId = item.entity_remote_id || null;
        const payloadName = String(payload?.name || '').trim();
        const payloadUuid = payload?.client_uuid ? String(payload.client_uuid) : clientUuid;
        const payloadBalance = Number(payload?.balance ?? 0) || 0;

        if (action === 'create') {
          const row = { user_id: String(userId), client_uuid: payloadUuid, name: payloadName, balance: payloadBalance };
          const ins = await supabase.from('real_accounts').insert(row).select('id, client_uuid').single();
          if (ins.error) {
            const msg = String(ins.error?.message || '').toLowerCase();
            const isConflict = msg.includes('duplicate key') || msg.includes('unique') || ins.error?.code === '23505';
            if (isConflict) {
              const lookup = await supabase
                .from('real_accounts')
                .select('id, client_uuid')
                .eq('user_id', String(userId))
                .eq('client_uuid', payloadUuid)
                .maybeSingle();
              if (lookup.error || !lookup.data?.id) throw ins.error;
              db.prepare(`
                UPDATE real_accounts
                SET remote_id = ?, sync_status = 'synced', updated_at = ?
                WHERE user_id = ? AND client_uuid = ?
              `).run(String(lookup.data.id), nowIso(), String(userId), payloadUuid);
              db.prepare(`UPDATE sync_queue SET entity_remote_id = ? WHERE id = ?`).run(String(lookup.data.id), Number(item.id));
              markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
              ok += 1;
              continue;
            }
            throw ins.error;
          }
          db.prepare(`
            UPDATE real_accounts
            SET remote_id = ?, sync_status = 'synced', updated_at = ?
            WHERE user_id = ? AND client_uuid = ?
          `).run(String(ins.data.id), nowIso(), String(userId), payloadUuid);
          db.prepare(`UPDATE sync_queue SET entity_remote_id = ? WHERE id = ?`).run(String(ins.data.id), Number(item.id));
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }

        if (action === 'update') {
          const patch = {
            name: payloadName || undefined,
            balance: payloadBalance,
          };
          if (remoteId) {
            const upd = await supabase
              .from('real_accounts')
              .update(patch)
              .eq('id', String(remoteId))
              .eq('user_id', String(userId));
            if (upd.error) throw upd.error;
          } else {
            const upd = await supabase
              .from('real_accounts')
              .update(patch)
              .eq('user_id', String(userId))
              .eq('client_uuid', payloadUuid);
            if (upd.error) throw upd.error;
          }
          db.prepare(
            `UPDATE real_accounts
             SET name = COALESCE(?, name),
                 balance = ?,
                 sync_status = 'synced',
                 updated_at = ?
             WHERE user_id = ? AND client_uuid = ?`
          ).run(payloadName || null, payloadBalance, nowIso(), String(userId), payloadUuid);
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }

        if (action === 'delete') {
          // Si nunca subió, solo marcamos synced localmente.
          const local = db.prepare(`
            SELECT remote_id, sync_status
            FROM real_accounts
            WHERE user_id = ? AND client_uuid = ?
          `).get(String(userId), payloadUuid);

          if (!local?.remote_id && String(local?.sync_status || '').startsWith('pending_')) {
            db.prepare(`
              UPDATE real_accounts
              SET sync_status = 'synced', deleted_at = COALESCE(deleted_at, ?), updated_at = ?
              WHERE user_id = ? AND client_uuid = ?
            `).run(nowIso(), nowIso(), String(userId), payloadUuid);
            markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
            ok += 1;
            continue;
          }

          if (remoteId) {
            const del = await supabase
              .from('real_accounts')
              .delete()
              .eq('id', String(remoteId))
              .eq('user_id', String(userId));
            if (del.error) throw del.error;
          } else {
            const del = await supabase
              .from('real_accounts')
              .delete()
              .eq('user_id', String(userId))
              .eq('client_uuid', payloadUuid);
            if (del.error) throw del.error;
          }

          db.prepare(`
            UPDATE real_accounts
            SET sync_status = 'synced', deleted_at = COALESCE(deleted_at, ?), updated_at = ?
            WHERE user_id = ? AND client_uuid = ?
          `).run(nowIso(), nowIso(), String(userId), payloadUuid);
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }
      }

      if (entityType === 'real_strategy') {
        const clientUuid = String(item.entity_local_id || '');
        const remoteId = item.entity_remote_id || null;
        const payloadName = String(payload?.name || '').trim();
        const payloadUuid = payload?.client_uuid ? String(payload.client_uuid) : clientUuid;

        if (action === 'create') {
          const row = {
            user_id: String(userId),
            client_uuid: payloadUuid,
            name: payloadName,
            ...strategyFieldsForSupabase(payload),
          };
          const ins = await supabase.from('real_strategies').insert(row).select('id, client_uuid').single();
          if (ins.error) {
            const msg = String(ins.error?.message || '').toLowerCase();
            const isConflict = msg.includes('duplicate key') || msg.includes('unique') || ins.error?.code === '23505';
            if (isConflict) {
              const lookup = await supabase
                .from('real_strategies')
                .select('id, client_uuid')
                .eq('user_id', String(userId))
                .eq('client_uuid', payloadUuid)
                .maybeSingle();
              if (lookup.error || !lookup.data?.id) throw ins.error;
              db.prepare(`
                UPDATE real_strategies
                SET remote_id = ?, sync_status = 'synced', updated_at = ?
                WHERE user_id = ? AND client_uuid = ?
              `).run(String(lookup.data.id), nowIso(), String(userId), payloadUuid);
              db.prepare(`UPDATE sync_queue SET entity_remote_id = ? WHERE id = ?`).run(String(lookup.data.id), Number(item.id));
              markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
              ok += 1;
              continue;
            }
            throw ins.error;
          }
          db.prepare(`
            UPDATE real_strategies
            SET remote_id = ?, sync_status = 'synced', updated_at = ?
            WHERE user_id = ? AND client_uuid = ?
          `).run(String(ins.data.id), nowIso(), String(userId), payloadUuid);
          db.prepare(`UPDATE sync_queue SET entity_remote_id = ? WHERE id = ?`).run(String(ins.data.id), Number(item.id));
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }

        if (action === 'update') {
          const patch = {
            name: payloadName || undefined,
            ...strategyFieldsForSupabase(payload),
          };
          if (remoteId) {
            const upd = await supabase
              .from('real_strategies')
              .update(patch)
              .eq('id', String(remoteId))
              .eq('user_id', String(userId));
            if (upd.error) throw upd.error;
          } else {
            const upd = await supabase
              .from('real_strategies')
              .update(patch)
              .eq('user_id', String(userId))
              .eq('client_uuid', payloadUuid);
            if (upd.error) throw upd.error;
          }
          const meta = strategyFieldsFromPayload(payload);
          db.prepare(`
            UPDATE real_strategies
            SET name = COALESCE(?, name),
                description = ?,
                schedule_enabled = ?,
                operating_hours = ?,
                sync_status = 'synced',
                updated_at = ?
            WHERE user_id = ? AND client_uuid = ?
          `).run(
            payloadName || null,
            meta.description,
            meta.schedule_enabled,
            meta.operating_hours,
            nowIso(),
            String(userId),
            payloadUuid
          );
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }

        if (action === 'delete') {
          const local = db.prepare(`
            SELECT remote_id, sync_status
            FROM real_strategies
            WHERE user_id = ? AND client_uuid = ?
          `).get(String(userId), payloadUuid);

          if (!local?.remote_id && String(local?.sync_status || '').startsWith('pending_')) {
            db.prepare(`
              UPDATE real_strategies
              SET sync_status = 'synced', deleted_at = COALESCE(deleted_at, ?), updated_at = ?
              WHERE user_id = ? AND client_uuid = ?
            `).run(nowIso(), nowIso(), String(userId), payloadUuid);
            markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
            ok += 1;
            continue;
          }

          if (remoteId) {
            const del = await supabase
              .from('real_strategies')
              .delete()
              .eq('id', String(remoteId))
              .eq('user_id', String(userId));
            if (del.error) throw del.error;
          } else {
            const del = await supabase
              .from('real_strategies')
              .delete()
              .eq('user_id', String(userId))
              .eq('client_uuid', payloadUuid);
            if (del.error) throw del.error;
          }

          db.prepare(`
            UPDATE real_strategies
            SET sync_status = 'synced', deleted_at = COALESCE(deleted_at, ?), updated_at = ?
            WHERE user_id = ? AND client_uuid = ?
          `).run(nowIso(), nowIso(), String(userId), payloadUuid);
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }
      }

      if (entityType === 'real_account_withdrawal') {
        const clientUuid = String(item.entity_local_id || '');
        const remoteId = item.entity_remote_id || payload?.remote_id || null;
        const payloadUuid = payload?.client_uuid ? String(payload.client_uuid) : clientUuid;
        const rowBody = supabaseRowFromPayload({ ...payload, user_id: String(userId), client_uuid: payloadUuid });

        if (action === 'create') {
          const ins = await supabase
            .from('real_account_withdrawals')
            .insert(rowBody)
            .select('id, client_uuid')
            .single();
          if (ins.error) {
            const msg = String(ins.error?.message || '').toLowerCase();
            const isConflict = msg.includes('duplicate key') || msg.includes('unique') || ins.error?.code === '23505';
            if (isConflict) {
              const lookup = await supabase
                .from('real_account_withdrawals')
                .select('id, client_uuid')
                .eq('user_id', String(userId))
                .eq('client_uuid', payloadUuid)
                .maybeSingle();
              if (lookup.error || !lookup.data?.id) throw ins.error;
              db.prepare(
                `UPDATE real_account_withdrawals
                 SET remote_id = ?, sync_status = 'synced', updated_at = ?
                 WHERE user_id = ? AND client_uuid = ?`
              ).run(String(lookup.data.id), nowIso(), String(userId), payloadUuid);
              db.prepare(`UPDATE sync_queue SET entity_remote_id = ? WHERE id = ?`).run(
                String(lookup.data.id),
                Number(item.id)
              );
              markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
              ok += 1;
              continue;
            }
            throw ins.error;
          }
          db.prepare(
            `UPDATE real_account_withdrawals
             SET remote_id = ?, sync_status = 'synced', updated_at = ?
             WHERE user_id = ? AND client_uuid = ?`
          ).run(String(ins.data.id), nowIso(), String(userId), payloadUuid);
          db.prepare(`UPDATE sync_queue SET entity_remote_id = ? WHERE id = ?`).run(
            String(ins.data.id),
            Number(item.id)
          );
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }

        if (action === 'update') {
          const patch = { ...rowBody };
          delete patch.user_id;
          if (remoteId) {
            const upd = await supabase
              .from('real_account_withdrawals')
              .update(patch)
              .eq('id', String(remoteId))
              .eq('user_id', String(userId));
            if (upd.error) throw upd.error;
          } else {
            const upd = await supabase
              .from('real_account_withdrawals')
              .update(patch)
              .eq('user_id', String(userId))
              .eq('client_uuid', payloadUuid);
            if (upd.error) throw upd.error;
          }
          db.prepare(
            `UPDATE real_account_withdrawals
             SET account_id = COALESCE(?, account_id),
                 account_name = ?,
                 amount = ?,
                 date = ?,
                 note = ?,
                 sync_status = 'synced',
                 updated_at = ?
             WHERE user_id = ? AND client_uuid = ?`
          ).run(
            rowBody.account_id,
            rowBody.account_name,
            rowBody.amount,
            rowBody.date,
            rowBody.note,
            nowIso(),
            String(userId),
            payloadUuid
          );
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }

        if (action === 'delete') {
          const local = db
            .prepare(
              `SELECT remote_id, sync_status FROM real_account_withdrawals WHERE user_id = ? AND client_uuid = ?`
            )
            .get(String(userId), payloadUuid);

          if (!local?.remote_id && String(local?.sync_status || '').startsWith('pending_')) {
            db.prepare(
              `UPDATE real_account_withdrawals
               SET sync_status = 'synced', deleted_at = COALESCE(deleted_at, ?), updated_at = ?
               WHERE user_id = ? AND client_uuid = ?`
            ).run(nowIso(), nowIso(), String(userId), payloadUuid);
            markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
            ok += 1;
            continue;
          }

          const tsDelete = nowIso();
          if (remoteId || local?.remote_id) {
            const rid = String(remoteId || local.remote_id);
            const upd = await supabase
              .from('real_account_withdrawals')
              .update({ deleted_at: tsDelete, updated_at: tsDelete })
              .eq('id', rid)
              .eq('user_id', String(userId));
            if (upd.error) throw upd.error;
          } else {
            const upd = await supabase
              .from('real_account_withdrawals')
              .update({ deleted_at: tsDelete, updated_at: tsDelete })
              .eq('user_id', String(userId))
              .eq('client_uuid', payloadUuid);
            if (upd.error) throw upd.error;
          }

          db.prepare(
            `UPDATE real_account_withdrawals
             SET sync_status = 'synced', deleted_at = COALESCE(deleted_at, ?), updated_at = ?
             WHERE user_id = ? AND client_uuid = ?`
          ).run(tsDelete, tsDelete, String(userId), payloadUuid);
          markQueueStatus(item.id, 'synced', { syncedAt: nowIso() });
          ok += 1;
          continue;
        }
      }

      throw new Error(`UNSUPPORTED_ENTITY_OR_ACTION:${entityType}:${action}`);
    } catch (err) {
      failed += 1;
      markQueueStatus(item.id, 'failed', { errorMessage: String(err?.message || err) });
      console.warn('Sync item failed:', item.id, entityType, action, err);
    }
  }

  // Ya comprobamos conectividad al inicio de este ciclo; evitamos un segundo probe de red.
  const pull = await pullRemoteData(userId, { assumeOnline: true }).catch(() => ({ pulled: false }));

  const pendingLeft = getSyncPendingCountForUser(userId);
  const failedLeft = getSyncFailedCountForUser(userId);
  if (failedLeft > 0) {
    emitSyncStatus('online_error', { pending: pendingLeft, failed: failedLeft });
  } else if (pendingLeft > 0) {
    emitSyncStatus('online_pending', { pending: pendingLeft });
  } else {
    emitSyncStatus('online_up_to_date', { pending: 0 });
  }

  return { ok, failed, pull };
}

async function pullRemoteData(userId, { assumeOnline = false } = {}) {
  if (!assumeOnline) {
    const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);
    if (!online) return { skipped: true, reason: 'OFFLINE' };
  }

  // Fetch remotos en paralelo (misma sesión/RLS). El merge local se hace después, secuencialmente.
  const [tradesRes, accountsRes, strategiesRes, withdrawalsRes] = await Promise.all([
    tradesService.getTrades().catch((err) => ({ success: false, error: err })),
    supabase
      .from('real_accounts')
      .select('id, user_id, name, balance, client_uuid, created_at')
      .eq('user_id', String(userId)),
    supabase
      .from('real_strategies')
      .select('id, user_id, name, client_uuid, created_at, description, schedule_enabled, operating_hours')
      .eq('user_id', String(userId)),
    supabase
      .from('real_account_withdrawals')
      .select(
        'id, user_id, account_id, account_name, client_uuid, amount, date, note, created_at, updated_at, deleted_at'
      )
      .eq('user_id', String(userId))
      .is('deleted_at', null),
  ]);

  if (tradesRes?.success && Array.isArray(tradesRes.data)) {
    // upsertTradesIntoLocal preserva entry/exit_time y position_legs, respeta pending_* y tombstones,
    // y solo pisa filas locales si el remoto es más reciente (updated_at).
    upsertTradesIntoLocal(db, tradesRes.data, userId, '[pullRemoteData]');
  }

  const upsertSimpleEntity = (table, localTable, rows, mapRow) => {
    const uid = String(userId);
    const list = Array.isArray(rows) ? rows : [];

    const selectByClient = db.prepare(
      `SELECT client_uuid, sync_status FROM ${localTable} WHERE user_id = ? AND client_uuid = ? LIMIT 1`
    );
    const selectByRemote = db.prepare(
      `SELECT client_uuid, sync_status FROM ${localTable} WHERE user_id = ? AND remote_id = ? LIMIT 1`
    );

    const insert = db.prepare(`
      INSERT INTO ${localTable}
      (user_id, client_uuid, remote_id, name, balance, created_at, updated_at, sync_status, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', NULL)
      ON CONFLICT(user_id, client_uuid) DO NOTHING
    `);

    const update = db.prepare(`
      UPDATE ${localTable}
      SET remote_id = COALESCE(?, remote_id),
          name = ?,
          balance = ?,
          updated_at = ?,
          sync_status = CASE
            WHEN sync_status LIKE 'pending_%' THEN sync_status
            ELSE 'synced'
          END
      WHERE user_id = ? AND client_uuid = ?
    `);

    const tx = db.transaction(() => {
      for (const r of list) {
        const mapped = mapRow(r);
        if (!mapped) continue;
        const clientUuid = mapped.client_uuid ? String(mapped.client_uuid) : null;
        const remoteId = mapped.remote_id ? String(mapped.remote_id) : null;
        if (!clientUuid && !remoteId) continue;

        const localHit =
          (clientUuid ? selectByClient.get(uid, clientUuid) : null) ||
          (remoteId ? selectByRemote.get(uid, remoteId) : null);

        if (localHit && String(localHit.sync_status || '').startsWith('pending_')) continue;

        if (!localHit) {
          insert.run(
            uid,
            clientUuid || stableClientUuidFromText(`${localTable}:${uid}`, mapped.name || ''),
            remoteId,
            mapped.name || '',
            Number(mapped.balance ?? 0) || 0,
            mapped.created_at || nowIso(),
            mapped.updated_at || nowIso()
          );
        } else {
          update.run(
            remoteId,
            mapped.name || '',
            Number(mapped.balance ?? 0) || 0,
            mapped.updated_at || nowIso(),
            uid,
            clientUuid || String(localHit.client_uuid)
          );
        }
      }
    });

    tx();
  };

  if (!accountsRes.error) {
    upsertSimpleEntity(
      'real_accounts',
      'real_accounts',
      accountsRes.data || [],
      (r) => ({
        remote_id: r?.id != null ? String(r.id) : null,
        client_uuid: r?.client_uuid ? String(r.client_uuid) : null,
        name: r?.name ?? '',
        balance: Number(r?.balance ?? 0) || 0,
        created_at: r?.created_at ? String(r.created_at) : null,
        updated_at: nowIso(),
      })
    );
  }

  if (!strategiesRes.error) {
    const uid = String(userId);
    const list = Array.isArray(strategiesRes.data) ? strategiesRes.data : [];
    const selectByClient = db.prepare(`SELECT sync_status FROM real_strategies WHERE user_id = ? AND client_uuid = ? LIMIT 1`);
    const selectByRemote = db.prepare(`SELECT client_uuid, sync_status FROM real_strategies WHERE user_id = ? AND remote_id = ? LIMIT 1`);
    const insert = db.prepare(`
      INSERT INTO real_strategies
      (user_id, client_uuid, remote_id, name, description, schedule_enabled, operating_hours, is_active, created_at, updated_at, sync_status, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'synced', NULL)
      ON CONFLICT(user_id, client_uuid) DO NOTHING
    `);
    const update = db.prepare(`
      UPDATE real_strategies
      SET remote_id = COALESCE(?, remote_id),
          name = ?,
          description = ?,
          schedule_enabled = ?,
          operating_hours = ?,
          updated_at = ?,
          sync_status = CASE
            WHEN sync_status LIKE 'pending_%' THEN sync_status
            ELSE 'synced'
          END
      WHERE user_id = ? AND client_uuid = ?
    `);
    const tx = db.transaction(() => {
      for (const r of list) {
        const remoteId = r?.id != null ? String(r.id) : null;
        const clientUuid = r?.client_uuid ? String(r.client_uuid) : stableClientUuidFromText(`real_strategy:${uid}`, String(r?.name || ''));
        const meta = strategyFieldsFromPayload(r);
        const localHit = selectByClient.get(uid, clientUuid) || (remoteId ? selectByRemote.get(uid, remoteId) : null);
        if (localHit && String(localHit.sync_status || '').startsWith('pending_')) continue;
        if (!localHit) {
          insert.run(
            uid,
            clientUuid,
            remoteId,
            String(r?.name || '').trim(),
            meta.description,
            meta.schedule_enabled,
            meta.operating_hours,
            r?.created_at ? String(r.created_at) : nowIso(),
            nowIso()
          );
        } else {
          update.run(
            remoteId,
            String(r?.name || '').trim(),
            meta.description,
            meta.schedule_enabled,
            meta.operating_hours,
            nowIso(),
            uid,
            clientUuid
          );
        }
      }
    });
    tx();
  }

  if (!withdrawalsRes.error) {
    upsertWithdrawalsIntoLocal(db, withdrawalsRes.data || [], userId, '[pullRemoteData]');
  }

  return {
    pulled: true,
    trades: Array.isArray(tradesRes?.data) ? tradesRes.data.length : 0,
    real_accounts: Array.isArray(accountsRes?.data) ? accountsRes.data.length : 0,
    real_strategies: Array.isArray(strategiesRes?.data) ? strategiesRes.data.length : 0,
    real_account_withdrawals: Array.isArray(withdrawalsRes?.data) ? withdrawalsRes.data.length : 0,
  };
}

// ------------------------ Sync engine (FASE 2) end ------------------------

ipcMain.handle('get-trades-local', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) {
    return [];
  }

  claimLegacyTradesForUser(db, userId);

  console.log('Loading trades from local SQLite');
  return getTradesFromLocal(db, userId, mapRowToTradeResponse);
});

ipcMain.handle('sync-trades-from-supabase', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) {
    return {
      success: false,
      error: 'NO_USER',
      trades: []
    };
  }

  claimLegacyTradesForUser(db, userId);

  try {
    console.log('Supabase online sync started');
    const result = await tradesService.getTrades();

    if (!result.success) {
      console.log('Supabase unavailable, using local cache');
      const local = getTradesFromLocal(db, userId, mapRowToTradeResponse);
      return {
        success: false,
        error: result.error || 'REMOTE_FAILED',
        trades: local
      };
    }

    upsertTradesIntoLocal(db, result.data, userId, '⚖️');
    console.log('Local cache updated from Supabase');

    const trades = getTradesFromLocal(db, userId, mapRowToTradeResponse);
    return { success: true, trades };
  } catch (err) {
    console.log('Supabase unavailable, using local cache');
    console.warn(String(err && err.message ? err.message : err));
    const local = getTradesFromLocal(db, userId, mapRowToTradeResponse);
    return {
      success: false,
      error: String(err && err.message ? err.message : err),
      trades: local
    };
  }
});

ipcMain.handle('get-trades', async () => {
  try {
    return await loadTradesOfflineFirstMain();
  } catch (err) {
    console.error('❌ ERROR GET:', err);
    const userId = await resolveUserIdForLocalCache();
    if (!userId) return [];
    claimLegacyTradesForUser(db, userId);
    console.log('Supabase unavailable, using local cache');
    return getTradesFromLocal(db, userId, mapRowToTradeResponse);
  }
});

ipcMain.handle('get-stats', async () => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) {
    return { totalTrades: 0, totalWins: 0, totalPnl: 0 };
  }
  const row = db
    .prepare(
      `SELECT
        COUNT(*) as totalTrades,
        SUM(CASE WHEN result = 'TP' THEN 1 ELSE 0 END) as totalWins,
        COALESCE(SUM(pnl_net), 0) as totalPnl
      FROM trades
      WHERE user_id = ?
        AND (deleted_at IS NULL OR deleted_at = '')
        AND (sync_status IS NULL OR sync_status = '' OR sync_status NOT IN ('pending_delete', 'deleted'))`
    )
    .get(String(userId));
  return row || { totalTrades: 0, totalWins: 0, totalPnl: 0 };
});

ipcMain.handle('get-trade', async (event, id) => {
  const tradeId = Number(id);
  if (!Number.isFinite(tradeId)) return null;

  const userId = await resolveUserIdForLocalCache();
  const row = userId
    ? db.prepare('SELECT * FROM trades WHERE user_id = ? AND id = ?').get(String(userId), tradeId)
    : db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
  const localMapped = row ? mapRowToTradeResponse(row) : null;
  const localLegs = parsePositionLegs(localMapped?.position_legs ?? []);
  if (localMapped && (localLegs.length > 0 || isCompositePositionFlag(localMapped.is_composite_position))) {
    return hydrateTradeCompositeFields(localMapped);
  }

  const authUserId = (await getCurrentUserId()) || userId;
  if (!authUserId) return localMapped ? hydrateTradeCompositeFields(localMapped) : null;

  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', authUserId)
      .maybeSingle();
    if (error || !data) return localMapped ? hydrateTradeCompositeFields(localMapped) : null;
    upsertTradesIntoLocal(db, [data], authUserId, '📥 get-trade');
    return hydrateTradeCompositeFields(mapRowToTradeResponse(data));
  } catch (err) {
    console.warn('⚠️ get-trade fallback Supabase:', err);
    return localMapped ? hydrateTradeCompositeFields(localMapped) : null;
  }
});

function writeTradeUpdateToSqlite(userId, localId, mapped, syncStatus, now) {
  const legsJson = serializePositionLegsForStorage(mapped.position_legs);
  console.log('[updateTrade] sqlite saved position_legs', legsJson);
  return db.prepare(`
    UPDATE trades
    SET date = ?, asset = ?, result = ?, be_after_result = ?, pnl = ?, strategy = ?, account = ?,
        lotaje = ?, commission = ?, pnl_net = ?, image_before = ?, image_after = ?,
        entry_time = ?, exit_time = ?, is_composite_position = ?, position_legs = ?,
        updated_at = ?, sync_status = ?
    WHERE user_id = ? AND id = ?
  `).run(
    mapped.date,
    mapped.asset,
    mapped.result,
    mapped.be_after_result ?? null,
    Number(mapped.pnl ?? 0) || 0,
    mapped.strategy || '',
    mapped.account || '',
    Number(mapped.lotaje ?? 0) || 0,
    Number(mapped.commission ?? 0) || 0,
    Number(mapped.pnl_net ?? 0) || 0,
    mapped.image_before || '',
    mapped.image_after || '',
    mapped.entry_time ?? null,
    mapped.exit_time ?? null,
    mapped.is_composite_position ? 1 : 0,
    legsJson,
    now,
    syncStatus,
    String(userId),
    Number(localId)
  );
}

function clearPendingUpdateQueueForTrade(userId, localId) {
  db.prepare(`
    DELETE FROM sync_queue
    WHERE user_id = ? AND entity_type = 'trade' AND entity_local_id = ? AND action = 'update' AND status = 'pending'
  `).run(String(userId), String(localId));
}

ipcMain.handle('update-trade', async (event, trade) => {
  console.log('[updateTrade] requested', { id: trade?.id, strategy: trade?.strategy });

  const userId = await resolveUserIdForLocalCache();
  if (!userId) {
    console.error('[updateTrade] NO_USER_ID');
    return { success: false, error: 'NO_USER_ID' };
  }

  const mapped = normalizeTrade(trade);
  const now = nowIso();
  const resolved = resolveLocalTradeForDelete(userId, trade?.id);

  if (!resolved?.row) {
    const remoteId = Number(trade?.id);
    if (!Number.isFinite(remoteId) || remoteId <= 0) {
      console.error('[updateTrade] NOT_FOUND local row', trade?.id);
      return { success: false, error: 'NOT_FOUND' };
    }
    const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);
    if (!online) {
      console.warn('[updateTrade] offline without local row', remoteId);
      return { success: false, error: 'OFFLINE_NO_LOCAL' };
    }
    try {
      const payload = { ...mapped, client_uuid: trade?.client_uuid || null };
      await updateTradeRemote({ userId, payload, remoteId });
      console.log('[updateTrade] remote-only success', remoteId);
      return { success: true, data: mapRowToTradeResponse({ ...mapped, id: remoteId }) };
    } catch (err) {
      console.error('[updateTrade] remote-only failed', err);
      return { success: false, error: err };
    }
  }

  const { row, localId } = resolved;
  const clientUuid = row.client_uuid || trade?.client_uuid || null;
  const remoteId =
    row.remote_id != null && row.remote_id !== ''
      ? Number(row.remote_id)
      : localId > 0
        ? localId
        : null;
  const queuePayload = {
    ...mapped,
    position_legs: parsePositionLegs(mapped.position_legs),
    client_uuid: clientUuid,
    user_id: String(userId),
  };
  console.log('[updateTrade] payload position_legs', queuePayload.position_legs?.length ?? 0);
  const isPendingCreate = String(row.sync_status || '') === 'pending_create' && !row.remote_id;
  const nextSyncStatus = isPendingCreate ? 'pending_create' : 'pending_update';

  try {
    writeTradeUpdateToSqlite(userId, localId, mapped, nextSyncStatus, now);
    console.log('[updateTrade] local SQLite updated', {
      localId,
      strategy: mapped.strategy,
      syncStatus: nextSyncStatus,
      composite: mapped.is_composite_position,
      legs: parsePositionLegs(mapped.position_legs).length,
    });
  } catch (sqliteErr) {
    console.error('[updateTrade] SQLite update failed', sqliteErr);
    return { success: false, error: sqliteErr };
  }

  if (isPendingCreate) {
    enqueueSyncItem({
      userId,
      entityType: 'trade',
      entityLocalId: String(localId),
      entityRemoteId: null,
      action: 'create',
      payload: queuePayload,
    });
    const fresh = getLocalTradeById(userId, localId);
    console.log('[updateTrade] updated pending_create before sync', localId);
    return { success: true, data: mapRowToTradeResponse(fresh || { ...mapped, id: localId }), pendingCreate: true };
  }

  const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);

  if (!online) {
    enqueueSyncItem({
      userId,
      entityType: 'trade',
      entityLocalId: String(localId),
      entityRemoteId: remoteId != null && Number.isFinite(remoteId) ? String(remoteId) : null,
      action: 'update',
      payload: queuePayload,
    });
    console.log('[sync_queue] pending_update position_legs', queuePayload.position_legs?.length ?? 0);
    console.log('[updateTrade] queued pending_update (offline)', localId);
    const fresh = getLocalTradeById(userId, localId);
    return { success: true, data: mapRowToTradeResponse(fresh || { ...mapped, id: localId }), offline: true };
  }

  try {
    const res = await updateTradeRemote({
      userId,
      payload: queuePayload,
      remoteId: remoteId != null && Number.isFinite(remoteId) && remoteId > 0 ? remoteId : null,
    });
    if (res?.row) {
      upsertTradesIntoLocal(db, [res.row], userId, '📥 update-trade');
    } else {
      writeTradeUpdateToSqlite(userId, localId, mapped, 'synced', now);
    }
    if (res?.id) {
      db.prepare(`
        UPDATE trades
        SET remote_id = COALESCE(?, remote_id), client_uuid = COALESCE(?, client_uuid)
        WHERE user_id = ? AND id = ?
      `).run(Number(res.id), res.client_uuid || clientUuid, String(userId), localId);
    }
    clearPendingUpdateQueueForTrade(userId, localId);
    console.log('[updateTrade] remote success', { localId, remoteId: res?.id ?? remoteId, strategy: mapped.strategy });
    const fresh = getLocalTradeById(userId, localId);
    return { success: true, data: mapRowToTradeResponse(fresh || { ...mapped, id: localId, remote_id: res?.id }) };
  } catch (err) {
    console.warn('[updateTrade] remote failed, keeping local + queue', err);
    enqueueSyncItem({
      userId,
      entityType: 'trade',
      entityLocalId: String(localId),
      entityRemoteId: remoteId != null && Number.isFinite(remoteId) ? String(remoteId) : null,
      action: 'update',
      payload: queuePayload,
    });
    console.log('[sync_queue] pending_update position_legs', queuePayload.position_legs?.length ?? 0);
    const fresh = getLocalTradeById(userId, localId);
    return {
      success: true,
      data: mapRowToTradeResponse(fresh || { ...mapped, id: localId }),
      pendingUpdate: true,
      remoteError: String(err?.message || err),
    };
  }
});

function resolveLocalTradeForDelete(userId, tradeId) {
  const uid = String(userId);
  const rawStr = String(tradeId ?? '').trim();
  if (!rawStr) return null;

  const byClient = db.prepare(`SELECT * FROM trades WHERE user_id = ? AND client_uuid = ?`).get(uid, rawStr);
  if (byClient) return { row: byClient, localId: Number(byClient.id) };

  const n = Number(rawStr);
  if (Number.isFinite(n)) {
    let row = db.prepare(`SELECT * FROM trades WHERE user_id = ? AND id = ?`).get(uid, n);
    if (row) return { row, localId: Number(row.id) };
    if (n > 0) {
      row = db.prepare(`SELECT * FROM trades WHERE user_id = ? AND remote_id = ?`).get(uid, n);
      if (row) return { row, localId: Number(row.id) };
    }
  }

  return null;
}

function clearPendingSyncQueueForTrade(userId, localId) {
  db.prepare(`
    DELETE FROM sync_queue
    WHERE user_id = ? AND entity_type = 'trade' AND entity_local_id = ? AND status = 'pending'
  `).run(String(userId), String(localId));
}

function clearPendingDeleteQueueForTrade(userId, localId) {
  db.prepare(`
    DELETE FROM sync_queue
    WHERE user_id = ? AND entity_type = 'trade' AND entity_local_id = ? AND action = 'delete' AND status = 'pending'
  `).run(String(userId), String(localId));
}

async function softDeleteSingleTrade(userId, row, options = {}) {
  const now = options.now || nowIso();
  const uid = String(userId);
  const localId = Number(row.id);
  const tryRemote = options.tryRemote !== false;
  const online = options.online === true;

  if (isTradeRowHidden(row)) {
    return { outcome: 'skipped', localId };
  }

  const syncStatus = String(row.sync_status || '');
  const isPendingCreateOnly = syncStatus === 'pending_create' && !row.remote_id;

  if (isPendingCreateOnly) {
    clearPendingSyncQueueForTrade(userId, localId);
    db.prepare(`DELETE FROM trades WHERE user_id = ? AND id = ?`).run(uid, localId);
    return { outcome: 'hardDeleted', localId };
  }

  db.prepare(`
    UPDATE trades
    SET deleted_at = ?, sync_status = 'pending_delete', updated_at = ?
    WHERE user_id = ? AND id = ?
  `).run(now, now, uid, localId);

  const remoteId =
    row.remote_id != null && row.remote_id !== ''
      ? Number(row.remote_id)
      : localId > 0
        ? localId
        : null;
  const clientUuid = row.client_uuid ? String(row.client_uuid) : null;

  const queueDelete = () => {
    enqueueSyncItem({
      userId,
      entityType: 'trade',
      entityLocalId: String(localId),
      entityRemoteId: remoteId != null && Number.isFinite(remoteId) ? String(remoteId) : null,
      action: 'delete',
      payload: { client_uuid: clientUuid, remote_id: remoteId },
    });
  };

  if (tryRemote && online) {
    try {
      await deleteTradeRemote({
        userId,
        remoteId: remoteId != null && Number.isFinite(remoteId) && remoteId > 0 ? remoteId : null,
        clientUuid,
      });
      db.prepare(`
        UPDATE trades
        SET deleted_at = ?, sync_status = 'synced', updated_at = ?
        WHERE user_id = ? AND id = ?
      `).run(now, now, uid, localId);
      clearPendingSyncQueueForTrade(userId, localId);
      return { outcome: 'softDeletedRemote', localId, remoteId };
    } catch (err) {
      queueDelete();
      return { outcome: 'queued', localId, remoteId, error: err };
    }
  }

  queueDelete();
  return { outcome: 'queued', localId, remoteId };
}

async function bulkSoftDeleteTradesByFilter(userId, column, value) {
  const kind = column === 'strategy' ? 'strategy' : 'account';
  const safeValue = String(value || '').trim();
  console.log('[bulkDeleteTrades]', kind, 'requested', safeValue);

  if (!safeValue) {
    return { success: false, deleted: 0, softDeleted: 0, hardDeleted: 0, queued: 0, skipped: 0 };
  }

  const col = column === 'strategy' ? 'strategy' : column === 'account' ? 'account' : null;
  if (!col) return { success: false, error: 'INVALID_COLUMN', deleted: 0 };

  const rows = db
    .prepare(`SELECT * FROM trades WHERE user_id = ? AND ${col} = ?`)
    .all(String(userId), safeValue);

  const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);
  const now = nowIso();
  const stats = { softDeleted: 0, hardDeleted: 0, queued: 0, skipped: 0, remoteOk: 0 };

  for (const row of rows) {
    const res = await softDeleteSingleTrade(userId, row, { now, online, tryRemote: true });
    switch (res.outcome) {
      case 'hardDeleted':
        stats.hardDeleted += 1;
        break;
      case 'softDeletedRemote':
        stats.remoteOk += 1;
        stats.softDeleted += 1;
        break;
      case 'queued':
        stats.queued += 1;
        stats.softDeleted += 1;
        break;
      case 'skipped':
        stats.skipped += 1;
        break;
      default:
        break;
    }
  }

  console.log('[bulkDeleteTrades] soft deleted count', stats.softDeleted);
  console.log('[bulkDeleteTrades] removed local pending_create count', stats.hardDeleted);
  console.log('[bulkDeleteTrades] queued pending_delete count', stats.queued);

  const deleted = stats.softDeleted + stats.hardDeleted;
  return { success: true, deleted, ...stats };
}

ipcMain.handle('delete-trade', async (event, tradeId) => {
  console.log('[deleteTrade] requested', tradeId);

  const userId = await resolveUserIdForLocalCache();
  if (!userId) {
    return { success: false, error: 'NO_USER_ID' };
  }

  const resolved = resolveLocalTradeForDelete(userId, tradeId);
  const now = nowIso();

  if (!resolved?.row) {
    const n = Number(tradeId);
    if (Number.isFinite(n) && n > 0) {
      try {
        await deleteTradeRemote({ userId, remoteId: n, clientUuid: null });
        console.log('[deleteTrade] remote delete success (no local row)', n);
        return { success: true, remoteOnly: true };
      } catch (err) {
        console.error('[deleteTrade] remote delete failed without local row', err);
        return { success: false, error: err };
      }
    }
    return { success: false, error: 'NOT_FOUND' };
  }

  const { row, localId } = resolved;
  const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);
  const res = await softDeleteSingleTrade(userId, row, { now, online, tryRemote: true });

  if (res.outcome === 'hardDeleted') {
    console.log('[deleteTrade] removed pending_create trade before sync', localId);
    return { success: true, hardDeleted: true, localId };
  }
  if (res.outcome === 'skipped') {
    return { success: true, skipped: true, localId };
  }

  console.log('[deleteTrade] local soft delete applied', { localId, remote_id: row.remote_id });

  if (res.outcome === 'softDeletedRemote') {
    console.log('[deleteTrade] remote delete success', { localId, remoteId: res.remoteId });
    return { success: true, localId, remoteId: res.remoteId };
  }
  if (!online) {
    console.log('[deleteTrade] queued pending_delete', localId);
    return { success: true, offline: true, localId };
  }
  console.log('[deleteTrade] queued pending_delete after remote error', localId);
  return { success: true, pendingDelete: true, localId };
});

ipcMain.handle('restore-deleted-trade', async (event, payload = {}) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  const localId = Number(payload?.id ?? payload?.localId);
  if (!Number.isFinite(localId)) return { success: false, error: 'INVALID_ID' };

  const row = db.prepare(`SELECT * FROM trades WHERE user_id = ? AND id = ?`).get(String(userId), localId);
  if (row) {
    const prevSync = String(payload?.trade?.sync_status || row.sync_status || 'synced');
    const restoredSync =
      prevSync && prevSync !== 'pending_delete' && prevSync !== 'deleted' ? prevSync : 'synced';
    db.prepare(`
      UPDATE trades
      SET deleted_at = NULL, sync_status = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `).run(restoredSync, nowIso(), String(userId), localId);
    clearPendingDeleteQueueForTrade(userId, localId);
    console.log('[deleteTrade] undo local tombstone cleared', localId);
    return { success: true, restored: 'local', id: localId };
  }

  const trade = payload?.trade;
  if (!trade || typeof trade !== 'object') {
    return { success: false, error: 'NO_TRADE_DATA' };
  }

  const mapped = normalizeTrade(trade);
  const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);
  if (online) {
    try {
      const result = await tradesService.addTrade({
        ...mapped,
        user_id: userId,
        client_uuid: trade.client_uuid || makeClientUuid(),
      });
      if (result?.success && Array.isArray(result.data) && result.data[0]) {
        upsertTradesIntoLocal(db, [result.data[0]], userId, '📥 restore');
        return { success: true, restored: 'remote', id: result.data[0].id };
      }
    } catch (err) {
      console.warn('[deleteTrade] undo remote re-insert failed', err);
    }
  }

  return { success: false, error: 'RESTORE_FAILED' };
});

ipcMain.handle('delete-trades-by-strategy', async (_event, strategyName) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID', deleted: 0 };
  return bulkSoftDeleteTradesByFilter(userId, 'strategy', strategyName);
});

ipcMain.handle('delete-trades-by-account', async (_event, accountName) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID', deleted: 0 };
  return bulkSoftDeleteTradesByFilter(userId, 'account', accountName);
});

async function renameTradesField(column, oldName, newName) {
  const o = String(oldName || '').trim();
  const n = String(newName || '').trim();
  if (!o || !n) return { success: false, error: 'EMPTY_NAMES' };
  if (o === n) return { success: true, skipped: true };

  const col = column === 'strategy' ? 'strategy' : column === 'account' ? 'account' : null;
  if (!col) return { success: false, error: 'INVALID_COLUMN' };

  const nowIso = new Date().toISOString();
  const info = db.prepare(`UPDATE trades SET ${col} = ?, updated_at = ? WHERE ${col} = ?`).run(n, nowIso, o);
  const localChanges = Number(info.changes || 0);

  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: true, localChanges };
  }

  const { error, data } = await supabase
    .from('trades')
    .update({ [col]: n, updated_at: nowIso })
    .eq('user_id', userId)
    .eq(col, o)
    .select('id');

  if (error) {
    console.error(`❌ Supabase rename ${col}:`, error);
    if (localChanges > 0) {
      return { success: true, localChanges, remotePending: true };
    }
    return { success: false, error, localChanges };
  }

  const remoteUpdated = Array.isArray(data) ? data.length : 0;
  console.log(`✅ Renombrado ${col}: ${o} → ${n} (local ${localChanges}, remoto ${remoteUpdated})`);
  return { success: true, localChanges, remoteUpdated };
}

ipcMain.handle('update-trades-strategy', (event, oldName, newName) =>
  renameTradesField('strategy', oldName, newName)
);

ipcMain.handle('update-trades-account', (event, oldName, newName) =>
  renameTradesField('account', oldName, newName)
);

ipcMain.handle('recalculate-trades-commission-for-account', async (event, payload = {}) => {
  const userId = await resolveUserIdForLocalCache();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  const accountName = payload?.accountName ? String(payload.accountName) : '';
  const newCommissionPerLot = Number(payload?.newCommissionPerLot ?? 0);
  const oldCommissionPerLot = Number(payload?.oldCommissionPerLot ?? 0);

  if (!accountName) return { success: false, error: 'INVALID_ACCOUNT_NAME' };
  if (!Number.isFinite(newCommissionPerLot) || newCommissionPerLot < 0) {
    return { success: false, error: 'INVALID_COMMISSION_PER_LOT' };
  }

  console.log('[commission] account commission changed', {
    accountName,
    from: oldCommissionPerLot,
    to: newCommissionPerLot,
  });

  console.log('[commission] recalculating trades for account', accountName);

  const now = nowIso();
  const trades = db
    .prepare(
      `
      SELECT
        id,
        client_uuid,
        remote_id,
        date,
        asset,
        result,
        be_after_result,
        pnl,
        strategy,
        account,
        lotaje,
        commission,
        pnl_net,
        image_before,
        image_after,
        entry_time,
        exit_time,
        position_legs,
        is_composite_position,
        sync_status,
        deleted_at
      FROM trades
      WHERE user_id = ?
        AND account = ?
        AND (deleted_at IS NULL OR deleted_at = '')
        AND (sync_status IS NULL OR sync_status = '' OR sync_status NOT IN ('pending_delete', 'deleted'))
      ORDER BY id DESC
      `
    )
    .all(String(userId), accountName);

  let updatedCount = 0;

  for (const trade of trades) {
    const legs = parsePositionLegs(trade.position_legs ?? []);
    const totalLot = legs.length > 0 ? sumLegsLotSize(legs) : Number(trade.lotaje ?? 0) || 0;
    const grossPnl = Number(trade.pnl ?? 0) || 0;

    const commission = totalLot * newCommissionPerLot;
    const pnlNet = grossPnl - commission;

    const isPendingCreate =
      String(trade.sync_status || '') === 'pending_create' && (trade.remote_id == null || trade.remote_id === '');
    const nextSyncStatus = isPendingCreate ? 'pending_create' : 'pending_update';

    db.prepare(`
      UPDATE trades
      SET commission = ?, pnl_net = ?, updated_at = ?, sync_status = ?
      WHERE user_id = ? AND id = ?
    `).run(
      commission,
      pnlNet,
      now,
      nextSyncStatus,
      String(userId),
      Number(trade.id)
    );

    // Encolamos actualización para que Supabase (si está online) mantenga comisión y pnl_net.
    enqueueSyncItem({
      userId,
      entityType: 'trade',
      entityLocalId: String(trade.id),
      entityRemoteId: trade.remote_id != null && trade.remote_id !== '' ? String(trade.remote_id) : null,
      action: 'update',
      payload: {
        id: Number(trade.id),
        client_uuid: trade.client_uuid || null,
        date: trade.date,
        asset: trade.asset,
        result: trade.result,
        be_after_result: trade.be_after_result ?? null,
        pnl: grossPnl,
        strategy: trade.strategy,
        account: trade.account,
        lotaje: Number(trade.lotaje ?? 0) || 0,
        commission,
        pnl_net: pnlNet,
        image_before: trade.image_before,
        image_after: trade.image_after,
        entry_time: trade.entry_time ?? null,
        exit_time: trade.exit_time ?? null,
        is_composite_position: legs.length >= 2 ? 1 : 0,
        position_legs: legs,
      },
    });

    console.log('[commission] trade recalculated', { tradeId: trade.id, commission, pnlNet });
    updatedCount += 1;
  }

  console.log('[commission] total updated count', updatedCount);

  const online = await checkInternetConnectionMain({ timeoutMs: 2500 }).catch(() => false);
  if (online) {
    await syncPendingChanges(String(userId));
  }

  return { success: true, updatedCount };
});

ipcMain.handle('add-backtest-trade', async (event, trade) => {
  return backtestingService.addBacktestTrade(trade || {});
});

ipcMain.handle('get-backtest-trades', async () => {
  const result = await backtestingService.getBacktestTrades();
  if (!result.success) return [];
  return result.data || [];
});

ipcMain.handle('update-backtest-trade', async (event, trade) => {
  return backtestingService.updateBacktestTrade(trade || {});
});

ipcMain.handle('delete-backtest-trade', async (event, id) => {
  return backtestingService.deleteBacktestTrade(id);
});

ipcMain.handle('get-backtesting-settings', async () => {
  return backtestingSettingsService.getBacktestingSettings();
});

ipcMain.handle('save-backtesting-settings', async (event, settings) => {
  return backtestingSettingsService.upsertBacktestingSettings(settings || {});
});

ipcMain.handle('get-backtesting-sessions', async () => {
  return backtestingSessionsService.getBacktestingSessions();
});

ipcMain.handle('add-backtesting-session', async (event, session) => {
  return backtestingSessionsService.addBacktestingSession(session || {});
});

ipcMain.handle('update-backtesting-session', async (event, session) => {
  return backtestingSessionsService.updateBacktestingSession(session || {});
});

ipcMain.handle('delete-backtesting-session', async (event, sessionId) => {
  return backtestingSessionsService.deleteBacktestingSession(sessionId);
});

ipcMain.handle('get-backtesting-metrics', async () => {
  return backtestingMetricsService.getBacktestingMetrics();
});

ipcMain.handle('add-backtesting-metric', async (event, metric) => {
  return backtestingMetricsService.addBacktestingMetric(metric || {});
});

ipcMain.handle('update-backtesting-metric', async (event, metric) => {
  return backtestingMetricsService.updateBacktestingMetric(metric || {});
});

ipcMain.handle('delete-backtesting-metric', async (event, metricId) => {
  return backtestingMetricsService.deleteBacktestingMetric(metricId);
});

ipcMain.handle('get-current-user-id', async () => getCurrentUserId());