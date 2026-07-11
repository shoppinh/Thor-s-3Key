import { create } from 'zustand';
import type Card from '~/models/Card';
import type DuelData from '~/models/DuelData';
import type { TeamData, ChanceType } from '~/models/TeamData';
import type ConfirmPopupData from '~/models/ConfirmPopupData';
import type { LocalDuelEvent, PowerUpsUsed } from '~/features/dashboard/types';
import type { GameSnapshot } from '~/features/game/state/historyStack';
import type { SetupRosters } from '~/features/game/services/rosterSetup';
import {
  GameState,
  PowerUpsAllocation,
  SetupMode,
  Side,
  TeamName
} from '~/features/game/types/gameTypes';
import { MatchRepository, RosterLoader } from '~/features/game/services/ports';
import {
  createInitialDuelData,
  createInitialTeamData,
  createAllocationFromTeam
} from '~/features/game/state/initialState';
import {
  createGameSnapshot,
  pushGameSnapshot,
  shouldRecordGameSnapshot,
  createUndoTransition,
  createRedoTransition
} from '~/features/game/state/historyStack';
import {
  getCardsBySide,
  getPlayerDataBySide,
  applyPlayerSelectionToDuel
} from '~/features/game/engine/duelEngine';
import {
  generateRandomAllocation
} from '~/features/game/engine/powerupAllocation';
import {
  createRevealTwoCards,
  pickWorstGroup,
  withRemoveWorstUsage
} from '~/features/game/engine/powerupEngine';
import {
  determineWinner,
  getStreakMessage,
  calculateSum,
  shuffleDeck,
  drawCards,
  createDeck
} from '~/utils/gameUtil';
import {
  addRosterMember,
  removeRosterMember,
  moveRosterMember,
  shuffleRoster,
  validateRosterSetup
} from '~/features/game/services/rosterSetup';

const DECKS = createDeck();

export interface GameStoreState {
  // Dependencies
  matchRepository: MatchRepository | null;
  rosterLoader: RosterLoader | null;
  t: (key: string, options?: Record<string, unknown>) => string;

  // Active game settings / setup state
  sheetId: string;
  sheetRange: string;
  setupTeam1Roster: string[];
  setupTeam2Roster: string[];
  isRosterLoading: boolean;
  rosterLoadError: string;
  setupForBothTeams: boolean;
  setupMode: SetupMode;
  undoEnabled: boolean;
  redoEnabled: boolean;
  aiEnabled: boolean;

  // Active game state
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
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  showWinnerAnnouncement: boolean;
  initialTeam1Roster: string[];
  initialTeam2Roster: string[];
  gameStartTime: number | null;

  // Powerups allocation setup state
  team1Alloc: PowerUpsAllocation;
  team2Alloc: PowerUpsAllocation;

  // Modals / Popups
  confirmPopup: ConfirmPopupData;
  isPowerupGuideOpen: boolean;

  // History stack
  historyStack: GameSnapshot[];
  redoStack: GameSnapshot[];
}

export interface GameStoreActions {
  initialize: (deps: {
    matchRepository: MatchRepository;
    rosterLoader: RosterLoader;
    t: (key: string, options?: Record<string, unknown>) => string;
  }) => void;
  setSheetId: (id: string) => void;
  setSheetRange: (range: string) => void;
  setSetupMode: (mode: SetupMode) => void;
  setSetupForBothTeams: (val: boolean) => void;
  setUndoEnabled: (val: boolean) => void;
  setRedoEnabled: (val: boolean) => void;
  setAiEnabled: (val: boolean) => void;
  setPowerupGuideOpen: (val: boolean) => void;
  
  // Roster setup actions
  addSetupRosterMember: (team: TeamName, name: string) => void;
  removeSetupRosterMember: (team: TeamName, index: number) => void;
  moveSetupRosterMember: (fromTeam: TeamName, fromIndex: number, toTeam: TeamName, toIndex: number) => void;
  shuffleSetupRoster: (team: TeamName) => void;
  loadRoster: () => Promise<void>;

  // Powerups allocation actions
  setAlloc: (team: TeamName, key: keyof PowerUpsAllocation, value: number) => void;
  randomizeBothAlloc: () => void;
  randomizeEachAlloc: () => void;

  // Gameplay actions
  startGame: () => void;
  resetGame: () => void;
  nextRound: (inputTeam1: string[], inputTeam2: string[], shouldRecordHistory?: boolean) => void;
  playerSelect: (side: Side) => void;
  handleAiPick: () => void;
  handleChanceClick: (teamName: TeamName, chanceType: ChanceType) => void;
  handleConfirmChance: () => void;
  handleCancelChance: () => void;
  
  // Save actions
  performSave: () => Promise<void>;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  
  // Undo/Redo
  undoLastAction: () => void;
  redoLastAction: () => void;

