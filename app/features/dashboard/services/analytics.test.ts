import { describe, expect, it } from 'vitest';
import {
  buildPlayerLeaderboard,
  buildHeadToHead,
  buildTeamStreaks,
  calculateMatchSummary
} from '~/features/dashboard/services/analytics';
import type { LocalDuelEvent } from '~/features/dashboard/types';

const makeEvent = (
  overrides: Partial<LocalDuelEvent> = {}
): LocalDuelEvent => ({
  round: 1,
  winnerName: 'A',
  loserName: 'B',
  winnerTeam: 'team1',
  loserTeam: 'team2',
  shielded: false,
  winnerCards: [],
  loserCards: [],
  winnerSum: 1,
  loserSum: 2,
  powerUpsUsed: {},
  ...overrides
});

describe('buildPlayerLeaderboard', () => {
  it('returns empty for no events', () => {
    expect(buildPlayerLeaderboard([])).toEqual([]);
  });

  it('ranks players by duel wins descending', () => {
    const events = [
      makeEvent({ winnerName: 'A' }),
      makeEvent({ winnerName: 'A' }),
      makeEvent({ winnerName: 'B' })
    ];
    expect(buildPlayerLeaderboard(events)).toEqual([
      { name: 'A', winCount: 2 },
      { name: 'B', winCount: 1 }
    ]);
  });
});

describe('buildHeadToHead', () => {
  it('returns empty for no events', () => {
    expect(buildHeadToHead([])).toEqual([]);
  });

  it('counts winner-loser pairings', () => {
    const events = [
      makeEvent({ winnerName: 'A', loserName: 'B' }),
      makeEvent({ winnerName: 'A', loserName: 'B' }),
      makeEvent({ winnerName: 'C', loserName: 'D' })
    ];
    expect(buildHeadToHead(events)).toEqual([
      { winner: 'A', loser: 'B', count: 2 },
      { winner: 'C', loser: 'D', count: 1 }
    ]);
  });
});

describe('buildTeamStreaks', () => {
  it('computes longest consecutive win streak per team', () => {
    const events = [
      makeEvent({ winnerTeam: 'team1' }),
      makeEvent({ winnerTeam: 'team1' }),
      makeEvent({ winnerTeam: 'team2' }),
      makeEvent({ winnerTeam: 'team2' }),
      makeEvent({ winnerTeam: 'team2' })
    ];
    expect(buildTeamStreaks(events)).toEqual([
      { team: 'team1', longestStreak: 2 },
      { team: 'team2', longestStreak: 3 }
    ]);
  });

  it('returns zero streaks when no events', () => {
    expect(buildTeamStreaks([])).toEqual([
      { team: 'team1', longestStreak: 0 },
      { team: 'team2', longestStreak: 0 }
    ]);
  });
});

describe('calculateMatchSummary', () => {
  it('summarizes empty events', () => {
    expect(calculateMatchSummary([])).toEqual({
      totalDuels: 0,
      shieldedDuels: 0,
      mostWinsPlayer: null,
      mostWinsCount: 0
    });
  });

  it('counts shielded duels and top winner', () => {
    const events = [
      makeEvent({ winnerName: 'A', shielded: true }),
      makeEvent({ winnerName: 'A', shielded: false }),
      makeEvent({ winnerName: 'B', shielded: true })
    ];
    expect(calculateMatchSummary(events)).toEqual({
      totalDuels: 3,
      shieldedDuels: 2,
      mostWinsPlayer: 'A',
      mostWinsCount: 2
    });
  });
});
