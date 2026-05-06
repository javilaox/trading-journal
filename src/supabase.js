import { createClient } from '@supabase/supabase-js';

const URL = 'https://ohgpbiwjmvfaazwwboyq.supabase.co';
const KEY = 'sb_publishable_BsQrtZxyF2c-z1Ni84OXAQ_aayATThA';

export const supabase = createClient(URL, KEY);

console.log('🔥 Supabase inicializado');

export async function testConnection() {
  try {
    const { data, error } = await supabase.from('trades').select('*').limit(1);

    if (error) {
      console.error('❌ Error Supabase:', error);
    } else {
      console.log('✅ Supabase conectado correctamente:', data);
    }
  } catch (err) {
    console.error('❌ Error inesperado Supabase:', err);
  }
}

testConnection();
