import { useState } from 'react';
import DuelData from '~/models/DuelData';

export const useDuelState = () => {
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
    lockAllUsedBy: null,
    removedWorstGroups: [],
    player1SideSelected: '',
    player2SideSelected: '',
    winningTeam: null
  });
  const [duelResult, setDuelResult] = useState('');

  return {
    duelData,
    setDuelData,
    duelResult,
    setDuelResult,
  };
};