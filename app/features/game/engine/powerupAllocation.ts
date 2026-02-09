import { GameState, PowerUpsAllocation, SetupMode } from '~/features/game/types/gameTypes';

export const isAllocationValid = (
  allocation: PowerUpsAllocation,
  total: number,
  maxPerType = 2
): boolean => {
  const sum =
    allocation.secondChance +
    allocation.revealTwo +
    allocation.lifeShield +
    allocation.removeWorst;
  const perTypeValid =
    allocation.secondChance <= maxPerType &&
    allocation.revealTwo <= maxPerType &&
    allocation.lifeShield <= maxPerType &&
    allocation.removeWorst <= maxPerType;
  return sum === total && perTypeValid;
};

export const isStartGameDisabledByAllocation = ({
  gameState,
  setupMode,
  team1Alloc,
  team2Alloc,
  team1Total,
  team2Total
}: {
  gameState: GameState;
  setupMode: SetupMode;
  team1Alloc: PowerUpsAllocation;
  team2Alloc: PowerUpsAllocation;
  team1Total: number;
  team2Total: number;
}): boolean => {
  if (gameState === 'gameLoading') {
    return true;
  }

  if (setupMode === 'both' || setupMode === 'random') {
    return !isAllocationValid(team1Alloc, team1Total);
  }

  return !(
    isAllocationValid(team1Alloc, team1Total) &&
    isAllocationValid(team2Alloc, team2Total)
  );
};

export const generateRandomAllocation = (
  total: number,
  maxPerType = 2
): PowerUpsAllocation => {
  const result: PowerUpsAllocation = {
    secondChance: 0,
    revealTwo: 0,
    lifeShield: 0,
    removeWorst: 0
  };

  const keys: (keyof PowerUpsAllocation)[] = [
    'secondChance',
    'revealTwo',
    'lifeShield',
    'removeWorst'
  ];

  let placed = 0;
  while (placed < total) {
    const available = keys.filter((k) => result[k] < maxPerType);
    if (available.length === 0) break;
    const pick = available[Math.floor(Math.random() * available.length)];
    result[pick] += 1;
    placed += 1;
  }

  return result;
};
