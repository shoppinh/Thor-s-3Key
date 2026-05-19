import type { TeamName } from '~/features/game/types/gameTypes';

export interface LeaderboardEntry {
  name: string;
  winCount: number;
}

type WinnerNameEvent = { winnerName?: string; winner_name?: string };

export function buildPlayerLeaderboard(
  events: WinnerNameEvent[]
): LeaderboardEntry[] {
  const wins: Record<string, number> = {};
  for (const event of events) {
    const name = event.winnerName ?? event.winner_name;
    if (name) {
      wins[name] = (wins[name] || 0) + 1;
    }
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

type WinnerLoserEvent = {
  winnerName?: string;
  winner_name?: string;
  loserName?: string;
  loser_name?: string;
};

export function buildHeadToHead(events: WinnerLoserEvent[]): HeadToHeadEntry[] {
  const map: Record<string, number> = {};
  for (const event of events) {
    const winner = event.winnerName ?? event.winner_name;
    const loser = event.loserName ?? event.loser_name;
    if (winner && loser) {
      const key = `${winner}|${loser}`;
      map[key] = (map[key] || 0) + 1;
    }
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

type WinnerTeamEvent = { winnerTeam?: TeamName; winner_team?: TeamName };

export function buildTeamStreaks(events: WinnerTeamEvent[]): TeamStreakEntry[] {
  const streaks: Record<TeamName, number> = { team1: 0, team2: 0 };
  let currentTeam: TeamName | '' = '';
  let currentCount = 0;

  for (const event of events) {
    const team = event.winnerTeam ?? event.winner_team;
    if (!team) continue;
    if (team === currentTeam) {
      currentCount++;
    } else {
      currentTeam = team;
      currentCount = 1;
    }
    streaks[team] = Math.max(streaks[team], currentCount);
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

type WinnerShieldedEvent = {
  winnerName?: string;
  winner_name?: string;
  shielded: boolean;
};

export function calculateMatchSummary(
  events: WinnerShieldedEvent[]
): MatchSummary {
  const wins: Record<string, number> = {};
  let shielded = 0;
  for (const event of events) {
    const name = event.winnerName ?? event.winner_name;
    if (name) {
      wins[name] = (wins[name] || 0) + 1;
    }
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
