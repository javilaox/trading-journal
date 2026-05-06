const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { supabase } = require('./services/supabaseClient');
const tradesService = require('./services/tradesService');
const backtestingService = require('./services/backtestingService');
const backtestingSettingsService = require('./services/backtestingSettingsService');
const backtestingSessionsService = require('./services/backtestingSessionsService');
const backtestingMetricsService = require('./services/backtestingMetricsService');
const { mapTrade } = require('./services/tradeMapper');
const { getCurrentUserId } = require('./services/supabaseAuth');

let mainWindow = null;
let currentUserId = null;

ipcMain.on('set-user-id', (event, userId) => {
  currentUserId = userId;
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

// 🖥️ Ventana
function createWindow() {
  const hasWebpackEntries = typeof MAIN_WINDOW_WEBPACK_ENTRY !== 'undefined' && typeof MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY !== 'undefined';
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: hasWebpackEntries ? MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY : path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (hasWebpackEntries) {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dashboard.html'));
  }

  // Debug
  mainWindow.webContents.openDevTools();
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

function normalizeTrade(trade = {}) {
  const grossPnl = Number(trade.pnl ?? trade.pnl_net ?? 0) || 0;
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
    lotaje: Number(trade.lotaje ?? trade.lotSize ?? 0) || 0,
    commission,
    pnl_net: pnlNet,
    image_before: trade.image_before || trade.beforeImage || '',
    image_after: trade.image_after || trade.afterImage || ''
  };
}

function mapRowToTradeResponse(row) {
  return {
    id: row.id,
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
    image_after: row.image_after || ''
  };
}

function parseTs(iso) {
  if (iso == null || iso === '') return 0;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : 0;
}

function remoteRowToSqliteValues(row) {
  const updated =
    row.updated_at != null && row.updated_at !== ''
      ? String(row.updated_at)
      : new Date().toISOString();
  return [
    Number(row.id),
    row.date ?? '',
    row.asset ?? '',
    row.result ?? '',
    row.be_after_result ?? null,
    Number(row.pnl ?? 0) || 0,
    row.strategy ?? '',
    row.account ?? '',
    Number(row.lotaje ?? 0) || 0,
    Number(row.commission ?? 0) || 0,
    Number(row.pnl_net ?? row.pnl ?? 0) || 0,
    row.image_before ?? '',
    row.image_after ?? '',
    updated
  ];
}

async function syncTradesFromSupabase() {
  console.log('☁️ Sync Supabase → local');
  try {
    const userId = await getCurrentUserId();
    console.log('Current user id:', userId);
    if (!userId) {
      console.error('❌ No hay usuario autenticado en Supabase');
      return;
    }

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error sincronizando Supabase', error);
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    const insertStmt = db.prepare(`
      INSERT INTO trades
      (id, date, asset, result, be_after_result, pnl, strategy, account, lotaje, commission, pnl_net, image_before, image_after, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE trades SET
        date = ?, asset = ?, result = ?, be_after_result = ?, pnl = ?, strategy = ?, account = ?,
        lotaje = ?, commission = ?, pnl_net = ?, image_before = ?, image_after = ?, updated_at = ?
      WHERE id = ?
    `);

    const selectLocal = db.prepare('SELECT id, updated_at FROM trades WHERE id = ?');

    const mergeTx = db.transaction((tradeRows) => {
      for (const row of tradeRows) {
        const id = Number(row.id);
        if (!Number.isFinite(id) || id <= 0) continue;

        const remoteTs = parseTs(row.updated_at);
        const local = selectLocal.get(id);
        const localTs = parseTs(local?.updated_at);

        const vals = remoteRowToSqliteValues(row);

        if (!local) {
          insertStmt.run(vals);
        } else if (remoteTs > localTs) {
          console.log('⚖️ Update por conflicto:', id);
          updateStmt.run(
            vals[1],
            vals[2],
            vals[3],
            vals[4],
            vals[5],
            vals[6],
            vals[7],
            vals[8],
            vals[9],
            vals[10],
            vals[11],
            vals[12],
            vals[13],
            id
          );
        }
      }
    });

    mergeTx(rows);

    if (rows.length > 0) {
      const maxId = db.prepare('SELECT MAX(id) as maxId FROM trades').get();
      if (maxId && maxId.maxId) {
        db.prepare(`UPDATE sqlite_sequence SET seq = ? WHERE name = 'trades'`).run(maxId.maxId);
        console.log('🔧 SQLite autoincrement ajustado a:', maxId.maxId);
      }
    }

    console.log('🔄 Sync aplicado');
    console.log('✅ Sync completado:', rows.length, 'trades remotos evaluados');
  } catch (err) {
    console.error('❌ Error sincronizando Supabase', err);
  }
}

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
    return { success: true, data: result.data, id: row?.id };
  } catch (err) {
    console.error('❌ EXCEPCIÓN:', err);
    return { success: false, error: err };
  }
});

