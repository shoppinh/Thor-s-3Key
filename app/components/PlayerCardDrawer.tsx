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
  const disabledByRemoveWorst = (() => {
    const disabled = new Set(duelData.removedWorstGroups || []);
    const key =
      side === 'left'
        ? playerData === duelData.topLeftPlayerData
          ? 'top-left'
          : playerData === duelData.bottomLeftPlayerData
            ? 'bottom-left'
            : null
        : playerData === duelData.topRightPlayerData
          ? 'top-right'
          : playerData === duelData.bottomRightPlayerData
            ? 'bottom-right'
            : null;
    return key ? disabled.has(key) : false;
  })();
  const isBlankHand = playerData.cards.length === 0;
  const canClickDraw = isBlankHand && !disabledByRemoveWorst;
  const shouldShowDrawButton = isBlankHand;
  const isDrawDisabled = disabled || disabledByRemoveWorst;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '480px',
    position: 'relative',
    padding: '5px',
    transition: 'all 0.3s ease'
  };

  return (
    <div
      className={`${className} rpg-panel`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px',
        margin: '5px',
        background: 'rgba(15, 12, 41, 0.6)',
        border: '1px solid rgba(0, 242, 255, 0.3)',
        opacity: isDrawDisabled && !playerData.name ? 0.5 : 1
      }}
    >
      <div className={'playerContainer'} style={containerStyle}>
        {/* Player Name Header */}
        <div 
          className="rpg-skewed"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.1), transparent)',
            padding: '3px 15px',
            marginBottom: '8px',
            borderBottom: '1px solid var(--color-secondary)',
            textAlign: 'center'
          }}
        >
          <h2 className={'m0 text-glow'} style={{ 
            color: varColorForTeam(playerData.team),
            fontSize: '1.5rem',
            letterSpacing: '1px'
          }}>
            {playerData.name || 'UNKNOWN'}
          </h2>
        </div>

        <div className={'drawCardsContainer'} style={{ position: 'relative', minHeight: '60px', height: '60px' }}>
          {shouldShowDrawButton && (
            <>
              {/* Animated Hand Pointer */}
              <img
                className={side === 'left' ? 'leftHandPointer' : 'rightHandPointer'}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: side === 'left' ? 'auto' : '-80px',
                  right: side === 'right' ? 'auto' : '-80px',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  display: isDrawDisabled ? 'none' : 'block',
                  filter: 'drop-shadow(0 0 5px var(--color-secondary))',
                  width: '60px',
                  height: '60px',
                  objectFit: 'contain',
                  animation: side === 'left' ? 'point-left 1s ease-in-out infinite' : 'point-right 1s ease-in-out infinite'
                }}
                src={side === 'left' ? "images/left-hand.png" : "images/right-hand.png"}
                alt="cursor"
              />
              
              <button
                onClick={onSelect}
                className={'rpg-button'}
                style={{
                  width: '100%',
                  height: '50px',
                  fontSize: '1.2rem',
                  cursor: isDrawDisabled ? 'default' : 'pointer',
                  opacity: isDrawDisabled ? 0.5 : 1,
                  background: isDrawDisabled ? '#333' : 'var(--color-primary)'
                }}
                disabled={isDrawDisabled}
              >
                {isDrawDisabled ? 'LOCKED' : 'DRAW CARDS'}
              </button>
            </>
          )}

          {!isBlankHand && (
            <div 
              className="rpg-skewed"
              onClick={
                playerData.name === '?' &&
                playerData.team === '' &&
                !disabled
                  ? onSelect
                  : undefined
              }
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: `2px solid ${varColorForTeam(playerData.team)}`,
                cursor: playerData.name === '?' && playerData.team === '' && !disabled ? 'pointer' : 'default'
              }}
            >
              <span
                className="text-glow"
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#fff',
                  transform: 'skewX(10deg)' // Counter-skew
                }}
              >
                {playerData.sum}
              </span>
            </div>
          )}
        </div>

        <div className={'cardContainer'} style={{display: 'flex', marginTop: '10px', gap: '8px', justifyContent: 'center' }}>
          {renderTheCards(
            playerData.cards.length > 0 ? playerData.cards : CARDS_COVER,
            canClickDraw ? onSelect : undefined,
            isDrawDisabled
          )}
        </div>
      </div>
    </div>
  );
};

// Helper to get color based on team
const varColorForTeam = (team: string) => {
  if (team === 'team1') return 'var(--color-secondary)'; // Cyan
  if (team === 'team2') return 'var(--color-primary)';   // Pink
  return '#fff';
};

export default PlayerCardDrawer;
