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
const { shareViewerUrl } = require('./shareViewerConfig');
const { ensureFreshSupabaseSession, friendlyServiceError } = require('./supabaseWriteHelpers');
const { buildViewerHtml } = require('./backtestShareViewer');

// Ya no se sube nada a Supabase Storage: sirve los HTML como text/plain a propósito y el
// navegador mostraba el código fuente. El visor se publica una sola vez en un alojamiento
// estático normal y aquí solo se compone el enlace con el token en el fragmento.

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

/**
 * Enlace final: la página del visor con el informe en el fragmento. Se usa la dirección que
 * viene en el build; `override` solo existe para pruebas y para poder apuntar a otro visor sin
 * recompilar.
 */
function buildShareUrl(override, token) {
  const base = String(override || shareViewerUrl || '').trim();
  if (!base || !token) return '';
  return `${base}${base.includes('#') ? '' : '#'}${token}`;
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

async function createBacktestShareLink({ title, trades, sessions, metrics, capital, range, maxDevices, viewerBaseUrl }) {
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

  const url = buildShareUrl(viewerBaseUrl, token);

  return {
    success: true,
    data: {
      token,
      url,
      password,
      maxDevices: Number(maxDevices) || 3,
      trades: list.length,
    },
  };
}

async function listBacktestShareLinks(viewerBaseUrl) {
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

  const rows = (data || []).map((row) => ({ ...row, url: buildShareUrl(viewerBaseUrl, row.id) }));

  return { success: true, data: rows };
}

/** Revocar: marcar la fila es lo que corta el acceso; el RPC deja de servir los datos. */
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

  return { success: true };
}

/** HTML del visor, para que el usuario lo publique una vez en su alojamiento estático. */
function buildShareViewerFile() {
  return buildViewerHtml({ supabaseUrl, supabaseAnonKey });
}

module.exports = {
  buildShareUrl,
  buildShareViewerFile,
  createBacktestShareLink,
  listBacktestShareLinks,
  revokeBacktestShareLink,
  generateSharePassword,
  sanitizeTradeForShare,
};
