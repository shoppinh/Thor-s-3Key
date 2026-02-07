import { useOutletContext } from '@remix-run/react';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '~/contexts/LanguageContext';
import { useTheme } from '~/contexts/ThemeContext';
import GameArenaScreen from '~/features/game/components/GameArenaScreen';
import GameOverScreen from '~/features/game/components/GameOverScreen';
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
  GameState,
  PowerUpsAllocation,
  SetupMode,
  Side,
  TeamName
} from '~/features/game/types/gameTypes';
import ConfirmPopupData from '~/models/ConfirmPopupData';
import DuelData from '~/models/DuelData';
import { PlayerData } from '~/models/PlayerData';
import { TeamData } from '~/models/TeamData';
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

type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
};

const CardGame = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const clientSecrets = useOutletContext<RootContext>();
  const [team1Data, setTeam1Data] = useState<TeamData>(
    createInitialTeamData(1, t('common.team'))
  );
  const [team2Data, setTeam2Data] = useState<TeamData>(
    createInitialTeamData(2, t('common.team'))
  );
  const [duelData, setDuelData] = useState<DuelData>(createInitialDuelData());

  const [teamWinner, setTeamWinner] = useState('');
  const [duelResult, setDuelResult] = useState(''); // Individual duel winner (e.g. "Player A Wins!")
  const [isFirstTurn, setIsFirstTurn] = useState(true); // first turn of the entire game
  const [confirmPopup, setConfirmPopup] = useState<ConfirmPopupData>({
    isVisible: false,
    teamName: null,
    chanceType: null,
    chanceItemName: ''
  });
  const [gameState, setGameState] = useState<GameState>('setup'); // setup -> gameLoading -> gamePlaying -> gameOver
  const [roundNumber, setRoundNumber] = useState(0);
  const [winStreaks, setWinStreaks] = useState<Record<string, number>>({});
  const [showWinnerAnnouncement, setShowWinnerAnnouncement] = useState(false);

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
    createAllocationFromTeam(createInitialTeamData(1, t('common.team')))
  );
  const [team2Alloc, setTeam2Alloc] = useState<PowerUpsAllocation>(
    createAllocationFromTeam(createInitialTeamData(2, t('common.team')))
  );

  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = clientSecrets?.API_KEY ?? '';

  const [sheetId, setSheetId] = useState(SHEET_ID);
  const [sheetRange, setSheetRange] = useState(SHEET_RANGE);
  const [setupForBothTeams, setSetupForBothTeams] = useState(false);
  const [isPowerupGuideOpen, setIsPowerupGuideOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>('per-team');

  /**
   * Starts the game with the provided team data
   * @param team1Data - Array of team 1 player names
   * @param team2Data - Array of team 2 player names
   */
  const startGameWithTeams = (team1Data: string[], team2Data: string[]) => {
    if (team1Data.length === 0 || team2Data.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }

    setWinStreaks({});
    setGameState('gamePlaying');
    // setTotalRound(Math.max(team1Data.length, team2Data.length));
    // Start the first round
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
    }

    try {
      const { team1: shuffledTeam1, team2: shuffledTeam2 } =
        await loadPlayersFromSheet({
          apiKey: API_KEY,
          sheetId,
          sheetRange,
          anonymousLabel: t('game.anonymous')
        });

      // Respect setup mode at start: in both/random modes, apply shared allocation
      if (setupMode === 'both' || setupMode === 'random') {
        setTeam1Data((prev) => ({
          ...prev,
          players: shuffledTeam1,
          powerUps: { ...team1Alloc }
        }));
        setTeam2Data((prev) => ({
          ...prev,
          players: shuffledTeam2,
          powerUps: { ...team1Alloc }
        }));
      } else {
        setTeam1Data((prev) => ({
          ...prev,
          players: shuffledTeam1,
          powerUps: { ...team1Alloc }
        }));
        setTeam2Data((prev) => ({
          ...prev,
          players: shuffledTeam2,
          powerUps: { ...team2Alloc }
        }));
      }

      startGameWithTeams(shuffledTeam1, shuffledTeam2);
    } catch (error) {
      console.error('Error fetching data:', error);
      setGameState('setup');
    }
  };

  // Function to select the next players for each team
  const nextRound = useCallback(
    (inputTeam1: string[], inputTeam2: string[]) => {
      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        setTeamWinner(
          inputTeam1.length === 0
            ? `${t('common.team')} 2 ${t('game.isWinner')}`
            : `${t('common.team')} 1 ${t('game.isWinner')}`
        );
        setGameState('gameOver');
        return;
      }

      setIsFirstTurn(roundNumber == 0);

      const deck = shuffleDeck([...DECKS]);

      setDuelData((prev) => ({
        ...prev,
        duelIndex: 0,
        currentPlayerName:
          roundNumber === 0
            ? Math.random() >= 0.5
              ? inputTeam1[0]
              : inputTeam2[0]
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
      setRoundNumber((prev) => prev + 1);
    },
    [roundNumber, t]
  );

  const playerSelect = (side: Side) => {
    const currentPlayer = duelData.currentPlayerName; // Capture current player before any updates
    const newDuelIndex = duelData.duelIndex + 1;
    setIsFirstTurn(false);
    const opponent = getDuelOpponent();
    const teamName = team1Data.players.includes(currentPlayer)
      ? 'team1'
      : 'team2';
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
        const secondTeamData =
          secondPlayerTeam === 'team1' ? team1Data : team2Data;
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
        ).includes(secondPlayerTeam as 'team1' | 'team2');
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
    return team1Data.players.includes(duelData.currentPlayerName)
      ? team2Data.players[0]
      : team1Data.players[0];
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
  const handleChanceClick = (
    teamName: TeamName,
    chanceType: 'secondChance' | 'revealTwo' | 'lifeShield' | 'removeWorst'
  ) => {
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
          if (currentDuelData.winningTeam === 'team1') {
            setTeam1Data((prev) => ({ ...prev, score: prev.score - 1 }));
          } else {
            setTeam2Data((prev) => ({ ...prev, score: prev.score - 1 }));
          }
        }

        // Reset only the second player's selection to reveal cards (player name is "?", team name is "")
        const secondPlayerSide = currentDuelData.player2SideSelected;
        const secondPlayerName = currentDuelData.player2Name;

        // Revert player elimination - add the losing player back to their team
        const firstPlayerName = currentDuelData.player1Name;
        const firstPlayerTeam = currentDuelData.player1Team;

        // Determine who the losing player was based on the winning team
        let losingPlayer = '';
        let losingTeam: TeamName | undefined;

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
          if (losingTeam === 'team1') {
            setTeam1Data((prev) => {
              if (!prev.players.includes(losingPlayer)) {
                return { ...prev, players: [losingPlayer, ...prev.players] };
              }
              return prev;
            });
          } else {
            setTeam2Data((prev) => {
              if (!prev.players.includes(losingPlayer)) {
                return { ...prev, players: [losingPlayer, ...prev.players] };
              }
              return prev;
            });
          }
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
          if (teamName === 'team1') {
            setTeam1Data((prev) => ({
              ...prev,
              powerUps: {
                ...prev.powerUps,
                secondChance: prev.powerUps.secondChance - 1
              },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          } else {
            setTeam2Data((prev) => ({
              ...prev,
              powerUps: {
                ...prev.powerUps,
                secondChance: prev.powerUps.secondChance - 1
              },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          }

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
          if (teamName === 'team1') {
            setTeam1Data((prev) => ({
              ...prev,
              powerUps: {
                ...prev.powerUps,
                revealTwo: prev.powerUps.revealTwo - 1
              },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          } else {
            setTeam2Data((prev) => ({
              ...prev,
              powerUps: {
                ...prev.powerUps,
                revealTwo: prev.powerUps.revealTwo - 1
              },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          }

          setDuelData((prev) => ({ ...prev, revealTwoUsedBy: teamName }));
          implementRevealTwo();
          break;
        }

        case 'lifeShield': {
          if (teamName === 'team1') {
            setTeam1Data((prev) => ({
              ...prev,
              powerUps: {
                ...prev.powerUps,
                lifeShield: prev.powerUps.lifeShield - 1
              },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          } else {
            setTeam2Data((prev) => ({
              ...prev,
              powerUps: {
                ...prev.powerUps,
                lifeShield: prev.powerUps.lifeShield - 1
              },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          }

          setDuelData((prev) => ({ ...prev, lifeShieldUsedBy: teamName }));
          break;
        }

        case 'removeWorst': {
          const worstKey = pickWorstGroup(duelData);
          if (worstKey) {
            if (teamName === 'team1') {
              setTeam1Data((prev) => ({
                ...prev,
                powerUps: {
                  ...prev.powerUps,
                  removeWorst: prev.powerUps.removeWorst - 1
                },
                totalPowerUps: prev.totalPowerUps - 1
              }));
            } else {
              setTeam2Data((prev) => ({
                ...prev,
                powerUps: {
                  ...prev.powerUps,
                  removeWorst: prev.powerUps.removeWorst - 1
                },
                totalPowerUps: prev.totalPowerUps - 1
              }));
            }

            setDuelData((prev) =>
              withRemoveWorstUsage(prev, teamName, worstKey)
            );
          }
          break;
        }

        default:
          break;
      }
    }

    // Hide popup
    setConfirmPopup({
      isVisible: false,
      teamName: null,
      chanceType: null,
      chanceItemName: ''
    });
  };

  /**
   * Handles confirmation popup cancel action
   */
  const handleCancelChance = () => {
    setConfirmPopup({
      isVisible: false,
      teamName: null,
      chanceType: null,
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
      p1Team?: TeamName,
      p2Team?: TeamName
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

      setTeam1Data((prev) => ({ ...prev, scoreClass: '' }));
      setTeam2Data((prev) => ({ ...prev, scoreClass: '' }));

      // Only update scores if the losing team doesn't have an active shield
      if (!shouldPreventElimination) {
        // Update scores and determine losing team
        if (isPlayer1Winner) {
          if (firstPlayerTeam === 'team1') {
            setTeam1Data((prev) => ({ ...prev, score: prev.score + 1 }));
            setTimeout(() => {
              setTeam1Data((prev) => ({ ...prev, scoreClass: 'blink-score' }));
            }, 10);
          } else {
            setTeam2Data((prev) => ({ ...prev, score: prev.score + 1 }));
            setTimeout(() => {
              setTeam2Data((prev) => ({ ...prev, scoreClass: 'blink-score' }));
            }, 10);
          }
        } else {
          if (secondPlayerTeam === 'team1') {
            setTeam1Data((prev) => ({ ...prev, score: prev.score + 1 }));
            setTimeout(() => {
              setTeam1Data((prev) => ({ ...prev, scoreClass: 'blink-score' }));
            }, 10);
          } else {
            setTeam2Data((prev) => ({ ...prev, score: prev.score + 1 }));
            setTimeout(() => {
              setTeam2Data((prev) => ({ ...prev, scoreClass: 'blink-score' }));
            }, 10);
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
      const currentTeam1Players = team1Data.players;
      const currentTeam2Players = team2Data.players;

      // Eliminate the specific losing player from their team (unless shield prevents it)
      const updatedTeam1Players =
        !shouldPreventElimination && losingTeam === 'team1'
          ? currentTeam1Players.filter((player) => player !== losingPlayer)
          : currentTeam1Players;
      const updatedTeam2Players =
        !shouldPreventElimination && losingTeam === 'team2'
          ? currentTeam2Players.filter((player) => player !== losingPlayer)
          : currentTeam2Players;

      setTeam1Data((prev) => ({ ...prev, players: updatedTeam1Players }));
      setTeam2Data((prev) => ({ ...prev, players: updatedTeam2Players }));

      // Determine next player after elimination
      let nextPlayer: string;
      const losingTeamPlayers =
        losingTeam === 'team1' ? updatedTeam1Players : updatedTeam2Players;

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

  /**
   * Renders a label with a small preview icon positioned to the left of the text.
   * Used in the combined 'setup' screen for power-up labels.
   *
   * @param labelText - The text content of the label
   * @param imageFileName - The image file name in `/public/images`, e.g. `chance_second.png`
   * @param htmlFor - The input id this label is associated with
   */
  const renderLabelWithIcon = (
    labelText: string,
    imageFileName: string,
    htmlFor: string
  ) => {
    return (
      <label
        htmlFor={htmlFor}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <img
          src={`/images/${imageFileName}`}
          alt=""
          width={22}
          height={22}
          style={{ display: 'inline-block' }}
        />
        <span>{labelText}</span>
      </label>
    );
  };

  /**
   * Renders the combined Welcome (right) and Setup (left) UI in a two-column layout
   * with a gray vertical divider in the middle. Visible during 'setup' and 'gameLoading'.
   */
  function renderGameInput() {
    return (
      <>
        {(gameState === 'setup' || gameState === 'gameLoading') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                maxWidth: 1150,
                alignItems: 'stretch',
                gap: 50,
                padding: 20
              }}
            >
              {/* Left: Setup UI */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    maxWidth: 920,
                    margin: '0 0 0 auto'
                  }}
                >
                  <h2
                    className="text-glow"
                    style={{
                      textAlign: 'center',
                      marginTop: 0,
                      marginBottom: '20px',
                      fontSize: '2.5rem',
                      color: 'var(--color-primary)',
                      letterSpacing: '3px'
                    }}
                  >
                    {t('game.powerUpsSetup')}
                  </h2>
                  <div
                    className="rpg-panel"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 12,
                      marginTop: 6,
                      marginBottom: 15,
                      padding: '20px',
                      background: 'rgba(15, 12, 41, 0.8)',
                      border: '2px solid var(--color-secondary)'
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-per-team"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'per-team'}
                        onChange={() => {
                          setSetupMode('per-team');
                          setSetupForBothTeams(false);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-per-team"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'per-team'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.eachTeamSetup')}
                      </label>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-both"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'both'}
                        onChange={() => {
                          setSetupMode('both');
                          setSetupForBothTeams(true);
                          // Keep both allocations in sync when switching into combined mode
                          setTeam2Alloc(() => ({ ...team1Alloc }));
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-both"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'both'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.setupBothTeams')}
                      </label>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-random-each"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'random-each'}
                        onChange={() => {
                          setSetupMode('random-each');
                          setSetupForBothTeams(false);
                          randomizeEachTeamsAllocation();
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-random-each"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'random-each'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.generateSeparate')}
                      </label>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-random"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'random'}
                        onChange={() => {
                          setSetupMode('random');
                          setSetupForBothTeams(true);
                          randomizeBothTeamsAllocation();
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-random"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'random'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.randomBoth')}
                      </label>
                    </div>
                  </div>
                  <div
                    className="setup-grid"
                    style={
                      setupForBothTeams
                        ? { gridTemplateColumns: '1fr', justifyItems: 'center' }
                        : undefined
                    }
                  >
                    {setupForBothTeams ? (
                      <div className="setup-card">
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.secondChance'),
                            'chance_second.png',
                            'both-second'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.secondChance > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-second"
                              value={team1Alloc.secondChance}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setBothTeamsAlloc('secondChance', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.revealTwo'),
                            'chance_reveal.png',
                            'both-reveal'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.revealTwo > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-reveal"
                              value={team1Alloc.revealTwo}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setBothTeamsAlloc('revealTwo', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.lifeShield'),
                            'chance_shield.png',
                            'both-shield'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.lifeShield > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-shield"
                              value={team1Alloc.lifeShield}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setBothTeamsAlloc('lifeShield', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.removeWorst'),
                            'chance_remove.png',
                            'both-remove'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.removeWorst > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-remove"
                              value={team1Alloc.removeWorst}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setBothTeamsAlloc('removeWorst', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          <strong>{t('game.total')}</strong>
                          <strong
                            style={{
                              color:
                                team1Alloc.secondChance +
                                  team1Alloc.revealTwo +
                                  team1Alloc.lifeShield +
                                  team1Alloc.removeWorst !==
                                team1Data.totalPowerUps
                                  ? 'red'
                                  : undefined
                            }}
                          >
                            {team1Alloc.secondChance +
                              team1Alloc.revealTwo +
                              team1Alloc.lifeShield +
                              team1Alloc.removeWorst}{' '}
                            / {team1Data.totalPowerUps}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="setup-card">
                          <h3
                            className={'teamName team1'}
                            style={{ marginTop: 0 }}
                          >
                            {team1Data.name}
                          </h3>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.secondChance'),
                              'chance_second.png',
                              't1-second'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.secondChance > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-second"
                                value={team1Alloc.secondChance}
                                onChange={(e) =>
                                  setTeam1Alloc({
                                    ...team1Alloc,
                                    secondChance: Math.max(
                                      0,
                                      Math.min(
                                        team1Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.revealTwo'),
                              'chance_reveal.png',
                              't1-reveal'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.revealTwo > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-reveal"
                                value={team1Alloc.revealTwo}
                                onChange={(e) =>
                                  setTeam1Alloc({
                                    ...team1Alloc,
                                    revealTwo: Math.max(
                                      0,
                                      Math.min(
                                        team1Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.lifeShield'),
                              'chance_shield.png',
                              't1-shield'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.lifeShield > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-shield"
                                value={team1Alloc.lifeShield}
                                onChange={(e) =>
                                  setTeam1Alloc({
                                    ...team1Alloc,
                                    lifeShield: Math.max(
                                      0,
                                      Math.min(
                                        team1Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.removeWorst'),
                              'chance_remove.png',
                              't1-remove'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.removeWorst > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-remove"
                                value={team1Alloc.removeWorst}
                                onChange={(e) =>
                                  setTeam1Alloc({
                                    ...team1Alloc,
                                    removeWorst: Math.max(
                                      0,
                                      Math.min(
                                        team1Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            <strong>Total</strong>
                            <strong
                              style={{
                                color:
                                  team1Alloc.secondChance +
                                    team1Alloc.revealTwo +
                                    team1Alloc.lifeShield +
                                    team1Alloc.removeWorst !==
                                  team1Data.totalPowerUps
                                    ? 'red'
                                    : undefined
                              }}
                            >
                              {team1Alloc.secondChance +
                                team1Alloc.revealTwo +
                                team1Alloc.lifeShield +
                                team1Alloc.removeWorst}{' '}
                              / {team1Data.totalPowerUps}
                            </strong>
                          </div>
                        </div>

                        <div className="setup-card">
                          <h3
                            className={'teamName team2'}
                            style={{ marginTop: 0 }}
                          >
                            {team2Data.name}
                          </h3>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.secondChance'),
                              'chance_second.png',
                              't2-second'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.secondChance > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-second"
                                value={team2Alloc.secondChance}
                                onChange={(e) =>
                                  setTeam2Alloc({
                                    ...team2Alloc,
                                    secondChance: Math.max(
                                      0,
                                      Math.min(
                                        team2Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.revealTwo'),
                              'chance_reveal.png',
                              't2-reveal'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.revealTwo > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-reveal"
                                value={team2Alloc.revealTwo}
                                onChange={(e) =>
                                  setTeam2Alloc({
                                    ...team2Alloc,
                                    revealTwo: Math.max(
                                      0,
                                      Math.min(
                                        team2Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.lifeShield'),
                              'chance_shield.png',
                              't2-shield'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.lifeShield > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-shield"
                                value={team2Alloc.lifeShield}
                                onChange={(e) =>
                                  setTeam2Alloc({
                                    ...team2Alloc,
                                    lifeShield: Math.max(
                                      0,
                                      Math.min(
                                        team2Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.removeWorst'),
                              'chance_remove.png',
                              't2-remove'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.removeWorst > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-remove"
                                value={team2Alloc.removeWorst}
                                onChange={(e) =>
                                  setTeam2Alloc({
                                    ...team2Alloc,
                                    removeWorst: Math.max(
                                      0,
                                      Math.min(
                                        team2Data.totalPowerUps,
                                        Number(e.target.value)
                                      )
                                    )
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            <strong>Total</strong>
                            <strong
                              style={{
                                color:
                                  team2Alloc.secondChance +
                                    team2Alloc.revealTwo +
                                    team2Alloc.lifeShield +
                                    team2Alloc.removeWorst !==
                                  team2Data.totalPowerUps
                                    ? 'red'
                                    : undefined
                              }}
                            >
                              {team2Alloc.secondChance +
                                team2Alloc.revealTwo +
                                team2Alloc.lifeShield +
                                team2Alloc.removeWorst}{' '}
                              / {team2Data.totalPowerUps}
                            </strong>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <p
                    className="note"
                    style={{
                      textAlign: 'center',
                      marginTop: 10,
                      marginBottom: 10,
                      color: 'var(--color-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.95rem'
                    }}
                  >
                    {t('game.note')}
                  </p>
                  <div style={{ textAlign: 'center' }}>
                    <a
                      href="#powerups-guide"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsPowerupGuideOpen(true);
                      }}
                      style={{
                        color: 'var(--color-accent)',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-body)',
                        fontSize: '1.1rem',
                        textShadow: '0 0 5px var(--color-accent)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textShadow =
                          '0 0 15px var(--color-accent)';
                        e.currentTarget.style.letterSpacing = '1px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textShadow =
                          '0 0 5px var(--color-accent)';
                        e.currentTarget.style.letterSpacing = '0px';
                      }}
                    >
                      {t('game.powerUpsGuide')}
                    </a>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: 2,
                  background:
                    'linear-gradient(180deg, transparent, var(--color-secondary), transparent)'
                }}
              />

              {/* Right: Welcome UI */}
              <div
                style={{
                  display: 'flex',
                  alignItems: '',
                  justifyContent: 'flex-start',
                  padding: '0 20px'
                }}
              >
                <div style={{ width: '100%', maxWidth: '400px' }}>
                  <h1
                    className="text-gradient"
                    style={{
                      fontSize: '3rem',
                      margin: '0 0 10px 0',
                      textAlign: 'center',
                      letterSpacing: '2px'
                    }}
                  >
                    THOR&apos;S 3KEY
                  </h1>

                  {/* Language Switcher */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '10px',
                      marginBottom: '20px'
                    }}
                  >
                    <button
                      onClick={() => setLanguage('en')}
                      style={{
                        background:
                          language === 'en'
                            ? 'var(--color-primary)'
                            : 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--color-primary)',
                        color: '#fff',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: language === 'en' ? 'bold' : 'normal'
                      }}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLanguage('vi')}
                      style={{
                        background:
                          language === 'vi'
                            ? 'var(--color-primary)'
                            : 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--color-primary)',
                        color: '#fff',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: language === 'vi' ? 'bold' : 'normal'
                      }}
                    >
                      VI
                    </button>
                  </div>

                  <div
                    className="rpg-panel"
                    style={{
                      padding: '20px',
                      background: 'var(--color-panel-bg)',
                      border: '2px solid var(--color-secondary)',
                      marginBottom: '20px'
                    }}
                  >
                    <label
                      className="text-glow"
                      htmlFor="sheetId"
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: 'var(--color-secondary)',
                        fontSize: '1.1rem',
                        fontFamily: 'var(--font-body)',
                        letterSpacing: '1px'
                      }}
                    >
                      {t('game.sheetId')}
                    </label>
                    <input
                      className="rpg-input"
                      id="sheetId"
                      type="text"
                      value={sheetId}
                      onChange={(e) => setSheetId(e.target.value)}
                      disabled={gameState != 'setup'}
                      style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '2px solid var(--color-secondary)',
                        color: '#fff',
                        fontSize: '1rem',
                        fontFamily: 'var(--font-body)',
                        borderRadius: '4px',
                        boxShadow: '0 0 10px rgba(0, 242, 255, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>

                  <div
                    className="rpg-panel"
                    style={{
                      padding: '20px',
                      background: 'var(--color-panel-bg)',
                      border: '2px solid var(--color-secondary)',
                      marginBottom: '30px'
                    }}
                  >
                    <label
                      className="text-glow"
                      htmlFor="sheetRange"
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        color: 'var(--color-secondary)',
                        fontSize: '1.1rem',
                        fontFamily: 'var(--font-body)',
                        letterSpacing: '1px'
                      }}
                    >
                      {t('game.sheetRange')}
                    </label>
                    <input
                      className="rpg-input"
                      id="sheetRange"
                      type="text"
                      value={sheetRange}
                      onChange={(e) => setSheetRange(e.target.value)}
                      disabled={gameState != 'setup'}
                      style={{
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '2px solid var(--color-secondary)',
                        color: '#fff',
                        fontSize: '1rem',
                        fontFamily: 'var(--font-body)',
                        borderRadius: '4px',
                        boxShadow: '0 0 10px rgba(0, 242, 255, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => startGame()}
                      className="rpg-button"
                      disabled={isStartGameDisabled()}
                      style={{
                        width: '100%',
                        padding: '15px 30px',
                        fontSize: '1.5rem',
                        letterSpacing: '2px',
                        background: isStartGameDisabled()
                          ? '#333'
                          : 'var(--color-primary)',
                        cursor: isStartGameDisabled()
                          ? 'not-allowed'
                          : 'pointer',
                        opacity: isStartGameDisabled() ? 0.5 : 1
                      }}
                    >
                      {t('common.startGame')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 20px', height: '100%' }}>
      {renderGameInput()}
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
