import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Diagnóstico build empaquetada (DevTools → Console del renderer)
console.log('[supabase] SUPABASE_URL:', supabaseUrl || '(undefined)');
console.log('[supabase] SUPABASE_KEY exists:', Boolean(supabaseAnonKey));
console.log('[supabase] APP_ENV:', process.env.APP_ENV);
console.log('[supabase] navigator.onLine:', typeof navigator !== 'undefined' ? navigator.onLine : 'n/a');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Missing Supabase environment variables', {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    appEnv: process.env.APP_ENV,
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[supabase] Cliente inicializado');

export async function testConnection() {
  // Si el navegador detecta offline, no spameamos errores en consola.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.log('📴 Supabase test omitido: navegador reporta offline');
    return;
  }
  try {
    const { data, error } = await supabase.from('trades').select('*').limit(1);

    if (error) {
      console.warn('⚠️ Supabase test:', error.message || error);
    } else {
      console.log('✅ Supabase conectado correctamente:', data);
    }
  } catch (err) {
    // En offline real esto siempre cae con "Failed to fetch": lo degradamos
    // a warning para no asustar.
    console.warn('⚠️ Supabase test (posible offline):', err && err.message ? err.message : err);
  }
}

// No bloqueamos arranque por esto; se ejecuta de forma diferida.
setTimeout(() => {
  testConnection().catch(() => {});
}, 0);
