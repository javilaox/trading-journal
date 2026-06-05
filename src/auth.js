import { supabase } from './supabase.js';
import {
  saveOfflineUserSession,
  setOfflineMode,
  getCurrentAppEnv,
  getOfflineUserByEmail,
  checkInternetConnection
} from './services/offlineAuth.js';

const { getCurrentUserSafe, clearAuthUserCache } = require('./services/supabaseAuth.js');

/**
 * Login robusto online/offline.
 *
 * Devuelve un objeto descriptivo:
 *   { status: 'online',           user }        login Supabase OK
 *   { status: 'offline',          user }        offline OK con usuario local
 *   { status: 'no_offline_user' }               offline pero email no autorizado
 *   { status: 'invalid_credentials' }           Supabase rechazó email/password
 *   { status: 'network' }                       parecía online pero la red falló
 *   { status: 'unknown', error }                otro error
 */
export async function login(email, password) {
  const safeEmail = String(email || '').trim();
  const navigatorOnLine =
    typeof navigator === 'undefined' ? true : Boolean(navigator.onLine);

  console.log('[login] inicio', {
    email: safeEmail,
    navigatorOnLine,
    supabaseUrl: process.env.SUPABASE_URL || '(undefined)',
    supabaseKeyExists: Boolean(process.env.SUPABASE_ANON_KEY),
    appEnv: process.env.APP_ENV
  });

  let online = false;
  try {
    online = await checkInternetConnection({ log: true });
  } catch (err) {
    console.warn('[login] checkInternetConnection excepción:', err);
    online = false;
  }

  if (!online && navigatorOnLine) {
    console.warn(
      '[login] checkInternetConnection=false pero navigator.onLine=true; intentando Supabase igualmente'
    );
    online = true;
  }

  if (!online) {
    console.log('[login] modo offline (sin red detectada)');
    const local = getOfflineUserByEmail(safeEmail);
    if (!local) {
      return { status: 'no_offline_user' };
    }

    localStorage.setItem('user_id', local.id);
    setOfflineMode(true);
    if (typeof window !== 'undefined' && window.electronAPI?.setUserId) {
      try {
        await window.electronAPI.setUserId(local.id);
      } catch (err) {
        console.warn('setUserId IPC offline error:', err);
      }
    }

    return {
      status: 'offline',
      user: { id: local.id, email: local.email, offline: true }
    };
  }

  // Online: login Supabase normal.
  let data;
  let error;
  try {
    console.log('[login] signInWithPassword →', process.env.SUPABASE_URL || '(sin URL)');
    const result = await supabase.auth.signInWithPassword({
      email: safeEmail,
      password
    });
    data = result.data;
    error = result.error;
    console.log('[login] signInWithPassword respuesta', {
      userId: data?.user?.id || null,
      error: error?.message || null
    });
  } catch (err) {
    console.warn('[login] signInWithPassword excepción:', err);
    return { status: 'network' };
  }

  if (error) {
    console.warn('[login] signInWithPassword error Supabase:', error);
    const msg = String(error.message || '').toLowerCase();
    if (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('err_name_not_resolved')
    ) {
      return { status: 'network' };
    }
    return { status: 'invalid_credentials', error };
  }

  if (!data?.user?.id) {
    return { status: 'unknown', error: new Error('NO_USER_RETURNED') };
  }

  localStorage.setItem('user_id', data.user.id);
  if (typeof window !== 'undefined' && window.electronAPI?.setUserId) {
    await window.electronAPI.setUserId(data.user.id);
  }

  // Persistencia offline mínima (sin password, sin tokens).
  try {
    saveOfflineUserSession(
      { id: data.user.id, email: data.user.email },
      getCurrentAppEnv()
    );
    setOfflineMode(false);
  } catch (err) {
    console.warn('⚠️ No se pudo guardar offline user:', err);
  }

  return {
    status: 'online',
    user: { id: data.user.id, email: data.user.email, offline: false }
  };
}

export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error('❌ Error registro:', error.message);
    return null;
  }

  if (data?.user?.id) {
    localStorage.setItem('user_id', data.user.id);
    if (typeof window !== 'undefined' && window.electronAPI?.setUserId) {
      await window.electronAPI.setUserId(data.user.id);
    }
  }
  return data.user;
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('⚠️ signOut fallo (offline?):', err);
  }
  localStorage.removeItem('user_id');
  setOfflineMode(false);
  clearAuthUserCache();
}

export async function getCurrentUser() {
  return getCurrentUserSafe();
}
