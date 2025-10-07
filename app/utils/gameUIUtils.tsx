import { PowerUpsAllocation } from '~/hooks/usePowerupAllocation';
import TeamData from '~/models/TeamData';
import Card from '~/models/Card';
import { getCardImage } from '~/utils/gameUtil';

export const renderTheCards = (
  cards: Card[],
  onCardClick?: () => void,
  disabled?: boolean
) => {
  return cards.map((card, index) => (
    <img
      key={index}
      src={getCardImage(card.value, card.suit)}
      alt={`${card.value}${card.suit}`}
      style={{
        width: '150px',
        cursor: onCardClick && !disabled ? 'pointer' : 'default'
      }}
      role={onCardClick && !disabled ? 'button' : undefined}
      tabIndex={onCardClick && !disabled ? 0 : undefined}
      onClick={onCardClick && !disabled ? onCardClick : undefined}
      onKeyDown={
        onCardClick && !disabled
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCardClick();
            }
          }
          : undefined
      }
    />
  ));
};

export const isStartGameDisabled = (
  gameState: string,
  team1Alloc: PowerUpsAllocation,
  team2Alloc: PowerUpsAllocation,
  team1Data: TeamData,
  team2Data: TeamData,
  setupMode: 'per-team' | 'both' | 'random'
): boolean => {
  if (gameState === 'gameLoading') {
    return true;
  }

  const isAllocationValid = (
    alloc: PowerUpsAllocation,
    total: number
  ): boolean => {
    const sum =
      alloc.secondChance + alloc.revealTwo + alloc.lifeShield + alloc.lockAll + alloc.removeWorst;
    const perTypeValid =
      alloc.secondChance <= 2 &&
      alloc.revealTwo <= 2 &&
      alloc.lifeShield <= 2 &&
      alloc.lockAll <= 2 &&
      alloc.removeWorst <= 2;
    return sum === total && perTypeValid;
  };

  if (setupMode === 'both' || setupMode === 'random') {
    const isAllocValid = isAllocationValid(team1Alloc, team1Data.totalPowerUps);
    return !isAllocValid;
  }

  const isTeam1AllocationValid = isAllocationValid(
    team1Alloc,
    team1Data.totalPowerUps
  );
  const isTeam2AllocationValid = isAllocationValid(
    team2Alloc,
    team2Data.totalPowerUps
  );

  return !(isTeam1AllocationValid && isTeam2AllocationValid);
};

export const renderLabelWithIcon = (
  labelText: string,
  imageFileName: string,
  htmlFor: string
) => {
  return (
    <label htmlFor={htmlFor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img
        src={`/images/${imageFileName}`}
        alt=""
        width={22}
        height={22}
        style={{ display: 'inline-block' }}
      />
      <span>{labelText}</span>
    </label>
  );
};