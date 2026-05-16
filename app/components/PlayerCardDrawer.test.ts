import { describe, expect, it } from 'vitest';
import { getPlayerCardDrawerDisplayState } from './PlayerCardDrawer';

const card = (value: number, suit: string) => ({ value, suit });

describe('getPlayerCardDrawerDisplayState', () => {
  it('shows full cards instead of a draw button for blank groups after duel finish', () => {
    const coveredCards = [card(0, ''), card(0, ''), card(0, '')];
    const fullCards = [card(1, '♦'), card(1, '♥'), card(9, '♠')];

    const displayState = getPlayerCardDrawerDisplayState({
      playerCards: [],
      coveredCards,
      fullCards,
      isFinishDuel: true,
      disabledByRemoveWorst: false
    });

    expect(displayState.cards).toEqual(fullCards);
    expect(displayState.shouldShowDrawButton).toBe(false);
    expect(displayState.canClickCards).toBe(false);
  });
});
