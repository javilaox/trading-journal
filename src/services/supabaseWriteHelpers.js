const { supabase } = require('./supabaseClient');

/**
 * Antes de una escritura directa a Supabase (fuera del flujo offline-first), nos aseguramos
 * de que el token de sesión esté fresco. getSession() refresca automáticamente si ha caducado
 * (supabase-js gestiona el refresh_token); si el token estuviera caducado y sin refrescar,
 * cualquier insert/update fallaría la política RLS (auth.uid() no resolvería al usuario)
 * aunque el user_id que enviemos en el payload sea correcto.
 *
 * Devuelve true/false para que quien llame pueda abortar la escritura ANTES de intentarla si
 * no hay sesión utilizable (en vez de dejar que Supabase la rechace por RLS y traducir ese
 * error a posteriori). Si getSession() no encuentra sesión (p. ej. el refresh_token también
 * caducó, o main aún no había recibido la sesión en este arranque de la app), se intenta un
 * refreshSession() explícito como último recurso antes de rendirse.
 */
async function ensureFreshSupabaseSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session) return true;

    const refreshed = await supabase.auth.refreshSession();
    if (refreshed?.error) {
      console.warn('[supabase] refreshSession falló:', refreshed.error.message);
      return false;
    }
    return Boolean(refreshed?.data?.session);
  } catch (err) {
    console.warn('[supabase] no se pudo refrescar la sesión antes de escribir:', err?.message || err);
    return false;
  }
}

/**
 * Traduce errores de Supabase/Postgres a mensajes legibles en español, en vez de propagar
 * el texto técnico (código Postgres, nombre de política RLS, etc.) hasta la interfaz.
 */
function friendlyServiceError(error, fallback = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.') {
  if (!error) return fallback;
  const code = String(error.code || '').toLowerCase();
  const message = String(error.message || '').toLowerCase();

  if (code === '42501' || message.includes('row-level security') || message.includes('row level security')) {
    return 'Tu sesión ha caducado o no se pudo verificar. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.';
  }
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('timeout')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  if (code === '23505' || message.includes('duplicate key') || message.includes('unique constraint')) {
    return 'Ya existe un registro con esos datos.';
  }
  if (error.message) return String(error.message);
  return fallback;
}

module.exports = { ensureFreshSupabaseSession, friendlyServiceError };
