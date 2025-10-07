import DuelData from '~/models/DuelData';
import TeamData from '~/models/TeamData';
import Card from '~/models/Card';
import { calculateSum, getCardHighestSuitAndValue, suitRank } from '~/utils/gameUtil';

export const implementSecondChance = (
  setDuelData: React.Dispatch<React.SetStateAction<DuelData>>,
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>
) => {
  setDuelData((prev) => {
    const currentDuelData = { ...prev };

    if (currentDuelData.duelIndex === 1) {
      return handleFirstPlayerSecondChance(currentDuelData);
    } else if (currentDuelData.duelIndex === 2) {
      return handleSecondPlayerSecondChance(currentDuelData, setTeam1Data, setTeam2Data);
    }

    return currentDuelData;
  });
};

const handleFirstPlayerSecondChance = (currentDuelData: DuelData): DuelData => {
  const firstPlayerSide = currentDuelData.player1SideSelected;

  const updatedPlayerData = {
    topLeftPlayerData: currentDuelData.topLeftPlayerData,
    bottomLeftPlayerData: currentDuelData.bottomLeftPlayerData,
    topRightPlayerData: currentDuelData.topRightPlayerData,
    bottomRightPlayerData: currentDuelData.bottomRightPlayerData
  };

  const sideMap = {
    'top-left': 'topLeftPlayerData',
    'bottom-left': 'bottomLeftPlayerData',
    'top-right': 'topRightPlayerData',
    'bottom-right': 'bottomRightPlayerData'
  } as const;

  const playerDataKey = sideMap[firstPlayerSide as keyof typeof sideMap];
  if (playerDataKey) {
    updatedPlayerData[playerDataKey] = {
      name: '?',
      team: '',
      sum: currentDuelData[playerDataKey].sum,
      cards: currentDuelData[playerDataKey].cards
    };
  }

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
    player1SideSelected: '',
    player2SideSelected: '',
    winningTeam: null
  };
};

const handleSecondPlayerSecondChance = (
  currentDuelData: DuelData,
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>
): DuelData => {
  if (currentDuelData.winningTeam) {
    if (currentDuelData.winningTeam === 'team1') {
      setTeam1Data((prev) => ({ ...prev, score: prev.score - 1 }));
    } else {
      setTeam2Data((prev) => ({ ...prev, score: prev.score - 1 }));
    }
  }

  const secondPlayerSide = currentDuelData.player2SideSelected;
  const secondPlayerName = currentDuelData.player2Name;

  const firstPlayerName = currentDuelData.player1Name;
  const firstPlayerTeam = currentDuelData.player1Team;

  let losingPlayer = '';
  let losingTeam: 'team1' | 'team2' | null = null;

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

  const updatedPlayerData = {
    topLeftPlayerData: currentDuelData.topLeftPlayerData,
    bottomLeftPlayerData: currentDuelData.bottomLeftPlayerData,
    topRightPlayerData: currentDuelData.topRightPlayerData,
    bottomRightPlayerData: currentDuelData.bottomRightPlayerData
  };

  const sideMap = {
    'top-left': 'topLeftPlayerData',
    'bottom-left': 'bottomLeftPlayerData',
    'top-right': 'topRightPlayerData',
    'bottom-right': 'bottomRightPlayerData'
  } as const;

  const playerDataKey = sideMap[secondPlayerSide as keyof typeof sideMap];
  if (playerDataKey) {
    updatedPlayerData[playerDataKey] = {
      name: '?',
      team: '',
      sum: currentDuelData[playerDataKey].sum,
      cards: currentDuelData[playerDataKey].cards
    };
  }

  return {
    ...currentDuelData,
    currentPlayerName: secondPlayerName,
    duelIndex: 1,
    player2Name: '',
    player2Team: null,
    ...updatedPlayerData,
    player2SideSelected: '',
    winningTeam: null,
    isFinishDuel: false
  };
};

export const implementRevealTwo = (setDuelData: React.Dispatch<React.SetStateAction<DuelData>>) => {
  setDuelData((prev) => {
    const newData = { ...prev };

    const createMixedCards = (cards: Card[]) => {
      return [
        cards[0],
        cards[1],
        { value: 0, suit: '' }
      ];
    };

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

export const implementLifeShield = (
  teamName: 'team1' | 'team2',
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setDuelData: React.Dispatch<React.SetStateAction<DuelData>>
) => {
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
};

export const implementLockAll = (
  teamName: 'team1' | 'team2',
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setDuelData: React.Dispatch<React.SetStateAction<DuelData>>
) => {
  if (teamName === 'team1') {
    setTeam1Data((prev) => ({
      ...prev,
      powerUps: { ...prev.powerUps, lockAll: prev.powerUps.lockAll - 1 },
      totalPowerUps: prev.totalPowerUps - 1
    }));
  } else {
    setTeam2Data((prev) => ({
      ...prev,
      powerUps: { ...prev.powerUps, lockAll: prev.powerUps.lockAll - 1 },
      totalPowerUps: prev.totalPowerUps - 1
    }));
  }
  setDuelData((prev) => ({ ...prev, lockAllUsedBy: teamName }));
};

export const implementRemoveWorst = (
  teamName: 'team1' | 'team2',
  duelData: DuelData,
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>,
  setDuelData: React.Dispatch<React.SetStateAction<DuelData>>
) => {
  const disabled = new Set(duelData.removedWorstGroups || []);
  const availableGroups: { key: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right'; cards: Card[] }[] = [];
  if (!duelData.topLeftRevealed && !disabled.has('top-left')) availableGroups.push({ key: 'top-left', cards: duelData.topLeftCards });
  if (!duelData.bottomLeftRevealed && !disabled.has('bottom-left')) availableGroups.push({ key: 'bottom-left', cards: duelData.bottomLeftCards });
  if (!duelData.topRightRevealed && !disabled.has('top-right')) availableGroups.push({ key: 'top-right', cards: duelData.topRightCards });
  if (!duelData.bottomRightRevealed && !disabled.has('bottom-right')) availableGroups.push({ key: 'bottom-right', cards: duelData.bottomRightCards });

  if (availableGroups.length > 1) {
    const pickWorst = (groups: typeof availableGroups): 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right' => {
      if (groups.length === 0) return 'top-left'; // fallback, though this shouldn't happen
      let worst = groups[0];
      for (let i = 1; i < groups.length; i++) {
        const b = groups[i];
        if (isGroupWorse(worst, b)) {
          worst = b;
        }
      }
      return worst.key;
    };

    const isGroupWorse = (a: typeof availableGroups[0], b: typeof availableGroups[0]): boolean => {
      const sumA = calculateSum(a.cards);
      const sumB = calculateSum(b.cards);
      if (sumB < sumA) return true;
      if (sumB > sumA) return false;

      // Same sum, compare highest cards
      const ha = getCardHighestSuitAndValue(a.cards);
      const hb = getCardHighestSuitAndValue(b.cards);
      if (suitRank[hb.suit] < suitRank[ha.suit]) return true;
      if (suitRank[hb.suit] > suitRank[ha.suit]) return false;

      // Same suit, compare values
      const haVal = ha.value === 1 ? 14 : ha.value;
      const hbVal = hb.value === 1 ? 14 : hb.value;
      return hbVal < haVal;
    };

    const worstKey = pickWorst(availableGroups);

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

    setDuelData((prev) => ({
      ...prev,
      removedWorstGroups: [...(prev.removedWorstGroups || []), worstKey],
      removeWorstUsedByTeams: [...(prev.removeWorstUsedByTeams || []), teamName]
    }));
  }
};