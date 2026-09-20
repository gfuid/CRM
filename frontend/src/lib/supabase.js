import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('YOUR_PROJECT_ID') &&
  !rawUrl.includes('placeholder')
);

// Resilient fallback client: if no real Supabase credentials, provide safe mock
// so the browser console never spams ERR_NAME_NOT_RESOLVED.
export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Demo mode' } }),
        signUp: async () => ({ data: { user: null }, error: { message: 'Demo mode' } }),
        signOut: async () => ({ error: null }),
      },
      from: () => {
        const queryChain = {
          select: () => queryChain,
          eq: () => queryChain,
          neq: () => queryChain,
          order: () => queryChain,
          single: async () => ({ data: null, error: null }),
          then: (resolve) => resolve({ data: [], error: null }),
        };
        return {
          select: () => queryChain,
          insert: async (payload) => ({ data: payload, error: null }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      },
    };
