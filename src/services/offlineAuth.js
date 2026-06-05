import { supabaseUrl as buildSupabaseUrl } from './supabaseConfig.js';

/**
 * Offline Auth — fase 1.
 *
 * Permite re-entrar a la app sin internet usando solo usuarios que ya
 * iniciaron sesión online correctamente en este equipo.
 *
 * NO se guardan contraseñas, ni tokens, ni service_role/anon keys.
 * Solo metadata mínima: user_id, email, last_login_at, app_env.
 *
 * Almacenamiento actual: localStorage (clave por entorno).
 * TODO (fase posterior): migrar a Electron safeStorage o keytar para
 * cifrado en disco con credenciales del sistema.
 */

const STORAGE_KEY_PREFIX = 'offline_users';
const OFFLINE_FLAG_KEY = 'offline_session_active';

export function getCurrentAppEnv() {
  if (typeof process !== 'undefined' && process.env && process.env.APP_ENV) {
    return String(process.env.APP_ENV);
  }
  return 'staging';
}

function getStorageKey(appEnv = getCurrentAppEnv()) {
  return `${STORAGE_KEY_PREFIX}_${appEnv}`;
}

function isLocalStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readOfflineUsersRaw(appEnv = getCurrentAppEnv()) {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(appEnv));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('offlineAuth: error leyendo lista offline:', err);
    return [];
  }
}

function writeOfflineUsersRaw(users, appEnv = getCurrentAppEnv()) {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(getStorageKey(appEnv), JSON.stringify(users));
  } catch (err) {
    console.warn('offlineAuth: error guardando lista offline:', err);
  }
}

/**
 * Guarda/actualiza la entrada offline del usuario tras un login online OK.
 * No persiste password ni tokens.
 */
export function saveOfflineUserSession(user, appEnv = getCurrentAppEnv()) {
  if (!user || !user.id) return;
  const safeEntry = {
    id: String(user.id),
    email: String(user.email || '').trim(),
    last_login_at: new Date().toISOString(),
    app_env: appEnv
  };

  const users = readOfflineUsersRaw(appEnv);
  const idx = users.findIndex(
    (u) =>
      u &&
      (String(u.id) === safeEntry.id ||
        (safeEntry.email &&
          String(u.email || '').toLowerCase() === safeEntry.email.toLowerCase()))
  );

  if (idx >= 0) {
    users[idx] = { ...users[idx], ...safeEntry };
  } else {
    users.push(safeEntry);
  }

  writeOfflineUsersRaw(users, appEnv);
}

export function getOfflineUsers(appEnv = getCurrentAppEnv()) {
  return readOfflineUsersRaw(appEnv)
    .filter((u) => u && u.id && u.email)
    .sort((a, b) => {
      const ta = Date.parse(a.last_login_at || '') || 0;
      const tb = Date.parse(b.last_login_at || '') || 0;
      return tb - ta;
    });
}

export function getLastOfflineUser(appEnv = getCurrentAppEnv()) {
  const list = getOfflineUsers(appEnv);
  return list.length > 0 ? list[0] : null;
}

export function canUseOfflineLogin(emailOrId, appEnv = getCurrentAppEnv()) {
  if (!emailOrId) return false;
  const needle = String(emailOrId).trim().toLowerCase();
  return getOfflineUsers(appEnv).some(
    (u) =>
      String(u.id).toLowerCase() === needle ||
      String(u.email || '').toLowerCase() === needle
  );
}

/**
 * Marca sesión offline activa. Devuelve user mínimo o null.
 * NO contacta con Supabase.
 */
export function loginOffline(userIdOrEmail, appEnv = getCurrentAppEnv()) {
  if (!userIdOrEmail) return null;
  const needle = String(userIdOrEmail).trim().toLowerCase();
  const user = getOfflineUsers(appEnv).find(
    (u) =>
      String(u.id).toLowerCase() === needle ||
      String(u.email || '').toLowerCase() === needle
  );
  if (!user) return null;

  if (isLocalStorageAvailable()) {
    window.localStorage.setItem('user_id', user.id);
    window.localStorage.setItem(OFFLINE_FLAG_KEY, '1');
  }
  return { id: user.id, email: user.email };
}

