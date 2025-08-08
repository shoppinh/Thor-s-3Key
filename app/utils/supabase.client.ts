import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import { useOutletContext } from '@remix-run/react';

type SupabaseContext = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

// Return a singleton client in the browser; ephemeral client on the server
function getSupabaseClient(ctx: SupabaseContext): SupabaseClient {
  if (typeof window !== 'undefined') {
    const globalAny = window as unknown as { __thorSupabase?: SupabaseClient };
    if (!globalAny.__thorSupabase) {
      globalAny.__thorSupabase = createClient(ctx.SUPABASE_URL, ctx.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    }
    return globalAny.__thorSupabase;
  }
  // SSR: create a short-lived client without session persistence
  return createClient(ctx.SUPABASE_URL, ctx.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function useSupabaseClient(): SupabaseClient {
  const ctx = useOutletContext<SupabaseContext>();
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = ctx;
  return useMemo(
    () => getSupabaseClient({ SUPABASE_URL, SUPABASE_ANON_KEY }),
    [SUPABASE_URL, SUPABASE_ANON_KEY]
  );
}

export default useSupabaseClient;
export { useSupabaseClient };
// Backwards-compatible alias for any code importing { useSupabase }
export { useSupabaseClient as useSupabase };


