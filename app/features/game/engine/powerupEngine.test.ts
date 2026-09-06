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
    expect(
      canUseSecondChance({ teamKey: 'team1', duelData: duel, isFinishDuel: false })
    ).toBe(false);
    expect(
      canUseSecondChance({ teamKey: 'team2', duelData: duel, isFinishDuel: false })
    ).toBe(false);
  });

  it('enables first player team only after first pick when free sides remain', () => {
    const duel = afterFirstPick();
    expect(
      canUseSecondChance({ teamKey: 'team1', duelData: duel, isFinishDuel: false })
    ).toBe(true);
    expect(
      canUseSecondChance({ teamKey: 'team2', duelData: duel, isFinishDuel: false })
    ).toBe(false);
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
    expect(
      canUseSecondChance({ teamKey: 'team1', duelData: duel, isFinishDuel: false })
    ).toBe(false);
  });

  it('denies team that already used Second Chance this duel', () => {
    const duel = afterFirstPick({ secondChanceUsedByTeams: ['team1'] });
    expect(
      canUseSecondChance({ teamKey: 'team1', duelData: duel, isFinishDuel: false })
    ).toBe(false);
  });

  it('denies second player team from using Second Chance after first pick', () => {
    const duel = afterFirstPick();
    expect(
      canUseSecondChance({ teamKey: 'team2', duelData: duel, isFinishDuel: false })
    ).toBe(false);
  });

  it('denies both teams once second player has selected (both selected)', () => {
    const duel = afterBothPicks({ isFinishDuel: false });
    expect(
      canUseSecondChance({ teamKey: 'team1', duelData: duel, isFinishDuel: false })
    ).toBe(false);
    expect(
      canUseSecondChance({ teamKey: 'team2', duelData: duel, isFinishDuel: false })
    ).toBe(false);
  });

  it('denies both teams once duel is resolved (isFinishDuel)', () => {
    const duel = afterBothPicks({ isFinishDuel: true });
    expect(
      canUseSecondChance({ teamKey: 'team1', duelData: duel, isFinishDuel: true })
    ).toBe(false);
    expect(
      canUseSecondChance({ teamKey: 'team2', duelData: duel, isFinishDuel: true })
    ).toBe(false);
  });
});
