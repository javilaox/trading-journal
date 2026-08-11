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

/** Las estrategias pueden ser objetos; el resto de listas son cadenas. */
function parseJsonArrayLike(key, value) {
  return key === 'strategies' ? parseStrategiesFromDb(value) : parseJsonArray(value);
}

function normalizeRow(row) {
  if (!row) return row;
  return {
    ...row,
    accounts: parseJsonArray(row.accounts),
    strategies: parseStrategiesFromDb(row.strategies),
    assets: parseJsonArray(row.assets),
    sessions: parseJsonArray(row.sessions),
    challenge_config:
      row.challenge_config && typeof row.challenge_config === 'object' ? row.challenge_config : {},
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

  // Red de seguridad contra el borrado accidental de las listas del usuario.
  //
  // Estas cuatro listas son datos que cuesta reconstruir (estrategias sobre todo), y el upsert
  // reemplaza la fila entera. Si llega una lista vacía pero en la base hay contenido, casi
  // siempre significa que la app guardó antes de terminar de cargar, no que el usuario haya
  // borrado sus estrategias una a una. En ese caso se conserva lo que ya había.
  //
  // Vaciar de verdad sigue siendo posible: quien lo haga a propósito envía allowEmptyLists.
  const { data: existing } = await supabase
    .from('backtesting_settings')
    .select('accounts, strategies, assets, sessions')
    .eq('user_id', userId)
    .maybeSingle();

  const keepIfWouldWipe = (key) => {
    const incoming = Array.isArray(settings[key]) ? settings[key] : [];
    if (incoming.length || settings.allowEmptyLists === true) return incoming;
    const stored = existing ? parseJsonArrayLike(key, existing[key]) : [];
    if (stored.length) {
      console.warn(
        `[backtesting_settings] se ignora el vaciado de "${key}": llegaba vacío y hay ${stored.length} elementos guardados`
      );
      return stored;
    }
    return incoming;
  };

  const payload = {
    user_id: userId,
    accounts: keepIfWouldWipe('accounts'),
    strategies: keepIfWouldWipe('strategies'),
    assets: keepIfWouldWipe('assets'),
    sessions: keepIfWouldWipe('sessions'),
    default_account: settings.default_account || null,
    default_strategy: settings.default_strategy || null,
    default_asset: settings.default_asset || null,
    // Configuración del simulador de challenges. No es una lista, así que no entra en la red de
    // seguridad de arriba: se guarda tal cual llega.
    challenge_config:
      settings.challenge_config && typeof settings.challenge_config === 'object'
        ? settings.challenge_config
        : {},
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
