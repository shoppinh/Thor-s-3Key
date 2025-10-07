import { useCallback } from 'react';
import DuelData from '~/models/DuelData';
import TeamData from '~/models/TeamData';
import Card from '~/models/Card';
import { calculateSum, determineWinner } from '~/utils/gameUtil';

type TeamType = 'team1' | 'team2';

interface DuelLogicParams {
  duelData: DuelData;
  setDuelData: React.Dispatch<React.SetStateAction<DuelData>>;
  team1Data: TeamData;
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>;
  team2Data: TeamData;
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>;
  setDuelResult: React.Dispatch<React.SetStateAction<string>>;
  setIsFirstTurn: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useDuelLogic = ({
  duelData,
  setDuelData,
  team1Data,
  setTeam1Data,
  team2Data,
  setTeam2Data,
  setDuelResult,
  setIsFirstTurn,
}: DuelLogicParams) => {

  const getDuelOpponent = useCallback(() => {
    return team1Data.players.includes(duelData.currentPlayerName)
      ? team2Data.players[0]
      : team1Data.players[0];
  }, [duelData.currentPlayerName, team1Data.players, team2Data.players]);

  const isPlayerCardDrawerDisabled = useCallback((playerData: { name: string; team: string; sum: number; cards: Card[] }) => {
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
  }, [duelData.isFinishDuel]);

  const revertWinningScore = useCallback((winningTeam: TeamType | null) => {
    if (winningTeam) {
      if (winningTeam === 'team1') {
        setTeam1Data((prev) => ({ ...prev, score: prev.score - 1 }));
      } else {
        setTeam2Data((prev) => ({ ...prev, score: prev.score - 1 }));
      }
    }
  }, [setTeam1Data, setTeam2Data]);

  const revertPlayerElimination = useCallback((currentDuelData: DuelData) => {
    const firstPlayerName = currentDuelData.player1Name;
    const firstPlayerTeam = currentDuelData.player1Team;
    const secondPlayerName = currentDuelData.player2Name;

    let losingPlayer = '';
    let losingTeam: TeamType | null = null;

    if (currentDuelData.winningTeam === firstPlayerTeam) {
      losingPlayer = secondPlayerName;
      losingTeam = currentDuelData.player2Team;
    } else {
      losingPlayer = firstPlayerName;
      losingTeam = firstPlayerTeam;
    }

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
  }, [setTeam1Data, setTeam2Data]);

  const createResetPlayerData = useCallback((currentDuelData: DuelData, playerSide: string) => {
    const updatedPlayerData = {
      topLeftPlayerData: currentDuelData.topLeftPlayerData,
      bottomLeftPlayerData: currentDuelData.bottomLeftPlayerData,
      topRightPlayerData: currentDuelData.topRightPlayerData,
      bottomRightPlayerData: currentDuelData.bottomRightPlayerData
    };

    if (playerSide === 'top-left') {
      updatedPlayerData.topLeftPlayerData = {
        name: '?',
        team: '',
        sum: currentDuelData.topLeftPlayerData.sum,
        cards: currentDuelData.topLeftPlayerData.cards
      };
    } else if (playerSide === 'bottom-left') {
      updatedPlayerData.bottomLeftPlayerData = {
        name: '?',
        team: '',
        sum: currentDuelData.bottomLeftPlayerData.sum,
        cards: currentDuelData.bottomLeftPlayerData.cards
      };
    } else if (playerSide === 'top-right') {
      updatedPlayerData.topRightPlayerData = {
        name: '?',
        team: '',
        sum: currentDuelData.topRightPlayerData.sum,
        cards: currentDuelData.topRightPlayerData.cards
      };
    } else if (playerSide === 'bottom-right') {
      updatedPlayerData.bottomRightPlayerData = {
        name: '?',
        team: '',
        sum: currentDuelData.bottomRightPlayerData.sum,
        cards: currentDuelData.bottomRightPlayerData.cards
      };
    }

    return updatedPlayerData;
  }, []);

  const handleFirstPlayerSecondChance = useCallback((currentDuelData: DuelData) => {
    const firstPlayerSide = currentDuelData.player1SideSelected || '';
    const updatedPlayerData = createResetPlayerData(currentDuelData, firstPlayerSide);

    return {
      ...currentDuelData,
      currentPlayerName: currentDuelData.player1Name,
      player1Name: '?',
      player1Team: null,
      player2Name: '',
      player2Team: null,
      duelIndex: 0,
      ...updatedPlayerData,
      topLeftRevealed: false,
      bottomLeftRevealed: false,
      topRightRevealed: false,
      bottomRightRevealed: false,
      player1SideSelected: '' as const,
      player2SideSelected: '' as const,
      winningTeam: null
    };
  }, [createResetPlayerData]);

  const handleSecondPlayerSecondChance = useCallback((currentDuelData: DuelData) => {
    // Revert the calculated result
    revertWinningScore(currentDuelData.winningTeam || null);

    // Revert player elimination
    revertPlayerElimination(currentDuelData);

    const secondPlayerSide = currentDuelData.player2SideSelected || '';
    const secondPlayerName = currentDuelData.player2Name;
    const updatedPlayerData = createResetPlayerData(currentDuelData, secondPlayerSide);

    return {
      ...currentDuelData,
      currentPlayerName: secondPlayerName,
      duelIndex: 1,
      player2Name: '',
      player2Team: null,
      ...updatedPlayerData,
      player2SideSelected: '' as const,
      winningTeam: null,
      isFinishDuel: false
    };
  }, [revertWinningScore, revertPlayerElimination, createResetPlayerData]);

  const implementSecondChance = useCallback(() => {
    setDuelData((prev) => {
      const currentDuelData = { ...prev };

      if (currentDuelData.duelIndex === 1) {
        return handleFirstPlayerSecondChance(currentDuelData);
      } else if (currentDuelData.duelIndex === 2) {
        return handleSecondPlayerSecondChance(currentDuelData);
      }

      return currentDuelData;
    });
  }, [setDuelData, handleFirstPlayerSecondChance, handleSecondPlayerSecondChance]);

  const implementRevealTwo = useCallback(() => {
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
  }, [setDuelData]);

  const updateScoresAndTeams = useCallback((
    isPlayer1Winner: boolean,
    firstPlayerTeam: TeamType | null,
    secondPlayerTeam: TeamType | null,
    shouldPreventElimination: boolean
  ) => {
    setTeam1Data((prev) => ({ ...prev, scoreClass: '' }));
    setTeam2Data((prev) => ({ ...prev, scoreClass: '' }));

    if (!shouldPreventElimination) {
      if (isPlayer1Winner) {
        if (firstPlayerTeam === 'team1') {
          setTeam1Data((prev) => ({ ...prev, score: prev.score + 1 }));
          setTimeout(() => {
            setTeam1Data((p) => ({ ...p, scoreClass: 'blink-score' }));
          }, 10);
        } else {
          setTeam2Data((prev) => ({ ...prev, score: prev.score + 1 }));
          setTimeout(() => {
            setTeam2Data((p) => ({ ...p, scoreClass: 'blink-score' }));
          }, 10);
        }
      } else {
        // Handle second player winner case
        const teamToUpdate = secondPlayerTeam === 'team1' ? setTeam1Data : setTeam2Data;
        teamToUpdate((prev) => ({ ...prev, score: prev.score + 1 }));
        setTimeout(() => {
          teamToUpdate((p) => ({ ...p, scoreClass: 'blink-score' }));
        }, 10);
      }

      const winningTeam = isPlayer1Winner ? firstPlayerTeam : secondPlayerTeam;
      setDuelData((prev) => ({ ...prev, winningTeam }));
    }
  }, [setTeam1Data, setTeam2Data, setDuelData]);

  const handlePlayerElimination = useCallback((
    losingPlayer: string,
    losingTeam: TeamType | null,
    shouldPreventElimination: boolean
  ) => {
    const updatedTeam1Players = !shouldPreventElimination && losingTeam === 'team1'
      ? team1Data.players.filter((player) => player !== losingPlayer)
      : team1Data.players;
    const updatedTeam2Players = !shouldPreventElimination && losingTeam === 'team2'
      ? team2Data.players.filter((player) => player !== losingPlayer)
      : team2Data.players;

    setTeam1Data((prev) => ({ ...prev, players: updatedTeam1Players }));
    setTeam2Data((prev) => ({ ...prev, players: updatedTeam2Players }));
  }, [team1Data.players, team2Data.players, setTeam1Data, setTeam2Data]);

  const determineNextPlayer = useCallback((
    losingTeam: TeamType | null,
    shouldPreventElimination: boolean
  ) => {
    if (!shouldPreventElimination && losingTeam) {
      const losingTeamPlayers = losingTeam === 'team1' ? team1Data.players : team2Data.players;

      if (losingTeamPlayers.length > 0) {
        const nextPlayer = losingTeamPlayers[0];
        setDuelData((prev) => ({ ...prev, currentPlayerName: nextPlayer }));
      }
    }
  }, [team1Data.players, team2Data.players, setDuelData]);

  const calculateResult = useCallback(
    (resultParams: {
      p1Sum: number;
      p2Sum: number;
      p1Cards: Card[];
      p2Cards: Card[];
      p1Name: string;
      p2Name: string;
      p1Team?: TeamType | null;
      p2Team?: TeamType | null;
    }) => {
      const { winner, isPlayer1Winner } = determineWinner(
        resultParams.p1Sum,
        resultParams.p2Sum,
        resultParams.p1Cards,
        resultParams.p2Cards,
        resultParams.p1Name,
        resultParams.p2Name
      );
      const losingPlayer = isPlayer1Winner ? resultParams.p2Name : resultParams.p1Name;

      const firstPlayerTeam = resultParams.p1Team || duelData.player1Team;
      const secondPlayerTeam = resultParams.p2Team || duelData.player2Team;
      const losingTeam = isPlayer1Winner ? secondPlayerTeam : firstPlayerTeam;

      const shieldedTeam = duelData.lifeShieldUsedBy;
      const shouldPreventElimination = !!(shieldedTeam && losingTeam === shieldedTeam);

      updateScoresAndTeams(isPlayer1Winner, firstPlayerTeam, secondPlayerTeam, shouldPreventElimination);
      setDuelResult(winner);

      handlePlayerElimination(losingPlayer, losingTeam, shouldPreventElimination);
      determineNextPlayer(losingTeam, shouldPreventElimination);
    },
    [
      duelData.player1Team,
      duelData.player2Team,
      duelData.lifeShieldUsedBy,
      setDuelResult,
      updateScoresAndTeams,
      handlePlayerElimination,
      determineNextPlayer
    ]
  );

  const playerSelect = useCallback(
    (side: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
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
          player1Team: teamName as TeamType,
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
          player2Team: teamName as TeamType
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

          const isSecondTeamLocked =
            newData.lockAllUsedBy !== null &&
            newData.lockAllUsedBy !== secondPlayerTeam;
          const secondTeamHasSecondChance =
            !secondTeamAlreadyUsedSecondChance &&
            !secondTeamIsWinning &&
            !isSecondTeamLocked;

          // Additional constraints: must have at least one selectable group remaining (not removed, not revealed, not already drawn)
          const disabledGroups = new Set(newData.removedWorstGroups || []);
          const availableCount = [
            !disabledGroups.has('top-left') && !newData.topLeftRevealed && newData.topLeftPlayerData.cards.length === 0,
            !disabledGroups.has('bottom-left') && !newData.bottomLeftRevealed && newData.bottomLeftPlayerData.cards.length === 0,
            !disabledGroups.has('top-right') && !newData.topRightRevealed && newData.topRightPlayerData.cards.length === 0,
            !disabledGroups.has('bottom-right') && !newData.bottomRightRevealed && newData.bottomRightPlayerData.cards.length === 0
          ].filter(Boolean).length;
          const secondChanceUsedThisDuel = (newData.secondChanceUsedByTeams || []).includes(
            (secondPlayerTeam as TeamType)
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
          calculateResult({
            p1Sum: firstPlayerData.sum,
            p2Sum: secondPlayerData.sum,
            p1Cards: firstPlayerData.cards,
            p2Cards: secondPlayerData.cards,
            p1Name: firstPlayerData.name,
            p2Name: secondPlayerData.name,
            p1Team: updatedData.player1Team,
            p2Team: updatedData.player2Team
          });

          // Mark duel as finished
          return {
            ...updatedData,
            isFinishDuel: true
          };
        });
      }
    },
    [
      duelData,
      setDuelData,
      setIsFirstTurn,
      getDuelOpponent,
      team1Data,
      team2Data,
      calculateResult
    ]
  );

  return {
    getDuelOpponent,
    isPlayerCardDrawerDisabled,
    implementSecondChance,
    implementRevealTwo,
    calculateResult,
    playerSelect,
  };
};