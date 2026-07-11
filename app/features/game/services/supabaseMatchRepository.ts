import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '~/features/dashboard/types';
import { saveMatch } from '~/features/dashboard/services/matchService';
import type { MatchRepository, SaveMatchInput } from './ports';

export class SupabaseMatchRepository implements MatchRepository {
  private client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  async saveMatch(input: SaveMatchInput): Promise<void> {
    await saveMatch({
      supabase: this.client,
      ...input
    });
  }
}
