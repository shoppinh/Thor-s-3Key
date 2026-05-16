# Duel Equity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a poker-style current-duel equity display that preserves suspense by using public information before player 2 chooses.

**Architecture:** Add a shared pure hand comparator, a deterministic equity engine, and a compact UI display in the existing game arena. The engine returns `null` before player 1 chooses, public-information percentages after player 1 chooses, and exact `100 / 0` after player 2 chooses.

**Tech Stack:** Remix v2, React 18, TypeScript, Vitest.

---

### Task 1: Test Tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] Add `vitest` as a dev dependency.
- [ ] Add `npm run test`.
- [ ] Configure `~/` alias in `vitest.config.ts`.
- [ ] Run `npm run typecheck`.
- [ ] Commit with `test: add vitest setup`.

### Task 2: Shared Hand Comparison

**Files:**
- Modify: `app/utils/gameUtil.ts`
- Create: `app/utils/gameUtil.test.ts`

- [ ] Write tests for normal sum comparison, suit tie-break, ace-high tie-break, and equal-suit value tie-break.
- [ ] Run the focused test and confirm it fails before implementation.
- [ ] Add `compareHands(player1Cards, player2Cards)`.
- [ ] Refactor `determineWinner` to use `compareHands` while preserving messages.
- [ ] Run focused test and typecheck.
- [ ] Commit with `refactor: share duel hand comparison`.

### Task 3: Duel Equity Engine

**Files:**
- Create: `app/features/game/engine/equityEngine.ts`
- Create: `app/features/game/engine/equityEngine.test.ts`

- [ ] Write tests for no player 1 selection, public-information equity after player 1 selection, hidden-group anti-spoiler behavior, exact post-player-2 result, and tie-break behavior.
- [ ] Run focused test and confirm it fails before implementation.
- [ ] Implement deterministic 3-card combination enumeration from a full deck excluding only player 1 selected cards.
- [ ] Implement exact result when both selected sides exist.
- [ ] Run focused test and typecheck.
- [ ] Commit with `feat: add duel equity engine`.

### Task 4: Game UI

**Files:**
- Modify: `app/routes/game.tsx`
- Modify: `app/features/game/components/GameArenaScreen.tsx`

- [ ] Compute `duelEquity` from `duelData`.
- [ ] Pass `duelEquity` to `GameArenaScreen`.
- [ ] Render a compact, non-interactive equity panel only when equity is non-null.
- [ ] Use `player1Name` and `player2Name`; before player 2 selection, use `currentPlayerName` for player 2.
- [ ] Run typecheck and lint.
- [ ] Commit with `feat: show duel equity`.

### Task 5: Final Verification

- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Start `npm run dev` and manually verify the duel equity lifecycle.
