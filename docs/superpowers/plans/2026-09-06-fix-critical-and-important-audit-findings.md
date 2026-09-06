# Plan: Fix All Critical and Important Audit Findings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all critical gameplay softlocks, state machine race conditions, database persistence integrity flaws, secret leakages, and important business logic bugs identified in the repository audit.

**Architecture:**
- Pure game state calculations with decoupled side effects in `app/routes/game.tsx`.
- Guaranteed interactivity for Second Chance re-picks in `PlayerCardDrawer.tsx` and `RoundStatus.tsx`.
- Non-blocking AI pick execution with bypass flag for AI drawing.
- Atomic match persistence via Supabase RPC `save_completed_match` with payload idempotency.
- Server-side proxy for Google Sheets API to keep secrets off client.

**Tech Stack:** Remix (Vite), React 18, TypeScript, Supabase/PostgreSQL, Vitest.

## Global Constraints
- Node >= 20.0.0.
- Strict Prettier formatting (`singleQuote: true`, `semi: true`, `trailingComma: 'none'`).
- 1:1 key parity between `app/locales/en.ts` and `app/locales/vi.ts`.
- Types in `app/features/dashboard/types.ts` must be updated prior to Supabase migration.
- All unit tests (`npm run test`), typechecking (`npm run typecheck`), and linting (`npm run lint`) must pass.

---

## File Map

| File | Responsibility |
| --- | --- |
| `app/components/PlayerCardDrawer.tsx` | Display state & draw interactivity during initial duel and Second Chance re-picks |
| `app/components/PlayerCardDrawer.test.ts` | Unit tests for PlayerCardDrawer display states (Second Chance, blank, finished) |
| `app/components/RoundStatus.tsx` | Match-point fallback timer, "End Match" concede button, AI thinking auto-select |
| `app/routes/game.tsx` | Clean event handler dispatching, Life Shield winning team fix, input validation, AI round reset |
| `app/locales/en.ts` & `vi.ts` | Translation keys for match end / concede button |
| `app/features/dashboard/types.ts` | Typed `save_completed_match` RPC contract and payload definitions |
| `app/features/dashboard/services/matchService.ts` | Single RPC call for atomic match saving and bounded dashboard queries |
| `app/features/dashboard/services/matchService.test.ts` | Tests for atomic RPC payload and dashboard limits |
| `supabase/migrations/20260906000000_atomic_completed_match_saving.sql` | Migration creating `save_completed_match` RPC |
| `app/routes/api.sheet.ts` | Server-side Remix resource route for Google Sheets API (protects `API_KEY`) |
| `app/features/game/services/sheetService.ts` | Client adapter fetching from `/api/sheet` |
| `app/root.tsx` | Remove client exposure of `API_KEY` from loader |
| `app/features/dashboard/components/MatchDetailModal.tsx` | Accessibility lint fixes |
| `app/features/game/engine/equityEngine.ts` | Remove unused variables for lint compliance |
| `app/utils/gameUtil.ts` | Safe reduce guard for tiebreakers |
| `app/features/game/components/RosterSetup.tsx` | Safe `JSON.parse` in drag-and-drop |

---

### Task 1: Second Chance Re-selection Interactivity & Life Shield Winning Team Fix

**Files:**
- Modify: `app/components/PlayerCardDrawer.tsx`
- Modify: `app/components/PlayerCardDrawer.test.ts`
- Modify: `app/routes/game.tsx`

**Interfaces:**
- `getPlayerCardDrawerDisplayState`: When `playerData.name === '?'` (Second Chance active) or when a drawer is unselected and duel is not finished, `shouldShowDrawButton` and `canClickCards` must be `true` (unless disabled by removeWorst or opponent pick).
- In `game.tsx`:
  - Duel finish: Do NOT mutate unchosen `playerData.cards` into 3 cards. Let `getPlayerCardDrawerDisplayState` display `fullCards` when `isFinishDuel` is `true`.
  - `implementSecondChance`: Clear unselected groups to `cards: []` and ensure the re-picking player can draw or select an available drawer.
  - In `calculateResult`: Always record `winningTeam` in `duelData` so `canUseSecondChance` correctly identifies the losing team, even when Life Shield is active.

