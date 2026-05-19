import type { LocalDuelEvent } from '~/features/dashboard/types';
import type { TeamName } from '~/features/game/types/gameTypes';

export interface LeaderboardEntry {
  name: string;
  winCount: number;
}

export function buildPlayerLeaderboard(
  events: Pick<LocalDuelEvent, 'winnerName'>[]
): LeaderboardEntry[] {
  const wins: Record<string, number> = {};
  for (const event of events) {
    wins[event.winnerName] = (wins[event.winnerName] || 0) + 1;
  }
  return Object.entries(wins)
    .map(([name, winCount]) => ({ name, winCount }))
    .sort((a, b) => b.winCount - a.winCount);
}

export interface HeadToHeadEntry {
  winner: string;
  loser: string;
  count: number;
}

export function buildHeadToHead(
  events: Pick<LocalDuelEvent, 'winnerName' | 'loserName'>[]
): HeadToHeadEntry[] {
  const map: Record<string, number> = {};
  for (const event of events) {
    const key = `${event.winnerName}|${event.loserName}`;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([key, count]) => {
      const [winner, loser] = key.split('|');
      return { winner, loser, count };
    })
    .sort((a, b) => b.count - a.count);
}

export interface TeamStreakEntry {
  team: TeamName;
  longestStreak: number;
}

export function buildTeamStreaks(
  events: Pick<LocalDuelEvent, 'winnerTeam'>[]
): TeamStreakEntry[] {
  const streaks: Record<TeamName, number> = { team1: 0, team2: 0 };
  let currentTeam: TeamName | '' = '';
  let currentCount = 0;

  for (const event of events) {
    if (event.winnerTeam === currentTeam) {
      currentCount++;
    } else {
      currentTeam = event.winnerTeam;
      currentCount = 1;
    }
    streaks[event.winnerTeam] = Math.max(
      streaks[event.winnerTeam],
      currentCount
    );
  }

  return [
    { team: 'team1' as const, longestStreak: streaks.team1 },
    { team: 'team2' as const, longestStreak: streaks.team2 }
  ];
}

export interface MatchSummary {
  totalDuels: number;
  shieldedDuels: number;
  mostWinsPlayer: string | null;
  mostWinsCount: number;
}

export function calculateMatchSummary(
  events: Pick<LocalDuelEvent, 'winnerName' | 'shielded'>[]
): MatchSummary {
  const wins: Record<string, number> = {};
  let shielded = 0;
  for (const event of events) {
    wins[event.winnerName] = (wins[event.winnerName] || 0) + 1;
    if (event.shielded) shielded++;
  }
  const entries = Object.entries(wins);
  const most = entries.length
    ? entries.reduce((a, b) => (a[1] > b[1] ? a : b))
    : null;
  return {
    totalDuels: events.length,
    shieldedDuels: shielded,
    mostWinsPlayer: most ? most[0] : null,
    mostWinsCount: most ? most[1] : 0
  };
}
