/**
 * Lectura local + upsert desde Supabase (offline-first, sin duplicar por id).
 */

const {
  serializePositionLegsForStorage,
  isCompositePositionFlag,
} = require('./positionLegsUtils');

function parseTs(iso) {
  if (iso == null || iso === '') return 0;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : 0;
}

/**
 * Valores para INSERT/UPDATE incluyendo user_id (aislar por usuario en SQLite).
 */
function remoteRowToSqliteValues(row, fallbackUserId) {
  const uidRaw =
    row.user_id != null && row.user_id !== ''
      ? row.user_id
      : fallbackUserId != null
        ? fallbackUserId
        : null;
  const uid = uidRaw != null ? String(uidRaw) : null;

  const updated =
    row.updated_at != null && row.updated_at !== ''
      ? String(row.updated_at)
      : new Date().toISOString();

  const id = Number(row.id);
  return [
    Number.isFinite(id) ? id : null,
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
    row.entry_time ?? null,
    row.exit_time ?? null,
    isCompositePositionFlag(row.is_composite_position) ? 1 : 0,
    serializePositionLegsForStorage(row.position_legs ?? []),
    updated,
    uid
  ];
}

/**
 * Asigna filas legacy (user_id NULL) al usuario actual. Pensado para un solo usuario por máquina.
 */
function claimLegacyTradesForUser(db, userId) {
  if (!userId) return 0;
  const info = db
    .prepare('UPDATE trades SET user_id = ? WHERE user_id IS NULL')
    .run(String(userId));
  return Number(info.changes || 0);
}

function isTradeRowHidden(row) {
  if (!row) return true;
  const deletedAt = row.deleted_at;
  if (deletedAt != null && String(deletedAt).trim() !== '') return true;
  const sync = String(row.sync_status || '').toLowerCase();
  return sync === 'pending_delete' || sync === 'deleted';
}

function getTradesFromLocal(db, userId, mapRowToTradeResponse) {
  if (!userId) return [];
  const uid = String(userId);
  const rows = db
    .prepare(
      `SELECT * FROM trades
       WHERE user_id = ?
         AND (deleted_at IS NULL OR deleted_at = '')
         AND (sync_status IS NULL OR sync_status = '' OR sync_status NOT IN ('pending_delete', 'deleted'))
       ORDER BY id DESC`
    )
    .all(uid);
  const visible = rows.filter((row) => !isTradeRowHidden(row));
  if (visible.length !== rows.length) {
    console.log(
      '[renderTrades] visible trades count after deleted filter:',
      visible.length,
      '(raw rows:',
      rows.length,
      ')'
    );
  }
  return visible.map((row) => mapRowToTradeResponse(row));
}

/**
 * Merge idempotente: insert o update si remoto es más reciente (updated_at).
 */
function upsertTradesIntoLocal(db, remoteRows, userId, logPrefix = '') {
  const rows = Array.isArray(remoteRows) ? remoteRows : [];
  const fallbackUserId = userId != null ? String(userId) : null;

  const insertStmt = db.prepare(`
    INSERT INTO trades
    (id, client_uuid, remote_id, date, asset, result, be_after_result, pnl, strategy, account, lotaje, commission, pnl_net, image_before, image_after, entry_time, exit_time, is_composite_position, position_legs, updated_at, user_id, sync_status, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', NULL)
  `);

  const updateStmt = db.prepare(`
    UPDATE trades SET
      client_uuid = COALESCE(?, client_uuid),
      remote_id = COALESCE(?, remote_id),
      date = ?, asset = ?, result = ?, be_after_result = ?, pnl = ?, strategy = ?, account = ?,
      lotaje = ?, commission = ?, pnl_net = ?, image_before = ?, image_after = ?,
      entry_time = ?, exit_time = ?, is_composite_position = ?, position_legs = ?,
      updated_at = ?, user_id = ?,
      sync_status = CASE
        WHEN sync_status LIKE 'pending_%' THEN sync_status
        ELSE 'synced'
      END
    WHERE id = ?
  `);

  const selectLocalById = db.prepare(
    'SELECT id, updated_at, user_id, sync_status, deleted_at FROM trades WHERE id = ?'
  );
  const selectLocalByClient = db.prepare(
    'SELECT id, updated_at, user_id, sync_status, deleted_at FROM trades WHERE user_id = ? AND client_uuid = ?'
  );

  const mergeTx = db.transaction((tradeRows) => {
    for (const row of tradeRows) {
      const vals = remoteRowToSqliteValues(row, fallbackUserId);
      const id = vals[0];
      if (!Number.isFinite(id) || id <= 0) continue;

      const remoteTs = parseTs(row.updated_at);
      const clientUuidRaw = row.client_uuid != null && row.client_uuid !== '' ? String(row.client_uuid) : null;
      const uid = vals[18] != null ? String(vals[18]) : fallbackUserId;

      // Preferimos merge por client_uuid (evita duplicar cuando local tiene id temporal negativo).
      const localByClient =
        clientUuidRaw && uid ? selectLocalByClient.get(String(uid), String(clientUuidRaw)) : null;
      const localById = selectLocalById.get(id);

      const local = localByClient || localById;
      const localTs = parseTs(local?.updated_at);
      const localSync = String(local?.sync_status || '');

      if (local && isTradeRowHidden(local)) {
        const logId = local.id ?? id;
        console.log('[pullRemoteData] skipping locally deleted trade', logId);
        continue;
      }

      // No pisar cambios locales pendientes (create/update/delete en cola).
      if (local && localSync.startsWith('pending_')) {
        continue;
      }

      if (!local) {
        insertStmt.run([
          id,
          clientUuidRaw,
          id,
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
          vals[14],
          vals[15],
          vals[16],
          vals[17],
          vals[18],
        ]);
      } else if (remoteTs > localTs) {
        if (logPrefix) console.log(logPrefix, 'Update por conflicto remoto más reciente:', id);
        updateStmt.run(
          clientUuidRaw,
          id,
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
          vals[14],
          vals[15],
          vals[16],
          vals[17],
          vals[18],
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
    }
  }
}

/**
 * Descarga trades desde Supabase usando la sesión actual (tradesService / RLS).
 */
async function getTradesFromSupabase(tradesService) {
  return tradesService.getTrades();
}

/**
 * Lectura offline-first en un solo paso (p. ej. stats / IPC get-trades).
 */
async function loadTradesOfflineFirst(db, tradesService, userId, mapRowToTradeResponse) {
  if (!userId) {
    return [];
  }

  claimLegacyTradesForUser(db, userId);

  let trades = getTradesFromLocal(db, userId, mapRowToTradeResponse);

  try {
    console.log('Supabase online sync started');
    const result = await getTradesFromSupabase(tradesService);
    if (result.success && Array.isArray(result.data)) {
      upsertTradesIntoLocal(db, result.data, userId, '⚖️');
      console.log('Local cache updated from Supabase');
      trades = getTradesFromLocal(db, userId, mapRowToTradeResponse);
    } else {
      console.log('Supabase unavailable, using local cache');
    }
  } catch (err) {
    console.log('Supabase unavailable, using local cache');
    console.warn(String(err && err.message ? err.message : err));
  }

  return trades;
}

module.exports = {
  parseTs,
  remoteRowToSqliteValues,
  claimLegacyTradesForUser,
  isTradeRowHidden,
  getTradesFromLocal,
  upsertTradesIntoLocal,
  getTradesFromSupabase,
  loadTradesOfflineFirst
};
