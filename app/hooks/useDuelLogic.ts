import { useCallback } from 'react';
import { shuffleDeck, drawCards, determineWinner } from '~/utils/gameUtil';
import DuelData from '~/models/DuelData';
import TeamData from '~/models/TeamData';
import Card from '~/models/Card';
import PlayerData from '~/models/PlayerData';

const DECKS: Card[] = [
  { value: 1, suit: '♦' }, { value: 1, suit: '♥' }, { value: 1, suit: '♠' }, { value: 1, suit: '♣' },
  { value: 2, suit: '♦' }, { value: 2, suit: '♥' }, { value: 2, suit: '♠' }, { value: 2, suit: '♣' },
  { value: 3, suit: '♦' }, { value: 3, suit: '♥' }, { value: 3, suit: '♠' }, { value: 3, suit: '♣' },
  { value: 4, suit: '♦' }, { value: 4, suit: '♥' }, { value: 4, suit: '♠' }, { value: 4, suit: '♣' },
  { value: 5, suit: '♦' }, { value: 5, suit: '♥' }, { value: 5, suit: '♠' }, { value: 5, suit: '♣' },
  { value: 6, suit: '♦' }, { value: 6, suit: '♥' }, { value: 6, suit: '♠' }, { value: 6, suit: '♣' },
  { value: 7, suit: '♦' }, { value: 7, suit: '♥' }, { value: 7, suit: '♠' }, { value: 7, suit: '♣' },
  { value: 8, suit: '♦' }, { value: 8, suit: '♥' }, { value: 8, suit: '♠' }, { value: 8, suit: '♣' },
  { value: 9, suit: '♦' }, { value: 9, suit: '♥' }, { value: 9, suit: '♠' }, { value: 9, suit: '♣' }
];

export const useDuelLogic = (
  duelData: DuelData,
  setDuelData: React.Dispatch<React.SetStateAction<DuelData>>,
  team1Data: TeamData,
  team2Data: TeamData,
  roundNumber: number,
  setRoundNumber: React.Dispatch<React.SetStateAction<number>>,
  setDuelResult: React.Dispatch<React.SetStateAction<string>>,
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>
) => {
  const nextRound = useCallback(
    (inputTeam1: string[], inputTeam2: string[]) => {
      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        return;
      }

      const deck = shuffleDeck([...DECKS]);
      const randomStart = Math.random() >= 0.5 ? inputTeam1[0] : inputTeam2[0];

      setDuelData((prev) => ({
        ...prev,
        duelIndex: 0,
        currentPlayerName:
          roundNumber === 0
            ? randomStart
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
        lockAllUsedBy: null,
        removedWorstGroups: [],
        removeWorstUsedByTeams: [],
        secondChanceUsedByTeams: [],
        player1SideSelected: '',
        player2SideSelected: '',
        winningTeam: null
      }));
      setDuelResult('');
      setRoundNumber((prev) => prev + 1);
    },
    [roundNumber, setDuelData, setDuelResult, setRoundNumber]
  );

  const getDuelOpponent = () => {
    return team1Data.players.includes(duelData.currentPlayerName)
      ? team2Data.players[0]
      : team1Data.players[0];
  };

  const isPlayerCardDrawerDisabled = (playerData: PlayerData) => {
    if (duelData.isFinishDuel) {
      return true;
    }

    if (playerData.cards.length === 0) {
      return false;
    }

    if (playerData.name === '?' && playerData.team === '') {
      return false;
    }

    return true;
  };

  const updateScores = useCallback((isPlayer1Winner: boolean, firstPlayerTeam: 'team1' | 'team2' | null, secondPlayerTeam: 'team1' | 'team2' | null) => {
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
  }, [setTeam1Data, setTeam2Data]);

  const handlePlayerElimination = useCallback((losingPlayer: string, losingTeam: 'team1' | 'team2' | null, shouldPreventElimination: boolean) => {
    const currentTeam1Players = team1Data.players;
    const currentTeam2Players = team2Data.players;

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

    if (losingTeam) {
      const losingTeamPlayers = losingTeam === 'team1' ? updatedTeam1Players : updatedTeam2Players;
      if (losingTeamPlayers.length > 0) {
        const nextPlayer = losingTeamPlayers[0];
        setDuelData((prev) => ({ ...prev, currentPlayerName: nextPlayer }));
      }
    }
  }, [team1Data.players, team2Data.players, setTeam1Data, setTeam2Data, setDuelData]);

  const calculateResult = useCallback(
    (params: {
      p1Sum: number;
      p2Sum: number;
      p1Cards: Card[];
      p2Cards: Card[];
      p1Name: string;
      p2Name: string;
      p1Team?: 'team1' | 'team2' | null;
      p2Team?: 'team1' | 'team2' | null;
    }) => {
      const { p1Sum, p2Sum, p1Cards, p2Cards, p1Name, p2Name, p1Team, p2Team } = params;
      const { winner, isPlayer1Winner } = determineWinner(
        p1Sum,
        p2Sum,
        p1Cards,
        p2Cards,
        p1Name,
        p2Name
      );
      const losingPlayer = isPlayer1Winner ? p2Name : p1Name;

      const firstPlayerTeam = p1Team || duelData.player1Team;
      const secondPlayerTeam = p2Team || duelData.player2Team;
      const losingTeam = isPlayer1Winner ? secondPlayerTeam : firstPlayerTeam;

      const shieldedTeam = duelData.lifeShieldUsedBy;
      const shouldPreventElimination =
        shieldedTeam && losingTeam === shieldedTeam;

      setTeam1Data((prev) => ({ ...prev, scoreClass: '' }));
      setTeam2Data((prev) => ({ ...prev, scoreClass: '' }));

      if (!shouldPreventElimination) {
        updateScores(isPlayer1Winner, firstPlayerTeam, secondPlayerTeam);
        const winningTeam = isPlayer1Winner ? firstPlayerTeam : secondPlayerTeam;
        setDuelData((prev) => ({ ...prev, winningTeam }));
      }

      setDuelResult(winner);
      handlePlayerElimination(losingPlayer, losingTeam, shouldPreventElimination || false);
    },
    [duelData.player1Team, duelData.player2Team, duelData.lifeShieldUsedBy, setTeam1Data, setTeam2Data, setDuelData, setDuelResult, handlePlayerElimination, updateScores]
  );

  return {
    nextRound,
    getDuelOpponent,
    isPlayerCardDrawerDisabled,
    calculateResult,
  };
};