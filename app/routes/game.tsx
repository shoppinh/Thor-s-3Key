import { useCallback, useState } from 'react';
import { useOutletContext } from '@remix-run/react';
import PlayerCardDrawer from '../components/PlayerCardDrawer';
import RoundStatus from '../components/RoundStatus';
import ChanceStar from '../components/ChanceStar';
import ConfirmPopup from '../components/ConfirmPopup';
import PowerupGuideModal from '../components/PowerupGuideModal';
import Card from '../models/Card';
import TeamData from '~/models/TeamData';
import DuelData from '~/models/DuelData';
import ConfirmPopupData from '~/models/ConfirmPopupData';
import PlayerData from '~/models/PlayerData';
import {
  CARDS_COVER,
  createDeck,
  shuffleDeck,
  shuffleArray,
  drawCards,
  getCardImage,
  calculateSum,
    determineWinner,
    preloadImages,
    getCardHighestSuitAndValue,
    suitRank
} from '~/utils/gameUtil';

const DECKS = createDeck();

type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
};

type PowerUpsAllocation = {
  secondChance: number;
  revealTwo: number;
  lifeShield: number;
  removeWorst: number;
};

const CardGame = () => {
  const clientSecrets = useOutletContext<RootContext>();
  const [team1Data, setTeam1Data] = useState<TeamData>({
    name: 'Team 1',
    score: 0,
    scoreClass: '',
    totalPowerUps: 4,
    powerUps: { secondChance: 1, revealTwo: 1, lifeShield: 1, removeWorst: 1 },
    players: []
  });
  const [team2Data, setTeam2Data] = useState<TeamData>({
    name: 'Team 2',
    score: 0,
    scoreClass: '',
    totalPowerUps: 4,
    powerUps: { secondChance: 1, revealTwo: 1, lifeShield: 1, removeWorst: 1 },
    players: []
  });
  const [duelData, setDuelData] = useState<DuelData>({
    duelIndex: 0,
    currentPlayerName: '',
    player1Name: '',
    player1Team: null,
    player2Name: '',
    player2Team: null,
    isFinishDuel: false,
    topLeftCards: [],
    bottomLeftCards: [],
    topRightCards: [],
    bottomRightCards: [],
    topLeftRevealed: false,
    bottomLeftRevealed: false,
    topRightRevealed: false,
    bottomRightRevealed: false,
    topLeftPlayerData: { cards: [], name: '', sum: 0, team: '' },
    topRightPlayerData: { cards: [], name: '', sum: 0, team: '' },
    bottomLeftPlayerData: { cards: [], name: '', sum: 0, team: '' },
    bottomRightPlayerData: { cards: [], name: '', sum: 0, team: '' },
    revealedCards: {
      topLeft: [],
      bottomLeft: [],
      topRight: [],
      bottomRight: []
    },
    revealTwoUsedBy: null,
    lifeShieldUsedBy: null,
    removedWorstGroups: [],
    player1SideSelected: '',
    player2SideSelected: '',
    winningTeam: null
  });
  const [teamWinner, setTeamWinner] = useState('');
  const [duelResult, setDuelResult] = useState(''); // Individual duel winner (e.g. "Player A Wins!")
  const [isFirstTurn, setIsFirstTurn] = useState(true); // first turn of the entire game
  const [confirmPopup, setConfirmPopup] = useState<ConfirmPopupData>({
    isVisible: false,
    teamName: null,
    chanceType: null,
    chanceItemName: ''
  });
  const [gameState, setGameState] = useState('setup'); // setup -> gameLoading -> gamePlaying -> gameOver
  const [roundNumber, setRoundNumber] = useState(0);

  // Local allocations for setup screen
  const [team1Alloc, setTeam1Alloc] = useState<PowerUpsAllocation>({
    secondChance: team1Data.powerUps.secondChance,
    revealTwo: team1Data.powerUps.revealTwo,
    lifeShield: team1Data.powerUps.lifeShield,
    removeWorst: team1Data.powerUps.removeWorst ?? 0
  });
  const [team2Alloc, setTeam2Alloc] = useState<PowerUpsAllocation>({
    secondChance: team2Data.powerUps.secondChance,
    revealTwo: team2Data.powerUps.revealTwo,
    lifeShield: team2Data.powerUps.lifeShield,
    removeWorst: team2Data.powerUps.removeWorst ?? 0
  });

  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = clientSecrets?.API_KEY ?? '';

  const [sheetId, setSheetId] = useState(SHEET_ID);
  const [sheetRange, setSheetRange] = useState(SHEET_RANGE);
  const [setupForBothTeams, setSetupForBothTeams] = useState(false);
  const [isPowerupGuideOpen, setIsPowerupGuideOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<'per-team' | 'both' | 'random' | 'random-each'>('per-team');

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
    // Preload all card images to avoid flicker during gameplay
    try {
      // Only preload A(1) through 9
      const allValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const suitNames: { [key: string]: string } = {
        '♦': 'diamonds',
        '♥': 'hearts',
        '♠': 'spades',
        '♣': 'clubs'
      };
      const extraImages = [
        '/images/back_card.jpg'
      ];
      const urls: string[] = [];
      allValues.forEach((v) => {
        Object.keys(suitNames).forEach((s) => {
          const suit = suitNames[s];
          const numToName = (num: number): string => (num === 1 ? 'ace' : num.toString());
          urls.push(`/images/${numToName(v)}_of_${suit}.png`);
        });
      });
      urls.push(...extraImages);
      await preloadImages(urls);
    } catch (error) {
      console.error('Error preloading images:', error);
    }

    // Load team player names from Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const team1Temp: string[] = [];
      const team2Temp: string[] = [];
      let index = 1;
      data.values.slice(1).forEach((item: string[]) => {
        if (item[0]) {
          team1Temp.push(item[0]);
        } else {
          team1Temp.push(`ANONYMOUS #${index}`);
          index++;
        }

        if (item[1]) {
          team2Temp.push(item[1]);
        } else {
          team2Temp.push(`ANONYMOUS #${index}`);
          index++;
        }
      });

      const shuffledTeam1 = shuffleArray(team1Temp);
      const shuffledTeam2 = shuffleArray(team2Temp);

      // Respect setup mode at start: in both/random modes, apply shared allocation
      if (setupMode === 'both' || setupMode === 'random') {
        setTeam1Data((prev) => ({ ...prev, players: shuffledTeam1, powerUps: { ...team1Alloc } }));
        setTeam2Data((prev) => ({ ...prev, players: shuffledTeam2, powerUps: { ...team1Alloc } }));
      } else {
        setTeam1Data((prev) => ({ ...prev, players: shuffledTeam1, powerUps: { ...team1Alloc } }));
        setTeam2Data((prev) => ({ ...prev, players: shuffledTeam2, powerUps: { ...team2Alloc } }));
      }

      startGameWithTeams(shuffledTeam1, shuffledTeam2);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Function to select the next players for each team
  const nextRound = useCallback(
    (inputTeam1: string[], inputTeam2: string[]) => {
      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        setTeamWinner(
          inputTeam1.length === 0 ? 'Team 2 Wins!' : 'Team 1 Wins!'
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
        player1Team: null,
        player2Name: '',
        player2Team: null,
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
        revealTwoUsedBy: null,
        lifeShieldUsedBy: null,
        removedWorstGroups: [],
        removeWorstUsedByTeams: [],
        secondChanceUsedByTeams: [],
        player1SideSelected: '',
        player2SideSelected: '',
        winningTeam: null
      }));
      setDuelResult(''); // Clear previous duel result
      setRoundNumber((prev) => prev + 1);
    },
    [roundNumber]
  );

  const playerSelect = (
    side: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  ) => {
    let pCards: Card[];
    let pSum: number;

    const currentPlayer = duelData.currentPlayerName; // Capture current player before any updates
    const newDuelIndex = duelData.duelIndex + 1;
    setIsFirstTurn(false);
    const opponent = getDuelOpponent();
    const teamName = team1Data.players.includes(currentPlayer)
      ? 'team1'
      : 'team2';

    if (side === 'top-left') {
      pCards = duelData.topLeftCards;
      pSum = calculateSum(pCards);
    } else if (side === 'bottom-left') {
      pCards = duelData.bottomLeftCards;
      pSum = calculateSum(pCards);
    } else if (side === 'top-right') {
      pCards = duelData.topRightCards;
      pSum = calculateSum(pCards);
    } else {
      // bottom-right
      pCards = duelData.bottomRightCards;
      pSum = calculateSum(pCards);
    }

    if (duelData.duelIndex == 0) {
      // first draw in a duel
      const updates: Partial<DuelData> = {
        duelIndex: newDuelIndex,
        currentPlayerName: opponent,
        player1Name: currentPlayer,
        player1Team: teamName as 'team1' | 'team2',
        player1SideSelected: side
      };

      // Track which team has made their selection (using side selection instead)

      if (side === 'top-left') {
        updates.topLeftPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.topLeftRevealed = true;
      } else if (side === 'bottom-left') {
        updates.bottomLeftPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.bottomLeftRevealed = true;
      } else if (side === 'top-right') {
        updates.topRightPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.topRightRevealed = true;
      } else {
        updates.bottomRightPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.bottomRightRevealed = true;
      }

      setDuelData((prev) => ({ ...prev, ...updates }));
    } else {
      // second draw in a duel
      // Don't automatically finish the duel and reveal all cards
      // Let teams have a chance to use their Second Chance items

      const updates: Partial<DuelData> = {
        duelIndex: newDuelIndex,
        player2SideSelected: side,
        player2Name: currentPlayer,
        player2Team: teamName as 'team1' | 'team2'
        // Don't set currentPlayerName here - let calculateResult handle it
        // Don't set isFinishDuel to true yet
      };

      // Track which team has made their selection (using side selection instead)

      if (side === 'top-left') {
        updates.topLeftPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.topLeftRevealed = true;
      } else if (side === 'bottom-left') {
        updates.bottomLeftPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.bottomLeftRevealed = true;
      } else if (side === 'top-right') {
        updates.topRightPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.topRightRevealed = true;
      } else {
        updates.bottomRightPlayerData = {
          name: currentPlayer,
          team: teamName,
          sum: pSum,
          cards: pCards
        };
        updates.bottomRightRevealed = true;
      }

      setDuelData((prev) => {
        const newData = { ...prev, ...updates };

        // Always calculate the result after second player makes their selection
        // Get the first player's data from their selected position
        let firstPlayerData: { name: string; sum: number; cards: Card[] } = {
          name: '',
          sum: 0,
          cards: []
        };
        if (newData.player1SideSelected === 'top-left') {
          firstPlayerData = newData.topLeftPlayerData;
        } else if (newData.player1SideSelected === 'bottom-left') {
          firstPlayerData = newData.bottomLeftPlayerData;
        } else if (newData.player1SideSelected === 'top-right') {
          firstPlayerData = newData.topRightPlayerData;
        } else if (newData.player1SideSelected === 'bottom-right') {
          firstPlayerData = newData.bottomRightPlayerData;
        }

        // Get the second player's data from their selected position
        let secondPlayerData: { name: string; sum: number; cards: Card[] } = {
          name: '',
          sum: 0,
          cards: []
        };
        if (newData.player2SideSelected === 'top-left') {
          secondPlayerData = newData.topLeftPlayerData;
        } else if (newData.player2SideSelected === 'bottom-left') {
          secondPlayerData = newData.bottomLeftPlayerData;
        } else if (newData.player2SideSelected === 'top-right') {
          secondPlayerData = newData.topRightPlayerData;
        } else if (newData.player2SideSelected === 'bottom-right') {
          secondPlayerData = newData.bottomRightPlayerData;
        }

        // Determine who wins to check if second team needs Second Chance
        const { isPlayer1Winner } = determineWinner(
          firstPlayerData.sum,
          secondPlayerData.sum,
          firstPlayerData.cards,
          secondPlayerData.cards,
          firstPlayerData.name,
          secondPlayerData.name
        );

        // Determine which team just made the second selection
        const secondPlayerTeam = newData.player2Team;
        const secondTeamData =
          secondPlayerTeam === 'team1' ? team1Data : team2Data;

        // Check if the second team has Second Chance available
        // Second Chance is NOT available if:
        // 1. They already used it, OR
        // 2. They are the winning team (they don't need Second Chance)
        const secondTeamAlreadyUsedSecondChance =
          secondTeamData.powerUps.secondChance <= 0;
        const secondTeamIsWinning =
          (secondPlayerTeam === newData.player1Team && isPlayer1Winner) ||
          (secondPlayerTeam === newData.player2Team && !isPlayer1Winner);

        const secondTeamHasSecondChance =
          !secondTeamAlreadyUsedSecondChance &&
          !secondTeamIsWinning;

        // Additional constraints: must have at least one selectable group remaining (not removed, not revealed, not already drawn)
        const disabledGroups = new Set(newData.removedWorstGroups || []);
        const availableCount = [
          !disabledGroups.has('top-left') && !newData.topLeftRevealed && newData.topLeftPlayerData.cards.length === 0,
          !disabledGroups.has('bottom-left') && !newData.bottomLeftRevealed && newData.bottomLeftPlayerData.cards.length === 0,
          !disabledGroups.has('top-right') && !newData.topRightRevealed && newData.topRightPlayerData.cards.length === 0,
          !disabledGroups.has('bottom-right') && !newData.bottomRightRevealed && newData.bottomRightPlayerData.cards.length === 0
        ].filter(Boolean).length;
        const secondChanceUsedThisDuel = (newData.secondChanceUsedByTeams || []).includes(
          (secondPlayerTeam as 'team1' | 'team2')
        );
        const canSecondTeamUseSecondChance =
          secondTeamHasSecondChance && availableCount > 0 && !secondChanceUsedThisDuel;

        // Reveal all cards if the second team doesn't have Second Chance available OR usable
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

        // Calculate the result
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

        // Mark duel as finished
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
    teamName: 'team1' | 'team2',
    chanceType: 'secondChance' | 'revealTwo' | 'lifeShield' | 'removeWorst'
  ) => {
    const chanceItemName =
      chanceType === 'secondChance'
        ? 'Second Chance'
        : chanceType === 'revealTwo'
          ? 'Reveal Two'
          : chanceType === 'lifeShield'
            ? 'Life Shield'
            : 'Remove Worst';

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
          player1Team: null,
          player2Name: '',
          player2Team: null,
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
          player1SideSelected: '',
          player2SideSelected: '',
          // Reset winning team
          winningTeam: null
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
        let losingTeam: 'team1' | 'team2' | null = null;

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
                return { ...prev, players: [losingPlayer,...prev.players ] };
              }
              return prev;
            });
          } else {
            setTeam2Data((prev) => {
              if (!prev.players.includes(losingPlayer)) {
                return { ...prev, players: [losingPlayer,...prev.players ] };
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
          player2Team: null,
          // Update only the second player's position
          ...updatedPlayerData,
          // Reset only the second player's side selection
          player2SideSelected: '',
          // Reset winning team
          winningTeam: null,
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

      // Create mixed card arrays: first 2 cards face-up, last card face-down
      const createMixedCards = (cards: Card[]) => {
        return [
          cards[0], // First card face-up
          cards[1], // Second card face-up
          { value: 0, suit: '' } // Third card face-down (back card)
        ];
      };

      // Set revealed cards in duelData instead of modifying player data
      return {
        ...newData,
        revealedCards: {
          topLeft: createMixedCards(newData.topLeftCards),
          bottomLeft: createMixedCards(newData.bottomLeftCards),
          topRight: createMixedCards(newData.topRightCards),
          bottomRight: createMixedCards(newData.bottomRightCards)
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
      if (chanceType === 'secondChance') {
        // Handle Second Chance logic
        if (teamName === 'team1') {
          setTeam1Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, secondChance: prev.powerUps.secondChance - 1 },
            totalPowerUps: prev.totalPowerUps - 1
          }));
        } else {
          setTeam2Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, secondChance: prev.powerUps.secondChance - 1 },
            totalPowerUps: prev.totalPowerUps - 1
          }));
        }

        // Implement second chance functionality
        implementSecondChance();
        // Mark team has used Second Chance this duel (single-use per team per duel)
        setDuelData((prev) => ({
          ...prev,
          secondChanceUsedByTeams: [ ...(prev.secondChanceUsedByTeams || []), teamName ]
        }));
      } else if (chanceType === 'revealTwo') {
        // Handle Reveal Two logic
        if (teamName === 'team1') {
          setTeam1Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, revealTwo: prev.powerUps.revealTwo - 1 },
            totalPowerUps: prev.totalPowerUps - 1
          }));
        } else {
          setTeam2Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, revealTwo: prev.powerUps.revealTwo - 1 },
            totalPowerUps: prev.totalPowerUps - 1
          }));
        }

        // Mark that reveal two has been used in this duel
        setDuelData((prev) => ({ ...prev, revealTwoUsedBy: teamName }));

        // Implement reveal two functionality
        implementRevealTwo();
      } else if (chanceType === 'lifeShield') {
        // Prevent elimination this duel
        if (teamName === 'team1') {
          setTeam1Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, lifeShield: prev.powerUps.lifeShield - 1 },
            totalPowerUps: prev.totalPowerUps - 1
          }));
        } else {
          setTeam2Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, lifeShield: prev.powerUps.lifeShield - 1 },
            totalPowerUps: prev.totalPowerUps - 1
          }));
        }
        setDuelData((prev) => ({ ...prev, lifeShieldUsedBy: teamName }));
      } else if (chanceType === 'removeWorst') {
        // Remove Worst: disable the worst available card group
        const disabled = new Set(duelData.removedWorstGroups || []);
        const availableGroups: { key: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right'; cards: Card[] }[] = [];
        if (!duelData.topLeftRevealed && !disabled.has('top-left')) availableGroups.push({ key: 'top-left', cards: duelData.topLeftCards });
        if (!duelData.bottomLeftRevealed && !disabled.has('bottom-left')) availableGroups.push({ key: 'bottom-left', cards: duelData.bottomLeftCards });
        if (!duelData.topRightRevealed && !disabled.has('top-right')) availableGroups.push({ key: 'top-right', cards: duelData.topRightCards });
        if (!duelData.bottomRightRevealed && !disabled.has('bottom-right')) availableGroups.push({ key: 'bottom-right', cards: duelData.bottomRightCards });

        if (availableGroups.length > 1) {
          // Find worst by sum, then by highest-card suit/value ascending
          const pickWorst = (groups: typeof availableGroups) => {
            let worst = groups[0];
            const getHighest = getCardHighestSuitAndValue;
            for (let i = 1; i < groups.length; i++) {
              const a = worst;
              const b = groups[i];
              const sumA = calculateSum(a.cards);
              const sumB = calculateSum(b.cards);
              if (sumB < sumA) {
                worst = b;
              } else if (sumB === sumA) {
                const ha = getHighest(a.cards);
                const hb = getHighest(b.cards);
                if (suitRank[hb.suit] < suitRank[ha.suit]) {
                  worst = b;
                } else if (suitRank[hb.suit] === suitRank[ha.suit]) {
                  const haVal = ha.value === 1 ? 14 : ha.value;
                  const hbVal = hb.value === 1 ? 14 : hb.value;
                  if (hbVal < haVal) worst = b;
                }
              }
            }
            return worst.key;
          };

          const worstKey = pickWorst(availableGroups);
          // Spend power-up
          if (teamName === 'team1') {
            setTeam1Data((prev) => ({
              ...prev,
              powerUps: { ...prev.powerUps, removeWorst: prev.powerUps.removeWorst - 1 },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          } else {
            setTeam2Data((prev) => ({
              ...prev,
              powerUps: { ...prev.powerUps, removeWorst: prev.powerUps.removeWorst - 1 },
              totalPowerUps: prev.totalPowerUps - 1
            }));
          }
          // Store disabled group for this duel and mark team has used it (one use per team per duel)
          setDuelData((prev) => ({
            ...prev,
            removedWorstGroups: [ ...(prev.removedWorstGroups || []), worstKey ],
            removeWorstUsedByTeams: [ ...(prev.removeWorstUsedByTeams || []), teamName ]
          }));
        }
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
      p1Team?: 'team1' | 'team2' | null,
      p2Team?: 'team1' | 'team2' | null
    ) => {
      const { winner, isPlayer1Winner } = determineWinner(
        p1Sum,
        p2Sum,
        p1Cards,
        p2Cards,
        p1Name,
        p2Name
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
        const winningTeam = isPlayer1Winner ? firstPlayerTeam : secondPlayerTeam;
        setDuelData((prev) => ({ ...prev, winningTeam }));
      }

      // Set the duel result
      setDuelResult(winner);

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
      duelData.lifeShieldUsedBy
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
        src={getCardImage(card.value, card.suit)}
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
    if (gameState === 'gameLoading') {
      return true;
    }

    /**
     * Validates a team's allocation:
     * - Sum must equal the team's `totalPowerUps`
     * - No more than 2 of the same type for each power-up
     */
    const isAllocationValid = (
      alloc: PowerUpsAllocation,
      total: number
    ): boolean => {
      const sum =
        alloc.secondChance + alloc.revealTwo + alloc.lifeShield + alloc.removeWorst;
      const perTypeValid =
        alloc.secondChance <= 2 &&
        alloc.revealTwo <= 2 &&
        alloc.lifeShield <= 2 &&
        alloc.removeWorst <= 2;
      return sum === total && perTypeValid;
    };

    // Validation should depend on current setup mode
    if (setupMode === 'both' || setupMode === 'random') {
      // In combined/random mode we treat both teams as sharing the same allocation
      const isAllocValid = isAllocationValid(team1Alloc, team1Data.totalPowerUps);
      return !isAllocValid;
    }

    // Per-team mode: validate both independently
    const isTeam1AllocationValid = isAllocationValid(
      team1Alloc,
      team1Data.totalPowerUps
    );
    const isTeam2AllocationValid = isAllocationValid(
      team2Alloc,
      team2Data.totalPowerUps
    );

    return !(isTeam1AllocationValid && isTeam2AllocationValid);
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
   * Generates a valid random allocation for power-ups given a total and per-type cap.
   * The algorithm places one point at a time across available power-up types until the
   * total is reached while respecting the maximum per type.
   * @param total - Total power-ups to allocate
   * @param maxPerType - Maximum allowed per power-up type (default 2)
   * @returns A randomized `PowerUpsAllocation` satisfying the constraints
   */
  const generateRandomAllocation = (
    total: number,
    maxPerType: number = 2
  ): PowerUpsAllocation => {
    const result: PowerUpsAllocation = {
      secondChance: 0,
      revealTwo: 0,
      lifeShield: 0,
      removeWorst: 0
    };

    const keys: (keyof PowerUpsAllocation)[] = [
      'secondChance',
      'revealTwo',
      'lifeShield',
      'removeWorst'
    ];

    let placed = 0;
    while (placed < total) {
      const available = keys.filter((k) => result[k] < maxPerType);
      if (available.length === 0) break;
      const pick = available[Math.floor(Math.random() * available.length)];
      result[pick] += 1;
      placed += 1;
    }

    return result;
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
      <label htmlFor={htmlFor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  <h2 className="text-glow" style={{ 
                    textAlign: 'center', 
                    marginTop: 0, 
                    marginBottom: '20px',
                    fontSize: '2.5rem',
                    color: 'var(--color-primary)',
                    letterSpacing: '3px'
                  }}>
                    POWER-UPS SETUP
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      <label htmlFor="mode-per-team" style={{ 
                        fontFamily: 'var(--font-body)', 
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        color: setupMode === 'per-team' ? 'var(--color-primary)' : '#fff'
                      }}>Each team setups their own power-ups</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      <label htmlFor="mode-both" style={{ 
                        fontFamily: 'var(--font-body)', 
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        color: setupMode === 'both' ? 'var(--color-primary)' : '#fff'
                      }}>Setup power-ups for both teams</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      <label htmlFor="mode-random-each" style={{ 
                        fontFamily: 'var(--font-body)', 
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        color: setupMode === 'random-each' ? 'var(--color-primary)' : '#fff'
                      }}>Generate power-ups separately for each team</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      <label htmlFor="mode-random" style={{ 
                        fontFamily: 'var(--font-body)', 
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        color: setupMode === 'random' ? 'var(--color-primary)' : '#fff'
                      }}>Random power-ups for both teams</label>
                    </div>
                  </div>
                  <div
                    className="setup-grid"
                    style={setupForBothTeams ? { gridTemplateColumns: '1fr', justifyItems: 'center' } : undefined}
                  >
                    {setupForBothTeams ? (
                      <div className="setup-card">
                        <div className="setup-row">
                          {renderLabelWithIcon('Second Chance', 'chance_second.png', 'both-second')}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={team1Alloc.secondChance > 2 ? { borderColor: 'red' } : undefined}
                              type="number"
                              min={0}
                              max={2}
                              id="both-second"
                              value={team1Alloc.secondChance}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(team1Data.totalPowerUps, Number(e.target.value))
                                );
                                setBothTeamsAlloc('secondChance', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon('Reveal Two', 'chance_reveal.png', 'both-reveal')}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={team1Alloc.revealTwo > 2 ? { borderColor: 'red' } : undefined}
                              type="number"
                              min={0}
                              max={2}
                              id="both-reveal"
                              value={team1Alloc.revealTwo}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(team1Data.totalPowerUps, Number(e.target.value))
                                );
                                setBothTeamsAlloc('revealTwo', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon('Life Shield', 'chance_shield.png', 'both-shield')}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={team1Alloc.lifeShield > 2 ? { borderColor: 'red' } : undefined}
                              type="number"
                              min={0}
                              max={2}
                              id="both-shield"
                              value={team1Alloc.lifeShield}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(team1Data.totalPowerUps, Number(e.target.value))
                                );
                                setBothTeamsAlloc('lifeShield', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon('Remove Worst', 'chance_remove.png', 'both-remove')}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={team1Alloc.removeWorst > 2 ? { borderColor: 'red' } : undefined}
                              type="number"
                              min={0}
                              max={2}
                              id="both-remove"
                              value={team1Alloc.removeWorst}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(team1Data.totalPowerUps, Number(e.target.value))
                                );
                                setBothTeamsAlloc('removeWorst', v);
                              }}
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
                    ) : (
                      <>
                        <div className="setup-card">
                          <h3 className={'teamName team1'} style={{ marginTop: 0 }}>
                            {team1Data.name}
                          </h3>
                          <div className="setup-row">
                            {renderLabelWithIcon('Second Chance', 'chance_second.png', 't1-second')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team1Alloc.secondChance > 2 ? { borderColor: 'red' } : undefined}
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
                            {renderLabelWithIcon('Reveal Two', 'chance_reveal.png', 't1-reveal')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team1Alloc.revealTwo > 2 ? { borderColor: 'red' } : undefined}
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
                            {renderLabelWithIcon('Life Shield', 'chance_shield.png', 't1-shield')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team1Alloc.lifeShield > 2 ? { borderColor: 'red' } : undefined}
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
                            {renderLabelWithIcon('Remove Worst', 'chance_remove.png', 't1-remove')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team1Alloc.removeWorst > 2 ? { borderColor: 'red' } : undefined}
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
                          <h3 className={'teamName team2'} style={{ marginTop: 0 }}>
                            {team2Data.name}
                          </h3>
                          <div className="setup-row">
                            {renderLabelWithIcon('Second Chance', 'chance_second.png', 't2-second')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team2Alloc.secondChance > 2 ? { borderColor: 'red' } : undefined}
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
                            {renderLabelWithIcon('Reveal Two', 'chance_reveal.png', 't2-reveal')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team2Alloc.revealTwo > 2 ? { borderColor: 'red' } : undefined}
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
                            {renderLabelWithIcon('Life Shield', 'chance_shield.png', 't2-shield')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team2Alloc.lifeShield > 2 ? { borderColor: 'red' } : undefined}
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
                            {renderLabelWithIcon('Remove Worst', 'chance_remove.png', 't2-remove')}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={team2Alloc.removeWorst > 2 ? { borderColor: 'red' } : undefined}
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
                  <p className="note" style={{ 
                    textAlign: 'center', 
                    marginTop: 10, 
                    marginBottom: 10,
                    color: 'var(--color-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.95rem'
                  }}>
                    Each team must have a total of 4 power-ups, with no more than 2 of the same type.
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
                        e.currentTarget.style.textShadow = '0 0 15px var(--color-accent)';
                        e.currentTarget.style.letterSpacing = '1px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textShadow = '0 0 5px var(--color-accent)';
                        e.currentTarget.style.letterSpacing = '0px';
                      }}
                    >
                      ⚡ POWER-UPS GUIDE ⚡
                    </a>
                  </div>

                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 2, background: 'linear-gradient(180deg, transparent, var(--color-secondary), transparent)' }} />

              {/* Right: Welcome UI */}
              <div style={{ display: 'flex', alignItems: '', justifyContent: 'flex-start', padding: '0 20px' }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                  <h1 className="text-gradient" style={{ 
                    fontSize: '3rem',
                    margin: '0 0 30px 0',
                    textAlign: 'center',
                    letterSpacing: '2px'
                  }}>THOR'S 3KEY</h1>
                  
                  <div className="rpg-panel" style={{
                    padding: '20px',
                    background: 'rgba(15, 12, 41, 0.8)',
                    border: '2px solid var(--color-secondary)',
                    marginBottom: '20px'
                  }}>
                    <label className="text-glow" htmlFor="sheetId" style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: 'var(--color-secondary)',
                      fontSize: '1.1rem',
                      fontFamily: 'var(--font-body)',
                      letterSpacing: '1px'
                    }}>
                      SHEET ID
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
                  
                  <div className="rpg-panel" style={{
                    padding: '20px',
                    background: 'rgba(15, 12, 41, 0.8)',
                    border: '2px solid var(--color-secondary)',
                    marginBottom: '30px'
                  }}>
                    <label className="text-glow" htmlFor="sheetRange" style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: 'var(--color-secondary)',
                      fontSize: '1.1rem',
                      fontFamily: 'var(--font-body)',
                      letterSpacing: '1px'
                    }}>
                      SHEET RANGE
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
                        background: isStartGameDisabled() ? '#333' : 'var(--color-primary)',
                        cursor: isStartGameDisabled() ? 'not-allowed' : 'pointer',
                        opacity: isStartGameDisabled() ? 0.5 : 1
                      }}
                    >
                      START GAME
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
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '40px',
              padding: '20px'
            }}
          >
            {/* Team 1 Panel */}
            <div className="rpg-panel" style={{ width: '200px', padding: '20px', background: 'rgba(15, 12, 41, 0.9)', border: '2px solid var(--color-primary)' }}>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: 'bold', 
                textAlign: 'center',
                color: 'var(--color-accent)',
                marginBottom: '10px',
                textShadow: '0 0 10px var(--color-accent)'
              }}>
                {team1Data.score}
              </div>
              <h2 className="text-glow" style={{ 
                textAlign: 'center',
                color: 'var(--color-primary)',
                fontSize: '24px',
                margin: '10px 0',
                position: 'relative'
              }}>
                TEAM 1
                {team1Data.totalPowerUps > 0 && (
                  <ChanceStar
                    number={team1Data.totalPowerUps}
                    style={{
                      top: '50%',
                      left: 'calc(100% + 10px)',
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
              </h2>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '15px' }}>
                {team1Data.players.map((member, index) => (
                  <div key={index} style={{
                    padding: '8px',
                    marginBottom: '5px',
                    background: 'rgba(255, 0, 85, 0.1)',
                    border: '1px solid rgba(255, 0, 85, 0.3)',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: 'var(--font-body)'
                  }}>
                    {member}
                  </div>
                ))}
              </div>
            </div>

            {/* Battle Arena */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '100px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <PlayerCardDrawer
                    className={'mb-1'}
                    playerData={duelData.topLeftPlayerData}
                    onSelect={() => playerSelect('top-left')}
                    side="left"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.topLeftPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.topLeft.length > 0
                        ? duelData.revealedCards.topLeft
                        : CARDS_COVER
                    }
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerData={duelData.bottomLeftPlayerData}
                    onSelect={() => playerSelect('bottom-left')}
                    side="left"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.bottomLeftPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.bottomLeft.length > 0
                        ? duelData.revealedCards.bottomLeft
                        : CARDS_COVER
                    }
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <PlayerCardDrawer
                    className={'mb-1'}
                    playerData={duelData.topRightPlayerData}
                    onSelect={() => playerSelect('top-right')}
                    side="right"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.topRightPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.topRight.length > 0
                        ? duelData.revealedCards.topRight
                        : CARDS_COVER
                    }
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerData={duelData.bottomRightPlayerData}
                    onSelect={() => playerSelect('bottom-right')}
                    side="right"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.bottomRightPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.bottomRight.length > 0
                        ? duelData.revealedCards.bottomRight
                        : CARDS_COVER
                    }
                  />
                </div>
              </div>
            </div>

            {/* Team 2 Panel */}
            <div className="rpg-panel" style={{ width: '200px', padding: '20px', background: 'rgba(15, 12, 41, 0.9)', border: '2px solid var(--color-secondary)' }}>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: 'bold', 
                textAlign: 'center',
                color: 'var(--color-accent)',
                marginBottom: '10px',
                textShadow: '0 0 10px var(--color-accent)'
              }}>
                {team2Data.score}
              </div>
              <h2 className="text-glow" style={{ 
                textAlign: 'center',
                color: 'var(--color-secondary)',
                fontSize: '24px',
                margin: '10px 0',
                position: 'relative'
              }}>
                {team2Data.totalPowerUps > 0 && (
                  <ChanceStar
                    number={team2Data.totalPowerUps}
                    style={{
                      top: '50%',
                      right: 'calc(100% + 10px)',
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
                TEAM 2
              </h2>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '15px' }}>
                {team2Data.players.map((member, index) => (
                  <div key={index} style={{
                    padding: '8px',
                    marginBottom: '5px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: 'var(--font-body)'
                  }}>
                    {member}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add RoundStatus component at the bottom */}
      {gameState == 'gamePlaying' && (
        <RoundStatus
          duelResult={duelResult}
          isFirstTurn={isFirstTurn}
          currentPlayerName={duelData.currentPlayerName}
          duelIndex={duelData.duelIndex}
          team1={team1Data.players}
          team2={team2Data.players}
          team1Data={team1Data}
          team2Data={team2Data}
          isFinishDuel={duelData.isFinishDuel}
          duelData={duelData}
          nextRound={nextRound}
          onChanceClick={handleChanceClick}
        />
      )}

      {gameState == 'gameOver' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: '30px'
          }}
        >
          <div className="rpg-panel" style={{ 
            padding: '40px 60px',
            textAlign: 'center',
            background: 'rgba(15, 12, 41, 0.95)',
            border: '3px solid var(--color-accent)'
          }}>
            <h2 className="text-glow" style={{ 
              color: 'var(--color-primary)', 
              margin: '0 0 20px 0',
              fontSize: '32px',
              letterSpacing: '3px'
            }}>
              BATTLE COMPLETE
            </h2>
            <h1 className="text-gradient" style={{ 
              fontSize: '64px', 
              fontWeight: 'bold', 
              margin: '20px 0',
              textShadow: '0 0 20px var(--color-accent)'
            }}>
              {teamWinner}
            </h1>
            <div className="rpg-panel" style={{ 
              marginTop: '30px',
              padding: '20px',
              background: 'rgba(0,0,0,0.3)'
            }}>
              <img
                src="/images/the-end.webp"
                alt="Victory"
                style={{ 
                  width: '600px',
                  maxWidth: '100%',
                  opacity: 0.9
                }}
              />
            </div>
          </div>
        </div>
      )}

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
