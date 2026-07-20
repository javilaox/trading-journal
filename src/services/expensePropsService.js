/**
 * Lista de "props" reutilizable en el formulario de Gastos — offline-first
 * (SQLite + sync_queue + Supabase). Solo soporta crear (no hace falta editar/borrar
 * todavía); se mantiene el mismo patrón de identidad estable (client_uuid) que el resto.
 */

function isPropRowHidden(row) {
  if (!row) return true;
  const deletedAt = row.deleted_at;
  if (deletedAt != null && String(deletedAt).trim() !== '') return true;
  const sync = String(row.sync_status || '').toLowerCase();
  return sync === 'pending_delete' || sync === 'deleted';
}

function mapPropRowToResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    client_uuid: row.client_uuid ?? null,
    remote_id: row.remote_id ?? null,
    name: row.name || '',
  };
}

function getPropsFromLocal(db, userId) {
  if (!userId) return [];
  const rows = db
    .prepare(
      `SELECT * FROM expense_props
       WHERE user_id = ?
         AND (deleted_at IS NULL OR deleted_at = '')
         AND (sync_status IS NULL OR sync_status = '' OR sync_status NOT IN ('pending_delete', 'deleted'))
       ORDER BY name COLLATE NOCASE ASC`
    )
    .all(String(userId));
  return rows.filter((r) => !isPropRowHidden(r)).map(mapPropRowToResponse);
}

function supabaseRowFromPayload(payload) {
  return {
    user_id: String(payload.user_id),
    client_uuid: payload.client_uuid ? String(payload.client_uuid) : null,
    name: String(payload.name || ''),
    updated_at: new Date().toISOString(),
  };
}

function upsertPropsIntoLocal(db, remoteRows, userId, logPrefix = '') {
  const uid = String(userId);
  const rows = Array.isArray(remoteRows) ? remoteRows : [];

  const selectByClient = db.prepare(
    `SELECT id, sync_status, deleted_at FROM expense_props WHERE user_id = ? AND client_uuid = ? LIMIT 1`
  );
  const selectByName = db.prepare(
    `SELECT id, sync_status, deleted_at FROM expense_props WHERE user_id = ? AND name = ? COLLATE NOCASE LIMIT 1`
  );

  const insert = db.prepare(`
    INSERT INTO expense_props (user_id, client_uuid, remote_id, name, created_at, updated_at, sync_status, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, 'synced', NULL)
  `);

  const update = db.prepare(`
    UPDATE expense_props SET
      client_uuid = COALESCE(?, client_uuid),
      remote_id = COALESCE(?, remote_id),
      name = ?,
      updated_at = ?,
      sync_status = CASE
        WHEN sync_status LIKE 'pending_%' THEN sync_status
        ELSE 'synced'
      END
    WHERE user_id = ? AND id = ?
  `);

  const tx = db.transaction(() => {
    for (const r of rows) {
      if (r?.deleted_at) continue;
      const remoteId = r?.id != null ? String(r.id) : null;
      if (!remoteId) continue;

      const clientUuid = r?.client_uuid ? String(r.client_uuid) : null;
      const name = String(r?.name || '').trim();
      if (!name) continue;

      const localHit = (clientUuid ? selectByClient.get(uid, clientUuid) : null) || selectByName.get(uid, name);

      if (localHit && isPropRowHidden(localHit)) continue;
      if (localHit && String(localHit.sync_status || '').startsWith('pending_')) continue;

      const updatedAt = r?.updated_at ? String(r.updated_at) : new Date().toISOString();
      const createdAt = r?.created_at ? String(r.created_at) : updatedAt;

      if (!localHit) {
        insert.run(uid, clientUuid, remoteId, name, createdAt, updatedAt);
      } else {
        update.run(clientUuid, remoteId, name, updatedAt, uid, Number(localHit.id));
      }
    }
  });

  tx();
}

module.exports = {
  isPropRowHidden,
  mapPropRowToResponse,
  getPropsFromLocal,
  supabaseRowFromPayload,
  upsertPropsIntoLocal,
};
