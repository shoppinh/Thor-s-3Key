# Power-Up Aware Duel Equity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make duel equity react to `Reveal Two` and `Remove Worst` using only public cards and legal selectable slots.

**Architecture:** Keep the feature inside the pure equity engine. Add range-building helpers that turn `duelData.revealedCards` into possible opponent hands, then have `calculateDuelEquity` choose between exact post-selection equity, Reveal Two constrained equity, and the existing generic public estimate.

**Tech Stack:** Remix, React, TypeScript, Vitest.

---

## File Structure

- Modify: `app/features/game/engine/equityEngine.ts`
  - Add helpers for card identity, visible-card validation, legal opponent slots, and Reveal Two opponent hand generation.
  - Keep `calculateDuelEquity(duelData: DuelData): DuelEquity | null` as the public API.
- Modify: `app/features/game/engine/equityEngine.test.ts`
  - Add tests for Reveal Two constrained equity, hidden third-card safety, Remove Worst exclusion, and Second Chance reset states.

## Task 1: Add Failing Tests for Power-Up Aware Equity

**Files:**
- Modify: `app/features/game/engine/equityEngine.test.ts`

- [ ] **Step 1: Add a local card helper and two Reveal Two fixtures**

Add this helper after the imports:

```ts
const card = (value: number, suit: string) => ({ value, suit });
```

Add these helpers after `withPlayer1Selection`:

```ts
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
```

Expected: tests still compile, but no behavior changes yet.

- [ ] **Step 2: Add a test proving Reveal Two changes the generic estimate**

Add this test before the exact post-selection tests:

```ts
it('uses Reveal Two visible cards to constrain pre-player-2 equity', () => {
  const genericEquity = calculateDuelEquity(withPlayer1Selection());
  const revealTwoEquity = calculateDuelEquity(withRevealTwo());

  expect(genericEquity).not.toBeNull();
  expect(revealTwoEquity).not.toBeNull();
  expect(revealTwoEquity?.player1.winRate).not.toBe(
    genericEquity?.player1.winRate
  );
  expect(revealTwoEquity?.player2.winRate).toBe(
    100 - (revealTwoEquity?.player1.winRate ?? 0)
  );
});
```

- [ ] **Step 3: Add a hidden third-card anti-leak test**

Add this test after the Reveal Two constrained equity test:

```ts
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
```

- [ ] **Step 4: Add a Remove Worst slot exclusion test**

Add this test after the hidden third-card anti-leak test:

```ts
it('excludes Remove Worst slots from Reveal Two equity', () => {
  const allSlotsEquity = calculateDuelEquity(withRevealTwo());
  const removedStrongSlotEquity = calculateDuelEquity(
    withRevealTwo({
      removedWorstGroups: ['bottom-left']
    })
  );

  expect(allSlotsEquity).not.toBeNull();
  expect(removedStrongSlotEquity).not.toBeNull();
  expect(removedStrongSlotEquity?.player1.winRate).not.toBe(
    allSlotsEquity?.player1.winRate
  );
});
```

- [ ] **Step 5: Add Second Chance reset state tests**

Add these tests after the Remove Worst slot exclusion test:

```ts
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
```

- [ ] **Step 6: Run the targeted test and verify it fails**

Run:

```bash
npm test -- app/features/game/engine/equityEngine.test.ts
```

Expected: FAIL. The new Reveal Two and Remove Worst tests should fail because the current engine ignores `duelData.revealedCards` and `duelData.removedWorstGroups`.

## Task 2: Implement Reveal Two Opponent Ranges

**Files:**
- Modify: `app/features/game/engine/equityEngine.ts`

- [ ] **Step 1: Add side list and stricter public-card helpers**

Replace the current `hasCompleteHand` and `isSameCard` helper block with:

```ts
const SIDES: Side[] = ['top-left', 'bottom-left', 'top-right', 'bottom-right'];

const hasCompleteHand = (cards: Card[]): boolean => {
  return cards.length === 3 && cards.every((card) => card.value > 0 && card.suit);
};

const hasPublicCard = (card: Card): boolean => {
  return card.value > 0 && Boolean(card.suit);
};

const isSameCard = (left: Card, right: Card): boolean => {
  return left.value === right.value && left.suit === right.suit;
};

const containsCard = (cards: Card[], target: Card): boolean => {
  return cards.some((card) => isSameCard(card, target));
};
```

- [ ] **Step 2: Add helpers for revealed cards and selectable opponent slots**

Add these helpers after `createThreeCardCombinations`:

```ts
const getRevealedCardsBySide = (
  duelData: DuelData,
  side: Side
): Card[] => {
  if (side === 'top-left') return duelData.revealedCards.topLeft;
  if (side === 'bottom-left') return duelData.revealedCards.bottomLeft;
  if (side === 'top-right') return duelData.revealedCards.topRight;
  return duelData.revealedCards.bottomRight;
};

const getLegalOpponentSides = (duelData: DuelData): Side[] => {
  const removedSides = new Set(duelData.removedWorstGroups || []);
  return SIDES.filter((side) => {
    return side !== duelData.player1SideSelected && !removedSides.has(side);
  });
};
```

