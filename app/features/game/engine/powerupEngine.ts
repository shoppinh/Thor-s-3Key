import Card from '~/models/Card';
import DuelData from '~/models/DuelData';
import { Side, TeamName } from '~/features/game/types/gameTypes';
import {
  calculateSum,
  getCardHighestSuitAndValue,
  suitRank
} from '~/utils/gameUtil';

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
