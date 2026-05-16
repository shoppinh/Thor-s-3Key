# Current-Duel Equity for Thor's 3Key

**Created**: 2026-05-16
**Status**: Approved
**GitHub Issue**: https://github.com/shoppinh/Thor-s-3Key/issues/30

## Goal

Add a poker-style equity display for the current duel. After the first player chooses a card group, the game should show each player's chance to win the duel as a percentage. After the second player chooses, the display should update to the exact result.

The feature must preserve suspense. It must not reveal whether the hidden generated card groups are strong or weak before the second player chooses.

## Scope

This feature covers only the current duel. It does not estimate match-level or whole-game winning probability.

## Equity Model

Use an anti-spoiler equity model based on public information:

- Before player 1 chooses, do not show duel equity because there is no selected hand to evaluate.
- After player 1 chooses, compare player 1's selected 3-card hand against every possible 3-card hand from a full deck excluding only player 1's selected cards.
- Do not use the remaining already-generated hidden card groups for the pre-reveal equity calculation.
- After player 2 chooses, update the equity to the exact result: winner `100%`, loser `0%`.

This mirrors poker equity: percentages are based on known cards and possible unknown outcomes, not on hidden cards already known internally by the app.

## Architecture

Add a pure game engine module:

```text
app/features/game/engine/equityEngine.ts
```

The module should expose a function that accepts the current duel context and returns player equity:

```ts
type DuelEquity = {
  player1: { winRate: number; equity: number };
  player2: { winRate: number; equity: number };
};
```

The implementation should reuse existing game rules from `app/utils/gameUtil.ts`, especially:

- `createDeck`
- `calculateSum`
- `getCardHighestSuitAndValue`
- the same winner comparison semantics used by `determineWinner`

If the current winner comparison is difficult to reuse without translation strings, extract a small pure helper that compares two hands and returns a winner side. `determineWinner` can keep building localized messages on top of that helper.

## Data Flow

1. `app/routes/game.tsx` owns the current `DuelData`.
2. When player 1 chooses, the selected player data is stored in `DuelData`.
3. The route or a memoized selector calls the equity engine with the current duel state.
4. The calculated equity is passed to the game UI component.
5. After player 2 chooses, the same display is updated with the exact winner and loser percentages.

The equity calculation should be deterministic for the same input. Prefer enumerating all possible 3-card combinations over random simulation because the deck is small.

## UI

Add a compact equity display in the active duel area, likely near `RoundStatus`.

Example after player 1 chooses:

```text
Alice 62% | Bob 38%
```

Example after player 2 chooses:

```text
Alice 100% | Bob 0%
```

The display should use player names when available. It should avoid showing a misleading percentage before player 1 chooses.

## Edge Cases

- If player 1 has not selected a side, return no equity.
- If player 1 selected cards are incomplete or invalid, return no equity.
- If player 2 has selected a side, calculate exact equity from the two selected hands.
- Ties should follow the existing game tie-break rules, including suit hierarchy and ace handling.
- Power-up effects that change selectable groups should not affect the anti-spoiler pre-reveal equity unless they change public selected cards.
- Life Shield affects elimination, not duel win probability, so it should not change equity.

## Testing

Add Vitest coverage for the pure equity engine.

Required cases:

- No equity before player 1 chooses.
- Player 1 selected only: equity is computed from all valid possible opponent hands excluding player 1's selected cards.
- Player 2 selected: winner receives `100%` and loser receives `0%`.
- Equal sums use the same highest-card and suit tie-break behavior as the game.
- Player 1 choosing a weak hand does not force `0%` unless every possible unknown opponent hand beats it.

## Non-Goals

- Whole-game or match-level equity.
- Revealing equity based on the real hidden generated groups before player 2 chooses.
- Artificial clamping such as forcing minimum hype percentages.
- AI-based recommendations or strategic advice.
