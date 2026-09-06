import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CompletedDuelEventRecord,
  CompletedMatchRecord,
  Database,
  LocalDuelEvent
} from '~/features/dashboard/types';
import type { TeamName } from '~/features/game/types/gameTypes';
import type { TeamData } from '~/models/TeamData';

export interface SaveMatchInput {
  id: string;
  supabase: SupabaseClient<Database>;
  winnerTeam: TeamName;
  team1Data: TeamData;
  team2Data: TeamData;
  team1InitialRoster: string[];
  team2InitialRoster: string[];
  durationSeconds?: number;
  duelEvents: LocalDuelEvent[];
}

export async function saveMatch(input: SaveMatchInput): Promise<string> {
  const p_match: CompletedMatchRecord = {
    winner_team: input.winnerTeam,
    team1_roster: input.team1Data.players,
    team2_roster: input.team2Data.players,
    team1_initial_roster: input.team1InitialRoster,
    team2_initial_roster: input.team2InitialRoster,
    team1_powerups: input.team1Data.powerUps,
    team2_powerups: input.team2Data.powerUps,
    team1_score: input.team1Data.score,
    team2_score: input.team2Data.score,
    total_duels: input.duelEvents.length,
    duration_seconds: input.durationSeconds ?? null
  };

  const p_events: CompletedDuelEventRecord[] = input.duelEvents.map((event) => ({
    round: event.round,
    winner_name: event.winnerName,
    loser_name: event.loserName,
    winner_team: event.winnerTeam,
    loser_team: event.loserTeam,
    shielded: event.shielded,
    winner_cards: event.winnerCards,
    loser_cards: event.loserCards,
    winner_sum: event.winnerSum,
    loser_sum: event.loserSum,
    power_ups_used: event.powerUpsUsed
  }));

  const { data, error } = await input.supabase.rpc('save_completed_match', {
    p_match_id: input.id,
    p_match,
    p_events
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save match');
  }

  return data;
}

export interface DashboardData {
  recentMatches: Database['public']['Tables']['matches']['Row'][];
  allMatches: Database['public']['Tables']['matches']['Row'][];
  allDuelEvents: Database['public']['Tables']['duel_events']['Row'][];
  summary: {
    totalMatches: number;
    totalDuels: number;
    team1Wins: number;
    team2Wins: number;
    shieldedDuels: number;
  };
}

export async function fetchDashboardData(
  supabase: SupabaseClient<Database>
): Promise<DashboardData> {
  const [{ data: matches, error: mErr }, { data: duelEvents, error: dErr }] =
    await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('duel_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
    ]);

  if (mErr) throw mErr;
  if (dErr) throw dErr;

  const allMatches = matches || [];
  const allEvents = duelEvents || [];

  return {
    recentMatches: allMatches.slice(0, 50),
    allMatches,
    allDuelEvents: allEvents,
    summary: {
      totalMatches: allMatches.length,
      totalDuels: allEvents.length,
      team1Wins: allMatches.filter((m) => m.winner_team === 'team1').length,
      team2Wins: allMatches.filter((m) => m.winner_team === 'team2').length,
      shieldedDuels: allEvents.filter((e) => e.shielded).length
    }
  };
}
