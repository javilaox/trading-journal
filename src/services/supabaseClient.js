const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('./supabaseConfig');

/**
 * Cliente de Supabase del proceso principal.
 *
 * Va con `autoRefreshToken: false` y `persistSession: false` a propósito, y esto no es un
 * detalle menor: en la aplicación hay DOS clientes, el de la ventana y este. Los dos comparten
 * la misma sesión, y Supabase rota el token de refresco cada vez que alguien lo usa. Si los dos
 * refrescan por su cuenta, el que llega segundo presenta un token ya rotado, se queda sin
 * sesión, y a partir de ahí avisa de que la necesita en cada intento de sincronizar. Eso es lo
 * que dejaba el indicador con un "Restableciendo sesión..." permanente.
 *
 * El reparto correcto es: la ventana es la dueña de la sesión (la refresca y la guarda) y este
 * proceso es un consumidor pasivo, que recibe los tokens por IPC (`set-supabase-session`) cada
 * vez que la ventana los renueva. Un solo dueño, ninguna carrera.
 */
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

module.exports = { supabase };
