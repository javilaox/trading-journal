const { supabase } = require('./supabaseClient');
const { getCurrentUserId } = require('./supabaseAuth');

/**
 * Insertar trade en Supabase (payload ya alineado con columnas).
 * Siempre fuerza user_id desde la sesión activa.
 */
async function addTrade(trade) {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('❌ addTrade: sin usuario autenticado');
    return { success: false, error: 'NO_AUTH' };
  }

  const row = { ...trade, user_id: userId };

  console.log('📤 Enviando trade:', row);
  const { data, error } = await supabase.from('trades').insert([row]).select();

  console.log('📥 Respuesta:', data);
  if (error) {
    console.error('❌ Error:', error);
    return { success: false, error };
  }

  return { success: true, data };
}

/**
 * Listar trades del usuario (orden actual: id desc).
 */
async function getTrades() {
  const userId = await getCurrentUserId();
  console.log('Current user id:', userId);

  if (!userId) {
    return { success: false, error: 'NO_AUTH', data: [] };
  }

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return { success: false, error };
  }

  console.log('📥 Respuesta:', Array.isArray(data) ? data.length : data);
  return { success: true, data };
}

/**
 * Borrar fila remota por id + user_id (RLS).
 * Reintenta con id numérico y, si hace falta, resuelve el id real vía listado (p. ej. string vs number).
 */
async function deleteTrade(id) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'NO_AUTH' };
  }

  console.log('🗑 Delete Supabase ID:', id);

  const deleteRemoteRow = async (pk) => {
    const { data, error } = await supabase
      .from('trades')
      .delete()
      .eq('id', pk)
      .eq('user_id', userId)
      .select('id');
    return { data, error };
  };

  const deletedRows = (r) => (Array.isArray(r.data) ? r.data.length : 0);

  let res = await deleteRemoteRow(id);
  if (!res.error && deletedRows(res) > 0) {
    return { success: true };
  }

  console.warn('⚠️ Intento fallback delete por user_id');

  const numericId = Number(id);
  if (Number.isFinite(numericId)) {
    res = await deleteRemoteRow(numericId);
    if (!res.error && deletedRows(res) > 0) {
      return { success: true };
    }
  }

  if (res.error) {
    console.error('❌ Error:', res.error);
    return { success: false, error: res.error };
  }

  const list = await getTrades();
  if (!list.success) {
    return { success: false, error: list.error };
  }

  const row = (list.data || []).find(
    (t) =>
      t != null &&
      (String(t.id) === String(id) || (Number.isFinite(numericId) && Number(t.id) === numericId))
  );

  if (row) {
    res = await deleteRemoteRow(row.id);
    if (!res.error && deletedRows(res) > 0) {
      return { success: true };
    }
    if (res.error) {
      console.error('❌ Error:', res.error);
      return { success: false, error: res.error };
    }
  }

  console.warn('⚠️ Trade no existía en Supabase o id no coincide; se asume ya eliminado');
  return { success: true };
}

module.exports = {
  addTrade,
  getTrades,
  deleteTrade
};
