/**
 * Credenciales Supabase leídas desde variables de entorno.
 *
 * Las variables se inyectan en build time vía webpack.DefinePlugin
 * (ver forge.config.js + webpack.main.config.js).
 *
 * Archivos fuente: .env.staging | .env.production (en raíz, no commiteados).
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabaseConfig] Missing Supabase environment variables', {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    appEnv: process.env.APP_ENV,
  });
}

module.exports = {
  supabaseUrl,
  supabaseAnonKey,
  // Alias legacy para compatibilidad con consumidores existentes
  supabaseKey: supabaseAnonKey,
};
