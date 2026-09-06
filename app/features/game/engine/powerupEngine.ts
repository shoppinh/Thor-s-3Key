import Card from '~/models/Card';
import DuelData from '~/models/DuelData';
import { Side, TeamName } from '~/features/game/types/gameTypes';
import {
  calculateSum,
  compareHands,
  getCardHighestSuitAndValue,
  suitRank
} from '~/utils/gameUtil';
import { getCardsBySide } from '~/features/game/engine/duelEngine';

export const createRevealTwoCards = (cards: Card[]): Card[] => {
  const firstCard = cards[0] ?? { value: 0, suit: '' };
  const secondCard = cards[1] ?? { value: 0, suit: '' };

  return [firstCard, secondCard, { value: 0, suit: '' }];
};
export const pickWorstGroup = (duelData: DuelData): Side | null => {
  const selectedSide = [
    duelData.topLeftPlayerData.sum > 0 ? 'top-left' : null,
    duelData.bottomLeftPlayerData.sum > 0 ? 'bottom-left' : null,
    duelData.topRightPlayerData.sum > 0 ? 'top-right' : null,
    duelData.bottomRightPlayerData.sum > 0 ? 'bottom-right' : null
  ].filter(Boolean) as Side[];
  const disabled = new Set([
    ...(duelData.removedWorstGroups || []),
    ...selectedSide
  ]);
  const availableGroups: { key: Side; cards: Card[] }[] = [];

  if (!duelData.topLeftRevealed && !disabled.has('top-left')) {
    availableGroups.push({ key: 'top-left', cards: duelData.topLeftCards });
  }
  if (!duelData.bottomLeftRevealed && !disabled.has('bottom-left')) {
    availableGroups.push({
      key: 'bottom-left',
      cards: duelData.bottomLeftCards
    });
  }
  if (!duelData.topRightRevealed && !disabled.has('top-right')) {
    availableGroups.push({ key: 'top-right', cards: duelData.topRightCards });
  }
  if (!duelData.bottomRightRevealed && !disabled.has('bottom-right')) {
    availableGroups.push({
      key: 'bottom-right',
      cards: duelData.bottomRightCards
    });
  }

  if (availableGroups.length <= 1) {
    return null;
  }

  let worst = availableGroups[0];
  for (let i = 1; i < availableGroups.length; i++) {
    const candidate = availableGroups[i];
    const worstSum = calculateSum(worst.cards);
    const candidateSum = calculateSum(candidate.cards);
    if (candidateSum < worstSum) {
      worst = candidate;
      continue;
    }
    if (candidateSum > worstSum) {
      continue;
    }

    const worstHighest = getCardHighestSuitAndValue(worst.cards);
    const candidateHighest = getCardHighestSuitAndValue(candidate.cards);
    if (suitRank[candidateHighest.suit] < suitRank[worstHighest.suit]) {
      worst = candidate;
      continue;
    }
    if (suitRank[candidateHighest.suit] > suitRank[worstHighest.suit]) {
      continue;
    }

    const worstValue = worstHighest.value === 1 ? 14 : worstHighest.value;
    const candidateValue =
      candidateHighest.value === 1 ? 14 : candidateHighest.value;
    if (candidateValue < worstValue) {
      worst = candidate;
    }
  }

  return worst.key;
};

export const withRemoveWorstUsage = (
  duelData: DuelData,
  teamName: TeamName,
  worstGroup: Side
): DuelData => ({
  ...duelData,
  removedWorstGroups: [...(duelData.removedWorstGroups || []), worstGroup],
  removeWorstUsedByTeams: [...(duelData.removeWorstUsedByTeams || []), teamName]
});

const SIDE_AVAILABILITY: {
  side: Side;
  isRevealed: (duelData: DuelData) => boolean;
  cardsLength: (duelData: DuelData) => number;
}[] = [
  {
    side: 'top-left',
    isRevealed: (d) => d.topLeftRevealed,
    cardsLength: (d) => d.topLeftPlayerData.cards.length
  },
  {
    side: 'bottom-left',
    isRevealed: (d) => d.bottomLeftRevealed,
    cardsLength: (d) => d.bottomLeftPlayerData.cards.length
  },
  {
    side: 'top-right',
    isRevealed: (d) => d.topRightRevealed,
    cardsLength: (d) => d.topRightPlayerData.cards.length
  },
  {
    side: 'bottom-right',
    isRevealed: (d) => d.bottomRightRevealed,
    cardsLength: (d) => d.bottomRightPlayerData.cards.length
  }
];

/** Unpicked, unrevealed sides still free for a Second Chance re-pick. */
export const countAvailableSecondChanceSides = (duelData: DuelData): number => {
  const disabled = new Set(duelData.removedWorstGroups || []);
  return SIDE_AVAILABILITY.filter(
    ({ side, isRevealed, cardsLength }) =>
      !disabled.has(side) && !isRevealed(duelData) && cardsLength(duelData) === 0
  ).length;
};

/**
 * Whether a team may activate Second Chance in the current duel phase.
 *
 * Phases:
 * - after first pick only → first player team, if a free side remains
 * - after both picks / duel resolved → losing participant team(s)
 *   (empty-side count is ignored; implementSecondChance resets selections)
 */
export const canUseSecondChance = ({
  teamKey,
  duelData,
  isFinishDuel
}: {
  teamKey: TeamName;
  duelData: DuelData;
  isFinishDuel?: boolean;
}): boolean => {
  if ((duelData.secondChanceUsedByTeams || []).includes(teamKey)) {
    return false;
  }

  const firstPlayerTeam = duelData.player1Team;
  const secondPlayerTeam = duelData.player2Team;
  const finished = isFinishDuel ?? duelData.isFinishDuel;
  const bothSelected =
    !!duelData.player1SideSelected && !!duelData.player2SideSelected;

  if (finished || bothSelected) {
    if (teamKey !== firstPlayerTeam && teamKey !== secondPlayerTeam) {
      return false;
    }
    let winningTeam = duelData.winningTeam;
    if (
      !winningTeam &&
      duelData.player1SideSelected &&
      duelData.player2SideSelected
    ) {
      const p1Cards = getCardsBySide(duelData, duelData.player1SideSelected);
      const p2Cards = getCardsBySide(duelData, duelData.player2SideSelected);
      if (p1Cards.length > 0 && p2Cards.length > 0) {
        const isP1Winner = compareHands(p1Cards, p2Cards) === 'player1';
        winningTeam = isP1Winner ? firstPlayerTeam : secondPlayerTeam;
      }
    }
    if (!winningTeam) {
      return false;
    }
    return winningTeam !== teamKey;
  }

  if (duelData.player1SideSelected && !duelData.player2SideSelected) {
    if (teamKey !== firstPlayerTeam) {
      return false;
    }
    return countAvailableSecondChanceSides(duelData) > 0;
  }

  return false;
};
