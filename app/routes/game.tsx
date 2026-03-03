import { useOutletContext } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '~/contexts/LanguageContext';
import { useTheme } from '~/contexts/ThemeContext';
import GameArenaScreen from '~/features/game/components/GameArenaScreen';
import GameOverScreen from '~/features/game/components/GameOverScreen';
import GameSetupScreen from '~/features/game/components/GameSetupScreen';
import WinnerAnnouncement from '~/features/game/components/WinnerAnnouncement';
import {
  applyPlayerSelectionToDuel,
  getAvailableSelectableGroupCount,
  getCardsBySide,
  getPlayerDataBySide
} from '~/features/game/engine/duelEngine';
import {
  generateRandomAllocation,
  isStartGameDisabledByAllocation
} from '~/features/game/engine/powerupAllocation';
import { getNextMatchState } from '~/features/game/engine/matchScheduler';
import {
  createRevealTwoCards,
  pickWorstGroup,
  withRemoveWorstUsage
} from '~/features/game/engine/powerupEngine';
import {
  getThemeExtraCardBacks,
  preloadGameImages
} from '~/features/game/services/assetService';
import { loadPlayersFromSheet } from '~/features/game/services/sheetService';
import {
  createAllocationFromTeam,
  createInitialDuelData,
  createInitialTeamData
} from '~/features/game/state/initialState';
import {
  buildTeamEntries,
  getTeamEntryById,
  getTeamIdByPlayerName
} from '~/features/game/state/teamCollection';
import {
  GameState,
  PowerUpsAllocation,
  SetupMode,
  Side,
  TeamId
} from '~/features/game/types/gameTypes';
import ConfirmPopupData from '~/models/ConfirmPopupData';
import DuelData from '~/models/DuelData';
import { PlayerData } from '~/models/PlayerData';
import { ChanceType, TeamData } from '~/models/TeamData';
import {
  calculateSum,
  createDeck,
  determineWinner,
  drawCards,
  getCardImage,
  getStreakMessage,
  shuffleDeck
} from '~/utils/gameUtil';
import ConfirmPopup from '../components/ConfirmPopup';
import PowerupGuideModal from '../components/PowerupGuideModal';
import Card from '../models/Card';

const DECKS = createDeck();
type AllocationKey = keyof PowerUpsAllocation;

type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
};

const TEAM_ONE_ID = 'team1';
const TEAM_TWO_ID = 'team2';

