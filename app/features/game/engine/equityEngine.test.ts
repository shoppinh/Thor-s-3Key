import { describe, expect, it } from 'vitest';
import { calculateDuelEquity } from '~/features/game/engine/equityEngine';
import { createInitialDuelData } from '~/features/game/state/initialState';
import DuelData from '~/models/DuelData';

const card = (value: number, suit: string) => ({ value, suit });

const withPlayer1Selection = (
  updates: Partial<DuelData> = {}
): DuelData => ({
  ...createInitialDuelData(),
  currentPlayerName: 'Bob',
  duelIndex: 1,
  player1Name: 'Alice',
  player1SideSelected: 'top-left',
  topLeftRevealed: true,
  topLeftCards: [
    { value: 9, suit: '♦' },
    { value: 9, suit: '♥' },
    { value: 9, suit: '♠' }
  ],
  topLeftPlayerData: {
    name: 'Alice',
    team: 'team1',
    sum: 7,
    cards: [
      { value: 9, suit: '♦' },
      { value: 9, suit: '♥' },
      { value: 9, suit: '♠' }
    ]
  },
  ...updates
});

const withRevealTwo = (updates: Partial<DuelData> = {}): DuelData =>
  withPlayer1Selection({
    revealedCards: {
      topLeft: [card(9, '♦'), card(9, '♥'), card(0, '')],
      bottomLeft: [card(1, '♦'), card(1, '♥'), card(0, '')],
      topRight: [card(2, '♣'), card(3, '♣'), card(0, '')],
      bottomRight: [card(8, '♣'), card(1, '♣'), card(0, '')]
    },
    bottomLeftCards: [card(1, '♦'), card(1, '♥'), card(9, '♠')],
    topRightCards: [card(2, '♣'), card(3, '♣'), card(4, '♣')],
    bottomRightCards: [card(8, '♣'), card(1, '♣'), card(9, '♥')],
    ...updates
  });

