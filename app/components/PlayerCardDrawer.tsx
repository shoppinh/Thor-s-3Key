/* eslint-disable react/prop-types */
import React from 'react';
import { PlayerData } from '~/models/PlayerData';
import DuelData from '~/models/DuelData';
import { useLanguage } from '~/contexts/LanguageContext';
import { calculateSum } from '~/utils/gameUtil';

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
  fullCards: Card[];
  onSelect: () => void;
  side: 'left' | 'right';
  disabled: boolean;
  renderTheCards: (
    cards: Card[],
    onCardClick?: () => void,
    disabled?: boolean
  ) => React.ReactNode;
  CARDS_COVER: Card[];
  isAiThinking?: boolean;
  isAiSelected?: boolean;
}

export const getPlayerCardDrawerDisplayState = ({
  playerCards,
  coveredCards,
  fullCards,
  isFinishDuel,
  disabledByRemoveWorst,
  isAiThinking = false
}: {
  playerCards: Card[];
  coveredCards: Card[];
  fullCards: Card[];
  isFinishDuel: boolean;
  disabledByRemoveWorst: boolean;
  isAiThinking?: boolean;
}) => {
  const isBlankHand = playerCards.length === 0;
  const isUnselectedReveal = isBlankHand && isFinishDuel;
  const cards = isUnselectedReveal
    ? fullCards
    : playerCards.length > 0
      ? playerCards
      : coveredCards;

  const canAct = isBlankHand && !isFinishDuel;

  return {
    cards,
    shouldShowDrawButton: canAct,
    canClickCards: canAct && !disabledByRemoveWorst && !isAiThinking,
    isUnselectedReveal
  };
};

/**
 * Renders a player's card drawing interface with draw button, hand pointer, and card display
 */
const PlayerCardDrawer: React.FC<PlayerCardDrawerProps> = ({
  className,
  duelData,
  playerData,
  fullCards,
  onSelect,
  side,
  disabled,
  renderTheCards,
  CARDS_COVER,
  isAiThinking = false,
  isAiSelected = false
}) => {
  const { t } = useLanguage();
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
  const titleTeamClass =
    playerData.team === 'team1'
      ? 'team-one'
      : playerData.team === 'team2'
        ? 'team-two'
        : '';
  const displayState = getPlayerCardDrawerDisplayState({
    playerCards: playerData.cards,
    coveredCards: CARDS_COVER,
    fullCards,
    isFinishDuel: duelData.isFinishDuel,
    disabledByRemoveWorst,
    isAiThinking
  });
  const unselectedSum =
    displayState.isUnselectedReveal && fullCards.length > 0
      ? calculateSum(fullCards)
      : null;
  const isDrawDisabled = disabled || disabledByRemoveWorst || isAiThinking;

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
      className={`${className} rpg-panel player-card-drawer ${
        isDrawDisabled && !playerData.name ? 'is-locked' : ''
      }`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px',
        margin: '5px',
        background: 'var(--color-surface, rgba(15, 12, 41, 0.6))',
        border: isAiSelected
          ? '2px solid var(--color-accent)'
          : '1px solid rgba(0, 242, 255, 0.3)',
        boxShadow: isAiSelected ? '0 0 18px var(--color-accent)' : undefined,
        opacity: isDrawDisabled && !playerData.name ? 0.64 : 1
      }}
    >
      <div className={'playerContainer'} style={containerStyle}>
        {/* Player Name Header */}
        <div
          className="rpg-skewed player-card-header"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.1), transparent)',
            padding: '3px 15px',
            marginBottom: '8px',
            borderBottom: '1px solid var(--color-secondary)',
            textAlign: 'center'
          }}
        >
          <h2
            className={`m0 text-glow player-card-title ${titleTeamClass}`}
            style={{
              color: varColorForTeam(playerData.team),
              fontSize: '1.5rem',
              letterSpacing: '1px'
            }}
          >
            {playerData.name || t('game.unknown')}
          </h2>
        </div>

        <div
          className={'drawCardsContainer'}
          style={{
            position: 'relative',
            minHeight: '70px',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {displayState.shouldShowDrawButton && (
            <>
              {/* Animated Hand Pointer */}
              <img
                className={
                  side === 'left' ? 'leftHandPointer' : 'rightHandPointer'
                }
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
                  animation:
                    side === 'left'
                      ? 'point-left 1s ease-in-out infinite'
                      : 'point-right 1s ease-in-out infinite'
                }}
                src={
                  side === 'left'
                    ? 'images/left-hand.png'
                    : 'images/right-hand.png'
                }
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
                {isDrawDisabled ? t('game.locked') : t('game.drawCard')}
              </button>
            </>
          )}

          {!isBlankHand && (
            <div
              className="rpg-skewed player-score-badge"
              style={{
                display: 'flex',
                padding: '4px 12px',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: `2px solid ${varColorForTeam(playerData.team)}`
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

          {displayState.isUnselectedReveal && unselectedSum !== null && (
            <div
              className="rpg-skewed unselected-score-badge"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '4px 16px',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60px',
                minWidth: '100px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px dashed rgba(148, 163, 184, 0.5)',
                boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)'
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  transform: 'skewX(10deg)',
                  lineHeight: 1
                }}
              >
                {t('game.unselected')}
              </span>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#cbd5e1',
                  transform: 'skewX(10deg)',
                  lineHeight: 1.1
                }}
              >
                {unselectedSum}
              </span>
            </div>
          )}
        </div>

        <div
          className={'cardContainer'}
          style={{
            display: 'flex',
            marginTop: '10px',
            gap: '8px',
            justifyContent: 'center'
          }}
        >
          {renderTheCards(
            displayState.cards,
            displayState.canClickCards ? onSelect : undefined,
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
  if (team === 'team2') return 'var(--color-primary)'; // Pink
  return '#fff';
};

export default PlayerCardDrawer;
