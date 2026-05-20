import { describe, expect, it } from 'vitest';
import {
  HISTORY_STACK_LIMIT,
  createGameSnapshot,
  pushGameSnapshot,
  shouldRecordGameSnapshot,
  type GameSnapshot
} from '~/features/game/state/historyStack';
import {
  createInitialDuelData,
  createInitialTeamData
} from '~/features/game/state/initialState';

const createSnapshot = (roundNumber: number): GameSnapshot =>
  createGameSnapshot({
    team1Data: createInitialTeamData(1, 'Team'),
    team2Data: createInitialTeamData(2, 'Team'),
    duelData: createInitialDuelData(),
    teamWinner: '',
    duelResult: '',
    isFirstTurn: false,
    gameState: 'gamePlaying',
    roundNumber,
    winStreaks: {},
    duelEvents: []
  });

describe('history stack', () => {
  it('excludes transient score classes from snapshots', () => {
    const snapshot = createGameSnapshot({
      team1Data: { ...createInitialTeamData(1, 'Team'), scoreClass: 'blink' },
      team2Data: { ...createInitialTeamData(2, 'Team'), scoreClass: 'blink' },
      duelData: createInitialDuelData(),
      teamWinner: '',
      duelResult: '',
      isFirstTurn: true,
      gameState: 'gamePlaying',
      roundNumber: 1,
      winStreaks: {},
      duelEvents: []
    });

    expect(snapshot.team1Data.scoreClass).toBe('');
    expect(snapshot.team2Data.scoreClass).toBe('');
  });

  it('caps the stack at the history limit', () => {
    const stack = Array.from(
      { length: HISTORY_STACK_LIMIT + 5 },
      (_, index) => index
    ).reduce(
      (history, roundNumber) =>
        pushGameSnapshot(history, createSnapshot(roundNumber)),
      [] as GameSnapshot[]
    );

    expect(stack).toHaveLength(HISTORY_STACK_LIMIT);
    expect(stack[0].roundNumber).toBe(5);
    expect(stack[HISTORY_STACK_LIMIT - 1].roundNumber).toBe(54);
  });

  it('copies snapshot data so later mutations cannot leak into history', () => {
    const team1Data = createInitialTeamData(1, 'Team');
    const duelData = createInitialDuelData();
    const duelEvents = [
      {
        round: 1,
        winnerName: 'A',
        loserName: 'B',
        winnerTeam: 'team1' as const,
        loserTeam: 'team2' as const,
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 5,
        loserSum: 3,
        powerUpsUsed: {}
      }
    ];
    const snapshot = createGameSnapshot({
      team1Data,
      team2Data: createInitialTeamData(2, 'Team'),
      duelData,
      teamWinner: '',
      duelResult: '',
      isFirstTurn: true,
      gameState: 'gamePlaying',
      roundNumber: 1,
      winStreaks: {},
      duelEvents
    });

    team1Data.players.push('Late Player');
    duelData.currentPlayerName = 'Late Player';
    duelEvents.push({
      round: 2,
      winnerName: 'C',
      loserName: 'D',
      winnerTeam: 'team1',
      loserTeam: 'team2',
      shielded: false,
      winnerCards: [],
      loserCards: [],
      winnerSum: 5,
      loserSum: 3,
      powerUpsUsed: {}
    });

    expect(snapshot.team1Data.players).toEqual([]);
    expect(snapshot.duelData.currentPlayerName).toBe('');
    expect(snapshot.duelEvents).toHaveLength(1);
    expect(snapshot.duelEvents[0].round).toBe(1);
  });

  it('records snapshots only when undo is enabled during active gameplay', () => {
    expect(shouldRecordGameSnapshot(true, 'gamePlaying')).toBe(true);
    expect(shouldRecordGameSnapshot(false, 'gamePlaying')).toBe(false);
    expect(shouldRecordGameSnapshot(true, 'setup')).toBe(false);
    expect(shouldRecordGameSnapshot(true, 'gameLoading')).toBe(false);
    expect(shouldRecordGameSnapshot(true, 'gameOver')).toBe(false);
  });
});
