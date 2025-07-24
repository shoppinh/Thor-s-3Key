import React from 'react';
import PlayerData from '~/models/PlayerData';

interface Card {
  value: number;
  suit: string;
}

/**
 * Props for PlayerCardDrawer component
 */
interface PlayerCardDrawerProps {
  className: string;
  playerData: PlayerData;
  onSelect: () => void;
  side: 'left' | 'right';
  disabled: boolean;
  renderTheCards: (cards: Card[], onCardClick?: () => void, disabled?: boolean) => React.ReactNode;
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
const PlayerCardDrawer: React.FC<PlayerCardDrawerProps> = (
  {
    className,
    playerData,
    onSelect,
    side,
    disabled,
    renderTheCards,
    CARDS_COVER
  }) => (
  <div
    className={className}
    style={{
      display: 'flex',
      justifyContent: 'space-between'
    }}
  >
    {side === 'left' && (
      <>
        <div className={'playerContainer'}>
          <h2 className={'m0'}>{playerData.name || '?'}</h2>
          <div className={'drawCardsContainer'}>
            {playerData.cards.length === 0 &&
              <>
                <img
                  className={'leftHandPointer'}
                  style={{ top: '15px', display: disabled ? 'none' : 'block' }}
                  src='images/left-hand.png'
                  alt='cursor'
                />
                <button
                  onClick={onSelect}
                  className={'btn'}
                  style={{
                    width: '480px',
                    cursor: disabled ? 'default' : 'pointer'
                  }}
                  disabled={disabled}
                >
                  Draw Cards
                </button>
              </>
            }
            {playerData.cards.length > 0 &&
              <span className={playerData.team === '' ? 'sumNumber text-black' : 'sumNumber ' + playerData.team}>
              {playerData.sum}
              </span>
            }
          </div>
          <div className={'cardContainer'}>
            {renderTheCards(
              playerData.cards.length > 0 ? playerData.cards : CARDS_COVER,
              playerData.cards.length === 0 ? onSelect : undefined,
              disabled
            )}
          </div>
        </div>
      </>
    )}
    {side === 'right' && (
      <>
        <div className={'playerContainer'}>
          <h2 className={'m0'}>{playerData.name || '?'}</h2>
          <div className={'drawCardsContainer'}>
            {playerData.cards.length === 0 &&
              <>
                <img
                  className={'rightHandPointer'}
                  style={{ top: '15px', display: disabled ? 'none' : 'block' }}
                  src='images/right-hand.png'
                  alt='cursor'
                />
                <button
                  onClick={onSelect}
                  className={'btn'}
                  style={{
                    width: '480px',
                    cursor: disabled ? 'default' : 'pointer'
                  }}
                  disabled={disabled}
                >
                  Draw Cards
                </button>
              </>
            }
            {playerData.cards.length > 0 &&
              <span className={playerData.team === '' ? 'sumNumber text-black' : 'sumNumber ' + playerData.team}>
                {playerData.sum}
              </span>
            }
          </div>
          <div className={'cardContainer'}>
            {renderTheCards(
              playerData.cards.length > 0 ? playerData.cards : CARDS_COVER,
              playerData.cards.length === 0 ? onSelect : undefined,
              disabled
            )}
          </div>
        </div>
      </>
    )}
  </div>
);

export default PlayerCardDrawer;
