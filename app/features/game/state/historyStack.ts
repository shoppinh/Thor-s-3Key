import type { GameState } from '~/features/game/types/gameTypes';
import type DuelData from '~/models/DuelData';
import type { TeamData } from '~/models/TeamData';

export const HISTORY_STACK_LIMIT = 50;

export type GameSnapshot = {
  team1Data: TeamData;
  team2Data: TeamData;
  duelData: DuelData;
  teamWinner: string;
  duelResult: string;
  isFirstTurn: boolean;
  gameState: GameState;
  roundNumber: number;
  winStreaks: Record<string, number>;
};

export type GameSnapshotInput = GameSnapshot;

const clone = <T>(value: T): T => structuredClone(value);

const createTeamSnapshot = (teamData: TeamData): TeamData => ({
  ...clone(teamData),
  scoreClass: ''
});

export const createGameSnapshot = (
  state: GameSnapshotInput
): GameSnapshot => ({
  team1Data: createTeamSnapshot(state.team1Data),
  team2Data: createTeamSnapshot(state.team2Data),
  duelData: clone(state.duelData),
  teamWinner: state.teamWinner,
  duelResult: state.duelResult,
  isFirstTurn: state.isFirstTurn,
  gameState: state.gameState,
  roundNumber: state.roundNumber,
  winStreaks: clone(state.winStreaks)
});

export const pushGameSnapshot = (
  historyStack: GameSnapshot[],
  snapshot: GameSnapshot,
  limit = HISTORY_STACK_LIMIT
): GameSnapshot[] => [...historyStack, snapshot].slice(-limit);

export const shouldRecordGameSnapshot = (
  undoEnabled: boolean,
  gameState: GameState
): boolean => undoEnabled && gameState === 'gamePlaying';
