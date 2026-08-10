/**
 * Enlaces para compartir resultados de backtesting.
 *
 * Reparto de responsabilidades:
 *   - Los datos viven en la tabla `backtest_reports`, protegida por RLS.
 *   - La contraseña y el límite de dispositivos los valida el RPC `open_backtest_report`.
 *   - Lo único público es el HTML del visor, que no contiene datos: solo el token.
 */

const { supabase } = require('./supabaseClient');
const { getCurrentUserId } = require('./supabaseAuth');
const { supabaseUrl, supabaseAnonKey } = require('./supabaseConfig');
const { ensureFreshSupabaseSession, friendlyServiceError } = require('./supabaseWriteHelpers');
const { buildViewerHtml } = require('./backtestShareViewer');

const BUCKET = 'backtest-reports';

/**
 * Contraseña legible y fácil de dictar por teléfono o WhatsApp. Se evitan los caracteres que
 * se confunden al leerlos (O/0, I/l/1) porque la va a teclear una persona a mano.
 */
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateSharePassword(length = 10) {
  const bytes = require('crypto').randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
    if (i === 4 && length > 6) out += '-'; // ABCDE-FGHIJ, más fácil de leer
  }
  return out;
}

/** Solo los campos que deben viajar al informe compartido. */
function sanitizeTradeForShare(trade = {}) {
  const metrics =
    trade.custom_metrics && typeof trade.custom_metrics === 'object' && !Array.isArray(trade.custom_metrics)
      ? { ...trade.custom_metrics }
      : {};
  delete metrics.risk_eur;

  return {
    id: trade.id,
    date: String(trade.date || '').slice(0, 10),
    session_id: trade.session_id ?? null,
    asset: trade.asset || '',
    strategy: trade.strategy || '',
    direction: trade.direction || '',
    result: trade.result || '',
    pnl: Number(trade.pnl || 0),
    rr_planned: Number(trade.rr_planned || 0),
    rr_result: Number(trade.rr_result || 0),
    entry_time: trade.entry_time || '',
    exit_time: trade.exit_time || '',
    notes: trade.notes || '',
    custom_metrics: metrics,
  };
}

async function createBacktestShareLink({ title, trades, sessions, metrics, capital, range, maxDevices }) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'No se pudo verificar tu sesión. Cierra sesión y vuelve a entrar.' };

  const list = Array.isArray(trades) ? trades : [];
  if (!list.length) return { success: false, error: 'No hay operaciones que compartir con los filtros actuales.' };

  const ok = await ensureFreshSupabaseSession();
  if (!ok) {
    return { success: false, error: 'Tu sesión ha caducado. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.' };
  }

  const payload = {
    trades: list.map(sanitizeTradeForShare),
    sessions: (Array.isArray(sessions) ? sessions : []).map((s) => ({ id: s.id, name: s.name || `Sesión ${s.id}` })),
    metrics: Array.isArray(metrics) ? metrics : [],
    capital: Number(capital || 0) || null,
    range: range || '',
  };

  const password = generateSharePassword();

  const { data: token, error } = await supabase.rpc('create_backtest_report', {
    p_title: title || 'Resultados de backtesting',
    p_payload: payload,
    p_password: password,
    p_max_devices: Number(maxDevices) || 3,
  });

  if (error || !token) {
    console.error('❌ create_backtest_report:', error);
    return { success: false, error: friendlyServiceError(error) };
  }

  // El visor se sube como archivo independiente por informe: así es inmutable y un informe
  // antiguo nunca se rompe si más adelante cambia el visor.
  const objectPath = `${userId}/${token}.html`;
  const html = buildViewerHtml({ token, supabaseUrl, supabaseAnonKey, title });

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, new Blob([html], { type: 'text/html; charset=utf-8' }), {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ subiendo visor:', uploadError);
    // El informe ya existe pero sin página: se borra para no dejar basura.
    await supabase.from('backtest_reports').delete().eq('id', token);
    return { success: false, error: friendlyServiceError(uploadError) };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  return {
    success: true,
    data: {
      token,
      url: pub?.publicUrl || '',
      password,
      maxDevices: Number(maxDevices) || 3,
      trades: list.length,
    },
  };
}

async function listBacktestShareLinks() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'NO_AUTH', data: [] };

  const { data, error } = await supabase
    .from('backtest_reports')
    .select('id, title, max_devices, revoked, opened_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ listBacktestShareLinks:', error);
    return { success: false, error: friendlyServiceError(error), data: [] };
  }

  const rows = (data || []).map((row) => {
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${userId}/${row.id}.html`);
    return { ...row, url: pub?.publicUrl || '' };
  });

  return { success: true, data: rows };
}

/**
 * Revocar: se marca el informe y se borra el archivo del visor. Marcar la fila es lo que corta
 * el acceso de verdad (el RPC deja de servir los datos); borrar el HTML es solo limpieza.
 */
async function revokeBacktestShareLink(token) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'NO_AUTH' };

  const ok = await ensureFreshSupabaseSession();
  if (!ok) return { success: false, error: 'Tu sesión ha caducado. Cierra sesión y vuelve a entrar.' };

  const { error } = await supabase
    .from('backtest_reports')
    .update({ revoked: true })
    .eq('id', token)
    .eq('user_id', userId);

  if (error) {
    console.error('❌ revokeBacktestShareLink:', error);
    return { success: false, error: friendlyServiceError(error) };
  }

  await supabase.storage.from(BUCKET).remove([`${userId}/${token}.html`]);
  return { success: true };
}

module.exports = {
  createBacktestShareLink,
  listBacktestShareLinks,
  revokeBacktestShareLink,
  generateSharePassword,
  sanitizeTradeForShare,
};
