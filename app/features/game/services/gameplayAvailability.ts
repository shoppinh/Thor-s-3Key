import type DuelData from '~/models/DuelData';
import type { Side, TeamName } from '~/features/game/types/gameTypes';

const SELECTABLE_SIDES: Side[] = [
  'top-left',
  'bottom-left',
  'top-right',
  'bottom-right'
];

export function getCurrentPlayerTeam(
  currentPlayerName: string,
  team1Players: string[],
  team2Players: string[]
): TeamName | undefined {
  if (team1Players.includes(currentPlayerName)) return 'team1';
  if (team2Players.includes(currentPlayerName)) return 'team2';
  return undefined;
}

export function getAiSelectableSides(duelData: DuelData): Side[] {
  return SELECTABLE_SIDES.filter((side) => {
    if (duelData.removedWorstGroups?.includes(side)) return false;

    switch (side) {
      case 'top-left':
        return (
          !duelData.topLeftRevealed &&
          duelData.topLeftPlayerData.cards.length === 0
        );
      case 'bottom-left':
        return (
          !duelData.bottomLeftRevealed &&
          duelData.bottomLeftPlayerData.cards.length === 0
        );
      case 'top-right':
        return (
          !duelData.topRightRevealed &&
          duelData.topRightPlayerData.cards.length === 0
        );
      case 'bottom-right':
        return (
          !duelData.bottomRightRevealed &&
          duelData.bottomRightPlayerData.cards.length === 0
        );
    }
  });
}