  // Utility actions
  setScoreClass: (team: TeamName, scoreClass: string) => void;
  setShowWinnerAnnouncement: (val: boolean) => void;
}

const defaultT = (key: string, options?: Record<string, unknown>) => {
  if (options) {
    let result = key;
    Object.keys(options).forEach((k) => {
      result = result.replace(`{{${k}}}`, String(options[k]));
    });
    return result;
  }
  return key;
};

const getInitialState = (): Omit<GameStoreState, 'matchRepository' | 'rosterLoader' | 't'> => {
  const initialTeam1 = createInitialTeamData(1, 'Team');
  const initialTeam2 = createInitialTeamData(2, 'Team');
  
  return {
    sheetId: '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM',
    sheetRange: '3Key Game!A1:B30',
    setupTeam1Roster: [],
    setupTeam2Roster: [],
    isRosterLoading: false,
    rosterLoadError: '',
    setupForBothTeams: false,
    setupMode: 'per-team',
    undoEnabled: false,
    redoEnabled: false,
    aiEnabled: false,

    team1Data: initialTeam1,
    team2Data: initialTeam2,
    duelData: createInitialDuelData(),
    teamWinner: '',
    duelResult: '',
    isFirstTurn: true,
    gameState: 'setup',
    roundNumber: 0,
    winStreaks: {},
    duelEvents: [],
    saveStatus: 'idle',
    showWinnerAnnouncement: false,
    initialTeam1Roster: [],
    initialTeam2Roster: [],
    gameStartTime: null,

    team1Alloc: createAllocationFromTeam(initialTeam1),
    team2Alloc: createAllocationFromTeam(initialTeam2),

    confirmPopup: {
      isVisible: false,
      teamName: undefined,
      chanceType: undefined,
      chanceItemName: ''
    },
    isPowerupGuideOpen: false,

    historyStack: [],
    redoStack: []
  };
};

