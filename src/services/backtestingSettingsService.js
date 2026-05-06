const { supabase } = require('./supabaseClient');
const { getCurrentUserId } = require('./supabaseAuth');

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
    return { success: false, error: 'NO_AUTH' };
  }

  const { data, error } = await supabase
    .from('backtesting_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { success: false, error };

  return { success: true, data: data ? normalizeRow(data) : null };
}

async function upsertBacktestingSettings(settings) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
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

  const { data, error } = await supabase
    .from('backtesting_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (error) return { success: false, error };

  return { success: true, data: data ? normalizeRow(data) : null };
}

module.exports = {
  getBacktestingSettings,
  upsertBacktestingSettings
};
