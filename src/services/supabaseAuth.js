const { supabase } = require('./supabaseClient');

const OFFLINE_FLAG_KEY = 'offline_session_active';
const OFFLINE_USERS_PREFIX = 'offline_users';

let cachedUser = null;
let cachedUserId = null;
let currentUserPromise = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function isOfflineSessionActive() {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(OFFLINE_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function getAppEnv() {
  if (typeof process !== 'undefined' && process.env && process.env.APP_ENV) {
    return String(process.env.APP_ENV);
  }
  return 'staging';
}

function readOfflineUserFromStorage() {
  if (!isBrowser()) return null;
  try {
    const key = `${OFFLINE_USERS_PREFIX}_${getAppEnv()}`;
    const raw = window.localStorage.getItem(key);
    const users = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(users) || !users.length) return null;

    const userId = window.localStorage.getItem('user_id');
    if (userId) {
      const match = users.find((u) => u && String(u.id) === String(userId));
      if (match) {
        return { id: String(match.id), email: String(match.email || '').trim() };
      }
    }

    const sorted = [...users]
      .filter((u) => u && u.id)
      .sort((a, b) => (Date.parse(b.last_login_at || '') || 0) - (Date.parse(a.last_login_at || '') || 0));
    const first = sorted[0];
    return first ? { id: String(first.id), email: String(first.email || '').trim() } : null;
  } catch (err) {
    console.warn('[auth] readOfflineUserFromStorage error:', err);
    return null;
  }
}

function userFromLocalStorageId() {
  const id = isBrowser()
    ? window.localStorage.getItem('user_id')
    : cachedUserId;
  if (!id) return null;
  return { id: String(id), email: cachedUser?.email || '' };
}

function cacheUser(user) {
  if (!user?.id) return null;
  const normalized = {
    id: String(user.id),
    email: String(user.email || user.user_metadata?.email || '').trim()
  };
  cachedUser = normalized;
  cachedUserId = normalized.id;
  if (isBrowser()) {
    window.currentUser = normalized;
    try {
      window.localStorage.setItem('user_id', normalized.id);
    } catch (err) {
      console.warn('[auth] no se pudo guardar user_id:', err);
    }
  }
  return normalized;
}

/**
 * Sincroniza el id de usuario conocido en main (IPC set-user-id).
 */
function setCachedUserId(userId) {
  if (!userId) {
    clearAuthUserCache();
    return;
  }
  const id = String(userId);
  const emailFromWindow =
    isBrowser() && window.currentUser?.id === id ? String(window.currentUser.email || '') : '';
  cacheUser({ id, email: emailFromWindow || cachedUser?.email || '' });
}

function clearAuthUserCache() {
  cachedUser = null;
  cachedUserId = null;
  currentUserPromise = null;
  if (isBrowser()) {
    window.currentUser = null;
  }
}

/**
 * Usuario actual con caché y deduplicación de supabase.auth.getUser().
 * Orden: window.currentUser → caché módulo → offline → localStorage → Supabase (una promesa compartida).
 */
async function getCurrentUserSafe(options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);

  if (!forceRefresh) {
    if (isBrowser() && window.currentUser?.id) {
      console.log('[auth] getCurrentUserSafe cache hit');
      return cacheUser(window.currentUser);
    }
    if (cachedUser?.id) {
      console.log('[auth] getCurrentUserSafe cache hit');
      return cachedUser;
    }
  }

  if (isOfflineSessionActive()) {
    const offline = readOfflineUserFromStorage() || userFromLocalStorageId();
    if (offline) {
      console.log('[auth] getCurrentUserSafe cache hit');
      return cacheUser(offline);
    }
  }

  const stored = userFromLocalStorageId();
  if (stored && (isOfflineSessionActive() || (isBrowser() && typeof navigator !== 'undefined' && !navigator.onLine))) {
    console.log('[auth] getCurrentUserSafe cache hit');
    return cacheUser(stored);
  }

  if (currentUserPromise) {
    console.log('[auth] getCurrentUserSafe pending promise reused');
    return currentUserPromise;
  }

  console.log('[auth] getCurrentUserSafe fetching from Supabase');
  currentUserPromise = (async () => {
    try {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error) {
        console.warn('[auth] getCurrentUserSafe Supabase error:', error.message);
        const fallback = readOfflineUserFromStorage() || userFromLocalStorageId();
        return fallback ? cacheUser(fallback) : null;
      }

      if (!user?.id) {
        const fallback = readOfflineUserFromStorage() || userFromLocalStorageId();
        return fallback ? cacheUser(fallback) : null;
      }

      return cacheUser(user);
    } catch (err) {
      console.warn('[auth] getCurrentUserSafe exception:', err);
      const fallback = readOfflineUserFromStorage() || userFromLocalStorageId();
      return fallback ? cacheUser(fallback) : null;
    } finally {
      currentUserPromise = null;
    }
  })();

  return currentUserPromise;
}

async function getCurrentSupabaseUser() {
  return getCurrentUserSafe();
}

async function getCurrentUserId() {
  if (cachedUserId) return cachedUserId;
  const user = await getCurrentUserSafe();
  return user?.id || null;
}

module.exports = {
  getCurrentUserSafe,
  getCurrentSupabaseUser,
  getCurrentUserId,
  setCachedUserId,
  clearAuthUserCache
};