describe('calculateDuelEquity', () => {
  it('returns null before player 1 selects a side', () => {
    expect(calculateDuelEquity(createInitialDuelData())).toBeNull();
  });

  it('returns public-information equity after player 1 selects only', () => {
    const equity = calculateDuelEquity(withPlayer1Selection());

    expect(equity).not.toBeNull();
    expect(equity?.player1.winRate).toBeGreaterThan(0);
    expect(equity?.player1.winRate).toBeLessThan(100);
    expect(equity?.player1.equity).toBe(equity?.player1.winRate);
    expect(equity?.player2.winRate).toBe(100 - (equity?.player1.winRate ?? 0));
    expect(equity?.player2.equity).toBe(equity?.player2.winRate);
  });

  it('does not change pre-reveal equity when hidden generated groups change', () => {
    const firstHiddenLayout = withPlayer1Selection({
      bottomLeftCards: [
        { value: 9, suit: '♦' },
        { value: 9, suit: '♥' },
        { value: 9, suit: '♠' }
      ],
      topRightCards: [
        { value: 8, suit: '♦' },
        { value: 8, suit: '♥' },
        { value: 8, suit: '♠' }
      ]
    });
    const secondHiddenLayout = withPlayer1Selection({
      bottomLeftCards: [
        { value: 1, suit: '♦' },
        { value: 1, suit: '♥' },
        { value: 1, suit: '♠' }
      ],
      topRightCards: [
        { value: 2, suit: '♦' },
        { value: 2, suit: '♥' },
        { value: 2, suit: '♠' }
      ]
    });

    expect(calculateDuelEquity(firstHiddenLayout)).toEqual(
      calculateDuelEquity(secondHiddenLayout)
    );
  });

  it('using Reveal Two visible cards does not affect the equity', () => {
    const genericEquity = calculateDuelEquity(withPlayer1Selection());
    const revealTwoEquity = calculateDuelEquity(withRevealTwo());

    expect(genericEquity).not.toBeNull();
    expect(revealTwoEquity).not.toBeNull();
    expect(revealTwoEquity?.player1.winRate).toBe(
      genericEquity?.player1.winRate
    );
    expect(revealTwoEquity?.player2.winRate).toBe(
      100 - (revealTwoEquity?.player1.winRate ?? 0)
    );
  });

  it('does not use hidden third cards when Reveal Two is active', () => {
    const firstHiddenLayout = withRevealTwo({
      bottomLeftCards: [card(1, '♦'), card(1, '♥'), card(9, '♠')],
      topRightCards: [card(2, '♣'), card(3, '♣'), card(4, '♣')],
      bottomRightCards: [card(8, '♣'), card(1, '♣'), card(9, '♥')]
    });
    const secondHiddenLayout = withRevealTwo({
      bottomLeftCards: [card(1, '♦'), card(1, '♥'), card(2, '♠')],
      topRightCards: [card(2, '♣'), card(3, '♣'), card(9, '♣')],
      bottomRightCards: [card(8, '♣'), card(1, '♣'), card(3, '♥')]
    });

    expect(calculateDuelEquity(firstHiddenLayout)).toEqual(
      calculateDuelEquity(secondHiddenLayout)
    );
  });

  it('Remove Worst and Reveal Two combination does not affect the equity', () => {
    const allSlotsEquity = calculateDuelEquity(withRevealTwo());
    const removedStrongSlotEquity = calculateDuelEquity(
      withRevealTwo({
        removedWorstGroups: ['bottom-left']
      })
    );

    expect(allSlotsEquity).not.toBeNull();
    expect(removedStrongSlotEquity).not.toBeNull();
    expect(removedStrongSlotEquity?.player1.winRate).toBe(
      allSlotsEquity?.player1.winRate
    );
  });

  it('returns null after Second Chance resets player 1 selection', () => {
    expect(
      calculateDuelEquity(
        withRevealTwo({
          duelIndex: 0,
          player1Name: '?',
          player1SideSelected: undefined,
          player2Name: '',
          player2SideSelected: undefined,
          topLeftPlayerData: {
            name: '?',
            team: '',
            sum: 7,
            cards: [card(9, '♦'), card(9, '♥'), card(9, '♠')]
          }
        })
      )
    ).toBeNull();
  });

  it('returns public equity after Second Chance resets player 2 selection', () => {
    const equity = calculateDuelEquity(
      withRevealTwo({
        duelIndex: 1,
        player2Name: '',
        player2SideSelected: undefined
      })
    );

    expect(equity).not.toBeNull();
    expect(equity?.player1.winRate).toBeGreaterThan(0);
    expect(equity?.player1.winRate).toBeLessThan(100);
  });

  it('returns exact equity after player 2 selects a losing hand', () => {
    const equity = calculateDuelEquity(
      withPlayer1Selection({
        duelIndex: 2,
        player2Name: 'Bob',
        player2SideSelected: 'bottom-right',
        bottomRightRevealed: true,
        bottomRightCards: [
          { value: 4, suit: '♣' },
          { value: 5, suit: '♣' },
          { value: 1, suit: '♣' }
        ],
        bottomRightPlayerData: {
          name: 'Bob',
          team: 'team2',
          sum: 10,
          cards: [
            { value: 4, suit: '♣' },
            { value: 5, suit: '♣' },
            { value: 1, suit: '♣' }
          ]
        }
      })
    );

    expect(equity).toEqual({
      player1: { winRate: 0, equity: 0 },
      player2: { winRate: 100, equity: 100 }
    });
  });

  it('uses tie-break rules for exact post-selection equity', () => {
    const equity = calculateDuelEquity(
      withPlayer1Selection({
        duelIndex: 2,
        topLeftCards: [
          { value: 4, suit: '♣' },
          { value: 3, suit: '♣' },
          { value: 2, suit: '♣' }
        ],
        topLeftPlayerData: {
          name: 'Alice',
          team: 'team1',
          sum: 9,
          cards: [
            { value: 4, suit: '♣' },
            { value: 3, suit: '♣' },
            { value: 2, suit: '♣' }
          ]
        },
        player2Name: 'Bob',
        player2SideSelected: 'bottom-right',
        bottomRightRevealed: true,
        bottomRightCards: [
          { value: 4, suit: '♦' },
          { value: 3, suit: '♣' },
          { value: 2, suit: '♣' }
        ],
        bottomRightPlayerData: {
          name: 'Bob',
          team: 'team2',
          sum: 9,
          cards: [
            { value: 4, suit: '♦' },
            { value: 3, suit: '♣' },
            { value: 2, suit: '♣' }
          ]
        }
      })
    );

    expect(equity).toEqual({
      player1: { winRate: 0, equity: 0 },
      player2: { winRate: 100, equity: 100 }
    });
  });
});
