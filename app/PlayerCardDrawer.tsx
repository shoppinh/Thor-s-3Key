import React from 'react';

interface Card {
    value: number;
    suit: string;
}

/**
 * Props for PlayerCardDrawer component
 */
interface PlayerCardDrawerProps {
    className: string;
    playerName: string;
    teamName: string;
    cards: Card[];
    sum: number;
    onDraw: () => void;
    side: 'left' | 'right';
    disabled: boolean;
    renderTheCards: (cards: Card[]) => React.ReactNode;
    CARDS_COVER: Card[];
}

/**
 * Renders a player's card drawing interface with draw button, hand pointer, and card display
 * @param playerName - The name of the player
 * @param cards - Array of cards the player has drawn
 * @param sum - The sum of the player's cards
 * @param onDraw - Callback function when draw button is clicked
 * @param disabled - Whether the draw button is disabled
 * @param side - Which side the player is on (left/right) for hand pointer
 * @param renderTheCards - Function to render the cards
 * @param CARDS_COVER - Array of placeholder cards to show when no cards drawn
 */
const PlayerCardDrawer: React.FC<PlayerCardDrawerProps> = ({
    className,
    playerName,
    teamName,
    cards,
    sum,
    onDraw,
    side,
    disabled,
    renderTheCards,
    CARDS_COVER,
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
                    <h2 className={'m0'}>{playerName}</h2>
                    <div className={'drawCardsContainer'}>
                        {cards.length === 0 &&
                            <>
                                <img
                                    className={'leftHandPointer'}
                                    style={{ top: '15px', display: disabled ? 'none' : 'block' }}
                                    src='images/left-hand.png'
                                    alt='cursor'
                                />
                                <button
                                    onClick={onDraw}
                                    className={'btn'}
                                    style={{ width: '480px' }}
                                    disabled={disabled}
                                >
                                    Draw Cards
                                </button>
                            </>
                        }
                        {cards.length > 0 &&
                            <span className={teamName === '' ? 'sumNumber text-black' : 'sumNumber ' + teamName}>
                                {sum}
                            </span>
                        }
                    </div>
                    <div className={'cardContainer'}>
                        {renderTheCards(cards.length > 0 ? cards : CARDS_COVER)}
                    </div>
                </div>
            </>
        )}
        {side === 'right' && (
            <>
                <div className={'playerContainer'}>
                    <h2 className={'m0'}>{playerName}</h2>
                    <div className={'drawCardsContainer'}>
                        {cards.length === 0 &&
                            <>
                                <img
                                    className={'rightHandPointer'}
                                    style={{ top: '15px', display: disabled ? 'none' : 'block' }}
                                    src='images/right-hand.png'
                                    alt='cursor'
                                />
                                <button
                                    onClick={onDraw}
                                    className={'btn'}
                                    style={{ width: '480px' }}
                                    disabled={disabled}
                                >
                                    Draw Cards
                                </button>
                            </>
                        }
                        {cards.length > 0 &&
                            <span className={teamName === '' ? 'sumNumber text-black' : 'sumNumber ' + teamName}>
                                {sum}
                            </span>
                        }
                    </div>
                    <div className={'cardContainer'}>
                        {renderTheCards(cards.length > 0 ? cards : CARDS_COVER)}
                    </div>
                </div>
            </>
        )}  
    </div>
);

export default PlayerCardDrawer; 