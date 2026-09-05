import { describe, expect, it } from 'vitest';
import {
  canUseSecondChance,
  countAvailableSecondChanceSides
} from '~/features/game/engine/powerupEngine';
import { createInitialDuelData } from '~/features/game/state/initialState';
import DuelData from '~/models/DuelData';
import { PlayerData } from '~/models/PlayerData';

const filledPlayer = (name: string, team: string): PlayerData => ({
  name,
  team,
  sum: 10,
  cards: [
    { value: 3, suit: '♠' },
    { value: 3, suit: '♥' },
    { value: 4, suit: '♦' }
  ]
});

const emptyPlayer = (): PlayerData => ({
  name: '',
  team: '',
  sum: 0,
  cards: []
});

const afterFirstPick = (updates: Partial<DuelData> = {}): DuelData => ({
  ...createInitialDuelData(),
  duelIndex: 1,
  currentPlayerName: 'Bob',
  player1Name: 'Alice',
  player1Team: 'team1',
  player1SideSelected: 'top-left',
  topLeftRevealed: true,
  topLeftPlayerData: filledPlayer('Alice', 'team1'),
  ...updates
});

const afterBothPicks = (updates: Partial<DuelData> = {}): DuelData => ({
  ...afterFirstPick(),
  duelIndex: 2,
  isFinishDuel: true,
  player2Name: 'Bob',
  player2Team: 'team2',
  player2SideSelected: 'bottom-right',
  bottomRightRevealed: true,
  bottomRightPlayerData: filledPlayer('Bob', 'team2'),
  // Finished duel path fills remaining sides for reveal
  bottomLeftPlayerData: filledPlayer('', ''),
  topRightPlayerData: filledPlayer('', ''),
  winningTeam: 'team1',
  ...updates
});

describe('countAvailableSecondChanceSides', () => {
  it('counts unpicked sides after first pick', () => {
    expect(countAvailableSecondChanceSides(afterFirstPick())).toBe(3);
  });

  it('returns 0 when all sides have cards after resolve', () => {
    expect(countAvailableSecondChanceSides(afterBothPicks())).toBe(0);
  });
});

describe('canUseSecondChance', () => {
  it('denies before any selection', () => {
    const duel = createInitialDuelData();
    expect(canUseSecondChance({ teamKey: 'team1', duelData: duel })).toBe(
      false
    );
    expect(canUseSecondChance({ teamKey: 'team2', duelData: duel })).toBe(
      false
    );
  });

  it('enables first player team only after first pick when free sides remain', () => {
    const duel = afterFirstPick();
    expect(canUseSecondChance({ teamKey: 'team1', duelData: duel })).toBe(
      true
    );
    expect(canUseSecondChance({ teamKey: 'team2', duelData: duel })).toBe(
      false
    );
  });

  it('denies first-pick redo when no free sides remain', () => {
    const duel = afterFirstPick({
      bottomLeftPlayerData: filledPlayer('', ''),
      topRightPlayerData: filledPlayer('', ''),
      bottomRightPlayerData: filledPlayer('', ''),
      removedWorstGroups: []
    });
    // top-left already filled; force the other three filled → 0 free
    expect(countAvailableSecondChanceSides(duel)).toBe(0);
    expect(canUseSecondChance({ teamKey: 'team1', duelData: duel })).toBe(
      false
    );
  });

  it('denies team that already used Second Chance this duel', () => {
    const duel = afterFirstPick({ secondChanceUsedByTeams: ['team1'] });
    expect(canUseSecondChance({ teamKey: 'team1', duelData: duel })).toBe(
      false
    );
  });

  it('enables losing second player after resolve even when availableCount is 0', () => {
    const duel = afterBothPicks({ winningTeam: 'team1' });
    expect(countAvailableSecondChanceSides(duel)).toBe(0);
    expect(
      canUseSecondChance({
        teamKey: 'team2',
        duelData: duel,
        isFinishDuel: true
      })
    ).toBe(true);
    expect(
      canUseSecondChance({
        teamKey: 'team1',
        duelData: duel,
        isFinishDuel: true
      })
    ).toBe(false);
  });

  it('enables losing first player after resolve', () => {
    const duel = afterBothPicks({ winningTeam: 'team2' });
    expect(
      canUseSecondChance({
        teamKey: 'team1',
        duelData: duel,
        isFinishDuel: true
      })
    ).toBe(true);
    expect(
      canUseSecondChance({
        teamKey: 'team2',
        duelData: duel,
        isFinishDuel: true
      })
    ).toBe(false);
  });

  it('enables both participants on a tie (no winningTeam)', () => {
    const duel = afterBothPicks({ winningTeam: undefined });
    expect(
      canUseSecondChance({
        teamKey: 'team1',
        duelData: duel,
        isFinishDuel: true
      })
    ).toBe(true);
    expect(
      canUseSecondChance({
        teamKey: 'team2',
        duelData: duel,
        isFinishDuel: true
      })
    ).toBe(true);
  });

  it('denies non-participant teams after resolve', () => {
    // Should not happen in 1v1, but guard the predicate
    const duel = afterBothPicks({
      player1Team: 'team1',
      player2Team: 'team1',
      winningTeam: 'team1'
    });
    expect(
      canUseSecondChance({
        teamKey: 'team2',
        duelData: duel,
        isFinishDuel: true
      })
    ).toBe(false);
  });

  it('treats both-selected without isFinishDuel like post-resolve', () => {
    const duel = afterBothPicks({
      isFinishDuel: false,
      winningTeam: 'team1',
      // still both selected
      topLeftPlayerData: emptyPlayer(),
      bottomLeftPlayerData: emptyPlayer(),
      topRightPlayerData: emptyPlayer(),
      bottomRightPlayerData: emptyPlayer()
    });
    expect(
      canUseSecondChance({
        teamKey: 'team2',
        duelData: duel,
        isFinishDuel: false
      })
    ).toBe(true);
  });
});
