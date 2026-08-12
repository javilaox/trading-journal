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
 * Todos los ids de los trades del usuario, leyendo por páginas hasta agotar la tabla.
 *
 * Se pagina a mano en vez de hacer un `select('id')` a secas porque PostgREST puede tener un
 * tope de filas por respuesta: una lista truncada haría creer que los trades que faltan se han
 * borrado, y quien usa esto (la limpieza de la caché local) los borraría de verdad. Pedir solo
 * la columna `id` hace que incluso miles de trades quepan en una o dos páginas.
 */
async function getAllTradeIds() {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'NO_AUTH', ids: [] };

  const PAGE = 1000;
  const ids = [];
  let total = null;

  for (let from = 0; ; from += PAGE) {
    const { data, error, count } = await supabase
      .from('trades')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) return { success: false, error, ids: [] };
    if (count != null) total = count;
    const page = Array.isArray(data) ? data : [];
    page.forEach((row) => ids.push(Number(row.id)));

    // Se para cuando ya se tienen tantos ids como filas dice haber, o cuando una página viene
    // vacía. No se usa "página incompleta = última página": si el servidor recorta las
    // respuestas por debajo del tamaño pedido, la primera página parecería la última.
    if (!page.length) break;
    if (total != null && ids.length >= total) break;
  }

  // El recuento es la garantía de que la lista está completa. Quien la usa borra de la caché
  // local todo lo que no esté aquí, así que devolverla a medias sería borrar datos buenos:
  // ante la duda, se prefiere fallar.
  if (total != null && ids.length !== total) {
    return { success: false, error: { message: `LISTA_INCOMPLETA (${ids.length}/${total})` }, ids: [] };
  }

  return { success: true, ids, total };
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
  getAllTradeIds,
  addTrade,
  getTrades,
  deleteTrade
};
