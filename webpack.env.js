const path = require('path');
const dotenv = require('dotenv');

/**
 * Carga .env.staging | .env.production antes de DefinePlugin (mismo criterio que forge.config.js).
 */
function loadBuildEnv() {
  const buildEnv =
    process.env.APP_BUILD_ENV === 'production' ? 'production' : 'staging';
  const envFile = buildEnv === 'production' ? '.env.production' : '.env.staging';

  const result = dotenv.config({
    path: path.resolve(__dirname, envFile),
  });

  if (result.error) {
    console.warn(
      `[webpack.env] No se pudo cargar ${envFile}:`,
      result.error.message
    );
  } else {
    console.log(`[webpack.env] Cargado ${envFile} (APP_BUILD_ENV=${buildEnv})`);
  }

  if (!process.env.APP_ENV) {
    process.env.APP_ENV = buildEnv;
  }

  return buildEnv;
}

function getEnvDefinePluginValues() {
  const buildEnv = loadBuildEnv();
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      `[webpack.env] FALTAN SUPABASE_URL o SUPABASE_ANON_KEY para build "${buildEnv}". ` +
        'La app empaquetada no podrá autenticar.'
    );
  } else {
    console.log('[webpack.env] SUPABASE_URL:', supabaseUrl);
    console.log('[webpack.env] SUPABASE_KEY exists:', Boolean(supabaseAnonKey));
  }

  return {
    'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    'process.env.APP_ENV': JSON.stringify(process.env.APP_ENV || buildEnv),
  };
}

module.exports = { loadBuildEnv, getEnvDefinePluginValues };
