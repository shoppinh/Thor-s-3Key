import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '~/features/dashboard/types';

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(
  url: string,
  key: string
): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(url, key);
  }
  return client;
}

export function clearSupabaseClient(): void {
  client = null;
}
