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
const fs = require('fs');
const path = require('path');

const SHARED_IMAGES_BUCKET = 'backtest-report-images';
const TRADE_IMAGES_BUCKET = 'trade-images';
const STORAGE_REF_PREFIX = 'storage:';

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
    // Hace falta para el análisis de BE del informe: sin saber si después habría ido a TP o a SL,
    // no se puede decir si mover a break even protegió o limitó. Los enlaces creados antes de
    // esto no lo traen, y el visor lo contempla escondiendo ese bloque.
    be_after_result: trade.be_after_result || '',
    pnl: Number(trade.pnl || 0),
    rr_planned: Number(trade.rr_planned || 0),
    rr_result: Number(trade.rr_result || 0),
    entry_time: trade.entry_time || '',
    exit_time: trade.exit_time || '',
    notes: trade.notes || '',
    custom_metrics: metrics,
  };
}

async function createBacktestShareLink({ title, trades, sessions, metrics, capital, range, maxDevices, viewerBaseUrl, live }) {
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

  // En modo "en vivo" el informe se arma en el servidor con lo que haya en cada apertura; el
  // payload se guarda igualmente como respaldo por si el enlace se convierte en congelado.
  const sessionIds = (Array.isArray(sessions) ? sessions : [])
    .map((s) => Number(s?.id))
    .filter((n) => Number.isFinite(n) && n > 0);

  const { data: token, error } = await supabase.rpc('create_backtest_report', {
    p_title: title || 'Resultados de backtesting',
    p_payload: payload,
    p_password: password,
    p_max_devices: Number(maxDevices) || 3,
    p_live: live !== false,
    p_session_ids: sessionIds,
    p_metric_names: Array.isArray(metrics) ? metrics : [],
  });

  if (error || !token) {
    console.error('❌ create_backtest_report:', error);
    return { success: false, error: friendlyServiceError(error) };
  }

  const url = buildShareUrl(viewerBaseUrl, token);

  // Las capturas se copian al bucket público del informe, pero SIN hacer esperar al enlace.
  //
  // Se copian de una en una, y cada una es una descarga y una subida: con unas cuantas decenas
  // de operaciones eso son minutos. Esperando aquí, la ventana se quedaba en «Generando
  // enlace...» todo ese rato aunque el informe ya estuviera creado, y parecía que no funcionaba.
  //
  // El enlace es válido desde el primer momento; como es «en vivo», lo que falte por copiar se
  // sube solo la próxima vez que se entre en Backtesting (syncAllLiveShareImages).
  syncShareReportImages(token, list).catch((err) => {
    console.warn('⚠️ no se pudieron copiar las imágenes del informe:', err?.message || err);
  });

  return {
    success: true,
    data: {
      token,
      url,
      password,
      // null = «copiándose por su cuenta», que no es lo mismo que 0 («ninguna que copiar»).
      images: null,
      pendingImages: list.some((t) => t?.image_before || t?.image_after),
      live: live !== false,
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

  // Las capturas copiadas dejan de tener sentido en cuanto el enlace deja de servir datos.
  const { data: files } = await supabase.storage.from(SHARED_IMAGES_BUCKET).list(String(token), {
    limit: 1000,
  });
  if (files?.length) {
    await supabase.storage
      .from(SHARED_IMAGES_BUCKET)
      .remove(files.map((f) => `${token}/${f.name}`));
  }

  return { success: true };
}

/** Nombre de archivo de una referencia de imagen, sea ruta local o "storage:<user>/<archivo>". */
function imageFileName(ref) {
  const raw = String(ref || '').trim();
  if (!raw) return '';
  return raw.split(/[\\/]/).pop();
}

/**
 * Copia al bucket público del informe las capturas de las operaciones compartidas.
 *
 * Se copian, no se enlazan: el bucket original es privado y contiene también las imágenes de los
 * trades reales, que no deben quedar expuestas. Aquí solo acaban las de este informe, en su
 * propia carpeta, y al revocar el enlace se borra entera.
 */
async function syncShareReportImages(token, trades) {
  const userId = await getCurrentUserId();
  if (!userId || !token) return { copied: 0 };

  const refs = [];
  (trades || []).forEach((t) => {
    [t?.image_before, t?.image_after].forEach((ref) => {
      if (ref && String(ref).trim()) refs.push(String(ref).trim());
    });
  });
  if (!refs.length) return { copied: 0 };

  // Lo que ya está copiado no se vuelve a subir: al actualizar un informe en vivo esto se
  // ejecuta a menudo y solo deben viajar las capturas nuevas.
  const { data: existing } = await supabase.storage.from(SHARED_IMAGES_BUCKET).list(String(token), {
    limit: 1000,
  });
  const already = new Set((existing || []).map((f) => f.name));

  let copied = 0;
  for (const ref of refs) {
    const file = imageFileName(ref);
    if (!file || already.has(file)) continue;

    let body = null;
    if (ref.startsWith(STORAGE_REF_PREFIX)) {
      const objectPath = ref.slice(STORAGE_REF_PREFIX.length);
      const { data, error } = await supabase.storage.from(TRADE_IMAGES_BUCKET).download(objectPath);
      if (error || !data) continue;
      body = Buffer.from(await data.arrayBuffer());
    } else if (fs.existsSync(ref)) {
      body = fs.readFileSync(ref);
    }
    if (!body) continue;

    const ext = path.extname(file).toLowerCase();
    const contentType =
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';

    const { error: upErr } = await supabase.storage
      .from(SHARED_IMAGES_BUCKET)
      .upload(`${token}/${file}`, body, { contentType, upsert: true });
    if (!upErr) copied += 1;
  }

  return { copied };
}

/**
 * Pone al día las capturas de todos los enlaces en vivo del usuario. Se llama al abrir la vista
 * de backtesting: mientras la app esté cerrada, las operaciones nuevas se verán en el enlace
 * (los datos son en vivo) pero sus imágenes aún no, porque copiarlas requiere la app.
 */
async function syncAllLiveShareImages(trades) {
  const userId = await getCurrentUserId();
  if (!userId) return { reports: 0 };

  const { data, error } = await supabase
    .from('backtest_reports')
    .select('id, session_ids')
    .eq('user_id', userId)
    .eq('live', true)
    .eq('revoked', false);

  if (error || !data?.length) return { reports: 0 };

  for (const report of data) {
    const ids = Array.isArray(report.session_ids) ? report.session_ids.map(String) : [];
    const scoped = ids.length
      ? (trades || []).filter((t) => ids.includes(String(t?.session_id)))
      : trades || [];
    await syncShareReportImages(report.id, scoped).catch(() => {});
  }
  return { reports: data.length };
}

/** HTML del visor, para que el usuario lo publique una vez en su alojamiento estático. */
function buildShareViewerFile() {
  return buildViewerHtml({ supabaseUrl, supabaseAnonKey });
}

module.exports = {
  syncAllLiveShareImages,
  buildShareUrl,
  buildShareViewerFile,
  createBacktestShareLink,
  listBacktestShareLinks,
  revokeBacktestShareLink,
  generateSharePassword,
  sanitizeTradeForShare,
};
