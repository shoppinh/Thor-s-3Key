import React from 'react';
import PlayerData from '~/models/PlayerData';
import DuelData from '~/models/DuelData';

interface Card {
  value: number;
  suit: string;
}

/**
 * Props for PlayerCardDrawer component
 */
interface PlayerCardDrawerProps {
  className: string;
  duelData: DuelData;
  playerData: PlayerData;
  onSelect: () => void;
  side: 'left' | 'right';
  disabled: boolean;
  renderTheCards: (
    cards: Card[],
    onCardClick?: () => void,
    disabled?: boolean
  ) => React.ReactNode;
  CARDS_COVER: Card[];
}

/**
 * Renders a player's card drawing interface with draw button, hand pointer, and card display
 * @param className
 * @param playerData
 * @param onDraw - Callback function when draw button is clicked
 * @param disabled - Whether the draw button is disabled
 * @param side - Which side the player is on (left/right) for hand pointer
 * @param renderTheCards - Function to render the cards
 * @param CARDS_COVER - Array of placeholder cards to show when no cards drawn
 */
const PlayerCardDrawer: React.FC<PlayerCardDrawerProps> = ({
  className,
  duelData,
  playerData,
  onSelect,
  side,
  disabled,
  renderTheCards,
  CARDS_COVER
}) => {
  // Helper function to determine if player can make a selection
  // True when: no cards drawn (normal case)
  // After Second Chance, show calculated number instead of Draw Cards
  const getDisabledByRemoveWorst = () => {
    const disabled = new Set(duelData.removedWorstGroups || []);
    let key: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right' | null = null;
    if (side === 'left') {
      if (playerData === duelData.topLeftPlayerData) {
        key = 'top-left';
      } else if (playerData === duelData.bottomLeftPlayerData) {
        key = 'bottom-left';
      }
    } else {
      if (playerData === duelData.topRightPlayerData) {
        key = 'top-right';
      } else if (playerData === duelData.bottomRightPlayerData) {
        key = 'bottom-right';
      }
    }
    return key ? disabled.has(key) : false;
  };

  const disabledByRemoveWorst = getDisabledByRemoveWorst();
  const isBlankHand = playerData.cards.length === 0;
  const canClickDraw = isBlankHand && !disabledByRemoveWorst;
  const shouldShowDrawButton = isBlankHand;
  const isDrawDisabled = disabled || disabledByRemoveWorst;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between'
      }}
    >
      {side === 'left' && (
        <div className={'playerContainer'}>
          <h2 className={'m0'}>{playerData.name || '?'}</h2>
          <div className={'drawCardsContainer'}>

          </div>
          <div className={'cardContainer'}>
            {renderTheCards(
              playerData.cards.length > 0 ? playerData.cards : CARDS_COVER,
              canClickDraw ? onSelect : undefined,
              isDrawDisabled
            )}
          </div>
        </div>
      )}
      {side === 'right' && (
        <div className={'playerContainer'}>
          <h2 className={'m0'}>{playerData.name || '?'}</h2>
          <div className={'drawCardsContainer'}>
            {shouldShowDrawButton && (
              <>
                <img
                  className={'rightHandPointer'}
                  style={{
                    top: '15px',
                    display: isDrawDisabled ? 'none' : 'block'
                  }}
                  src="images/right-hand.png"
                  alt="cursor"
                />
                <button
                  onClick={onSelect}
                  className={'btn'}
                  style={{
                    width: '480px',
                    cursor: isDrawDisabled ? 'default' : 'pointer'
                  }}
                  disabled={isDrawDisabled}
                >
                  Draw Cards
                </button>
              </>
            )}
            {!isBlankHand && (
              <span
                className={
                  playerData.team === ''
                    ? 'sumNumber text-black'
                    : 'sumNumber ' + playerData.team
                }
                onClick={
                  playerData.name === '?' &&
                  playerData.team === '' &&
                  !disabled
                    ? onSelect
                    : undefined
                }
                onKeyDown={
                  playerData.name === '?' &&
                  playerData.team === '' &&
                  !disabled
                    ? () => onSelect()
                    : undefined
                }
                style={{
                  cursor:
                    playerData.name === '?' &&
                    playerData.team === '' &&
                    !disabled
                      ? 'pointer'
                      : 'default'
                }}
                tabIndex={
                  playerData.name === '?' &&
                  playerData.team === '' &&
                  !disabled
                    ? 0
                    : undefined
                }
              >
                {playerData.sum}
              </span>
            )}
          </div>
          <div className={'cardContainer'}>
            {renderTheCards(
              playerData.cards.length > 0 ? playerData.cards : CARDS_COVER,
              canClickDraw ? onSelect : undefined,
              isDrawDisabled
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCardDrawer;
