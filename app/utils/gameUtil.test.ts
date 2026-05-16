import { describe, expect, it } from 'vitest';
import { compareHands } from '~/utils/gameUtil';

describe('compareHands', () => {
  it('chooses the hand with the higher calculated sum', () => {
    expect(
      compareHands(
        [
          { value: 4, suit: '♣' },
          { value: 2, suit: '♣' },
          { value: 1, suit: '♣' }
        ],
        [
          { value: 3, suit: '♦' },
          { value: 2, suit: '♦' },
          { value: 1, suit: '♦' }
        ]
      )
    ).toBe('player1');
  });

  it('uses suit rank when calculated sums are tied', () => {
    expect(
      compareHands(
        [
          { value: 4, suit: '♣' },
          { value: 3, suit: '♣' },
          { value: 2, suit: '♣' }
        ],
        [
          { value: 4, suit: '♦' },
          { value: 3, suit: '♣' },
          { value: 2, suit: '♣' }
        ]
      )
    ).toBe('player2');
  });

  it('treats ace as the highest value when highest suits are tied', () => {
    expect(
      compareHands(
        [
          { value: 1, suit: '♠' },
          { value: 5, suit: '♣' },
          { value: 3, suit: '♣' }
        ],
        [
          { value: 9, suit: '♠' },
          { value: 5, suit: '♣' },
          { value: 3, suit: '♣' }
        ]
      )
    ).toBe('player1');
  });

  it('uses highest card value when sums and highest suits are tied', () => {
    expect(
      compareHands(
        [
          { value: 8, suit: '♥' },
          { value: 7, suit: '♣' },
          { value: 4, suit: '♣' }
        ],
        [
          { value: 9, suit: '♥' },
          { value: 6, suit: '♣' },
          { value: 4, suit: '♣' }
        ]
      )
    ).toBe('player2');
  });
});
