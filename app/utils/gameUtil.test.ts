import { describe, expect, it } from 'vitest';
import { compareHands, calculateWinStreaksFromEvents } from '~/utils/gameUtil';

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
          { value: 8, suit: '♣' },
          { value: 3, suit: '♣' }
        ],
        [
          { value: 9, suit: '♠' },
          { value: 1, suit: '♣' },
          { value: 2, suit: '♣' }
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

describe('calculateWinStreaksFromEvents', () => {
  it('returns empty object when events list is empty', () => {
    expect(calculateWinStreaksFromEvents([])).toEqual({});
  });

  it('accurately accumulates winner streaks and resets loser streaks', () => {
    const events = [
      { winnerName: 'Alice', loserName: 'Bob' },
      { winnerName: 'Alice', loserName: 'Charlie' },
      { winnerName: 'Bob', loserName: 'Alice' }
    ];

    expect(calculateWinStreaksFromEvents(events)).toEqual({
      Bob: 1,
      Alice: 0,
      Charlie: 0
    });
  });

  it('restores previous streak when an invalidated duel event is removed', () => {
    const events = [
      { winnerName: 'Alice', loserName: 'Bob' },
      { winnerName: 'Alice', loserName: 'Charlie' }
    ];

    expect(calculateWinStreaksFromEvents(events)).toEqual({
      Alice: 2,
      Bob: 0,
      Charlie: 0
    });
  });
});
