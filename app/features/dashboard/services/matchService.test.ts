import { describe, expect, it, vi } from 'vitest';
import {
  saveMatch,
  fetchDashboardData,
  type SaveMatchInput
} from '~/features/dashboard/services/matchService';
import type { LocalDuelEvent } from '~/features/dashboard/types';
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

const makeSaveInput = (overrides?: Partial<SaveMatchInput>): SaveMatchInput => ({
  id: 'match-1',
  supabase: { rpc: vi.fn() } as unknown as SaveMatchInput['supabase'],
  winnerTeam: 'team1',
  team1Data: mockTeam(),
  team2Data: mockTeam(),
  team1InitialRoster: ['A', 'B'],
  team2InitialRoster: ['C', 'D'],
  durationSeconds: 42,
  duelEvents: [mockEvent()],
  ...overrides
});

describe('saveMatch', () => {
  it('sends one completed match through save_completed_match', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'match-1', error: null });
    const supabase = { rpc } as unknown as SaveMatchInput['supabase'];

    await expect(
      saveMatch(
        makeSaveInput({
          id: 'match-1',
          supabase,
          durationSeconds: 42,
          duelEvents: [mockEvent()]
        })
      )
    ).resolves.toBe('match-1');

    expect(rpc).toHaveBeenCalledWith('save_completed_match', {
      p_match_id: 'match-1',
      p_match: expect.objectContaining({ total_duels: 1, duration_seconds: 42 }),
      p_events: [expect.objectContaining({ winner_name: 'A' })]
    });
  });

  it('preserves caller-provided identity on duplicate calls', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'match-1', error: null });
    const supabase = { rpc } as unknown as SaveMatchInput['supabase'];
    const input = makeSaveInput({ id: 'match-1', supabase });

    await saveMatch(input);
    await saveMatch(input);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, 'save_completed_match', expect.objectContaining({ p_match_id: 'match-1' }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'save_completed_match', expect.objectContaining({ p_match_id: 'match-1' }));
  });

  it('throws when rpc fails without querying tables directly', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    const from = vi.fn();
    const supabase = { rpc, from } as unknown as SaveMatchInput['supabase'];

    await expect(saveMatch(makeSaveInput({ supabase }))).rejects.toThrow('db down');
    expect(from).not.toHaveBeenCalled();
  });
});

describe('fetchDashboardData', () => {
  it('returns empty data when no rows exist and applies limits', async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as Parameters<typeof fetchDashboardData>[0];

    const data = await fetchDashboardData(supabase);
    expect(data.summary.totalMatches).toBe(0);
    expect(data.summary.totalDuels).toBe(0);
    expect(from).toHaveBeenCalledWith('matches');
    expect(from).toHaveBeenCalledWith('duel_events');
    expect(limit).toHaveBeenCalledWith(100);
    expect(limit).toHaveBeenCalledWith(1000);
  });
});
