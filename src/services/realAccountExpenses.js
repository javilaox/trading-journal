/**
 * Gastos de cuentas reales (props, suscripciones, comisiones externas, etc.)
 * — offline-first (SQLite + sync_queue + Supabase). Mismo patrón que realAccountWithdrawals.js.
 */

function isExpenseRowHidden(row) {
  if (!row) return true;
  const deletedAt = row.deleted_at;
  if (deletedAt != null && String(deletedAt).trim() !== '') return true;
  const sync = String(row.sync_status || '').toLowerCase();
  return sync === 'pending_delete' || sync === 'deleted';
}

function normalizeExpenseInput(raw = {}, userId) {
  const amount = Number(raw.amount);
  const date = String(raw.date || '').trim().slice(0, 10);
  const accountName = String(raw.account_name || raw.accountName || '').trim();
  const category = raw.category != null ? String(raw.category).trim() : '';
  const note = raw.note != null ? String(raw.note).trim() : '';
  const clientUuid = raw.client_uuid ? String(raw.client_uuid).trim() : '';

  if (!userId) return { error: 'NO_USER_ID' };
  if (!accountName) return { error: 'MISSING_ACCOUNT' };
  if (!date) return { error: 'MISSING_DATE' };
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'INVALID_AMOUNT' };

  return {
    user_id: String(userId),
    client_uuid: clientUuid || null,
    account_id: raw.account_id != null && String(raw.account_id).trim() !== '' ? String(raw.account_id) : null,
    account_client_uuid:
      raw.account_client_uuid != null && String(raw.account_client_uuid).trim() !== ''
        ? String(raw.account_client_uuid)
        : null,
    account_name: accountName,
    amount,
    date,
    category: category || null,
    note: note || null,
  };
}

function mapExpenseRowToResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    localId: row.id,
    remote_id: row.remote_id ?? null,
    client_uuid: row.client_uuid ?? null,
    user_id: row.user_id,
    account_id: row.account_id ?? null,
    account_client_uuid: row.account_client_uuid ?? null,
    account_name: row.account_name || '',
    accountName: row.account_name || '',
    amount: Number(row.amount ?? 0) || 0,
    date: row.date || '',
    category: row.category || '',
    note: row.note || '',
    sync_status: row.sync_status ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function getExpensesFromLocal(db, userId) {
  if (!userId) return [];
  const rows = db
    .prepare(
      `SELECT * FROM real_account_expenses
       WHERE user_id = ?
         AND (deleted_at IS NULL OR deleted_at = '')
         AND (sync_status IS NULL OR sync_status = '' OR sync_status NOT IN ('pending_delete', 'deleted'))
       ORDER BY date DESC, id DESC`
    )
    .all(String(userId));
  return rows.filter((r) => !isExpenseRowHidden(r)).map(mapExpenseRowToResponse);
}

function supabaseRowFromPayload(payload) {
  return {
    user_id: String(payload.user_id),
    client_uuid: payload.client_uuid ? String(payload.client_uuid) : null,
    account_id: payload.account_id ? String(payload.account_id) : null,
    account_name: String(payload.account_name || ''),
    amount: Number(payload.amount) || 0,
    date: String(payload.date || '').slice(0, 10),
    category: payload.category != null ? String(payload.category) : null,
    note: payload.note != null ? String(payload.note) : null,
    updated_at: new Date().toISOString(),
  };
}

function upsertExpensesIntoLocal(db, remoteRows, userId, logPrefix = '') {
  const uid = String(userId);
  const rows = Array.isArray(remoteRows) ? remoteRows : [];

  const selectByClient = db.prepare(
    `SELECT id, sync_status, deleted_at FROM real_account_expenses WHERE user_id = ? AND client_uuid = ? LIMIT 1`
  );
  const selectByRemote = db.prepare(
    `SELECT id, sync_status, deleted_at FROM real_account_expenses WHERE user_id = ? AND remote_id = ? LIMIT 1`
  );

  const insert = db.prepare(`
    INSERT INTO real_account_expenses
    (user_id, client_uuid, remote_id, account_id, account_client_uuid, account_name, amount, date, category, note, created_at, updated_at, sync_status, deleted_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'synced', NULL)
  `);

  const update = db.prepare(`
    UPDATE real_account_expenses SET
      client_uuid = COALESCE(?, client_uuid),
      remote_id = COALESCE(?, remote_id),
      account_id = COALESCE(?, account_id),
      account_name = ?,
      amount = ?,
      date = ?,
      category = ?,
      note = ?,
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
      const localHit =
        (clientUuid ? selectByClient.get(uid, clientUuid) : null) ||
        selectByRemote.get(uid, remoteId);

      if (localHit && isExpenseRowHidden(localHit)) {
        if (logPrefix) console.log('[pullRemoteData] skipping locally deleted expense', localHit.id);
        continue;
      }
      if (localHit && String(localHit.sync_status || '').startsWith('pending_')) continue;

      const updatedAt = r?.updated_at ? String(r.updated_at) : new Date().toISOString();
      const createdAt = r?.created_at ? String(r.created_at) : updatedAt;

      if (!localHit) {
        insert.run(
          uid,
          clientUuid,
          remoteId,
          r?.account_id ? String(r.account_id) : null,
          String(r?.account_name || ''),
          Number(r?.amount ?? 0) || 0,
          String(r?.date || '').slice(0, 10),
          r?.category != null ? String(r.category) : null,
          r?.note != null ? String(r.note) : null,
          createdAt,
          updatedAt
        );
      } else {
        update.run(
          clientUuid,
          remoteId,
          r?.account_id ? String(r.account_id) : null,
          String(r?.account_name || ''),
          Number(r?.amount ?? 0) || 0,
          String(r?.date || '').slice(0, 10),
          r?.category != null ? String(r.category) : null,
          r?.note != null ? String(r.note) : null,
          updatedAt,
          uid,
          Number(localHit.id)
        );
      }
    }
  });

  tx();
}

function calculateExpenseMetrics(expenses = []) {
  const list = Array.isArray(expenses) ? expenses : [];
  const total = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const count = list.length;
  const avg = count > 0 ? total / count : 0;
  const sorted = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const last = sorted[0] || null;

  const byAccount = {};
  for (const e of list) {
    const key = String(e.account_name || e.accountName || '—');
    if (!byAccount[key]) byAccount[key] = { total: 0, count: 0, last: null };
    byAccount[key].total += Number(e.amount) || 0;
    byAccount[key].count += 1;
    if (!byAccount[key].last || String(e.date) > String(byAccount[key].last.date)) {
      byAccount[key].last = e;
    }
  }

  const byMonth = {};
  for (const e of list) {
    const m = String(e.date || '').slice(0, 7);
    if (!m) continue;
    byMonth[m] = (byMonth[m] || 0) + (Number(e.amount) || 0);
  }

  const byCategory = {};
  for (const e of list) {
    const key = String(e.category || 'Sin categoría');
    byCategory[key] = (byCategory[key] || 0) + (Number(e.amount) || 0);
  }

  return { total, count, average: avg, last, byAccount, byMonth, byCategory };
}

module.exports = {
  isExpenseRowHidden,
  normalizeExpenseInput,
  mapExpenseRowToResponse,
  getExpensesFromLocal,
  supabaseRowFromPayload,
  upsertExpensesIntoLocal,
  calculateExpenseMetrics,
};
