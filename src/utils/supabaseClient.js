import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found in environment variables.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// PostgREST caps a plain select() at 1000 rows and gives no indication it
// truncated — so a 1151-row table silently returns 1000. Page through with
// .range() whenever a query could exceed that.
export async function selectAll(table, columns, refine) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (refine) q = refine(q);
    const { data, error } = await q;
    if (error) return { data: out, error };
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { data: out, error: null };
}

// End the Google session and drop the local guest identity, then hard-reload to
// the welcome screen. The reload matters: App.jsx builds a fresh guest session
// on boot, and that is what flips the welcome screen back to a generic
// "Continue with Google" instead of still naming the account that just left.
export async function signOutToWelcome() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('[auth] sign-out failed, clearing local state anyway', e);
  }
  // Without this the guest fallback would reuse the same id and keep resolving
  // to the profile the user just signed out of.
  localStorage.removeItem('mock_user_id');
  sessionStorage.removeItem('cc_oauth_return');
  window.location.href = '/';
}