- [ ] **Step 1: Write failing test in `PlayerCardDrawer.test.ts` for Second Chance state**
  Assert that when `playerData.name === '?'` and `isFinishDuel === false`, `shouldShowDrawButton` is `true` and `canClickCards` is `true`.
- [ ] **Step 2: Run test and verify it fails**
  Run `npx vitest run app/components/PlayerCardDrawer.test.ts`.
- [ ] **Step 3: Update `PlayerCardDrawer.tsx` display state logic**
  Allow re-pick when `isSecondChancePick` is true (`playerData.name === '?'` or unchosen position while `!isFinishDuel`).
- [ ] **Step 4: Update `game.tsx` duel finish and `implementSecondChance`**
  Ensure cards are not permanently mutated onto empty player positions; ensure `winningTeam` is recorded in `duelData` regardless of `shouldPreventElimination`.
- [ ] **Step 5: Verify tests pass**
  Run `npx vitest run app/components/PlayerCardDrawer.test.ts`.

---

### Task 2: Match-Point Auto-Advance Fallback & Concede/End Match Button

**Files:**
- Modify: `app/components/RoundStatus.tsx`
- Modify: `app/locales/en.ts`
- Modify: `app/locales/vi.ts`

**Interfaces:**
- Add `endMatch` locale string:
  - EN: `'End Match'`
  - VI: `'Kết Thúc Trận'`
- In `RoundStatus.tsx`:
  - When `duelResult && isFinishDuel && noPlayersLeft`:
    - Render an "End Match" button even if `canSecondChanceNow` is true.
    - Set an 8-second fallback timeout so the match auto-advances if unattended.

- [ ] **Step 1: Add localization keys in `en.ts` and `vi.ts`**
- [ ] **Step 2: Update `RoundStatus.tsx` auto-advance and button condition**
- [ ] **Step 3: Run Vitest to ensure no regression**
  Run `npx vitest run`.

---

### Task 3: AI Selection Race Condition, Highlight Bleed, and Input Validation

**Files:**
- Modify: `app/routes/game.tsx`
- Modify: `app/components/RoundStatus.tsx`

**Interfaces:**
- `playerSelect(side: Side, options?: { isAi?: boolean })`:
  - Guard: `if (isAiThinking && !options?.isAi) return;`
  - Guard: `if (duelData.isFinishDuel) return;`
  - Guard: `if (duelData.player1SideSelected === side) return;`
  - Guard: `if (duelData.removedWorstGroups?.includes(side)) return;`
- In `handleAiPick`: Call `playerSelect(chosen, { isAi: true })`.
- In `nextRound`: Reset `aiSelectedSides: []` and `aiRecommendationUsedByTeams: []`.

- [ ] **Step 1: Add parameter and defensive guards to `playerSelect` in `game.tsx`**
- [ ] **Step 2: Pass `{ isAi: true }` in `handleAiPick`**
- [ ] **Step 3: Reset `aiSelectedSides` and `aiRecommendationUsedByTeams` in `nextRound`**
- [ ] **Step 4: Run typecheck and tests**
  Run `npm run typecheck && npm run test`.

---

### Task 4: State Updater Purity & Side-Effect Extraction

**Files:**
- Modify: `app/routes/game.tsx`

**Interfaces:**
- Move `calculateResult` call out of the `setDuelData` functional updater in `playerSelect`.
- Calculate the updated duel data, call state setters once at the handler level, and eliminate nested `setDuelData` inside `calculateResult`.
- Include `duelData.aiRecommendationUsedByTeams` in dependencies or simplify memoization.

