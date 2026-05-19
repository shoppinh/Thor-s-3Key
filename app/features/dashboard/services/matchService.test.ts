import { describe, expect, it, vi } from 'vitest';
import {
  saveMatch,
  fetchDashboardData
} from '~/features/dashboard/services/matchService';
import type { Database, LocalDuelEvent } from '~/features/dashboard/types';
import type { TeamData } from '~/models/TeamData';

const mockTeam = (overrides?: Partial<TeamData>): TeamData => ({
  name: 'Team',
  score: 3,
  scoreClass: '',
  totalPowerUps: 4,
  powerUps: { secondChance: 1, revealTwo: 1, lifeShield: 1, removeWorst: 1 },
  players: ['A', 'B'],
  ...overrides
});

const mockEvent = (overrides?: Partial<LocalDuelEvent>): LocalDuelEvent => ({
  round: 1,
  winnerName: 'A',
  loserName: 'B',
  winnerTeam: 'team1',
  loserTeam: 'team2',
  shielded: false,
  winnerCards: [{ value: 1, suit: '♦' }],
  loserCards: [{ value: 2, suit: '♥' }],
  winnerSum: 1,
  loserSum: 2,
  powerUpsUsed: {},
  ...overrides
});

function createMockSupabase(
  insertSequence: { data?: unknown; error?: { message: string } | null }[]
) {
  let callIndex = 0;
  const fromImpl = vi.fn(() => {
    const chain = {
      insert: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn(() => {
        const result = insertSequence[callIndex] ?? { data: null, error: null };
        callIndex++;
        return Promise.resolve(result);
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      then: vi.fn((onfulfilled, onrejected) => {
        const result = insertSequence[callIndex] ?? { data: null, error: null };
        callIndex++;
        return Promise.resolve(result).then(onfulfilled, onrejected);
      })
    };
    return chain;
  });
  return { from: fromImpl } as unknown as Parameters<
    typeof saveMatch
  >[0]['supabase'];
}

describe('saveMatch', () => {
  it('inserts a match and its duel events', async () => {
    const supabase = createMockSupabase([
      { data: { id: 'match-1' }, error: null },
      { data: null, error: null }
    ]);

    await saveMatch({
      supabase,
      winnerTeam: 'team1',
      team1Data: mockTeam(),
      team2Data: mockTeam(),
      team1InitialRoster: ['A', 'B'],
      team2InitialRoster: ['C', 'D'],
      duelEvents: [mockEvent()]
    });

    expect(supabase.from).toHaveBeenCalledWith('matches');
    expect(supabase.from).toHaveBeenCalledWith('duel_events');
  });

  it('throws when match insert fails', async () => {
    const supabase = createMockSupabase([
      { data: null, error: { message: 'db down' } }
    ]);

    await expect(
      saveMatch({
        supabase,
        winnerTeam: 'team1',
        team1Data: mockTeam(),
        team2Data: mockTeam(),
        team1InitialRoster: ['A', 'B'],
        team2InitialRoster: ['C', 'D'],
        duelEvents: []
      })
    ).rejects.toThrow('db down');
  });

  it('throws when duel_events insert fails', async () => {
    const supabase = createMockSupabase([
      { data: { id: 'match-1' }, error: null },
      { data: null, error: { message: 'events error' } }
    ]);

    await expect(
      saveMatch({
        supabase,
        winnerTeam: 'team2',
        team1Data: mockTeam(),
        team2Data: mockTeam(),
        team1InitialRoster: ['A', 'B'],
        team2InitialRoster: ['C', 'D'],
        duelEvents: [mockEvent()]
      })
    ).rejects.toThrow('events error');
  });
});

describe('fetchDashboardData', () => {
  it('returns empty data when no rows exist', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    } as unknown as Parameters<typeof fetchDashboardData>[0];

    const data = await fetchDashboardData(supabase);
    expect(data.summary.totalMatches).toBe(0);
    expect(data.summary.totalDuels).toBe(0);
  });
});