ipcMain.handle('get-trades', async () => {
  const result = await tradesService.getTrades();

  if (!result.success) {
    console.error('❌ ERROR GET:', result.error);
    return [];
  }

  console.log('✅ TRADES RECIBIDOS:', result.data?.length ?? 0);

  return result.data || [];
});

ipcMain.handle('get-stats', () => {
  const row = db
    .prepare(
      `SELECT
        COUNT(*) as totalTrades,
        SUM(CASE WHEN result = 'TP' THEN 1 ELSE 0 END) as totalWins,
        COALESCE(SUM(pnl_net), 0) as totalPnl
      FROM trades`
    )
    .get();
  return row || { totalTrades: 0, totalWins: 0, totalPnl: 0 };
});

ipcMain.handle('get-trade', (event, id) => {
  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
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
    image_after: row.image_after || ''
  };
});

ipcMain.handle('update-trade', async (event, trade) => {
  console.log('✏️ UPDATE-TRADE EJECUTADO');

  const tradeId = Number(trade?.id);

  if (!Number.isFinite(tradeId) || tradeId <= 0) {
    console.error('❌ ID inválido update-trade:', trade?.id);
    return { success: false, error: 'INVALID_ID' };
  }

  const authUserId = await getCurrentUserId();
  if (!authUserId) {
    console.error('❌ update-trade sin usuario autenticado');
    return { success: false, error: 'NO_USER_ID' };
  }

  const safeTrade = normalizeTrade(trade);

  const supabaseTrade = {
    date: safeTrade.date,
    asset: safeTrade.asset,
    result: safeTrade.result,
    be_after_result:
      String(safeTrade.result || '').toUpperCase() === 'BE'
        ? (safeTrade.be_after_result ?? trade.be_after_result ?? null)
        : null,
    pnl: Number(safeTrade.pnl ?? 0) || 0,
    strategy: safeTrade.strategy,
    account: safeTrade.account || null,
    lotaje: Number(safeTrade.lotaje ?? trade.lotaje ?? trade.lotSize ?? 0) || 0,
    commission: Number(safeTrade.commission ?? trade.commission ?? 0) || 0,
    pnl_net: Number(safeTrade.pnl_net ?? safeTrade.pnl ?? 0) || 0,
    image_before: safeTrade.image_before || trade.image_before || trade.beforeImage || null,
    image_after: safeTrade.image_after || trade.image_after || trade.afterImage || null
  };

  console.log('📤 UPDATE FINAL A SUPABASE:', {
    id: tradeId,
    user_id: authUserId,
    supabaseTrade
  });
  console.log('UPDATE TRADE be_after_result:', trade?.be_after_result ?? null);

  try {
    const { data, error } = await supabase
      .from('trades')
      .update(supabaseTrade)
      .eq('id', tradeId)
      .eq('user_id', authUserId)
      .select();

    console.log('📥 RESPUESTA UPDATE SUPABASE:', { data, error });
    console.log('UPDATED TRADE RESULT:', data);

    if (error) {
      console.error('❌ Error Supabase update:', error);
      return { success: false, error };
    }

    const updatedRow = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!updatedRow) {
      console.warn('⚠️ Supabase update sin filas actualizadas:', tradeId);
      return { success: false, error: 'NOT_FOUND_OR_RLS' };
    }

    try {
      const nowIso = new Date().toISOString();

      const info = db
        .prepare(`
          UPDATE trades
          SET date = ?, asset = ?, result = ?, be_after_result = ?, pnl = ?, strategy = ?, account = ?,
              lotaje = ?, commission = ?, pnl_net = ?, image_before = ?, image_after = ?, updated_at = ?
          WHERE id = ?
        `)
        .run(
          updatedRow.date ?? supabaseTrade.date,
          updatedRow.asset ?? supabaseTrade.asset,
          updatedRow.result ?? supabaseTrade.result,
          updatedRow.be_after_result ?? supabaseTrade.be_after_result ?? null,
          Number(updatedRow.pnl ?? supabaseTrade.pnl ?? 0) || 0,
          updatedRow.strategy ?? supabaseTrade.strategy,
          updatedRow.account ?? supabaseTrade.account ?? '',
          Number(updatedRow.lotaje ?? supabaseTrade.lotaje ?? 0) || 0,
          Number(updatedRow.commission ?? supabaseTrade.commission ?? 0) || 0,
          Number(updatedRow.pnl_net ?? supabaseTrade.pnl_net ?? 0) || 0,
          updatedRow.image_before ?? supabaseTrade.image_before ?? '',
          updatedRow.image_after ?? supabaseTrade.image_after ?? '',
          nowIso,
          tradeId
        );

      console.log('📦 SQLite cache update:', info.changes);
    } catch (cacheErr) {
      console.warn('⚠️ No se pudo actualizar cache SQLite, pero Supabase sí:', cacheErr);
    }

    return {
      success: true,
      data: updatedRow
    };
  } catch (err) {
    console.error('❌ Excepción update-trade:', err);
    return { success: false, error: err };
  }
});