- [ ] **Step 1: Extract calculation from `setDuelData` updater in `playerSelect`**
- [ ] **Step 2: Update `calculateResult` to avoid recursive `setDuelData`**
- [ ] **Step 3: Run Vitest tests**
  Run `npm run test`.

---

### Task 5: Atomic Match Persistence & Dashboard Query Limits

**Files:**
- Modify: `app/features/dashboard/types.ts`
- Modify: `app/features/dashboard/services/matchService.ts`
- Modify: `app/features/dashboard/services/matchService.test.ts`
- Create: `supabase/migrations/20260906000000_atomic_completed_match_saving.sql`
- Modify: `app/routes/game.tsx`

**Interfaces:**
- `save_completed_match` RPC in `types.ts` and `matchService.ts`.
- `fetchDashboardData`: Add `.limit(100)` to matches and `.limit(1000)` to duel events.
- In `game.tsx`: Use `crypto.randomUUID()` when game finishes and pass `id` to `saveMatch`.

- [ ] **Step 1: Update `types.ts` with `CompletedMatchRecord`, `CompletedDuelEventRecord`, and `save_completed_match` RPC signature**
- [ ] **Step 2: Update `matchService.ts` to call RPC and add limits to `fetchDashboardData`**
- [ ] **Step 3: Update `matchService.test.ts` to mock RPC and verify idempotency**
- [ ] **Step 4: Create migration SQL in `supabase/migrations/20260906000000_atomic_completed_match_saving.sql`**
- [ ] **Step 5: Wire `crypto.randomUUID()` and idempotent save in `game.tsx`**
- [ ] **Step 6: Run `npm run test` and `npm run typecheck`**

---

### Task 6: Server-Side Google Sheets API Proxy

**Files:**
- Create: `app/routes/api.sheet.ts`
- Modify: `app/features/game/services/sheetService.ts`
- Modify: `app/features/game/services/sheetService.test.ts`
- Modify: `app/root.tsx`

**Interfaces:**
- `app/routes/api.sheet.ts`: Remix loader that reads `sheetId` and `sheetRange` query params, fetches Google Sheets using server-side `process.env.API_KEY`, and returns JSON.
- `sheetService.ts`: Fetches `/api/sheet?sheetId=...&sheetRange=...` without needing client API key.
- `root.tsx`: Remove `API_KEY` from loader return value so it's not exposed in `OutletContext`.

- [ ] **Step 1: Create `app/routes/api.sheet.ts` resource loader**
- [ ] **Step 2: Update `sheetService.ts` to fetch from `/api/sheet`**
- [ ] **Step 3: Update `sheetService.test.ts`**
- [ ] **Step 4: Remove `API_KEY` from `root.tsx` loader**
- [ ] **Step 5: Run tests and typecheck**

---

### Task 7: ESLint Cleanups & Verification Before Completion

**Files:**
- Modify: `app/features/dashboard/components/MatchDetailModal.tsx`
- Modify: `app/features/game/engine/equityEngine.ts`
- Modify: `app/features/dashboard/types.ts`
- Modify: `app/utils/gameUtil.ts`
- Modify: `app/features/game/components/RosterSetup.tsx`

**Interfaces:**
- Wrap `JSON.parse` in `RosterSetup.tsx` in a `try/catch`.
- Add empty array check in `gameUtil.ts` `getCardHighestSuitAndValue`.
- Fix accessibility and unused variables in `MatchDetailModal.tsx`, `equityEngine.ts`, `types.ts`.
- Run full suite: `npm run test`, `npm run typecheck`, `npm run lint`.

- [ ] **Step 1: Apply minor bug fixes (safe JSON.parse, safe reduce)**
- [ ] **Step 2: Fix ESLint errors and warnings across all files**
- [ ] **Step 3: Run `npm run test`**
- [ ] **Step 4: Run `npm run typecheck`**
- [ ] **Step 5: Run `npm run lint`**
- [ ] **Step 6: Run `npm run prettier-format`**