const CardGame = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const clientSecrets = useOutletContext<RootContext>();
  const [team1Data, setTeam1Data] = useState<TeamData>(
    createInitialTeamData(1, t('common.team'), TEAM_ONE_ID)
  );
  const [team2Data, setTeam2Data] = useState<TeamData>(
    createInitialTeamData(2, t('common.team'), TEAM_TWO_ID)
  );
  const [duelData, setDuelData] = useState<DuelData>(createInitialDuelData());

  const [teamWinner, setTeamWinner] = useState('');
  const [duelResult, setDuelResult] = useState(''); // Individual duel winner (e.g. "Player A Wins!")
  const [isFirstTurn, setIsFirstTurn] = useState(true); // first turn of the entire game
  const [confirmPopup, setConfirmPopup] = useState<ConfirmPopupData>({
    isVisible: false,
    teamName: undefined,
    chanceType: undefined,
    chanceItemName: ''
  });
  const [gameState, setGameState] = useState<GameState>('setup'); // setup -> gameLoading -> gamePlaying -> gameOver
  const [roundNumber, setRoundNumber] = useState(0);
  const [winStreaks, setWinStreaks] = useState<Record<string, number>>({});
  const [showWinnerAnnouncement, setShowWinnerAnnouncement] = useState(false);
  const [queuedTeams, setQueuedTeams] = useState<TeamData[]>([]);

  // Effect to handle score blinking for Team 1
  useEffect(() => {
    if (team1Data.score > 0) {
      setTeam1Data((prev) => ({ ...prev, scoreClass: 'blink-score' }));
      const timer = setTimeout(() => {
        setTeam1Data((prev) => ({ ...prev, scoreClass: '' }));
      }, 1500); // 0.5s * 3 iterations
      return () => clearTimeout(timer);
    }
  }, [team1Data.score]);

  // Effect to handle score blinking for Team 2
  useEffect(() => {
    if (team2Data.score > 0) {
      setTeam2Data((prev) => ({ ...prev, scoreClass: 'blink-score' }));
      const timer = setTimeout(() => {
        setTeam2Data((prev) => ({ ...prev, scoreClass: '' }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [team2Data.score]);

  // Show winner announcement when duelResult changes
  useEffect(() => {
    if (duelResult && duelData.isFinishDuel) {
      setShowWinnerAnnouncement(true);

      // // Hide after 2 seconds
      const timer = setTimeout(() => {
        setShowWinnerAnnouncement(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [duelResult, duelData.isFinishDuel]);
  // Local allocations for setup screen
  const [team1Alloc, setTeam1Alloc] = useState<PowerUpsAllocation>(
    createAllocationFromTeam(
      createInitialTeamData(1, t('common.team'), TEAM_ONE_ID)
    )
  );
  const [team2Alloc, setTeam2Alloc] = useState<PowerUpsAllocation>(
    createAllocationFromTeam(
      createInitialTeamData(2, t('common.team'), TEAM_TWO_ID)
    )
  );

  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = clientSecrets?.API_KEY ?? '';

  const [sheetId, setSheetId] = useState(SHEET_ID);
  const [sheetRange, setSheetRange] = useState(SHEET_RANGE);
  const [setupForBothTeams, setSetupForBothTeams] = useState(false);
  const [isPowerupGuideOpen, setIsPowerupGuideOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>('per-team');

  const getTotalPowerUps = (alloc: PowerUpsAllocation): number =>
    alloc.secondChance + alloc.revealTwo + alloc.lifeShield + alloc.removeWorst;

  const teamEntries = useMemo(
    () =>
      buildTeamEntries([
        { id: TEAM_ONE_ID, data: team1Data, allocation: team1Alloc },
        { id: TEAM_TWO_ID, data: team2Data, allocation: team2Alloc }
      ]),
    [team1Data, team2Data, team1Alloc, team2Alloc]
  );

  const updateTeamDataById = useCallback(
    (teamId: TeamId, updater: (prev: TeamData) => TeamData) => {
      if (teamId === TEAM_ONE_ID) {
        setTeam1Data(updater);
        return;
      }
      if (teamId === TEAM_TWO_ID) {
        setTeam2Data(updater);
      }
    },
    []
  );

  const startGameWithTeams = (team1Data: string[], team2Data: string[]) => {
    if (team1Data.length === 0 || team2Data.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }

    setWinStreaks({});
    setGameState('gamePlaying');
    setRoundNumber(0);
    nextRound(team1Data, team2Data);
  };

  /**
   * Loads team player names from Google Sheets and populates `team1Data` and `team2Data`.
   * Keeps the app in the 'setup' state where setup and welcome UIs are combined.
   */

  const startGame = async () => {
    setGameState('gameLoading');
    try {
      await preloadGameImages(getThemeExtraCardBacks(theme));
    } catch (error) {
      setGameState('setup');
      console.error('Error preloading images:', error);
      return;
    }

    try {
      const { teams: loadedTeams } =
        await loadPlayersFromSheet({
          apiKey: API_KEY,
          sheetId,
          sheetRange,
          anonymousLabel: t('game.anonymous')
        });

      if (loadedTeams.length < 2) {
        throw new Error('Need at least 2 teams from the sheet range');
      }

      const preparedTeams = loadedTeams.map((players, index) => {
        const teamId = `team${index + 1}`;
        const allocation =
          setupMode === 'both' || setupMode === 'random'
            ? team1Alloc
            : index === 0
              ? team1Alloc
              : index === 1
                ? team2Alloc
                : team1Alloc;
        return {
          ...createInitialTeamData(index + 1, t('common.team'), teamId),
          players,
          powerUps: { ...allocation },
          totalPowerUps: getTotalPowerUps(allocation)
        };
      });

      setTeam1Data(preparedTeams[0]);
      setTeam2Data(preparedTeams[1]);
      setQueuedTeams(preparedTeams.slice(2));

      startGameWithTeams(preparedTeams[0].players, preparedTeams[1].players);
    } catch (error) {
      console.error('Error fetching data:', error);
      setGameState('setup');
    }
  };

  // Function to select the next players for each team
  const nextRound = useCallback(
    (inputTeam1: string[], inputTeam2: string[]) => {
      let team1Players = inputTeam1;
      let team2Players = inputTeam2;
      let isNewMatch = false;

      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        const winnerData =
          inputTeam1.length === 0
            ? { ...team2Data, players: inputTeam2 }
            : { ...team1Data, players: inputTeam1 };
        const loserData =
          inputTeam1.length === 0
            ? { ...team1Data, players: inputTeam1 }
            : { ...team2Data, players: inputTeam2 };

        const nextMatchState = getNextMatchState(
          { winner: winnerData, loser: loserData },
          queuedTeams
        );

        if (nextMatchState.isGameOver || !nextMatchState.nextTeam1 || !nextMatchState.nextTeam2) {
          setTeamWinner(`${winnerData.name} ${t('game.isWinner')}`);
          setGameState('gameOver');
          return;
        }

        setTeam1Data(nextMatchState.nextTeam1);
        setTeam2Data(nextMatchState.nextTeam2);
        setQueuedTeams(nextMatchState.remainingQueue);
        setRoundNumber(0);

        team1Players = nextMatchState.nextTeam1.players;
        team2Players = nextMatchState.nextTeam2.players;
        isNewMatch = true;
      }

      setIsFirstTurn(isNewMatch || roundNumber === 0);

      const deck = shuffleDeck([...DECKS]);

      setDuelData((prev) => ({
        ...prev,
        duelIndex: 0,
        currentPlayerName:
          isNewMatch || roundNumber === 0
            ? Math.random() >= 0.5
              ? team1Players[0]
              : team2Players[0]
            : prev.currentPlayerName,
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
      }));
      setDuelResult(''); // Clear previous duel result
      if (!isNewMatch) {
        setRoundNumber((prev) => prev + 1);
      } else {
        setRoundNumber(1);
      }
    },
    [queuedTeams, roundNumber, t, team1Data, team2Data]
  );

  const playerSelect = (side: Side) => {
    const currentPlayer = duelData.currentPlayerName; // Capture current player before any updates
    const newDuelIndex = duelData.duelIndex + 1;
    setIsFirstTurn(false);
    const opponent = getDuelOpponent();
    const teamName = getTeamIdByPlayerName(teamEntries, currentPlayer) || TEAM_TWO_ID;
    const selectedCards = getCardsBySide(duelData, side);
    const selectedSum = calculateSum(selectedCards);

    if (duelData.duelIndex == 0) {
      const updates: Partial<DuelData> = {
        ...applyPlayerSelectionToDuel({
          duelData,
          side,
          currentPlayer,
          teamName,
          sum: selectedSum,
          cards: selectedCards,
          duelIndex: newDuelIndex
        }),
        currentPlayerName: opponent
      };

      setDuelData((prev) => ({ ...prev, ...updates }));
    } else {
      const updates: Partial<DuelData> = applyPlayerSelectionToDuel({
        duelData,
        side,
        currentPlayer,
        teamName,
        sum: selectedSum,
        cards: selectedCards,
        duelIndex: newDuelIndex
      });

      setDuelData((prev) => {
        const newData = { ...prev, ...updates };

        // Ensure both players have a selected side before determining the winner.
        if (!newData.player1SideSelected || !newData.player2SideSelected) {
          return newData;
        }

        const firstPlayerData = getPlayerDataBySide(
          newData,
          newData.player1SideSelected
        );
        const secondPlayerData = getPlayerDataBySide(
          newData,
          newData.player2SideSelected
        );

        const { isPlayer1Winner } = determineWinner(
          firstPlayerData.sum,
          secondPlayerData.sum,
          firstPlayerData.cards,
          secondPlayerData.cards,
          firstPlayerData.name,
          secondPlayerData.name,
          t
        );

        const secondPlayerTeam = newData.player2Team;
        const secondTeamData = getTeamEntryById(teamEntries, secondPlayerTeam)?.data;
        if (!secondPlayerTeam || !secondTeamData) {
          return newData;
        }
        const secondTeamAlreadyUsedSecondChance =
          secondTeamData.powerUps.secondChance <= 0;
        const secondTeamIsWinning =
          (secondPlayerTeam === newData.player1Team && isPlayer1Winner) ||
          (secondPlayerTeam === newData.player2Team && !isPlayer1Winner);

        const secondTeamHasSecondChance =
          !secondTeamAlreadyUsedSecondChance && !secondTeamIsWinning;
        const availableCount = getAvailableSelectableGroupCount(newData);
        const secondChanceUsedThisDuel = (
          newData.secondChanceUsedByTeams || []
        ).includes(secondPlayerTeam);
        const canSecondTeamUseSecondChance =
          secondTeamHasSecondChance &&
          availableCount > 0 &&
          !secondChanceUsedThisDuel;

        const shouldRevealAllCards = !canSecondTeamUseSecondChance;

        const updatedData = {
          ...newData,
          topLeftPlayerData:
            (newData.topLeftPlayerData.cards.length == 0 ||
              !newData.topLeftRevealed) &&
            shouldRevealAllCards
              ? {
                  ...newData.topLeftPlayerData,
                  cards: newData.topLeftCards,
                  sum: calculateSum(newData.topLeftCards)
                }
              : newData.topLeftPlayerData,
          bottomLeftPlayerData:
            (newData.bottomLeftPlayerData.cards.length == 0 ||
              !newData.bottomLeftRevealed) &&
            shouldRevealAllCards
              ? {
                  ...newData.bottomLeftPlayerData,
                  cards: newData.bottomLeftCards,
                  sum: calculateSum(newData.bottomLeftCards)
                }
              : newData.bottomLeftPlayerData,
          topRightPlayerData:
            (newData.topRightPlayerData.cards.length == 0 ||
              !newData.topRightRevealed) &&
            shouldRevealAllCards
              ? {
                  ...newData.topRightPlayerData,
                  cards: newData.topRightCards,
                  sum: calculateSum(newData.topRightCards)
                }
              : newData.topRightPlayerData,
          bottomRightPlayerData:
            (newData.bottomRightPlayerData.cards.length == 0 ||
              !newData.bottomRightRevealed) &&
            shouldRevealAllCards
              ? {
                  ...newData.bottomRightPlayerData,
                  cards: newData.bottomRightCards,
                  sum: calculateSum(newData.bottomRightCards)
                }
              : newData.bottomRightPlayerData
        };

        calculateResult(
          firstPlayerData.sum,
          secondPlayerData.sum,
          firstPlayerData.cards,
          secondPlayerData.cards,
          firstPlayerData.name,
          secondPlayerData.name,
          updatedData.player1Team,
          updatedData.player2Team
        );

        return {
          ...updatedData,
          isFinishDuel: true
        };
      });
    }
  };

  const getDuelOpponent = () => {
    const currentTeamId = getTeamIdByPlayerName(
      teamEntries,
      duelData.currentPlayerName
    );
    const opponentTeamId =
      currentTeamId === TEAM_ONE_ID ? TEAM_TWO_ID : TEAM_ONE_ID;
    return getTeamEntryById(teamEntries, opponentTeamId)?.data.players[0] || '';
  };

  /**
   * Determines if a PlayerCardDrawer should be disabled
   * A drawer is enabled (not disabled) if:
   * 1. No cards are drawn yet (normal case), OR
   * 2. Player has used Second Chance (name is "?" and team is "") and it's their turn
   */
  const isPlayerCardDrawerDisabled = (playerData: PlayerData) => {
    // If duel is finished, disable all interactions
    if (duelData.isFinishDuel) {
      return true;
    }

    // If no cards drawn, allow interaction
    if (playerData.cards.length === 0) {
      return false;
    }

    // If Second Chance was used (name is "?" and team is ""), allow interaction if it's their turn
    if (playerData.name === '?' && playerData.team === '') {
      // Allow interaction only if this player is the current player
      return false; // Let them click on the calculated number to make new selection
    }

    // Otherwise, disable interaction
    return true;
  };

  /**
   * Handles chance item clicks - shows confirmation popup
   * @param teamName - Which team clicked the chance
   * @param chanceType - Type of chance (secondChance or revealTwo)
   */
  const handleChanceClick = (teamName: TeamId, chanceType: ChanceType) => {
    const chanceItemName =
      chanceType === 'secondChance'
        ? t('game.secondChance')
        : chanceType === 'revealTwo'
          ? t('game.revealTwo')
          : chanceType === 'lifeShield'
            ? t('game.lifeShield')
            : t('game.removeWorst');

    setConfirmPopup({
      isVisible: true,
      teamName,
      chanceType,
      chanceItemName
    });
  };

  const decrementTeamPowerUp = (teamId: TeamId, chanceType: ChanceType) => {
    updateTeamDataById(teamId, (prev) => ({
      ...prev,
      powerUps: {
        ...prev.powerUps,
        [chanceType]: prev.powerUps[chanceType] - 1
      },
      totalPowerUps: prev.totalPowerUps - 1
    }));
  };

  const incrementTeamScore = (teamId: TeamId) => {
    updateTeamDataById(teamId, (prev) => ({ ...prev, score: prev.score + 1 }));
    setTimeout(() => {
      updateTeamDataById(teamId, (prev) => ({ ...prev, scoreClass: 'blink-score' }));
    }, 10);
  };

  /**
   * Implements the Second Chance functionality
   * When a team activates this item, it allows them to have another chance in the duel
   * This can be used after both players have made their selections
   */
  const implementSecondChance = () => {
    setDuelData((prev) => {
      const currentDuelData = { ...prev };

      // Check if this is the first or second player in the duel
      if (currentDuelData.duelIndex === 1) {
        // First player activated Second Chance
        // Reset their selection to reveal cards (player name is "?", team name is "")
        const firstPlayerSide = currentDuelData.player1SideSelected;

        // Create updated player data based on the first player's actual selection
        const updatedPlayerData = {
          topLeftPlayerData: currentDuelData.topLeftPlayerData,
          bottomLeftPlayerData: currentDuelData.bottomLeftPlayerData,
          topRightPlayerData: currentDuelData.topRightPlayerData,
          bottomRightPlayerData: currentDuelData.bottomRightPlayerData
        };

        // Reset only the position that the first player actually selected
        if (firstPlayerSide === 'top-left') {
          updatedPlayerData.topLeftPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.topLeftPlayerData.sum,
            cards: currentDuelData.topLeftPlayerData.cards
          };
        } else if (firstPlayerSide === 'bottom-left') {
          updatedPlayerData.bottomLeftPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.bottomLeftPlayerData.sum,
            cards: currentDuelData.bottomLeftPlayerData.cards
          };
        } else if (firstPlayerSide === 'top-right') {
          updatedPlayerData.topRightPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.topRightPlayerData.sum,
            cards: currentDuelData.topRightPlayerData.cards
          };
        } else if (firstPlayerSide === 'bottom-right') {
          updatedPlayerData.bottomRightPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.bottomRightPlayerData.sum,
            cards: currentDuelData.bottomRightPlayerData.cards
          };
        }

        return {
          ...currentDuelData,
          // Reset the current player to allow new selection
          currentPlayerName: currentDuelData.player1Name,
          // Reset first player's data to reveal cards
          player1Name: '?',
          player1Team: undefined,
          player2Name: '',
          player2Team: undefined,
          // Reset duel index to allow new selection
          duelIndex: 0,
          // Update only the position that was actually selected
          ...updatedPlayerData,
          // Reset reveal flags
          topLeftRevealed: false,
          bottomLeftRevealed: false,
          topRightRevealed: false,
          bottomRightRevealed: false,
          // Reset side selections
          player1SideSelected: undefined,
          player2SideSelected: undefined,
          // Reset winning team
          winningTeam: undefined
        };
      } else if (currentDuelData.duelIndex === 2) {
        // Second player activated Second Chance
        // Revert the calculated result (reduce winning team's score by 1)
        if (currentDuelData.winningTeam) {
          updateTeamDataById(currentDuelData.winningTeam, (prev) => ({
            ...prev,
            score: prev.score - 1
          }));
        }

        // Reset only the second player's selection to reveal cards (player name is "?", team name is "")
        const secondPlayerSide = currentDuelData.player2SideSelected;
        const secondPlayerName = currentDuelData.player2Name;

        // Revert player elimination - add the losing player back to their team
        const firstPlayerName = currentDuelData.player1Name;
        const firstPlayerTeam = currentDuelData.player1Team;

        // Determine who the losing player was based on the winning team
        let losingPlayer = '';
        let losingTeam: TeamId | undefined;

        if (currentDuelData.winningTeam === firstPlayerTeam) {
          // First player won, so second player was eliminated
          losingPlayer = secondPlayerName;
          losingTeam = currentDuelData.player2Team;
        } else {
          // Second player won, so first player was eliminated
          losingPlayer = firstPlayerName;
          losingTeam = firstPlayerTeam;
        }

        // Add the losing player back to their team if they're not already there
        if (losingPlayer && losingTeam) {
          updateTeamDataById(losingTeam, (prev) => {
            if (!prev.players.includes(losingPlayer)) {
              return { ...prev, players: [losingPlayer, ...prev.players] };
            }
            return prev;
          });
        }

        // Create updated player data based on current state
        const updatedPlayerData = {
          topLeftPlayerData: currentDuelData.topLeftPlayerData,
          bottomLeftPlayerData: currentDuelData.bottomLeftPlayerData,
          topRightPlayerData: currentDuelData.topRightPlayerData,
          bottomRightPlayerData: currentDuelData.bottomRightPlayerData
        };

        if (secondPlayerSide === 'top-left') {
          updatedPlayerData.topLeftPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.topLeftPlayerData.sum,
            cards: currentDuelData.topLeftPlayerData.cards
          };
        } else if (secondPlayerSide === 'bottom-left') {
          updatedPlayerData.bottomLeftPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.bottomLeftPlayerData.sum,
            cards: currentDuelData.bottomLeftPlayerData.cards
          };
        } else if (secondPlayerSide === 'top-right') {
          updatedPlayerData.topRightPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.topRightPlayerData.sum,
            cards: currentDuelData.topRightPlayerData.cards
          };
        } else if (secondPlayerSide === 'bottom-right') {
          updatedPlayerData.bottomRightPlayerData = {
            name: '?',
            team: '',
            sum: currentDuelData.bottomRightPlayerData.sum,
            cards: currentDuelData.bottomRightPlayerData.cards
          };
        }

        return {
          ...currentDuelData,
          // Set current player to the second player so they can make a new selection
          currentPlayerName: secondPlayerName,
          // Reset duel index to allow the second player to make a new selection
          duelIndex: 1,
          // Reset second player's data
          player2Name: '',
          player2Team: undefined,
          // Update only the second player's position
          ...updatedPlayerData,
          // Reset only the second player's side selection
          player2SideSelected: undefined,
          // Reset winning team
          winningTeam: undefined,
          // Reset finish duel flag so player can make new selection
          isFinishDuel: false
        };
      }

      // If duelIndex is not 1 or 2, return unchanged
      return currentDuelData;
    });
  };

  /**
   * Implements the Reveal Two functionality
   * When a team activates this item, the first two cards of all 4 groups (top-left, bottom-left, top-right, bottom-right)
   * will be shown face-up while keeping the last card face-down
   * This provides strategic information about the card distribution across all positions
   * Note: This does not set the revealed flags - those remain controlled by the original logic
   */
  const implementRevealTwo = () => {
    setDuelData((prev) => {
      const newData = { ...prev };

      // Set revealed cards in duelData instead of modifying player data
      return {
        ...newData,
        revealedCards: {
          topLeft: createRevealTwoCards(newData.topLeftCards),
          bottomLeft: createRevealTwoCards(newData.bottomLeftCards),
          topRight: createRevealTwoCards(newData.topRightCards),
          bottomRight: createRevealTwoCards(newData.bottomRightCards)
        }
      };
    });
  };

  /**
   * Handles confirmation popup confirm action
   */
  const handleConfirmChance = () => {
    const { teamName, chanceType } = confirmPopup;

    if (teamName && chanceType) {
      switch (chanceType) {
        case 'secondChance': {
          decrementTeamPowerUp(teamName, 'secondChance');

          implementSecondChance();
          setDuelData((prev) => ({
            ...prev,
            secondChanceUsedByTeams: [
              ...(prev.secondChanceUsedByTeams || []),
              teamName
            ]
          }));
          break;
        }

        case 'revealTwo': {
          decrementTeamPowerUp(teamName, 'revealTwo');

          setDuelData((prev) => ({ ...prev, revealTwoUsedBy: teamName }));
          implementRevealTwo();
          break;
        }

        case 'lifeShield': {
          decrementTeamPowerUp(teamName, 'lifeShield');

          setDuelData((prev) => ({ ...prev, lifeShieldUsedBy: teamName }));
          break;
        }

        case 'removeWorst': {
          setDuelData((prev) => {
            const worstKey = pickWorstGroup(prev);
            if (worstKey) {
              decrementTeamPowerUp(teamName, 'removeWorst');
              return withRemoveWorstUsage(prev, teamName, worstKey);
            }
            return prev;
          });
          break;
        }

        default:
          break;
      }
    }

    // Hide popup
    setConfirmPopup({
      isVisible: false,
      teamName: undefined,
      chanceType: undefined,
      chanceItemName: ''
    });
  };

  /**
   * Handles confirmation popup cancel action
   */
  const handleCancelChance = () => {
    setConfirmPopup({
      isVisible: false,
      teamName: undefined,
      chanceType: undefined,
      chanceItemName: ''
    });
  };

  // Function to calculate the result and handle elimination
  const calculateResult = useCallback(
    (
      p1Sum: number,
      p2Sum: number,
      p1Cards: Card[],
      p2Cards: Card[],
      p1Name: string,
      p2Name: string,
      p1Team?: TeamId,
      p2Team?: TeamId
    ) => {
      const { winner, isPlayer1Winner } = determineWinner(
        p1Sum,
        p2Sum,
        p1Cards,
        p2Cards,
        p1Name,
        p2Name,
        t
      );
      const losingPlayer = isPlayer1Winner ? p2Name : p1Name;

      // Use passed team information or fallback to duelData
      const firstPlayerTeam = p1Team || duelData.player1Team;
      const secondPlayerTeam = p2Team || duelData.player2Team;
      const losingTeam = isPlayer1Winner ? secondPlayerTeam : firstPlayerTeam;

      // If Shield is active for the losing team, do not eliminate that player this duel
      const shieldedTeam = duelData.lifeShieldUsedBy;
      const shouldPreventElimination =
        shieldedTeam && losingTeam === shieldedTeam;

      updateTeamDataById(TEAM_ONE_ID, (prev) => ({ ...prev, scoreClass: '' }));
      updateTeamDataById(TEAM_TWO_ID, (prev) => ({ ...prev, scoreClass: '' }));

      // Only update scores if the losing team doesn't have an active shield
      if (!shouldPreventElimination) {
        // Update scores and determine losing team
        if (isPlayer1Winner) {
          if (firstPlayerTeam) {
            incrementTeamScore(firstPlayerTeam);
          }
        } else {
          if (secondPlayerTeam) {
            incrementTeamScore(secondPlayerTeam);
          }
        }

        // Store the winning team in duelData (only if no shield is active)
        const winningTeam = isPlayer1Winner
          ? firstPlayerTeam
          : secondPlayerTeam;
        setDuelData((prev) => ({ ...prev, winningTeam }));
      }

      // Calculate streak
      const winnerName = isPlayer1Winner ? p1Name : p2Name;
      const loserName = isPlayer1Winner ? p2Name : p1Name;
      const prevStreak = winStreaks[winnerName] || 0;
      const loserStreak = winStreaks[loserName] || 0;
      const newStreak = prevStreak + 1;
      const streakMessage = getStreakMessage(newStreak);

      setWinStreaks((prev) => ({
        ...prev,
        [loserName]: 0,
        [winnerName]: newStreak
      }));

      // Set the duel result
      let resultMessage = winner;
      if (loserStreak >= 3) {
        resultMessage = `${loserName} ${t('game.isShutdownBy')} ${winnerName}`;
      } else if (streakMessage) {
        // Use an explicit lookup to avoid dynamic key concatenation and make keys
        // easy to track. Add known streak translation keys here.
        const streakTranslationMap: Record<string, string> = {
          // examples - replace or extend with your actual translation keys
          legendary: 'game.legendary',
          godlike: 'game.godlike',
          dominating: 'game.dominating',
          unstoppable: 'game.unstoppable',
          rampage: 'game.rampage',
          killingSpree: 'game.killingSpree'
        };

        const explicitKey = streakTranslationMap[streakMessage];
        if (explicitKey) {
          resultMessage = t(explicitKey, { winner: winnerName });
        } else {
          // Fallback for unknown values (keeps previous behavior but makes explicit intent)
          resultMessage = t(`game.${streakMessage}`, { winner: winnerName });
        }
      }

      setDuelResult(resultMessage);

      // Get the current team arrays
      const updatedTeamsById: Record<TeamId, string[]> = {
        [TEAM_ONE_ID]: team1Data.players,
        [TEAM_TWO_ID]: team2Data.players
      };

      if (!shouldPreventElimination && losingTeam) {
        updatedTeamsById[losingTeam] = (updatedTeamsById[losingTeam] || []).filter(
          (player) => player !== losingPlayer
        );
      }

      updateTeamDataById(TEAM_ONE_ID, (prev) => ({
        ...prev,
        players: updatedTeamsById[TEAM_ONE_ID]
      }));
      updateTeamDataById(TEAM_TWO_ID, (prev) => ({
        ...prev,
        players: updatedTeamsById[TEAM_TWO_ID]
      }));

      // Determine next player after elimination
      let nextPlayer: string;
      const losingTeamPlayers = losingTeam ? updatedTeamsById[losingTeam] : [];

      if (losingTeamPlayers.length > 0) {
        // Losing team still has players after elimination
        nextPlayer = losingTeamPlayers[0];
        setDuelData((prev) => ({ ...prev, currentPlayerName: nextPlayer }));
      }

      // Move to the next round after result
      // setTimeout(() => nextRound(team1After, team2After), 4000);
    },
    [
      team1Data.players,
      team2Data.players,
      duelData.player1Team,
      duelData.player2Team,
      duelData.lifeShieldUsedBy,
      winStreaks,
      t
    ]
  );

  /**
   * Renders the cards with optional click functionality
   * @param cards - Array of cards to render
   * @param onCardClick - Optional click handler for card images
   * @param disabled - Whether card clicks are disabled
   * @returns React elements for the cards
   */
  const renderTheCards = (
    cards: Card[],
    onCardClick?: () => void,
    disabled?: boolean
  ) => {
    return cards.map((card, index) => (
      <img
        key={index}
        src={getCardImage(card.value, card.suit, theme)}
        alt={`${card.value}${card.suit}`}
        style={{
          width: '150px',
          cursor: onCardClick && !disabled ? 'pointer' : 'default'
        }}
        role={onCardClick && !disabled ? 'button' : undefined}
        tabIndex={onCardClick && !disabled ? 0 : undefined}
        onClick={onCardClick && !disabled ? onCardClick : undefined}
        onKeyDown={
          onCardClick && !disabled
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCardClick();
                }
              }
            : undefined
        }
      />
    ));
  };

  /**
   * Determines whether the "Start Game" button should be disabled.
   *
   * Rules:
   * - Disabled while the app is loading data (gameState is 'gameLoading').
   * - If both teams already have players, then each team's allocated power-ups
   *   must exactly equal their `totalPowerUps`. If either team does not match,
   *   the button is disabled.
   * - If players are not loaded yet, the button remains enabled to allow
   *   kicking off the sheet loading.
   *
   * @returns true if the button should be disabled; otherwise false
   */
  const isStartGameDisabled = (): boolean => {
    return isStartGameDisabledByAllocation({
      gameState,
      setupMode,
      team1Alloc,
      team2Alloc,
      team1Total: team1Data.totalPowerUps,
      team2Total: team2Data.totalPowerUps
    });
  };

  /**
   * Sets a specific power-up allocation value for BOTH teams when the
   * "Setup power-ups for both teams" option is enabled.
   *
   * @param key - The allocation field name to update
   * @param value - The new numeric value to use for both teams
   */
  const setBothTeamsAlloc = (
    key: keyof PowerUpsAllocation,
    value: number
  ): void => {
    setTeam1Alloc((prev) => ({ ...prev, [key]: value }));
    setTeam2Alloc((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Randomizes a valid power-ups allocation and applies it to BOTH teams.
   *
   * Constraints enforced:
   * - Sum equals `team1Data.totalPowerUps` (shared allocation for both teams)
   * - Each type is capped at 2
   */
  const randomizeBothTeamsAllocation = (): void => {
    const total = team1Data.totalPowerUps;
    const result = generateRandomAllocation(total, 2);
    setTeam1Alloc(result);
    setTeam2Alloc(result);
  };

  /**
   * Randomizes valid power-ups allocations independently for each team.
   * Uses each team's `totalPowerUps` and the same per-type cap as shared random mode.
   */
  const randomizeEachTeamsAllocation = (): void => {
    const t1 = generateRandomAllocation(team1Data.totalPowerUps, 2);
    const t2 = generateRandomAllocation(team2Data.totalPowerUps, 2);
    setTeam1Alloc(t1);
    setTeam2Alloc(t2);
  };

  const clampAllocationValue = (value: number, total: number): number =>
    Math.max(0, Math.min(total, value));

  const setTeam1Allocation = (key: AllocationKey, value: number): void => {
    setTeam1Alloc((prev) => ({
      ...prev,
      [key]: clampAllocationValue(value, team1Data.totalPowerUps)
    }));
  };

  const setTeam2Allocation = (key: AllocationKey, value: number): void => {
    setTeam2Alloc((prev) => ({
      ...prev,
      [key]: clampAllocationValue(value, team2Data.totalPowerUps)
    }));
  };

  const setSharedAllocation = (key: AllocationKey, value: number): void => {
    setBothTeamsAlloc(key, clampAllocationValue(value, team1Data.totalPowerUps));
  };

  const handlePerTeamMode = (): void => {
    setSetupMode('per-team');
    setSetupForBothTeams(false);
  };

  const handleBothMode = (): void => {
    setSetupMode('both');
    setSetupForBothTeams(true);
    setTeam2Alloc(() => ({ ...team1Alloc }));
  };

  const handleRandomEachMode = (): void => {
    setSetupMode('random-each');
    setSetupForBothTeams(false);
    randomizeEachTeamsAllocation();
  };

  const handleRandomMode = (): void => {
    setSetupMode('random');
    setSetupForBothTeams(true);
    randomizeBothTeamsAllocation();
  };

  return (
    <div style={{ textAlign: 'center', padding: '0 20px', height: '100%' }}>
      <GameSetupScreen
        gameState={gameState}
        setupMode={setupMode}
        setupForBothTeams={setupForBothTeams}
        team1Data={team1Data}
        team2Data={team2Data}
        team1Alloc={team1Alloc}
        team2Alloc={team2Alloc}
        language={language}
        sheetId={sheetId}
        sheetRange={sheetRange}
        t={t}
        onSetLanguage={setLanguage}
        onSetSheetId={setSheetId}
        onSetSheetRange={setSheetRange}
        onStartGame={startGame}
        isStartGameDisabled={isStartGameDisabled()}
        onPerTeamMode={handlePerTeamMode}
        onBothMode={handleBothMode}
        onRandomEachMode={handleRandomEachMode}
        onRandomMode={handleRandomMode}
        onSetBothTeamsAlloc={setSharedAllocation}
        onSetTeam1Alloc={setTeam1Allocation}
        onSetTeam2Alloc={setTeam2Allocation}
        onOpenPowerupGuide={() => setIsPowerupGuideOpen(true)}
      />
      <PowerupGuideModal
        isOpen={isPowerupGuideOpen}
        onClose={() => setIsPowerupGuideOpen(false)}
      />

      {gameState == 'gamePlaying' && (
        <GameArenaScreen
          duelResult={duelResult}
          isFirstTurn={isFirstTurn}
          duelData={duelData}
          team1Data={team1Data}
          team2Data={team2Data}
          queuedTeamsCount={queuedTeams.length}
          theme={theme}
          onSelect={playerSelect}
          isPlayerCardDrawerDisabled={isPlayerCardDrawerDisabled}
          renderTheCards={renderTheCards}
          nextRound={nextRound}
          onChanceClick={handleChanceClick}
        />
      )}

      {gameState == 'gameOver' && <GameOverScreen teamWinner={teamWinner} />}

      <WinnerAnnouncement
        show={showWinnerAnnouncement}
        duelResult={duelResult}
        team1Name={team1Data.name}
        team2Name={team2Data.name}
      />
      {/* Confirmation Popup */}
      <ConfirmPopup
        isVisible={confirmPopup.isVisible}
        chanceItemName={confirmPopup.chanceItemName}
        onConfirm={handleConfirmChance}
        onCancel={handleCancelChance}
      />
    </div>
  );
};

export default CardGame;
