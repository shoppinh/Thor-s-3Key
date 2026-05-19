import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, LocalDuelEvent } from '~/features/dashboard/types';
import type { TeamData } from '~/models/TeamData';

export interface SaveMatchInput {
  supabase: SupabaseClient<Database>;
  teamWinner: string;
  team1Data: TeamData;
  team2Data: TeamData;
  duelEvents: LocalDuelEvent[];
}

export async function saveMatch({
  supabase,
  teamWinner,
  team1Data,
  team2Data,
  duelEvents
}: SaveMatchInput): Promise<void> {
  const winnerTeam = teamWinner.includes('1') ? 'team1' : 'team2';

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      winner_team: winnerTeam,
      team1_roster: team1Data.players,
      team2_roster: team2Data.players,
      team1_score: team1Data.score,
      team2_score: team2Data.score,
      total_duels: duelEvents.length
    })
    .select('id')
    .single();

  if (matchError || !match) {
    throw new Error(matchError?.message ?? 'Failed to insert match');
  }

  if (duelEvents.length > 0) {
    const payload = duelEvents.map((event) => ({
      match_id: match.id,
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

    const { error: eventsError } = await supabase
      .from('duel_events')
      .insert(payload);

    if (eventsError) {
      throw new Error(eventsError.message);
    }
  }
}

export interface DashboardData {
  recentMatches: Database['public']['Tables']['matches']['Row'][];
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
        .limit(50),
      supabase.from('duel_events').select('*')
    ]);

  if (mErr) throw mErr;
  if (dErr) throw dErr;

  const allMatches = matches || [];
  const allEvents = duelEvents || [];

  return {
    recentMatches: allMatches,
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