export function setOfflineMode(enabled) {
  if (!isLocalStorageAvailable()) return;
  if (enabled) {
    window.localStorage.setItem(OFFLINE_FLAG_KEY, '1');
  } else {
    window.localStorage.removeItem(OFFLINE_FLAG_KEY);
  }
}

export function isOfflineModeActive() {
  if (!isLocalStorageAvailable()) return false;
  return window.localStorage.getItem(OFFLINE_FLAG_KEY) === '1';
}

export function isOnline() {
  if (typeof navigator === 'undefined') return true;
  return Boolean(navigator.onLine);
}

/**
 * Devuelve el usuario offline cuyo email/id coincide con el argumento.
 */
export function getOfflineUserByEmail(email, appEnv = getCurrentAppEnv()) {
  if (!email) return null;
  const needle = String(email).trim().toLowerCase();
  return (
    getOfflineUsers(appEnv).find(
      (u) =>
        String(u.email || '').toLowerCase() === needle ||
        String(u.id || '').toLowerCase() === needle
    ) || null
  );
}

/**
 * Cache corto del último resultado de checkInternetConnection para evitar
 * disparar muchos fetches en cascada (login + arranque + listeners).
 */
let _lastConnCheck = { ts: 0, online: false };

/**
 * Comprobación REAL de conexión: hace fetch HEAD/GET con timeout corto a
 * la URL indicada (por defecto SUPABASE_URL). Tolera 401/403/404/5xx como
 * "online" porque el host respondió. Solo fallos de red/timeouts/DNS son
 * "offline".
 *
 * NO depende de navigator.onLine porque suele mentir en Windows.
 */
function resolveConnectivityProbeUrl(url) {
  if (url) return url;
  const base = buildSupabaseUrl || process.env.SUPABASE_URL;
  if (base) {
    return `${String(base).replace(/\/+$/, '')}/auth/v1/health`;
  }
  return 'https://www.gstatic.com/generate_204';
}

async function probeUrl(targetUrl, { timeoutMs, mode }) {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller && setTimeout(() => controller.abort('timeout'), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      cache: 'no-store',
      mode,
      signal: controller?.signal
    });
    // Cualquier respuesta HTTP del host = hay red (401/403/404 cuentan como online).
    if (mode === 'cors' && res && typeof res.status === 'number') {
      return true;
    }
    return true;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function checkInternetConnection({
  url,
  timeoutMs = 4000,
  cacheMs = 1500,
  log = false
} = {}) {
  const targetUrl = resolveConnectivityProbeUrl(url);
  const browserOnline =
    typeof navigator === 'undefined' ? true : Boolean(navigator.onLine);

  const now = Date.now();
  if (now - _lastConnCheck.ts < cacheMs) {
    if (log) {
      console.log('[connectivity] cache hit:', _lastConnCheck.online, {
        targetUrl,
        navigatorOnLine: browserOnline
      });
    }
    return _lastConnCheck.online;
  }

  if (typeof fetch !== 'function') {
    _lastConnCheck = { ts: now, online: false };
    return false;
  }

  if (log) {
    console.log('[connectivity] probe start:', {
      targetUrl,
      supabaseUrlConfigured: Boolean(buildSupabaseUrl || process.env.SUPABASE_URL),
      navigatorOnLine: browserOnline
    });
  }

  const attempts = [
    { url: targetUrl, mode: 'cors' },
    { url: targetUrl, mode: 'no-cors' },
    { url: 'https://www.gstatic.com/generate_204', mode: 'no-cors' }
  ];

  for (const attempt of attempts) {
    try {
      await probeUrl(attempt.url, { timeoutMs, mode: attempt.mode });
      if (log) {
        console.log('[connectivity] OK via', attempt.mode, attempt.url);
      }
      _lastConnCheck = { ts: now, online: true };
      return true;
    } catch (err) {
      if (log) {
        console.warn('[connectivity] fallo', attempt.mode, attempt.url, err?.message || err);
      }
    }
  }

  // Electron empaquetado: navigator.onLine suele ser fiable cuando el probe falla por CSP/CORS.
  if (browserOnline) {
    if (log) {
      console.warn(
        '[connectivity] probes fallaron pero navigator.onLine=true → tratando como online'
      );
    }
    _lastConnCheck = { ts: now, online: true };
    return true;
  }

  _lastConnCheck = { ts: now, online: false };
  if (log) console.warn('[connectivity] offline confirmado');
  return false;
}
