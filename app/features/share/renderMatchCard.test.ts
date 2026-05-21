import { describe, it, expect } from 'vitest';
import { calculateMvp, summarizePowerUps } from './renderMatchCard';
import type { LocalDuelEvent } from '~/features/dashboard/types';

describe('calculateMvp', () => {
  it('returns empty string for empty events', () => {
    expect(calculateMvp([])).toBe('');
  });

  it('returns the player with highest kills-minus-deaths', () => {
    const events: LocalDuelEvent[] = [
      {
        round: 1,
        winnerName: 'Alice',
        loserName: 'Bob',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 8,
        loserSum: 3,
        powerUpsUsed: {}
      },
      {
        round: 2,
        winnerName: 'Alice',
        loserName: 'Charlie',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 7,
        loserSum: 5,
        powerUpsUsed: {}
      }
    ];
    expect(calculateMvp(events)).toBe('Alice');
  });

  it('breaks ties by most kills', () => {
    const events: LocalDuelEvent[] = [
      {
        round: 1,
        winnerName: 'Alice',
        loserName: 'Bob',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 8,
        loserSum: 3,
        powerUpsUsed: {}
      },
      {
        round: 2,
        winnerName: 'Alice',
        loserName: 'Charlie',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 7,
        loserSum: 5,
        powerUpsUsed: {}
      },
      {
        round: 3,
        winnerName: 'Eve',
        loserName: 'Bob',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 9,
        loserSum: 2,
        powerUpsUsed: {}
      },
      {
        round: 4,
        winnerName: 'Bob',
        loserName: 'Alice',
        winnerTeam: 'team2',
        loserTeam: 'team1',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 6,
        loserSum: 4,
        powerUpsUsed: {}
      }
    ];
    // Alice: 2W 1L = +1, Eve: 1W 0L = +1, Bob: 1W 2L = -1, Charlie: 0W 1L = -1
    // Alice has more kills (2) than Eve (1), so Alice wins tiebreaker
    expect(calculateMvp(events)).toBe('Alice');
  });
});

describe('summarizePowerUps', () => {
  it('lists all power-up types used across events', () => {
    const events: LocalDuelEvent[] = [
      {
        round: 1,
        winnerName: 'Alice',
        loserName: 'Bob',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 8,
        loserSum: 3,
        powerUpsUsed: { revealTwo: 'team1', secondChance: ['team2'] }
      }
    ];
    const result = summarizePowerUps(events);
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'Second Chance', count: 1 },
        { name: 'Reveal Two', count: 1 }
      ])
    );
  });

  it('returns empty array when no power-ups used', () => {
    expect(summarizePowerUps([])).toEqual([]);
  });
});