ipcMain.handle('delete-trade', async (event, tradeId) => {
  const id = Number(tradeId);

  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: 'INVALID_ID' };
  }

  try {
    const remote = await tradesService.deleteTrade(id);

    const isNotFound =
      remote.error === 'NOT_FOUND' ||
      remote.error?.code === 'PGRST116' ||
      remote.error?.message?.toLowerCase().includes('not found');

    if (isNotFound) {
      console.warn('⚠️ Trade no existía en Supabase, se borra solo en local');
    }

    if (!remote.success && !isNotFound) {
      console.error('❌ Error Supabase delete:', remote.error);
      return { success: false, error: remote.error };
    }

    if (remote.success) {
      console.log('☁️ Eliminado en Supabase:', id);
    }
  } catch (err) {
    console.error('❌ Error Supabase delete:', err);
    return { success: false, error: err };
  }

  const info = db.prepare('DELETE FROM trades WHERE id = ?').run(id);

  console.log('🗑 Eliminado en SQLite:', id);

  return {
    success: true,
    deleted: Number(info.changes || 0)
  };
});

ipcMain.handle('delete-trades-by-strategy', (event, strategyName) => {
  const safeStrategy = String(strategyName || '').trim();
  if (!safeStrategy) return { success: false, deleted: 0 };
  const info = db.prepare('DELETE FROM trades WHERE strategy = ?').run(safeStrategy);
  return { success: true, deleted: Number(info.changes || 0) };
});

ipcMain.handle('delete-trades-by-account', (event, accountName) => {
  const safeAccount = String(accountName || '').trim();
  if (!safeAccount) return { success: false, deleted: 0 };
  const info = db.prepare('DELETE FROM trades WHERE account = ?').run(safeAccount);
  return { success: true, deleted: Number(info.changes || 0) };
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