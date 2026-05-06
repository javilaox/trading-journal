const { supabase } = require('./supabaseClient');
const { getCurrentUserId } = require('./supabaseAuth');

function parseCustomMetrics(val) {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return typeof p === 'object' && p !== null && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Whitelist estricta: solo columnas válidas para `backtesting_trades`. */
function normalizeBacktestingTradePayload(trade = {}, userId) {
  const custom_metrics =
    trade.custom_metrics && typeof trade.custom_metrics === 'object' && !Array.isArray(trade.custom_metrics)
      ? { ...trade.custom_metrics }
      : {};

  if (Object.prototype.hasOwnProperty.call(trade, 'risk_eur')) {
    custom_metrics.risk_eur = Number(trade.risk_eur) || 0;
  }

  const pnlValue = Number(trade.pnl ?? trade.pnl_estimated ?? 0) || 0;

  let session_id = null;
  if (trade.session_id) {
    const s = Number(trade.session_id);
    if (Number.isFinite(s) && s > 0) session_id = s;
  }

  return {
    user_id: userId,
    session_id,
    date: trade.date || null,
    asset: trade.asset || '',
    strategy: trade.strategy || '',
    session: trade.session || '',
    direction: trade.direction || 'LONG',
    result: trade.result || 'BE',

    entry_price:
      trade.entry_price === '' || trade.entry_price == null ? null : Number(trade.entry_price),
    stop_loss: trade.stop_loss === '' || trade.stop_loss == null ? null : Number(trade.stop_loss),
    take_profit:
      trade.take_profit === '' || trade.take_profit == null ? null : Number(trade.take_profit),

    rr_planned:
      trade.rr_planned === '' || trade.rr_planned == null ? null : Number(trade.rr_planned),
    rr_result: (() => {
      if (trade.rr_result !== undefined && trade.rr_result !== '' && trade.rr_result != null) {
        const n = Number(trade.rr_result);
        if (Number.isFinite(n)) return n;
      }
      if (trade.rr !== undefined && trade.rr !== '' && trade.rr != null) {
        const n = Number(trade.rr);
        if (Number.isFinite(n)) return n;
      }
      return 0;
    })(),

    pnl: pnlValue,
    notes: trade.notes || '',
    custom_metrics
  };
}

function normalizeRow(row) {
  if (!row) return row;
  const sessionId = row.session_id;
  const sid =
    sessionId != null && sessionId !== ''
      ? Number(sessionId)
      : null;
  const pnlVal = Number(row.pnl ?? row.pnl_estimated ?? 0) || 0;
  const cm = parseCustomMetrics(row.custom_metrics);
  let riskEuro = NaN;
  const cmRisk = cm?.risk_eur;
  if (cmRisk !== undefined && cmRisk !== null && cmRisk !== '') {
    riskEuro = Number(cmRisk);
  }
  if (!Number.isFinite(riskEuro) && row.risk_eur !== undefined && row.risk_eur !== null && row.risk_eur !== '') {
    riskEuro = Number(row.risk_eur);
  }
  if (!Number.isFinite(riskEuro)) riskEuro = 0;

  return {
    ...row,
    session_id: Number.isFinite(sid) && sid > 0 ? sid : null,
    custom_metrics: cm,
    entry_price: Number(row.entry_price ?? 0) || 0,
    stop_loss: Number(row.stop_loss ?? 0) || 0,
    take_profit: Number(row.take_profit ?? 0) || 0,
    risk_eur: riskEuro,
    rr_planned: Number(row.rr_planned ?? 0) || 0,
    rr_result: Number(row.rr_result ?? 0) || 0,
    pnl: pnlVal,
    pnl_estimated: pnlVal
  };
}

async function addBacktestTrade(trade) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }
  const payload = normalizeBacktestingTradePayload(trade, userId);

  console.log('📤 Insert backtesting_trades payload:', payload);

  const { data, error } = await supabase
    .from('backtesting_trades')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error addBacktestTrade:', error);
    return { success: false, error };
  }

  console.log('✅ Insert backtesting_trades data:', data);

  return { success: true, data };
}

async function getBacktestTrades() {
  const userId = await getCurrentUserId();
  console.log('Current user id:', userId);
  if (!userId) {
    return { success: false, error: 'NO_AUTH', data: [] };
  }

  const { data, error } = await supabase
    .from('backtesting_trades')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .order('id', { ascending: true });

  console.log('📥 getBacktestTrades userId:', userId, 'rows:', data?.length ?? 0);

  if (error) {
    console.error('❌ Error getBacktestTrades:', error);
    return { success: false, error, data: [] };
  }

  const raw = data || [];
  const rows = Array.isArray(raw) ? raw.map(normalizeRow) : [];
  return { success: true, data: rows };
}

async function updateBacktestTrade(trade) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }

  const id = Number(trade?.id);

  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: 'INVALID_ID' };
  }

  const payload = normalizeBacktestingTradePayload(trade, userId);
  delete payload.user_id;

  const { data, error } = await supabase
    .from('backtesting_trades')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error updateBacktestTrade:', error);
    return { success: false, error };
  }

  return { success: true, data };
}

async function deleteBacktestTrade(id) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }

  const pk = Number(id);
  if (!Number.isFinite(pk) || pk <= 0) {
    return { success: false, error: 'INVALID_ID' };
  }

  const { error } = await supabase
    .from('backtesting_trades')
    .delete()
    .eq('id', pk)
    .eq('user_id', userId);

  if (error) {
    console.error('❌ deleteBacktestTrade:', error);
    return { success: false, error };
  }

  return { success: true };
}

module.exports = {
  addBacktestTrade,
  getBacktestTrades,
  updateBacktestTrade,
  deleteBacktestTrade
};
