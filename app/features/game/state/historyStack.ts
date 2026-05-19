import type { GameState } from '~/features/game/types/gameTypes';
import type { LocalDuelEvent } from '~/features/dashboard/types';
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
  duelEvents: LocalDuelEvent[];
};

export type GameSnapshotInput = GameSnapshot;
export type GameHistoryTransition = {
  snapshotToApply?: GameSnapshot;
  nextHistoryStack: GameSnapshot[];
  nextRedoStack: GameSnapshot[];
};
type UndoTransitionInput = {
  historyStack: GameSnapshot[];
  redoStack: GameSnapshot[];
  currentSnapshot: GameSnapshot;
  trackRedo?: boolean;
  limit?: number;
};
type RedoTransitionInput = {
  historyStack: GameSnapshot[];
  redoStack: GameSnapshot[];
  currentSnapshot: GameSnapshot;
  limit?: number;
};

const clone = <T>(value: T): T => structuredClone(value);

const createTeamSnapshot = (teamData: TeamData): TeamData => ({
  ...clone(teamData),
  scoreClass: ''
});

export const createGameSnapshot = (state: GameSnapshotInput): GameSnapshot => ({
  team1Data: createTeamSnapshot(state.team1Data),
  team2Data: createTeamSnapshot(state.team2Data),
  duelData: clone(state.duelData),
  teamWinner: state.teamWinner,
  duelResult: state.duelResult,
  isFirstTurn: state.isFirstTurn,
  gameState: state.gameState,
  roundNumber: state.roundNumber,
  winStreaks: clone(state.winStreaks),
  duelEvents: clone(state.duelEvents)
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

export const createUndoTransition = ({
  historyStack,
  redoStack,
  currentSnapshot,
  trackRedo = true,
  limit = HISTORY_STACK_LIMIT
}: UndoTransitionInput): GameHistoryTransition => {
  const snapshotToApply = historyStack[historyStack.length - 1];
  if (!snapshotToApply) {
    return {
      snapshotToApply: undefined,
      nextHistoryStack: historyStack,
      nextRedoStack: redoStack
    };
  }

  return {
    snapshotToApply,
    nextHistoryStack: historyStack.slice(0, -1),
    nextRedoStack: trackRedo
      ? pushGameSnapshot(redoStack, currentSnapshot, limit)
      : redoStack
  };
};

export const createRedoTransition = ({
  historyStack,
  redoStack,
  currentSnapshot,
  limit = HISTORY_STACK_LIMIT
}: RedoTransitionInput): GameHistoryTransition => {
  const snapshotToApply = redoStack[redoStack.length - 1];
  if (!snapshotToApply) {
    return {
      snapshotToApply: undefined,
      nextHistoryStack: historyStack,
      nextRedoStack: redoStack
    };
  }

  return {
    snapshotToApply,
    nextHistoryStack: pushGameSnapshot(historyStack, currentSnapshot, limit),
    nextRedoStack: redoStack.slice(0, -1)
  };
};
