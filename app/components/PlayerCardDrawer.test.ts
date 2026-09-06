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
    expect(displayState.isUnselectedReveal).toBe(true);
  });

  it('keeps isUnselectedReveal false when duel is active or hand is not blank', () => {
    const coveredCards = [card(0, ''), card(0, ''), card(0, '')];
    const fullCards = [card(1, '♦'), card(1, '♥'), card(9, '♠')];

    const activeDisplayState = getPlayerCardDrawerDisplayState({
      playerCards: [],
      coveredCards,
      fullCards,
      isFinishDuel: false,
      disabledByRemoveWorst: false
    });
    expect(activeDisplayState.isUnselectedReveal).toBe(false);

    const filledDisplayState = getPlayerCardDrawerDisplayState({
      playerCards: [card(1, '♦')],
      coveredCards,
      fullCards,
      isFinishDuel: true,
      disabledByRemoveWorst: false
    });
    expect(filledDisplayState.isUnselectedReveal).toBe(false);
  });

  it('disables clicking cards when isAiThinking is true', () => {
    const displayState = getPlayerCardDrawerDisplayState({
      playerCards: [],
      coveredCards: [card(0, '')],
      fullCards: [card(1, '♦')],
      isFinishDuel: false,
      disabledByRemoveWorst: false,
      isAiThinking: true
    });

    expect(displayState.shouldShowDrawButton).toBe(true);
    expect(displayState.canClickCards).toBe(false);
  });

  it('disallows draw and card clicks when group already has cards drawn', () => {
    const displayState = getPlayerCardDrawerDisplayState({
      playerCards: [card(1, '♦'), card(2, '♥'), card(3, '♠')],
      coveredCards: [card(0, '')],
      fullCards: [card(1, '♦'), card(2, '♥'), card(3, '♠')],
      isFinishDuel: false,
      disabledByRemoveWorst: false
    });

    expect(displayState.shouldShowDrawButton).toBe(false);
    expect(displayState.canClickCards).toBe(false);
  });
});