export const useGameStore = create<GameStoreState & GameStoreActions>((set, get) => {
  // Helper to record history before mutating state
  const recordHistorySnapshot = () => {
    const { undoEnabled, gameState } = get();
    if (!shouldRecordGameSnapshot(undoEnabled, gameState)) return;

    // Create current snapshot
    const snapshot = createGameSnapshot({
      team1Data: get().team1Data,
      team2Data: get().team2Data,
      duelData: get().duelData,
      teamWinner: get().teamWinner,
      duelResult: get().duelResult,
      isFirstTurn: get().isFirstTurn,
      gameState: get().gameState,
      roundNumber: get().roundNumber,
      winStreaks: get().winStreaks,
      duelEvents: get().duelEvents
    });

    set((state) => ({
      historyStack: pushGameSnapshot(state.historyStack, snapshot),
      redoStack: []
    }));
  };

  const getDuelOpponent = (duelData: DuelData, team1Players: string[], team2Players: string[]) => {
    return team1Players.includes(duelData.currentPlayerName)
      ? team2Players[0]
      : team1Players[0];
  };

  return {
    ...getInitialState(),
    matchRepository: null,
    rosterLoader: null,
    t: defaultT,

    initialize: (deps) => {
      set({
        matchRepository: deps.matchRepository,
        rosterLoader: deps.rosterLoader,
        t: deps.t,
        team1Data: createInitialTeamData(1, deps.t('common.team')),
        team2Data: createInitialTeamData(2, deps.t('common.team')),
        team1Alloc: createAllocationFromTeam(createInitialTeamData(1, deps.t('common.team'))),
        team2Alloc: createAllocationFromTeam(createInitialTeamData(2, deps.t('common.team')))
      });
    },

    setSheetId: (sheetId) => set({ sheetId }),
    setSheetRange: (sheetRange) => set({ sheetRange }),
    setSetupMode: (setupMode) => set({ setupMode }),
    setSetupForBothTeams: (setupForBothTeams) => set((state) => {
      if (setupForBothTeams) {
        return { setupForBothTeams, team2Alloc: { ...state.team1Alloc } };
      }
      return { setupForBothTeams };
    }),
    setUndoEnabled: (undoEnabled) => set((state) => {
      if (!undoEnabled) {
        return { undoEnabled, redoEnabled: false, historyStack: [], redoStack: [] };
      }
      return { undoEnabled };
    }),
    setRedoEnabled: (redoEnabled) => set((state) => {
      if (!redoEnabled) {
        return { redoEnabled, redoStack: [] };
      }
      return { redoEnabled };
    }),
    setAiEnabled: (aiEnabled) => set({ aiEnabled }),
    setPowerupGuideOpen: (isPowerupGuideOpen) => set({ isPowerupGuideOpen }),

    addSetupRosterMember: (team, name) => set((state) => {
      if (team === 'team1') {
        return {
          rosterLoadError: '',
          setupTeam1Roster: addRosterMember(state.setupTeam1Roster, name)
        };
      }
      return {
        rosterLoadError: '',
        setupTeam2Roster: addRosterMember(state.setupTeam2Roster, name)
      };
    }),

    removeSetupRosterMember: (team, index) => set((state) => {
      if (team === 'team1') {
        return {
          rosterLoadError: '',
          setupTeam1Roster: removeRosterMember(state.setupTeam1Roster, index)
        };
      }
      return {
        rosterLoadError: '',
        setupTeam2Roster: removeRosterMember(state.setupTeam2Roster, index)
      };
    }),

    moveSetupRosterMember: (fromTeam, fromIndex, toTeam, toIndex) => set((state) => {
      const result = moveRosterMember({
        team1: state.setupTeam1Roster,
        team2: state.setupTeam2Roster,
        fromTeam,
        fromIndex,
        toTeam,
        toIndex
      });
      return {
        rosterLoadError: '',
        setupTeam1Roster: result.team1,
        setupTeam2Roster: result.team2
      };
    }),

    shuffleSetupRoster: (team) => set((state) => {
      if (team === 'team1') {
        return {
          rosterLoadError: '',
          setupTeam1Roster: shuffleRoster(state.setupTeam1Roster)
        };
      }
      return {
        rosterLoadError: '',
        setupTeam2Roster: shuffleRoster(state.setupTeam2Roster)
      };
    }),

    loadRoster: async () => {
      const { rosterLoader, sheetId, sheetRange } = get();
      if (!rosterLoader) return;

      set({ isRosterLoading: true, rosterLoadError: '' });
      try {
        const { team1, team2 } = await rosterLoader.loadRoster({ sheetId, sheetRange });
        set({
          setupTeam1Roster: team1,
          setupTeam2Roster: team2,
          isRosterLoading: false
        });
      } catch (err: any) {
        set({
          rosterLoadError: err?.message || 'Failed to load roster',
          isRosterLoading: false
        });
      }
    },

    setAlloc: (team, key, value) => set((state) => {
      if (team === 'team1') {
        const newAlloc = { ...state.team1Alloc, [key]: value };
        return {
          team1Alloc: newAlloc,
          ...(state.setupForBothTeams && { team2Alloc: newAlloc })
        };
      } else {
        const newAlloc = { ...state.team2Alloc, [key]: value };
        return {
          team2Alloc: newAlloc,
          ...(state.setupForBothTeams && { team1Alloc: newAlloc })
        };
      }
    }),

    randomizeBothAlloc: () => {
      const total = get().team1Data.totalPowerUps;
      const result = generateRandomAllocation(total, 2);
      set({ team1Alloc: result, team2Alloc: result });
    },

    randomizeEachAlloc: () => {
      const t1 = generateRandomAllocation(get().team1Data.totalPowerUps, 2);
      const t2 = generateRandomAllocation(get().team2Data.totalPowerUps, 2);
      set({ team1Alloc: t1, team2Alloc: t2 });
    },

    startGame: () => {
      const { setupTeam1Roster, setupTeam2Roster } = get();
      if (setupTeam1Roster.length === 0 || setupTeam2Roster.length === 0) {
        return;
      }

      set({
        initialTeam1Roster: [...setupTeam1Roster],
        initialTeam2Roster: [...setupTeam2Roster],
        gameStartTime: Date.now(),
        historyStack: [],
        redoStack: [],
        winStreaks: {},
        duelEvents: [],
        saveStatus: 'idle',
        gameState: 'gamePlaying',
        teamWinner: ''
      });

      get().nextRound(setupTeam1Roster, setupTeam2Roster, false);
    },

    resetGame: () => {
      const { t } = get();
      set({
        ...getInitialState(),
        team1Data: createInitialTeamData(1, t('common.team')),
        team2Data: createInitialTeamData(2, t('common.team')),
        team1Alloc: createAllocationFromTeam(createInitialTeamData(1, t('common.team'))),
        team2Alloc: createAllocationFromTeam(createInitialTeamData(2, t('common.team')))
      });
    },

    nextRound: (inputTeam1, inputTeam2, shouldRecordHistory = true) => {
      const { t, roundNumber } = get();
      if (shouldRecordHistory) {
        recordHistorySnapshot();
      }

      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        set({
          teamWinner:
            inputTeam1.length === 0
              ? `${t('common.team')} 2 ${t('game.isWinner')}`
              : `${t('common.team')} 1 ${t('game.isWinner')}`,
          gameState: 'gameOver'
        });
        return;
      }

      const deck = shuffleDeck([...DECKS]);
      const firstRandomizedTeam = Math.random() >= 0.5 ? inputTeam1 : inputTeam2;

      set((state) => ({
        isFirstTurn: roundNumber === 0,
        roundNumber: state.roundNumber + 1,
        duelResult: '',
        team1Data: {
          ...state.team1Data,
          players: [...inputTeam1]
        },
        team2Data: {
          ...state.team2Data,
          players: [...inputTeam2]
        },
        duelData: {
          duelIndex: 0,
          currentPlayerName: roundNumber === 0 ? firstRandomizedTeam[0] : state.duelData.currentPlayerName,
          player1Name: '',
          player1Team: undefined,
          player2Name: '',
          player2Team: undefined,
          topLeftCards: drawCards(deck),
          bottomLeftCards: drawCards(deck),
          topRightCards: drawCards(deck),
          bottomRightCards: drawCards(deck),
          topLeftRevealed: false,
          bottomLeftRevealed: false,
          topRightRevealed: false,
          bottomRightRevealed: false,
          topLeftPlayerData: { name: '', team: '', sum: -1, cards: [] },
          bottomLeftPlayerData: { name: '', team: '', sum: -1, cards: [] },
          topRightPlayerData: { name: '', team: '', sum: -1, cards: [] },
          bottomRightPlayerData: { name: '', team: '', sum: -1, cards: [] },
          isFinishDuel: false,
          revealedCards: {
            topLeft: [],
            bottomLeft: [],
            topRight: [],
            bottomRight: []
          },
          revealTwoUsedBy: undefined,
          lifeShieldUsedBy: undefined,
          removedWorstGroups: [],
          removeWorstUsedByTeams: [],
          secondChanceUsedByTeams: [],
          player1SideSelected: undefined,
          player2SideSelected: undefined,
          winningTeam: undefined
        }
      }));
    },

    playerSelect: (side) => {
      recordHistorySnapshot();

      const { duelData, team1Data, team2Data, t, roundNumber, winStreaks } = get();
      const currentPlayer = duelData.currentPlayerName;
      const newDuelIndex = duelData.duelIndex + 1;
      const opponent = getDuelOpponent(duelData, team1Data.players, team2Data.players);
      const teamName = team1Data.players.includes(currentPlayer) ? 'team1' : 'team2';
      
      const selectedCards = getCardsBySide(duelData, side);
      const selectedSum = calculateSum(selectedCards);

      set({ isFirstTurn: false });

      if (duelData.duelIndex === 0) {
        const updates = applyPlayerSelectionToDuel({
          duelData,
          side,
          currentPlayer,
          teamName,
          sum: selectedSum,
          cards: selectedCards,
          duelIndex: newDuelIndex
        });

        set((state) => ({
          duelData: {
            ...state.duelData,
            ...updates,
            currentPlayerName: opponent
          }
        }));
      } else {
        const updates = applyPlayerSelectionToDuel({
          duelData,
          side,
          currentPlayer,
          teamName,
          sum: selectedSum,
          cards: selectedCards,
          duelIndex: newDuelIndex
        });

        // Ensure both players have selected sides
        const newData = { ...duelData, ...updates };
        if (!newData.player1SideSelected || !newData.player2SideSelected) {
          set({ duelData: newData });
          return;
        }

        const firstPlayerData = getPlayerDataBySide(newData, newData.player1SideSelected);
        const secondPlayerData = getPlayerDataBySide(newData, newData.player2SideSelected);

        const updatedData: DuelData = {
          ...newData,
          topLeftPlayerData:
            newData.topLeftPlayerData.cards.length === 0 || !newData.topLeftRevealed
              ? {
                  ...newData.topLeftPlayerData,
                  cards: newData.topLeftCards,
                  sum: calculateSum(newData.topLeftCards)
                }
              : newData.topLeftPlayerData,
          bottomLeftPlayerData:
            newData.bottomLeftPlayerData.cards.length === 0 || !newData.bottomLeftRevealed
              ? {
                  ...newData.bottomLeftPlayerData,
                  cards: newData.bottomLeftCards,
                  sum: calculateSum(newData.bottomLeftCards)
                }
              : newData.bottomLeftPlayerData,
          topRightPlayerData:
            newData.topRightPlayerData.cards.length === 0 || !newData.topRightRevealed
              ? {
                  ...newData.topRightPlayerData,
                  cards: newData.topRightCards,
                  sum: calculateSum(newData.topRightCards)
                }
              : newData.topRightPlayerData,
          bottomRightPlayerData:
            newData.bottomRightPlayerData.cards.length === 0 || !newData.bottomRightRevealed
              ? {
                  ...newData.bottomRightPlayerData,
                  cards: newData.bottomRightCards,
                  sum: calculateSum(newData.bottomRightCards)
                }
              : newData.bottomRightPlayerData
        };

        // Determine winner
        const { winner, isPlayer1Winner } = determineWinner(
          firstPlayerData.sum,
          secondPlayerData.sum,
          firstPlayerData.cards,
          secondPlayerData.cards,
          firstPlayerData.name,
          secondPlayerData.name,
          t
        );

        const firstPlayerTeam = updatedData.player1Team || duelData.player1Team;
        const secondPlayerTeam = updatedData.player2Team || duelData.player2Team;
        const winningTeamName = isPlayer1Winner ? firstPlayerTeam : secondPlayerTeam;
        const losingTeamName = isPlayer1Winner ? secondPlayerTeam : firstPlayerTeam;

        if (!winningTeamName || !losingTeamName) {
          throw new Error('Duel teams must be defined when calculating result');
        }

        const shieldedTeam = updatedData.lifeShieldUsedBy;
        const shouldPreventElimination = shieldedTeam && losingTeamName === shieldedTeam;

        const event: LocalDuelEvent = {
          round: roundNumber,
          winnerName: isPlayer1Winner ? firstPlayerData.name : secondPlayerData.name,
          loserName: isPlayer1Winner ? secondPlayerData.name : firstPlayerData.name,
          winnerTeam: winningTeamName,
          loserTeam: losingTeamName,
          shielded: !!shouldPreventElimination,
          winnerCards: isPlayer1Winner ? firstPlayerData.cards : secondPlayerData.cards,
          loserCards: isPlayer1Winner ? secondPlayerData.cards : firstPlayerData.cards,
          winnerSum: isPlayer1Winner ? firstPlayerData.sum : secondPlayerData.sum,
          loserSum: isPlayer1Winner ? secondPlayerData.sum : firstPlayerData.sum,
          powerUpsUsed: {
            ...(updatedData.revealTwoUsedBy && { revealTwo: updatedData.revealTwoUsedBy }),
            ...(updatedData.lifeShieldUsedBy && { lifeShield: updatedData.lifeShieldUsedBy }),
            ...(updatedData.removeWorstUsedByTeams?.length && { removeWorst: updatedData.removeWorstUsedByTeams }),
            ...(updatedData.secondChanceUsedByTeams?.length && { secondChance: updatedData.secondChanceUsedByTeams }),
            ...(updatedData.aiRecommendationUsedByTeams?.length && { aiRecommendation: updatedData.aiRecommendationUsedByTeams })
          }
        };

        const losingPlayerName = isPlayer1Winner ? secondPlayerData.name : firstPlayerData.name;
        const winnerPlayerName = isPlayer1Winner ? firstPlayerData.name : secondPlayerData.name;

        // Calculate streaks
        const prevStreak = winStreaks[winnerPlayerName] || 0;
        const loserStreak = winStreaks[losingPlayerName] || 0;
        const newStreak = prevStreak + 1;
        const streakMessage = getStreakMessage(newStreak);

        const nextStreaks = {
          ...winStreaks,
          [losingPlayerName]: 0,
          [winnerPlayerName]: newStreak
        };

        let resultMessage = winner;
        if (loserStreak >= 3) {
          resultMessage = `${losingPlayerName} ${t('game.isShutdownBy')} ${winnerPlayerName}`;
        } else if (streakMessage) {
          const streakTranslationMap: Record<string, string> = {
            legendary: 'game.legendary',
            godlike: 'game.godlike',
            dominating: 'game.dominating',
            unstoppable: 'game.unstoppable',
            rampage: 'game.rampage',
            killingSpree: 'game.killingSpree'
          };
          const explicitKey = streakTranslationMap[streakMessage];
          if (explicitKey) {
            resultMessage = t(explicitKey, { winner: winnerPlayerName });
          } else {
            resultMessage = t(`game.${streakMessage}`, { winner: winnerPlayerName });
          }
        }

        const team1Players = team1Data.players;
        const team2Players = team2Data.players;

        const updatedTeam1Players =
          !shouldPreventElimination && losingTeamName === 'team1'
            ? team1Players.filter((p) => p !== losingPlayerName)
            : team1Players;
        const updatedTeam2Players =
          !shouldPreventElimination && losingTeamName === 'team2'
            ? team2Players.filter((p) => p !== losingPlayerName)
            : team2Players;

        const losingTeamPlayers = losingTeamName === 'team1' ? updatedTeam1Players : updatedTeam2Players;
        let nextPlayer: string = duelData.currentPlayerName;
        if (losingTeamPlayers.length > 0) {
          nextPlayer = losingTeamPlayers[0];
        }

        set((state) => ({
          duelEvents: [...state.duelEvents, event],
          winStreaks: nextStreaks,
          duelResult: resultMessage,
          team1Data: {
            ...state.team1Data,
            players: updatedTeam1Players,
            scoreClass: ''
          },
          team2Data: {
            ...state.team2Data,
            players: updatedTeam2Players,
            scoreClass: ''
          },
          duelData: {
            ...updatedData,
            isFinishDuel: true,
            currentPlayerName: nextPlayer,
            ...(!shouldPreventElimination && { winningTeam: winningTeamName })
          }
        }));

        // Blinking triggers
        if (!shouldPreventElimination) {
          const isTeam1ScoreUpdate =
            (isPlayer1Winner && firstPlayerTeam === 'team1') ||
            (!isPlayer1Winner && secondPlayerTeam === 'team1');
            
          const activeTeamKey = isTeam1ScoreUpdate ? 'team1Data' : 'team2Data';

          set((state) => ({
            [activeTeamKey]: {
              ...state[activeTeamKey],
              score: state[activeTeamKey].score + 1
            }
          }));

          setTimeout(() => {
            set((state) => ({
              [activeTeamKey]: {
                ...state[activeTeamKey],
                scoreClass: 'blink-score'
              }
            }));
          }, 10);
        }

        // Duel completion animation
        set({ showWinnerAnnouncement: true });
        setTimeout(() => {
          set({ showWinnerAnnouncement: false });
        }, 2000);
      }
    },

    handleAiPick: () => {
      const { duelData, team1Data, playerSelect } = get();
      if (duelData.isFinishDuel || !duelData.currentPlayerName) return;

      const teamName = team1Data.players.includes(duelData.currentPlayerName) ? 'team1' : 'team2';
      const disabledGroups = new Set(duelData.removedWorstGroups || []);

      const availableSides: Side[] = (
        [
          {
            side: 'top-left' as Side,
            available:
              !disabledGroups.has('top-left') &&
              !duelData.topLeftRevealed &&
              duelData.topLeftPlayerData.cards.length === 0
          },
          {
            side: 'bottom-left' as Side,
            available:
              !disabledGroups.has('bottom-left') &&
              !duelData.bottomLeftRevealed &&
              duelData.bottomLeftPlayerData.cards.length === 0
          },
          {
            side: 'top-right' as Side,
            available:
              !disabledGroups.has('top-right') &&
              !duelData.topRightRevealed &&
              duelData.topRightPlayerData.cards.length === 0
          },
          {
            side: 'bottom-right' as Side,
            available:
              !disabledGroups.has('bottom-right') &&
              !duelData.bottomRightRevealed &&
              duelData.bottomRightPlayerData.cards.length === 0
          }
        ] as const
      )
        .filter((g) => g.available)
        .map((g) => g.side);

      if (availableSides.length === 0) return;

      const chosen = availableSides[Math.floor(Math.random() * availableSides.length)];

      set((state) => ({
        duelData: {
          ...state.duelData,
          aiRecommendationUsedByTeams: [
            ...(state.duelData.aiRecommendationUsedByTeams || []),
            teamName
          ]
        }
      }));

      playerSelect(chosen);
    },

    handleChanceClick: (teamName, chanceType) => {
      const { t } = get();
      const chanceItemName =
        chanceType === 'secondChance'
          ? t('game.secondChance')
          : chanceType === 'revealTwo'
            ? t('game.revealTwo')
            : chanceType === 'lifeShield'
              ? t('game.lifeShield')
              : t('game.removeWorst');

      set({
        confirmPopup: {
          isVisible: true,
          teamName,
          chanceType,
          chanceItemName
        }
      });
    },

    handleConfirmChance: () => {
      const { confirmPopup } = get();
      const { teamName, chanceType } = confirmPopup;

      if (teamName && chanceType) {
        recordHistorySnapshot();

        const teamKey = teamName === 'team1' ? 'team1Data' : 'team2Data';

        if (chanceType !== 'aiRecommendation') {
          set((state) => {
            const currentTeam = state[teamKey];
            return {
              [teamKey]: {
                ...currentTeam,
                powerUps: {
                  ...currentTeam.powerUps,
                  [chanceType]: currentTeam.powerUps[chanceType] - 1
                },
                totalPowerUps: currentTeam.totalPowerUps - 1
              }
            };
          });
        }

        switch (chanceType) {
          case 'secondChance': {
            // Implement second chance
            set((state) => {
              const currentDuelData = { ...state.duelData };
              
              if (currentDuelData.duelIndex === 1) {
                const firstPlayerSide = currentDuelData.player1SideSelected;
                const updatedPlayerData = {
                  topLeftPlayerData: currentDuelData.topLeftPlayerData,
                  bottomLeftPlayerData: currentDuelData.bottomLeftPlayerData,
                  topRightPlayerData: currentDuelData.topRightPlayerData,
                  bottomRightPlayerData: currentDuelData.bottomRightPlayerData
                };

                const resetData = { name: '?', team: '', sum: 0, cards: [] };

                if (firstPlayerSide === 'top-left') updatedPlayerData.topLeftPlayerData = resetData;
                else if (firstPlayerSide === 'bottom-left') updatedPlayerData.bottomLeftPlayerData = resetData;
                else if (firstPlayerSide === 'top-right') updatedPlayerData.topRightPlayerData = resetData;
                else if (firstPlayerSide === 'bottom-right') updatedPlayerData.bottomRightPlayerData = resetData;

                return {
                  duelData: {
                    ...currentDuelData,
                    currentPlayerName: currentDuelData.player1Name,
                    player1Name: '?',
                    player1Team: undefined,
                    player2Name: '',
                    player2Team: undefined,
                    duelIndex: 0,
                    ...updatedPlayerData,
                    topLeftRevealed: false,
                    bottomLeftRevealed: false,
                    topRightRevealed: false,
                    bottomRightRevealed: false,
                    player1SideSelected: undefined,
                    player2SideSelected: undefined,
                    winningTeam: undefined,
                    secondChanceUsedByTeams: [
                      ...(currentDuelData.secondChanceUsedByTeams || []),
                      teamName
                    ]
                  }
                };
              } else if (currentDuelData.duelIndex === 2) {
                // Revert score if a winning team was recorded
                if (currentDuelData.winningTeam) {
                  const winnerKey = currentDuelData.winningTeam === 'team1' ? 'team1Data' : 'team2Data';
                  setTimeout(() => {
                    set((s) => ({
                      [winnerKey]: {
                        ...s[winnerKey],
                        score: s[winnerKey].score - 1
                      }
                    }));
                  }, 0);
                }

                const secondPlayerSide = currentDuelData.player2SideSelected;
                const secondPlayerName = currentDuelData.player2Name;

                // Revert elimination (put player back on team)
                const firstPlayerName = currentDuelData.player1Name;
                const firstPlayerTeam = currentDuelData.player1Team;
                let losingPlayer = '';
                let losingTeamName: TeamName | undefined;

                if (currentDuelData.winningTeam === firstPlayerTeam) {
                  losingPlayer = secondPlayerName;
                  losingTeamName = currentDuelData.player2Team;
                } else {
                  losingPlayer = firstPlayerName;
                  losingTeamName = firstPlayerTeam;
                }

                if (losingPlayer && losingTeamName) {
                  const loseTeamKey = losingTeamName === 'team1' ? 'team1Data' : 'team2Data';
                  setTimeout(() => {
                    set((s) => {
                      const tData = s[loseTeamKey];
                      if (!tData.players.includes(losingPlayer)) {
                        return {
                          [loseTeamKey]: {
                            ...tData,
                            players: [losingPlayer, ...tData.players]
                          }
                        };
                      }
                      return {};
                    });
                  }, 0);
                }

                const updatedPlayerData = {
                  topLeftPlayerData: currentDuelData.topLeftPlayerData,
                  bottomLeftPlayerData: currentDuelData.bottomLeftPlayerData,
                  topRightPlayerData: currentDuelData.topRightPlayerData,
                  bottomRightPlayerData: currentDuelData.bottomRightPlayerData
                };

                const resetData = { name: '?', team: '', sum: 0, cards: [] };

                if (secondPlayerSide === 'top-left') updatedPlayerData.topLeftPlayerData = resetData;
                else if (secondPlayerSide === 'bottom-left') updatedPlayerData.bottomLeftPlayerData = resetData;
                else if (secondPlayerSide === 'top-right') updatedPlayerData.topRightPlayerData = resetData;
                else if (secondPlayerSide === 'bottom-right') updatedPlayerData.bottomRightPlayerData = resetData;

                return {
                  duelData: {
                    ...currentDuelData,
                    currentPlayerName: secondPlayerName,
                    duelIndex: 1,
                    player2Name: '',
                    player2Team: undefined,
                    ...updatedPlayerData,
                    player2SideSelected: undefined,
                    winningTeam: undefined,
                    isFinishDuel: false,
                    secondChanceUsedByTeams: [
                      ...(currentDuelData.secondChanceUsedByTeams || []),
                      teamName
                    ]
                  }
                };
              }
              return {};
            });
            break;
          }

          case 'revealTwo': {
            set((state) => {
              const newData = { ...state.duelData };
              return {
                duelData: {
                  ...newData,
                  revealTwoUsedBy: teamName,
                  revealedCards: {
                    topLeft: createRevealTwoCards(newData.topLeftCards),
                    bottomLeft: createRevealTwoCards(newData.bottomLeftCards),
                    topRight: createRevealTwoCards(newData.topRightCards),
                    bottomRight: createRevealTwoCards(newData.bottomRightCards)
                  }
                }
              };
            });
            break;
          }

          case 'lifeShield': {
            set((state) => ({
              duelData: {
                ...state.duelData,
                lifeShieldUsedBy: teamName
              }
            }));
            break;
          }

          case 'removeWorst': {
            set((state) => {
              const worstKey = pickWorstGroup(state.duelData);
              if (worstKey) {
                return {
                  duelData: withRemoveWorstUsage(state.duelData, teamName, worstKey)
                };
              }
              return {};
            });
            break;
          }
        }
      }

      set({
        confirmPopup: {
          isVisible: false,
          teamName: undefined,
          chanceType: undefined,
          chanceItemName: ''
        }
      });
    },

    handleCancelChance: () => {
      set({
        confirmPopup: {
          isVisible: false,
          teamName: undefined,
          chanceType: undefined,
          chanceItemName: ''
        }
      });
    },

    performSave: async () => {
      const { matchRepository, team1Data, team2Data, initialTeam1Roster, initialTeam2Roster, gameStartTime, duelEvents } = get();
      if (!matchRepository) return;

      const winnerTeam: TeamName = team1Data.players.length === 0 ? 'team2' : 'team1';
      const durationSeconds = gameStartTime != null ? Math.floor((Date.now() - gameStartTime) / 1000) : undefined;

      set({ saveStatus: 'saving' });
      try {
        await matchRepository.saveMatch({
          winnerTeam,
          team1Data,
          team2Data,
          team1InitialRoster: initialTeam1Roster,
          team2InitialRoster: initialTeam2Roster,
          durationSeconds,
          duelEvents
        });
        set({ saveStatus: 'saved' });
      } catch (err) {
        set({ saveStatus: 'error' });
      }
    },

    setSaveStatus: (saveStatus) => set({ saveStatus }),

    undoLastAction: () => {
      const { undoEnabled, historyStack, redoStack, redoEnabled } = get();
      if (!undoEnabled) return;

      // Create current snapshot
      const currentSnapshot = createGameSnapshot({
        team1Data: get().team1Data,
        team2Data: get().team2Data,
        duelData: get().duelData,
        teamWinner: get().teamWinner,
        duelResult: get().duelResult,
        isFirstTurn: get().isFirstTurn,
        gameState: get().gameState,
        roundNumber: get().roundNumber,
        winStreaks: get().winStreaks,
        duelEvents: get().duelEvents
      });

      const transition = createUndoTransition({
        historyStack,
        redoStack,
        currentSnapshot,
        trackRedo: redoEnabled
      });

      if (!transition.snapshotToApply) return;

      set({
        historyStack: transition.nextHistoryStack,
        redoStack: transition.nextRedoStack,
        team1Data: transition.snapshotToApply.team1Data,
        team2Data: transition.snapshotToApply.team2Data,
        duelData: transition.snapshotToApply.duelData,
        teamWinner: transition.snapshotToApply.teamWinner,
        duelResult: transition.snapshotToApply.duelResult,
        isFirstTurn: transition.snapshotToApply.isFirstTurn,
        gameState: transition.snapshotToApply.gameState,
        roundNumber: transition.snapshotToApply.roundNumber,
        winStreaks: transition.snapshotToApply.winStreaks,
        duelEvents: transition.snapshotToApply.duelEvents,
        showWinnerAnnouncement: false,
        confirmPopup: {
          isVisible: false,
          teamName: undefined,
          chanceType: undefined,
          chanceItemName: ''
        }
      });
    },

    redoLastAction: () => {
      const { undoEnabled, redoEnabled, historyStack, redoStack } = get();
      if (!undoEnabled || !redoEnabled) return;

      const currentSnapshot = createGameSnapshot({
        team1Data: get().team1Data,
        team2Data: get().team2Data,
        duelData: get().duelData,
        teamWinner: get().teamWinner,
        duelResult: get().duelResult,
        isFirstTurn: get().isFirstTurn,
        gameState: get().gameState,
        roundNumber: get().roundNumber,
        winStreaks: get().winStreaks,
        duelEvents: get().duelEvents
      });

      const transition = createRedoTransition({
        historyStack,
        redoStack,
        currentSnapshot
      });

      if (!transition.snapshotToApply) return;

      set({
        historyStack: transition.nextHistoryStack,
        redoStack: transition.nextRedoStack,
        team1Data: transition.snapshotToApply.team1Data,
        team2Data: transition.snapshotToApply.team2Data,
        duelData: transition.snapshotToApply.duelData,
        teamWinner: transition.snapshotToApply.teamWinner,
        duelResult: transition.snapshotToApply.duelResult,
        isFirstTurn: transition.snapshotToApply.isFirstTurn,
        gameState: transition.snapshotToApply.gameState,
        roundNumber: transition.snapshotToApply.roundNumber,
        winStreaks: transition.snapshotToApply.winStreaks,
        duelEvents: transition.snapshotToApply.duelEvents,
        showWinnerAnnouncement: false,
        confirmPopup: {
          isVisible: false,
          teamName: undefined,
          chanceType: undefined,
          chanceItemName: ''
        }
      });
    },

    setScoreClass: (team, scoreClass) => set((state) => {
      const teamKey = team === 'team1' ? 'team1Data' : 'team2Data';
      return {
        [teamKey]: {
          ...state[teamKey],
          scoreClass
        }
      };
    }),

    setShowWinnerAnnouncement: (showWinnerAnnouncement) => set({ showWinnerAnnouncement })
  };
});
