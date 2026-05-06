const { supabase } = require('./supabaseClient');

async function getCurrentSupabaseUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Usuario no autenticado', error);
    return null;
  }

  return user;
}

async function getCurrentUserId() {
  const user = await getCurrentSupabaseUser();
  return user?.id || null;
}

module.exports = {
  getCurrentSupabaseUser,
  getCurrentUserId
};
