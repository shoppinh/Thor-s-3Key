import { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from '@remix-run/react';
import PlayerCardDrawer from '../components/PlayerCardDrawer';
import RoundStatus from '../components/RoundStatus';
import ChanceStar from '../components/ChanceStar';
import ConfirmPopup from '../components/ConfirmPopup';
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
  determineWinner
} from '~/utils/gameUtil';
import useSupabaseClient from '~/utils/supabase.client';

const DECKS = createDeck();

type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
};

type PowerUpsAllocation = {
  second: number;
  reveal: number;
  shield: number;
  lock: number;
};

const CardGame = () => {
  const clientSecrets = useOutletContext<RootContext>();
  const [params] = useSearchParams();
  const supabase = useSupabaseClient();
  const [team1Data, setTeam1Data] = useState<TeamData>({
    name: 'Team 1',
    score: 0,
    scoreClass: '',
    totalChance: 4,
    powerUps: { second: 1, reveal: 1, shield: 1, lock: 1 },
    players: []
  });
  const [team2Data, setTeam2Data] = useState<TeamData>({
    name: 'Team 2',
    score: 0,
    scoreClass: '',
    totalChance: 4,
    powerUps: { second: 1, reveal: 1, shield: 1, lock: 1 },
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
    shieldUsedBy: null,
    lockUsedBy: null,
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
  const [gameState, setGameState] = useState('welcome'); // welcome -> gameLoading -> setup -> gamePlaying -> gameOver
  const [roundNumber, setRoundNumber] = useState(0);

  // Local allocations for setup screen
  const [team1Alloc, setTeam1Alloc] = useState<PowerUpsAllocation>({
    second: team1Data.powerUps.second,
    reveal: team1Data.powerUps.reveal,
    shield: team1Data.powerUps.shield,
    lock: team1Data.powerUps.lock
  });
  const [team2Alloc, setTeam2Alloc] = useState<PowerUpsAllocation>({
    second: team2Data.powerUps.second,
    reveal: team2Data.powerUps.reveal,
    shield: team2Data.powerUps.shield,
    lock: team2Data.powerUps.lock
  });

  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = clientSecrets?.API_KEY ?? '';

  const [sheetId, setSheetId] = useState(SHEET_ID);
  const [sheetRange, setSheetRange] = useState(SHEET_RANGE);

  async function loadDataFromRoom(code: string) {
    setGameState('gameLoading');
    try {
      const roomRes = await supabase.from('rooms').select('id,status').eq('code', code).single();
      if (roomRes.error || !roomRes.data) {
        console.error('Room not found', roomRes.error);
        setGameState('welcome');
        return;
      }
      const roomId = roomRes.data.id as string;
      const memRes = await supabase
        .from('room_members')
        .select('nickname, team')
        .eq('room_id', roomId);
      if (memRes.error) {
        console.error('Members fetch error', memRes.error);
        setGameState('welcome');
        return;
      }
      const a: string[] = [];
      const b: string[] = [];
      (memRes.data || []).forEach((m: { nickname: string; team: 'A' | 'B' | null }) => {
        if (m.team === 'A') a.push(m.nickname);
        else if (m.team === 'B') b.push(m.nickname);
      });
      const shuffledTeam1 = shuffleArray(a.length ? a : ['TeamA#1']);
      const shuffledTeam2 = shuffleArray(b.length ? b : ['TeamB#1']);
      setTeam1Data((prev) => ({ ...prev, players: shuffledTeam1 }));
      setTeam2Data((prev) => ({ ...prev, players: shuffledTeam2 }));
      setGameState('setup');
    } catch (e) {
      console.error('loadDataFromRoom failed', e);
      setGameState('welcome');
    }
  }

  useEffect(() => {
    const roomCode = params.get('room');
    if (roomCode && gameState === 'welcome') {
      void loadDataFromRoom(roomCode.toUpperCase());
    }
  }, [params, gameState]);

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

  const loadDataFromGoogleSheet = async () => {
    setGameState('gameLoading');
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

      setTeam1Data((prev) => ({ ...prev, players: shuffledTeam1 }));
      setTeam2Data((prev) => ({ ...prev, players: shuffledTeam2 }));
      // Move to setup so teams can allocate power-ups
      setGameState('setup');
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
        shieldUsedBy: null,
        lockUsedBy: null,
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
          secondTeamData.powerUps.second <= 0;
        const secondTeamIsWinning =
          (secondPlayerTeam === newData.player1Team && isPlayer1Winner) ||
          (secondPlayerTeam === newData.player2Team && !isPlayer1Winner);

        const isSecondTeamLocked =
          newData.lockUsedBy !== null &&
          newData.lockUsedBy !== secondPlayerTeam;
        const secondTeamHasSecondChance =
          !secondTeamAlreadyUsedSecondChance &&
          !secondTeamIsWinning &&
          !isSecondTeamLocked;

        // Reveal all cards if the second team doesn't have Second Chance available
        const shouldRevealAllCards = !secondTeamHasSecondChance;

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
   * @param chanceType - Type of chance (second or reveal)
   */
  const handleChanceClick = (
    teamName: 'team1' | 'team2',
    chanceType: 'second' | 'reveal' | 'shield' | 'lock'
  ) => {
    const chanceItemName =
      chanceType === 'second'
        ? 'Second Chance'
        : chanceType === 'reveal'
          ? 'Reveal Two'
          : chanceType === 'shield'
            ? 'Shield'
            : 'Lockdown';

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
                return { ...prev, players: [...prev.players, losingPlayer] };
              }
              return prev;
            });
          } else {
            setTeam2Data((prev) => {
              if (!prev.players.includes(losingPlayer)) {
                return { ...prev, players: [...prev.players, losingPlayer] };
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
      if (chanceType === 'second') {
        // Handle Second Chance logic
        if (teamName === 'team1') {
          setTeam1Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, second: prev.powerUps.second - 1 },
            totalChance: prev.totalChance - 1
          }));
        } else {
          setTeam2Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, second: prev.powerUps.second - 1 },
            totalChance: prev.totalChance - 1
          }));
        }

        // Implement second chance functionality
        implementSecondChance();
      } else if (chanceType === 'reveal') {
        // Handle Reveal Two logic
        if (teamName === 'team1') {
          setTeam1Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, reveal: prev.powerUps.reveal - 1 },
            totalChance: prev.totalChance - 1
          }));
        } else {
          setTeam2Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, reveal: prev.powerUps.reveal - 1 },
            totalChance: prev.totalChance - 1
          }));
        }

        // Mark that reveal two has been used in this duel
        setDuelData((prev) => ({ ...prev, revealTwoUsedBy: teamName }));

        // Implement reveal two functionality
        implementRevealTwo();
      } else if (chanceType === 'shield') {
        // Prevent elimination this duel
        if (teamName === 'team1') {
          setTeam1Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, shield: prev.powerUps.shield - 1 },
            totalChance: prev.totalChance - 1
          }));
        } else {
          setTeam2Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, shield: prev.powerUps.shield - 1 },
            totalChance: prev.totalChance - 1
          }));
        }
        setDuelData((prev) => ({ ...prev, shieldUsedBy: teamName }));
      } else if (chanceType === 'lock') {
        // Lock opponent power-ups this duel
        if (teamName === 'team1') {
          setTeam1Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, lock: prev.powerUps.lock - 1 },
            totalChance: prev.totalChance - 1
          }));
        } else {
          setTeam2Data((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, lock: prev.powerUps.lock - 1 },
            totalChance: prev.totalChance - 1
          }));
        }
        setDuelData((prev) => ({ ...prev, lockUsedBy: teamName }));
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
      const shieldedTeam = duelData.shieldUsedBy;
      const shouldPreventElimination =
        shieldedTeam && losingTeam === shieldedTeam;

      setTeam1Data((prev) => ({ ...prev, scoreClass: '' }));
      setTeam2Data((prev) => ({ ...prev, scoreClass: '' }));
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

      // Set the duel result
      setDuelResult(winner);

      // Store the winning team in duelData
      const winningTeam = isPlayer1Winner ? firstPlayerTeam : secondPlayerTeam;
      setDuelData((prev) => ({ ...prev, winningTeam }));

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
      duelData.shieldUsedBy
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

  function renderGameInput() {
    return (
      <>
        {(gameState == 'welcome' || gameState == 'gameLoading') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <div>
              <h1>Thorlit 3Key</h1>
              <div className={'controlContainer'}>
                <label className={'labelControl'} htmlFor="sheetId">
                  Sheet Id
                </label>
                <input
                  className={'textControl'}
                  id="sheetId"
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  disabled={gameState != 'welcome'}
                />
              </div>
              <div className={'controlContainer'}>
                <label className={'labelControl'} htmlFor="sheetRange">
                  Sheet Range
                </label>
                <input
                  className={'textControl'}
                  id="sheetRange"
                  type="text"
                  value={sheetRange}
                  onChange={(e) => setSheetRange(e.target.value)}
                  disabled={gameState != 'welcome'}
                />
              </div>
              <div>
                {team1Data.players.length === 0 &&
                  team2Data.players.length === 0 && (
                    <div>
                      <button
                        onClick={() => loadDataFromGoogleSheet()}
                        className={'btnStart'}
                        disabled={gameState == 'gameLoading'}
                      >
                        Start Game
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {gameState == 'setup' && (
          <div
            style={{
              maxWidth: 920,
              margin: '0 auto',
              padding: 20
            }}
          >
            <h2 style={{ textAlign: 'center', marginTop: 0 }}>
              Power-ups Allocation
            </h2>
            <p className="note" style={{ textAlign: 'center' }}>
              Allocate total chances across power-ups. Sum for each team must
              equal {team1Data.totalChance}.
            </p>
            <div className="setup-grid">
              <div className="setup-card">
                <h3 className={'teamName team1'} style={{ marginTop: 0 }}>
                  {team1Data.name}
                </h3>
                <div className="setup-row">
                  <label htmlFor="t1-second">Second Chance</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team1Data.totalChance}
                    id="t1-second"
                    value={team1Alloc.second}
                    onChange={(e) =>
                      setTeam1Alloc({
                        ...team1Alloc,
                        second: Math.max(
                          0,
                          Math.min(
                            team1Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <label htmlFor="t1-reveal">Reveal Two</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team1Data.totalChance}
                    id="t1-reveal"
                    value={team1Alloc.reveal}
                    onChange={(e) =>
                      setTeam1Alloc({
                        ...team1Alloc,
                        reveal: Math.max(
                          0,
                          Math.min(
                            team1Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <label htmlFor="t1-shield">Shield</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team1Data.totalChance}
                    id="t1-shield"
                    value={team1Alloc.shield}
                    onChange={(e) =>
                      setTeam1Alloc({
                        ...team1Alloc,
                        shield: Math.max(
                          0,
                          Math.min(
                            team1Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <label htmlFor="t1-lock">Lockdown</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team1Data.totalChance}
                    id="t1-lock"
                    value={team1Alloc.lock}
                    onChange={(e) =>
                      setTeam1Alloc({
                        ...team1Alloc,
                        lock: Math.max(
                          0,
                          Math.min(
                            team1Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <strong>Total</strong>
                  <strong>
                    {team1Alloc.second +
                      team1Alloc.reveal +
                      team1Alloc.shield +
                      team1Alloc.lock}{' '}
                    / {team1Data.totalChance}
                  </strong>
                </div>
              </div>

              <div className="setup-card">
                <h3 className={'teamName team2'} style={{ marginTop: 0 }}>
                  {team2Data.name}
                </h3>
                <div className="setup-row">
                  <label htmlFor="t2-second">Second Chance</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team2Data.totalChance}
                    id="t2-second"
                    value={team2Alloc.second}
                    onChange={(e) =>
                      setTeam2Alloc({
                        ...team2Alloc,
                        second: Math.max(
                          0,
                          Math.min(
                            team2Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <label htmlFor="t2-reveal">Reveal Two</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team2Data.totalChance}
                    id="t2-reveal"
                    value={team2Alloc.reveal}
                    onChange={(e) =>
                      setTeam2Alloc({
                        ...team2Alloc,
                        reveal: Math.max(
                          0,
                          Math.min(
                            team2Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <label htmlFor="t2-shield">Shield</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team2Data.totalChance}
                    id="t2-shield"
                    value={team2Alloc.shield}
                    onChange={(e) =>
                      setTeam2Alloc({
                        ...team2Alloc,
                        shield: Math.max(
                          0,
                          Math.min(
                            team2Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <label htmlFor="t2-lock">Lockdown</label>
                  <input
                    className="num-input"
                    type="number"
                    min={0}
                    max={team2Data.totalChance}
                    id="t2-lock"
                    value={team2Alloc.lock}
                    onChange={(e) =>
                      setTeam2Alloc({
                        ...team2Alloc,
                        lock: Math.max(
                          0,
                          Math.min(
                            team2Data.totalChance,
                            Number(e.target.value)
                          )
                        )
                      })
                    }
                  />
                </div>
                <div className="setup-row">
                  <strong>Total</strong>
                  <strong>
                    {team2Alloc.second +
                      team2Alloc.reveal +
                      team2Alloc.shield +
                      team2Alloc.lock}{' '}
                    / {team2Data.totalChance}
                  </strong>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginTop: 16
              }}
            >
              <button
                className={'btnStart'}
                disabled={
                  team1Alloc.second +
                    team1Alloc.reveal +
                    team1Alloc.shield +
                    team1Alloc.lock !==
                    team1Data.totalChance ||
                  team2Alloc.second +
                    team2Alloc.reveal +
                    team2Alloc.shield +
                    team2Alloc.lock !==
                    team2Data.totalChance
                }
                onClick={() => {
                  setTeam1Data((prev) => ({
                    ...prev,
                    powerUps: { ...team1Alloc }
                  }));
                  setTeam2Data((prev) => ({
                    ...prev,
                    powerUps: { ...team2Alloc }
                  }));
                  startGameWithTeams(team1Data.players, team2Data.players);
                }}
              >
                Start Match
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 20px', height: '100%' }}>
      {renderGameInput()}

      {gameState == 'gamePlaying' && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ width: '140px' }}>
              <div className={'scoreContainer ' + team1Data.scoreClass}>
                <span style={{ paddingBottom: '10px' }}>{team1Data.score}</span>
              </div>
              <h2 className="teamName team1" style={{ position: 'relative' }}>
                Team 1
                {team1Data.totalChance > 0 && (
                  <ChanceStar
                    number={team1Data.totalChance}
                    style={{
                      top: '50%',
                      left: 'calc(100% + 10px)',
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
              </h2>
              <ul className={'ulTeam'}>
                {team1Data.players.map((member, index) => (
                  <li className={'memberItem'} key={index}>
                    {member}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    marginRight: '70px'
                  }}
                >
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
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    marginLeft: '70px'
                  }}
                >
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
            <div style={{ width: '140px' }}>
              <div className={'scoreContainer ' + team2Data.scoreClass}>
                <span style={{ paddingBottom: '10px' }}>{team2Data.score}</span>
              </div>
              <h2 className="teamName team2" style={{ position: 'relative' }}>
                {team2Data.totalChance > 0 && (
                  <ChanceStar
                    number={team2Data.totalChance}
                    style={{
                      top: '50%',
                      right: 'calc(100% + 10px)',
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
                Team 2
              </h2>
              <ul className={'ulTeam'}>
                {team2Data.players.map((member, index) => (
                  <li className={'memberItem'} key={index}>
                    {member}
                  </li>
                ))}
              </ul>
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
            height: '100%'
          }}
        >
          <div>
            <h2 style={{ color: 'red', margin: 0 }}>Game Over</h2>
            <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>
              {teamWinner}
            </h2>
            <img
              style={{ marginTop: '20px' }}
              src="/images/the-end.webp"
              alt=""
              width="600"
            />
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
