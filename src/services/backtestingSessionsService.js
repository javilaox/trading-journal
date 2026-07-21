const { supabase } = require('./supabaseClient');
const { getCurrentUserId } = require('./supabaseAuth');
const { ensureFreshSupabaseSession, friendlyServiceError } = require('./supabaseWriteHelpers');

/** Lista de pares desde `asset` (CSV) o, en memoria, desde `pairs` si viniera sin `asset`. */
function pairsListFromSession(session = {}) {
  const fromAsset = String(session.asset || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (fromAsset.length) return fromAsset;
  if (Array.isArray(session.pairs) && session.pairs.length) {
    return session.pairs.map((x) => String(x || '').trim()).filter(Boolean);
  }
  return [];
}

/** Campos persistibles (insert/update). Sin user_id. Solo columna `asset` (varios pares como CSV). */
function normalizeSessionPayload(session = {}) {
  const list = pairsListFromSession(session);
  const asset = list.length ? list.join(',') : String(session.asset || '').trim();
  return {
    name: String(session.name || '').trim(),
    asset,
    strategy: session.strategy ? String(session.strategy).trim() : null,
    start_date: session.start_date || null,
    end_date: session.end_date || null,
    status: session.status || 'in_progress',
    notes: session.notes ? String(session.notes) : null,
    account_capital: Number(session.account_capital ?? 0) || 0,
    updated_at: new Date().toISOString()
  };
}

/** Coerción al leer (p. ej. numeric como string). */
function mapSessionRow(row) {
  if (!row) return row;
  const assetStr = String(row.asset || '').trim();
  const pairs = assetStr
    ? assetStr
        .split(',')
        .map((x) => String(x || '').trim())
        .filter(Boolean)
    : [];
  return {
    ...row,
    account_capital: Number(row.account_capital ?? 0) || 0,
    pairs,
    asset: assetStr
  };
}

async function getBacktestingSessions() {
  const userId = await getCurrentUserId();
  console.log('Current user id:', userId);
  if (!userId) {
    return { success: false, error: 'No se pudo verificar tu sesión. Cierra sesión y vuelve a entrar.' };
  }

  const { data, error } = await supabase
    .from('backtesting_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('❌ getBacktestingSessions:', error);
    return { success: false, error: friendlyServiceError(error) };
  }

  return { success: true, data: (data || []).map(mapSessionRow) };
}

async function addBacktestingSession(session) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'No se pudo verificar tu sesión. Cierra sesión y vuelve a entrar.' };
  }

  const payload = {
    ...normalizeSessionPayload(session || {}),
    user_id: userId
  };

  if (!payload.name) return { success: false, error: 'MISSING_NAME' };
  if (
    !String(payload.asset || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean).length
  ) {
    return { success: false, error: 'MISSING_ASSET' };
  }
  if (!payload.start_date) return { success: false, error: 'MISSING_START_DATE' };
  if (!payload.end_date) return { success: false, error: 'MISSING_END_DATE' };

  const sessionOk = await ensureFreshSupabaseSession();
  if (!sessionOk) {
    return { success: false, error: 'Tu sesión ha caducado o no se pudo verificar. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.' };
  }

  const { data, error } = await supabase
    .from('backtesting_sessions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('❌ addBacktestingSession:', error);
    return { success: false, error: friendlyServiceError(error) };
  }

  return { success: true, data: mapSessionRow(data) };
}

async function updateBacktestingSession(session) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'No se pudo verificar tu sesión. Cierra sesión y vuelve a entrar.' };
  }

  const id = Number(session.id);

  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: 'INVALID_SESSION_ID' };
  }

  const payload = normalizeSessionPayload(session);

  if (!payload.name) return { success: false, error: 'MISSING_NAME' };
  if (
    !String(payload.asset || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean).length
  ) {
    return { success: false, error: 'MISSING_ASSET' };
  }
  if (!payload.start_date) return { success: false, error: 'MISSING_START_DATE' };
  if (!payload.end_date) return { success: false, error: 'MISSING_END_DATE' };

  const sessionOkUpdate = await ensureFreshSupabaseSession();
  if (!sessionOkUpdate) {
    return { success: false, error: 'Tu sesión ha caducado o no se pudo verificar. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.' };
  }

  const { data, error } = await supabase
    .from('backtesting_sessions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('❌ updateBacktestingSession:', error);
    return { success: false, error: friendlyServiceError(error) };
  }

  return { success: true, data: mapSessionRow(data) };
}

async function deleteBacktestingSession(sessionId) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'No se pudo verificar tu sesión. Cierra sesión y vuelve a entrar.' };
  }

  const id = Number(sessionId);

  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: 'INVALID_SESSION_ID' };
  }

  const sessionOkDelete = await ensureFreshSupabaseSession();
  if (!sessionOkDelete) {
    return { success: false, error: 'Tu sesión ha caducado o no se pudo verificar. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.' };
  }

  const { error } = await supabase
    .from('backtesting_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('❌ deleteBacktestingSession:', error);
    return { success: false, error: friendlyServiceError(error) };
  }

  return { success: true };
}

module.exports = {
  getBacktestingSessions,
  addBacktestingSession,
  updateBacktestingSession,
  deleteBacktestingSession
};
