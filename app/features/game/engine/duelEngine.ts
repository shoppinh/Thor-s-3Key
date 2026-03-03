import Card from '~/models/Card';
import DuelData from '~/models/DuelData';
import { PlayerData } from '~/models/PlayerData';
import { Side, TeamId } from '~/features/game/types/gameTypes';

export const getCardsBySide = (duelData: DuelData, side: Side): Card[] => {
  if (side === 'top-left') return duelData.topLeftCards;
  if (side === 'bottom-left') return duelData.bottomLeftCards;
  if (side === 'top-right') return duelData.topRightCards;
  return duelData.bottomRightCards;
};

export const getPlayerDataBySide = (
  duelData: DuelData,
  side: Side
): PlayerData => {
  if (side === 'top-left') return duelData.topLeftPlayerData;
  if (side === 'bottom-left') return duelData.bottomLeftPlayerData;
  if (side === 'top-right') return duelData.topRightPlayerData;
  return duelData.bottomRightPlayerData;
};

export const applyPlayerSelectionToDuel = ({
  duelData,
  side,
  currentPlayer,
  teamName,
  sum,
  cards,
  duelIndex
}: {
  duelData: DuelData;
  side: Side;
  currentPlayer: string;
  teamName: TeamId;
  sum: number;
  cards: Card[];
  duelIndex: number;
}): Partial<DuelData> => {
  const updates: Partial<DuelData> = {
    duelIndex
  };

  if (duelData.duelIndex === 0) {
    updates.player1Name = currentPlayer;
    updates.player1Team = teamName;
    updates.player1SideSelected = side;
  } else {
    updates.player2Name = currentPlayer;
    updates.player2Team = teamName;
    updates.player2SideSelected = side;
  }

  if (side === 'top-left') {
    updates.topLeftPlayerData = {
      name: currentPlayer,
      team: teamName,
      sum,
      cards
    };
    updates.topLeftRevealed = true;
  } else if (side === 'bottom-left') {
    updates.bottomLeftPlayerData = {
      name: currentPlayer,
      team: teamName,
      sum,
      cards
    };
    updates.bottomLeftRevealed = true;
  } else if (side === 'top-right') {
    updates.topRightPlayerData = {
      name: currentPlayer,
      team: teamName,
      sum,
      cards
    };
    updates.topRightRevealed = true;
  } else {
    updates.bottomRightPlayerData = {
      name: currentPlayer,
      team: teamName,
      sum,
      cards
    };
    updates.bottomRightRevealed = true;
  }

  return updates;
};

export const getAvailableSelectableGroupCount = (
  duelData: DuelData
): number => {
  const disabledGroups = new Set(duelData.removedWorstGroups || []);
  return [
    !disabledGroups.has('top-left') &&
      !duelData.topLeftRevealed &&
      duelData.topLeftPlayerData.cards.length === 0,
    !disabledGroups.has('bottom-left') &&
      !duelData.bottomLeftRevealed &&
      duelData.bottomLeftPlayerData.cards.length === 0,
    !disabledGroups.has('top-right') &&
      !duelData.topRightRevealed &&
      duelData.topRightPlayerData.cards.length === 0,
    !disabledGroups.has('bottom-right') &&
      !duelData.bottomRightRevealed &&
      duelData.bottomRightPlayerData.cards.length === 0
  ].filter(Boolean).length;
};
