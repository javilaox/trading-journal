const { supabase } = require('./supabaseClient');
const { getCurrentUserId } = require('./supabaseAuth');

const ALLOWED_TYPES = new Set(['checkbox', 'number', 'text']);

function normalizeMetricPayload(metric = {}) {
  const mt = metric.metric_type || 'checkbox';
  const metric_type = ALLOWED_TYPES.has(String(mt)) ? String(mt) : 'checkbox';
  return {
    name: String(metric.name || '').trim(),
    description: metric.description ? String(metric.description).trim() : null,
    metric_type,
    is_active: metric.is_active !== false,
    sort_order: Number(metric.sort_order || 0),
    updated_at: new Date().toISOString()
  };
}

function normalizeMetricRow(row) {
  if (!row) return row;
  const mt = row.metric_type || 'checkbox';
  return {
    ...row,
    metric_type: ALLOWED_TYPES.has(String(mt)) ? String(mt) : 'checkbox'
  };
}

async function getBacktestingMetrics() {
  const userId = await getCurrentUserId();
  console.log('Current user id:', userId);
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }

  const { data, error } = await supabase
    .from('backtesting_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ getBacktestingMetrics:', error);
    return { success: false, error };
  }

  const rows = Array.isArray(data) ? data.map(normalizeMetricRow) : [];
  return { success: true, data: rows };
}

async function addBacktestingMetric(metric) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }

  const payload = {
    ...normalizeMetricPayload(metric),
    user_id: userId
  };

  if (!payload.name) return { success: false, error: 'MISSING_NAME' };

  const { data, error } = await supabase
    .from('backtesting_metrics')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('❌ addBacktestingMetric:', error);
    return { success: false, error };
  }

  return { success: true, data: normalizeMetricRow(data) };
}

async function updateBacktestingMetric(metric) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }

  const id = Number(metric.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: 'INVALID_METRIC_ID' };
  }

  const payload = normalizeMetricPayload(metric);

  const { data, error } = await supabase
    .from('backtesting_metrics')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('❌ updateBacktestingMetric:', error);
    return { success: false, error };
  }

  return { success: true, data: normalizeMetricRow(data) };
}

async function deleteBacktestingMetric(metricId) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }

  const id = Number(metricId);
  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: 'INVALID_METRIC_ID' };
  }

  const { error } = await supabase
    .from('backtesting_metrics')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('❌ deleteBacktestingMetric:', error);
    return { success: false, error };
  }

  return { success: true };
}

module.exports = {
  getBacktestingMetrics,
  addBacktestingMetric,
  updateBacktestingMetric,
  deleteBacktestingMetric
};
