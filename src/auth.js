import { supabase } from './supabase.js';

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('❌ Error login:', error.message);
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
  await supabase.auth.signOut();
  localStorage.removeItem('user_id');
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}
