const { supabase } = require('./supabaseClient');
const { getCurrentUserId } = require('./supabaseAuth');
const { ensureFreshSupabaseSession, friendlyServiceError } = require('./supabaseWriteHelpers');

function parseJsonArray(val) {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (val == null) return [];
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Estrategias: array de strings u objetos { id, name, risk, rr, ... } desde JSON/JSONB */
function parseStrategiesFromDb(val) {
  if (Array.isArray(val)) return val.filter((x) => x != null);
  if (val == null) return [];
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p.filter((x) => x != null) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeRow(row) {
  if (!row) return row;
  return {
    ...row,
    accounts: parseJsonArray(row.accounts),
    strategies: parseStrategiesFromDb(row.strategies),
    assets: parseJsonArray(row.assets),
    sessions: parseJsonArray(row.sessions),
    default_risk: Number(row.default_risk ?? 100) || 100,
    default_rr: Number(row.default_rr ?? 2) || 2
  };
}

async function getBacktestingSettings() {
  const userId = await getCurrentUserId();
  console.log('Current user id:', userId);
  if (!userId) {
    return { success: false, error: 'No se pudo verificar tu sesión. Cierra sesión y vuelve a entrar.' };
  }

  const { data, error } = await supabase
    .from('backtesting_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { success: false, error: friendlyServiceError(error) };

  return { success: true, data: data ? normalizeRow(data) : null };
}

async function upsertBacktestingSettings(settings) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'No se pudo verificar tu sesión. Cierra sesión y vuelve a entrar.' };
  }

  const payload = {
    user_id: userId,
    accounts: settings.accounts || [],
    strategies: settings.strategies || [],
    assets: settings.assets || [],
    sessions: settings.sessions || [],
    default_account: settings.default_account || null,
    default_strategy: settings.default_strategy || null,
    default_asset: settings.default_asset || null,
    default_risk: Number(settings.default_risk ?? 0),
    default_rr: Number(settings.default_rr ?? 0),
    updated_at: new Date().toISOString()
  };

  const sessionOk = await ensureFreshSupabaseSession();
  if (!sessionOk) {
    return { success: false, error: 'Tu sesión ha caducado o no se pudo verificar. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.' };
  }

  // Nota: antes se encadenaba .select().maybeSingle() tras el upsert para devolver la fila
  // actualizada. Si esa lectura de confirmación fallaba (p. ej. por un hipo de red o de RLS
  // en la réplica de lectura) se reportaba como error aunque la escritura ya se hubiera
  // guardado correctamente -- el usuario veía "no se pudo guardar" pero al recargar la
  // estrategia/ajuste sí estaba ahí. Separamos ambos pasos: el éxito depende solo de que el
  // upsert (la escritura) no haya devuelto error; la lectura de confirmación es best-effort.
  const { error: upsertError } = await supabase
    .from('backtesting_settings')
    .upsert(payload, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('❌ upsertBacktestingSettings:', upsertError);
    return { success: false, error: friendlyServiceError(upsertError) };
  }

  return { success: true, data: normalizeRow(payload) };
}

module.exports = {
  getBacktestingSettings,
  upsertBacktestingSettings
};