- [ ] **Step 3: Add the Reveal Two hand generator**

Add this helper after `calculatePlayer1PublicWinRate`:

```ts
const createRevealTwoOpponentHands = (
  duelData: DuelData,
  player1Cards: Card[]
): Card[][] => {
  const publicCards = getLegalOpponentSides(duelData).flatMap((side) =>
    getRevealedCardsBySide(duelData, side).filter(hasPublicCard)
  );

  const knownCards = [...player1Cards, ...publicCards];
  const unknownThirdCards = createDeck().filter(
    (candidate) => !containsCard(knownCards, candidate)
  );

  return getLegalOpponentSides(duelData).flatMap((side) => {
    const visibleCards = getRevealedCardsBySide(duelData, side).filter(
      hasPublicCard
    );

    if (visibleCards.length !== 2) {
      return [];
    }

    return unknownThirdCards.map((thirdCard) => [...visibleCards, thirdCard]);
  });
};
```

- [ ] **Step 4: Add a shared win-rate helper**

Add this helper after `createRevealTwoOpponentHands`:

```ts
const calculatePlayer1WinRateAgainstHands = (
  player1Cards: Card[],
  opponentHands: Card[][]
): number | null => {
  if (opponentHands.length === 0) {
    return null;
  }

  const player1Wins = opponentHands.filter(
    (opponentCards) => compareHands(player1Cards, opponentCards) === 'player1'
  ).length;

  return Math.round((player1Wins / opponentHands.length) * 100);
};
```

- [ ] **Step 5: Refactor the generic public calculation through the shared helper**

Replace `calculatePlayer1PublicWinRate` with:

```ts
const calculatePlayer1PublicWinRate = (player1Cards: Card[]): number => {
  const possibleOpponentCards = createDeck().filter(
    (card) => !containsCard(player1Cards, card)
  );
  const possibleOpponentHands =
    createThreeCardCombinations(possibleOpponentCards);

  return calculatePlayer1WinRateAgainstHands(player1Cards, possibleOpponentHands) ?? 0;
};
```

- [ ] **Step 6: Route pre-player-2 calculation through Reveal Two when available**

Add this helper after `calculatePlayer1PublicWinRate`:

```ts
const calculatePlayer1PreSelectionWinRate = (
  duelData: DuelData,
  player1Cards: Card[]
): number => {
  const revealTwoWinRate = calculatePlayer1WinRateAgainstHands(
    player1Cards,
    createRevealTwoOpponentHands(duelData, player1Cards)
  );

  return revealTwoWinRate ?? calculatePlayer1PublicWinRate(player1Cards);
};
```

Replace the final return in `calculateDuelEquity` with:

```ts
  return createEquity(calculatePlayer1PreSelectionWinRate(duelData, player1Cards));
```

- [ ] **Step 7: Run the targeted test and verify it passes**

Run:

```bash
npm test -- app/features/game/engine/equityEngine.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the equity engine enhancement**

Run:

```bash
git add app/features/game/engine/equityEngine.ts app/features/game/engine/equityEngine.test.ts
git commit -m "feat: account for power-ups in duel equity"
```

## Task 3: Verify the Feature Story

**Files:**
- Verify: `app/features/game/engine/equityEngine.ts`
- Verify: `app/features/game/engine/equityEngine.test.ts`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript checking**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing warnings unrelated to `equityEngine.ts` and `equityEngine.test.ts`.

- [ ] **Step 4: Manually inspect anti-spoiler behavior in code**

Confirm these facts before finishing:

```text
equityEngine.ts does not read topLeftCards, bottomLeftCards, topRightCards, or bottomRightCards when calculating Reveal Two pre-player-2 equity.
equityEngine.ts does read duelData.revealedCards and duelData.removedWorstGroups when calculating Reveal Two pre-player-2 equity.
calculateDuelEquity still returns exact 100/0 equity after player2SideSelected is present.
```

- [ ] **Step 5: Commit any verification-only fixes**

If verification required formatting or test fixes, run:

```bash
git add app/features/game/engine/equityEngine.ts app/features/game/engine/equityEngine.test.ts
git commit -m "test: cover power-up aware duel equity"
```

If there are no additional changes after Task 2, skip this commit step.

## Self-Review

Spec coverage:

- Reveal Two constrained equity is covered by Task 1 tests and Task 2 range generation.
- Hidden third-card safety is covered by Task 1 hidden-layout test and Task 3 code inspection.
- Remove Worst slot exclusion is covered by Task 1 test and Task 2 legal-side filtering.
- Second Chance behavior is covered by Task 1 reset-state tests because the equity engine follows selection state.
- Life Shield requires no code because the equity engine does not read `lifeShieldUsedBy`.

Placeholder scan: no placeholder markers remain in this plan.

Type consistency: the plan uses existing `DuelData`, `Card`, `Side`, `calculateDuelEquity`, `compareHands`, `createDeck`, `player1SideSelected`, `player2SideSelected`, `revealedCards`, and `removedWorstGroups` names.
