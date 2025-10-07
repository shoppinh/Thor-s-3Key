import { useState } from 'react';
import DuelData from '~/models/DuelData';

export const useDuelState = () => {
  const [duelData, setDuelData] = useState<DuelData>({
    duelIndex: 0,
    currentPlayerName: '',
    isFinishDuel: false,
    topLeftCards: [],
    bottomLeftCards: [],
    topRightCards: [],
    bottomRightCards: [],
    topLeftRevealed: false,
    bottomLeftRevealed: false,
    topRightRevealed: false,
    bottomRightRevealed: false,
    topLeftPlayerData: { name: '', team: '', sum: 0, cards: [] },
    topRightPlayerData: { name: '', team: '', sum: 0, cards: [] },
    bottomLeftPlayerData: { name: '', team: '', sum: 0, cards: [] },
    bottomRightPlayerData: { name: '', team: '', sum: 0, cards: [] },
    revealedCards: {
      topLeft: [],
      bottomLeft: [],
      topRight: [],
      bottomRight: [],
    },
    winningTeam: null,
    player1SideSelected: '',
    player2SideSelected: '',
    player1Name: '',
    player1Team: null,
    player2Name: '',
    player2Team: null,
    revealTwoUsedBy: null,
    lifeShieldUsedBy: null,
    lockAllUsedBy: null,
    removedWorstGroups: [],
    removeWorstUsedByTeams: [],
    secondChanceUsedByTeams: [],
  });

  return {
    duelData,
    setDuelData,
  };
};