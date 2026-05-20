# Supabase Match History and Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent match history using Supabase by recording local duel events during gameplay, saving a complete match at game over, and exposing a `/dashboard` route with all-time leaderboards and insights.

**Architecture:** A thin Supabase client singleton reads URL and anon key from Remix loader env. During each duel finish, a `LocalDuelEvent` is appended to local React state; the existing undo snapshot system is extended to restore this array. At `gameOver`, a service function inserts one `matches` row and its child `duel_events` rows. A separate dashboard route fetches saved data client-side and renders analytics derived from pure aggregation functions.

**Tech Stack:** Remix, React 18, TypeScript, Vitest, `@supabase/supabase-js@2`

---

## File Map

| File                                                    | Responsibility                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `app/lib/supabase.ts`                                   | Singleton Supabase client factory                                          |
| `app/features/dashboard/types.ts`                       | `Database`, `LocalDuelEvent`, `PowerUpsUsed` types                         |
| `app/features/dashboard/services/matchService.ts`       | Save match + duel events to Supabase; fetch dashboard data                 |
| `app/features/dashboard/services/analytics.ts`          | Pure aggregation functions for leaderboard, head-to-head, streaks, summary |
| `app/features/dashboard/services/matchService.test.ts`  | Tests for payload creation and mocked save failure                         |
| `app/features/dashboard/services/analytics.test.ts`     | Tests for all aggregation functions                                        |
| `app/features/dashboard/components/DashboardScreen.tsx` | Dashboard UI: summary cards, tables, recent matches                        |
| `app/routes/dashboard.tsx`                              | Remix route that passes Supabase creds to dashboard                        |
| `app/features/game/state/historyStack.ts`               | Extend `GameSnapshot` with `duelEvents`                                    |
| `app/features/game/state/historyStack.test.ts`          | Update snapshots to include `duelEvents`                                   |
| `app/features/game/components/GameOverScreen.tsx`       | Add save status indicator and retry button                                 |
| `app/routes/game.tsx`                                   | Record `duelEvents`, trigger save at game over, pass status to screen      |
| `app/root.tsx`                                          | Expose `SUPABASE_URL` and `SUPABASE_ANON_KEY` in root loader               |
| `app/locales/en.ts` / `vi.ts`                           | Labels for save status, retry, dashboard, analytics                        |

---

### Task 1: Add Supabase Dependency and Expose Env Vars

**Files:**

- Modify: `package.json`
- Modify: `app/root.tsx`
- Modify: `app/routes/game.tsx:67-72`
- Modify: `.env`

- [ ] **Step 1: Install `@supabase/supabase-js@2`**

Run:

```bash
npm install @supabase/supabase-js@2
```

Expected: package installs successfully.

- [ ] **Step 2: Expose Supabase env vars in root loader**

Modify `app/root.tsx`. In the `loader` function, add `SUPABASE_URL` and `SUPABASE_ANON_KEY`:

```typescript
export async function loader() {
  return json({
    API_KEY: process.env.API_KEY ?? '',
    SITE_URL: process.env.SITE_URL ?? 'http://localhost:5173',
    ANALYTICS_DOMAIN: process.env.PLAUSIBLE_DOMAIN ?? '',
    TWITTER_HANDLE: process.env.TWITTER_HANDLE ?? 'thor3key',
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? ''
  });
}
```

- [ ] **Step 3: Update `RootContext` type in `game.tsx`**

In `app/routes/game.tsx`, change the `RootContext` type to:

```typescript
type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};
```

- [ ] **Step 4: Add placeholder env vars to `.env`**

Append to `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/root.tsx app/routes/game.tsx .env
git commit -m "chore: add supabase dependency and expose env vars"
```

---

### Task 2: Create Supabase Client and Database Types

**Files:**

- Create: `app/lib/supabase.ts`
- Create: `app/features/dashboard/types.ts`

- [ ] **Step 1: Create Supabase client singleton**

Create `app/lib/supabase.ts`:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '~/features/dashboard/types';

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(
  url: string,
  key: string
): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(url, key);
  }
  return client;
}

export function clearSupabaseClient(): void {
  client = null;
}
```

- [ ] **Step 2: Create database and local event types**

Create `app/features/dashboard/types.ts`:

```typescript
import type { TeamName } from '~/features/game/types/gameTypes';

export interface PowerUpsUsed {
  revealTwo?: TeamName;
  lifeShield?: TeamName;
  removeWorst?: TeamName[];
  secondChance?: TeamName[];
}

export interface LocalDuelEvent {
  round: number;
  winnerName: string;
  loserName: string;
  winnerTeam: TeamName;
  loserTeam: TeamName;
  shielded: boolean;
  winnerCards: { value: number; suit: string }[];
  loserCards: { value: number; suit: string }[];
  winnerSum: number;
  loserSum: number;
  powerUpsUsed: PowerUpsUsed;
}

export interface Database {
  public: {
    Tables: {
      matches: {
        Row: {
          id: string;
          winner_team: TeamName;
          team1_roster: string[];
          team2_roster: string[];
          team1_score: number;
          team2_score: number;
          total_duels: number;
          created_at: string;
        };
        Insert: {
          winner_team: TeamName;
          team1_roster: string[];
          team2_roster: string[];
          team1_score: number;
          team2_score: number;
          total_duels: number;
        };
      };
      duel_events: {
        Row: {
          id: string;
          match_id: string;
          round: number;
          winner_name: string;
          loser_name: string;
          winner_team: TeamName;
          loser_team: TeamName;
          shielded: boolean;
          winner_cards: { value: number; suit: string }[];
          loser_cards: { value: number; suit: string }[];
          winner_sum: number;
          loser_sum: number;
          power_ups_used: PowerUpsUsed;
          created_at: string;
        };
        Insert: {
          match_id: string;
          round: number;
          winner_name: string;
          loser_name: string;
          winner_team: TeamName;
          loser_team: TeamName;
          shielded: boolean;
          winner_cards: { value: number; suit: string }[];
          loser_cards: { value: number; suit: string }[];
          winner_sum: number;
          loser_sum: number;
          power_ups_used: PowerUpsUsed;
        };
      };
    };
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/supabase.ts app/features/dashboard/types.ts
git commit -m "feat: add supabase client and db types"
```

---

### Task 3: Track Local Duel Events and Update Undo Snapshots

**Files:**

- Modify: `app/features/game/state/historyStack.ts`
- Modify: `app/features/game/state/historyStack.test.ts`
- Modify: `app/routes/game.tsx`

- [ ] **Step 1: Add `duelEvents` to `GameSnapshot`**

Modify `app/features/game/state/historyStack.ts`:

```typescript
import type { GameState } from '~/features/game/types/gameTypes';
import type DuelData from '~/models/DuelData';
import type { TeamData } from '~/models/TeamData';
import type { LocalDuelEvent } from '~/features/dashboard/types';

export const HISTORY_STACK_LIMIT = 50;

export type GameSnapshot = {
  team1Data: TeamData;
  team2Data: TeamData;
  duelData: DuelData;
  teamWinner: string;
  duelResult: string;
  isFirstTurn: boolean;
  gameState: GameState;
  roundNumber: number;
  winStreaks: Record<string, number>;
  duelEvents: LocalDuelEvent[];
};

export type GameSnapshotInput = GameSnapshot;

const clone = <T>(value: T): T => structuredClone(value);

const createTeamSnapshot = (teamData: TeamData): TeamData => ({
  ...clone(teamData),
  scoreClass: ''
});

export const createGameSnapshot = (state: GameSnapshotInput): GameSnapshot => ({
  team1Data: createTeamSnapshot(state.team1Data),
  team2Data: createTeamSnapshot(state.team2Data),
  duelData: clone(state.duelData),
  teamWinner: state.teamWinner,
  duelResult: state.duelResult,
  isFirstTurn: state.isFirstTurn,
  gameState: state.gameState,
  roundNumber: state.roundNumber,
  winStreaks: clone(state.winStreaks),
  duelEvents: clone(state.duelEvents)
});

export const pushGameSnapshot = (
  historyStack: GameSnapshot[],
  snapshot: GameSnapshot,
  limit = HISTORY_STACK_LIMIT
): GameSnapshot[] => [...historyStack, snapshot].slice(-limit);

export const shouldRecordGameSnapshot = (
  undoEnabled: boolean,
  gameState: GameState
): boolean => undoEnabled && gameState === 'gamePlaying';
```

- [ ] **Step 2: Update snapshot tests**

Modify `app/features/game/state/historyStack.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  HISTORY_STACK_LIMIT,
  createGameSnapshot,
  pushGameSnapshot,
  shouldRecordGameSnapshot,
  type GameSnapshot
} from '~/features/game/state/historyStack';
import {
  createInitialDuelData,
  createInitialTeamData
} from '~/features/game/state/initialState';

const createSnapshot = (roundNumber: number): GameSnapshot =>
  createGameSnapshot({
    team1Data: createInitialTeamData(1, 'Team'),
    team2Data: createInitialTeamData(2, 'Team'),
    duelData: createInitialDuelData(),
    teamWinner: '',
    duelResult: '',
    isFirstTurn: false,
    gameState: 'gamePlaying',
    roundNumber,
    winStreaks: {},
    duelEvents: []
  });

describe('history stack', () => {
  it('excludes transient score classes from snapshots', () => {
    const snapshot = createGameSnapshot({
      team1Data: { ...createInitialTeamData(1, 'Team'), scoreClass: 'blink' },
      team2Data: { ...createInitialTeamData(2, 'Team'), scoreClass: 'blink' },
      duelData: createInitialDuelData(),
      teamWinner: '',
      duelResult: '',
      isFirstTurn: true,
      gameState: 'gamePlaying',
      roundNumber: 1,
      winStreaks: {},
      duelEvents: []
    });

    expect(snapshot.team1Data.scoreClass).toBe('');
    expect(snapshot.team2Data.scoreClass).toBe('');
  });

  it('caps the stack at the history limit', () => {
    const stack = Array.from(
      { length: HISTORY_STACK_LIMIT + 5 },
      (_, index) => index
    ).reduce(
      (history, roundNumber) =>
        pushGameSnapshot(history, createSnapshot(roundNumber)),
      [] as GameSnapshot[]
    );

    expect(stack).toHaveLength(HISTORY_STACK_LIMIT);
    expect(stack[0].roundNumber).toBe(5);
    expect(stack[HISTORY_STACK_LIMIT - 1].roundNumber).toBe(54);
  });

  it('copies snapshot data so later mutations cannot leak into history', () => {
    const team1Data = createInitialTeamData(1, 'Team');
    const duelData = createInitialDuelData();
    const duelEvents = [
      {
        round: 1,
        winnerName: 'A',
        loserName: 'B',
        winnerTeam: 'team1' as const,
        loserTeam: 'team2' as const,
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 5,
        loserSum: 3,
        powerUpsUsed: {}
      }
    ];
    const snapshot = createGameSnapshot({
      team1Data,
      team2Data: createInitialTeamData(2, 'Team'),
      duelData,
      teamWinner: '',
      duelResult: '',
      isFirstTurn: true,
      gameState: 'gamePlaying',
      roundNumber: 1,
      winStreaks: {},
      duelEvents
    });

    team1Data.players.push('Late Player');
    duelData.currentPlayerName = 'Late Player';
    duelEvents.push({
      round: 2,
      winnerName: 'C',
      loserName: 'D',
      winnerTeam: 'team1',
      loserTeam: 'team2',
      shielded: false,
      winnerCards: [],
      loserCards: [],
      winnerSum: 5,
      loserSum: 3,
      powerUpsUsed: {}
    });

    expect(snapshot.team1Data.players).toEqual([]);
    expect(snapshot.duelData.currentPlayerName).toBe('');
    expect(snapshot.duelEvents).toHaveLength(1);
    expect(snapshot.duelEvents[0].round).toBe(1);
  });

  it('records snapshots only when undo is enabled during active gameplay', () => {
    expect(shouldRecordGameSnapshot(true, 'gamePlaying')).toBe(true);
    expect(shouldRecordGameSnapshot(false, 'gamePlaying')).toBe(false);
    expect(shouldRecordGameSnapshot(true, 'setup')).toBe(false);
    expect(shouldRecordGameSnapshot(true, 'gameLoading')).toBe(false);
    expect(shouldRecordGameSnapshot(true, 'gameOver')).toBe(false);
  });
});
```

Run tests:

```bash
npx vitest run app/features/game/state/historyStack.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 3: Add `duelEvents` state to `game.tsx`**

In `app/routes/game.tsx`, import the type:

```typescript
import type { LocalDuelEvent } from '~/features/dashboard/types';
```

Add state after `winStreaks`:

```typescript
const [duelEvents, setDuelEvents] = useState<LocalDuelEvent[]>([]);
```

- [ ] **Step 4: Include `duelEvents` in snapshot creation and undo**

Update `recordHistorySnapshot` to include `duelEvents`:

```typescript
const recordHistorySnapshot = useCallback(() => {
  if (!shouldRecordGameSnapshot(undoEnabled, gameState)) return;

  setHistoryStack((prev) =>
    pushGameSnapshot(
      prev,
      createGameSnapshot({
        team1Data,
        team2Data,
        duelData,
        teamWinner,
        duelResult,
        isFirstTurn,
        gameState,
        roundNumber,
        winStreaks,
        duelEvents
      })
    )
  );
}, [
  team1Data,
  team2Data,
  duelData,
  teamWinner,
  duelResult,
  isFirstTurn,
  gameState,
  roundNumber,
  winStreaks,
  duelEvents,
  undoEnabled
]);
```

Update `undoLastAction` to restore `duelEvents`:

```typescript
const undoLastAction = useCallback(() => {
  const snapshot = historyStack[historyStack.length - 1];
  if (!snapshot) return;

  setHistoryStack((prev) => prev.slice(0, -1));
  setTeam1Data(snapshot.team1Data);
  setTeam2Data(snapshot.team2Data);
  setDuelData(snapshot.duelData);
  setTeamWinner(snapshot.teamWinner);
  setDuelResult(snapshot.duelResult);
  setIsFirstTurn(snapshot.isFirstTurn);
  setGameState(snapshot.gameState);
  setRoundNumber(snapshot.roundNumber);
  setWinStreaks(snapshot.winStreaks);
  setDuelEvents(snapshot.duelEvents);
  setConfirmPopup({
    isVisible: false,
    teamName: undefined,
    chanceType: undefined,
    chanceItemName: ''
  });
  setShowWinnerAnnouncement(false);
}, [historyStack]);
```

- [ ] **Step 5: Reset `duelEvents` when a new game starts**

In `startGameWithTeams`, add:

```typescript
const startGameWithTeams = (team1Data: string[], team2Data: string[]) => {
  if (team1Data.length === 0 || team2Data.length === 0) {
    alert('Both teams must have at least one player.');
    return;
  }

  setHistoryStack([]);
  setWinStreaks({});
  setDuelEvents([]);
  setGameState('gamePlaying');
  nextRound(team1Data, team2Data, false);
};
```

- [ ] **Step 6: Record a `LocalDuelEvent` inside `calculateResult`**

Inside `calculateResult` in `app/routes/game.tsx`, after `determineWinner` and before updating scores, add the event recording. The existing `calculateResult` begins around line 936. Add these lines right after `const { winner, isPlayer1Winner } = determineWinner(...)` and before `const losingPlayer = isPlayer1Winner ? p2Name : p1Name;`:

```typescript
const firstPlayerTeam = p1Team || duelData.player1Team;
const secondPlayerTeam = p2Team || duelData.player2Team;
const winningTeam = isPlayer1Winner ? firstPlayerTeam : secondPlayerTeam;
const losingTeam = isPlayer1Winner ? secondPlayerTeam : firstPlayerTeam;

const event: LocalDuelEvent = {
  round: roundNumber,
  winnerName: isPlayer1Winner ? p1Name : p2Name,
  loserName: isPlayer1Winner ? p2Name : p1Name,
  winnerTeam: winningTeam!,
  loserTeam: losingTeam!,
  shielded: !!shouldPreventElimination,
  winnerCards: isPlayer1Winner ? p1Cards : p2Cards,
  loserCards: isPlayer1Winner ? p2Cards : p1Cards,
  winnerSum: isPlayer1Winner ? p1Sum : p2Sum,
  loserSum: isPlayer1Winner ? p2Sum : p1Sum,
  powerUpsUsed: {
    ...(duelData.revealTwoUsedBy && { revealTwo: duelData.revealTwoUsedBy }),
    ...(duelData.lifeShieldUsedBy && { lifeShield: duelData.lifeShieldUsedBy }),
    ...(duelData.removeWorstUsedByTeams?.length && {
      removeWorst: duelData.removeWorstUsedByTeams
    }),
    ...(duelData.secondChanceUsedByTeams?.length && {
      secondChance: duelData.secondChanceUsedByTeams
    })
  }
};
setDuelEvents((prev) => [...prev, event]);
```

Then add `roundNumber` to the `useCallback` dependency array of `calculateResult`:

```typescript
}, [
  team1Data.players,
  team2Data.players,
  duelData.player1Team,
  duelData.player2Team,
  duelData.lifeShieldUsedBy,
  winStreaks,
  t,
  roundNumber
]);
```

- [ ] **Step 7: Run tests to verify undo still works**

```bash
npx vitest run app/features/game/state/historyStack.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add app/features/game/state/historyStack.ts app/features/game/state/historyStack.test.ts app/routes/game.tsx
git commit -m "feat: track local duel events and include in undo snapshots"
```

---

### Task 4: Build Match Save Service

**Files:**

- Create: `app/features/dashboard/services/matchService.ts`
- Create: `app/features/dashboard/services/matchService.test.ts`

- [ ] **Step 1: Create match save service**

Create `app/features/dashboard/services/matchService.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, LocalDuelEvent } from '~/features/dashboard/types';
import type { TeamData } from '~/models/TeamData';

export interface SaveMatchInput {
  supabase: SupabaseClient<Database>;
  teamWinner: string;
  team1Data: TeamData;
  team2Data: TeamData;
  duelEvents: LocalDuelEvent[];
}

export async function saveMatch({
  supabase,
  teamWinner,
  team1Data,
  team2Data,
  duelEvents
}: SaveMatchInput): Promise<void> {
  const winnerTeam = teamWinner.includes('1') ? 'team1' : 'team2';

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      winner_team: winnerTeam,
      team1_roster: team1Data.players,
      team2_roster: team2Data.players,
      team1_score: team1Data.score,
      team2_score: team2Data.score,
      total_duels: duelEvents.length
    })
    .select('id')
    .single();

  if (matchError || !match) {
    throw new Error(matchError?.message ?? 'Failed to insert match');
  }

  if (duelEvents.length > 0) {
    const payload = duelEvents.map((event) => ({
      match_id: match.id,
      round: event.round,
      winner_name: event.winnerName,
      loser_name: event.loserName,
      winner_team: event.winnerTeam,
      loser_team: event.loserTeam,
      shielded: event.shielded,
      winner_cards: event.winnerCards,
      loser_cards: event.loserCards,
      winner_sum: event.winnerSum,
      loser_sum: event.loserSum,
      power_ups_used: event.powerUpsUsed
    }));

    const { error: eventsError } = await supabase
      .from('duel_events')
      .insert(payload);

    if (eventsError) {
      throw new Error(eventsError.message);
    }
  }
}

export interface DashboardData {
  recentMatches: Database['public']['Tables']['matches']['Row'][];
  allDuelEvents: Database['public']['Tables']['duel_events']['Row'][];
  summary: {
    totalMatches: number;
    totalDuels: number;
    team1Wins: number;
    team2Wins: number;
    shieldedDuels: number;
  };
}

export async function fetchDashboardData(
  supabase: SupabaseClient<Database>
): Promise<DashboardData> {
  const [{ data: matches, error: mErr }, { data: duelEvents, error: dErr }] =
    await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('duel_events').select('*')
    ]);

  if (mErr) throw mErr;
  if (dErr) throw dErr;

  const allMatches = matches || [];
  const allEvents = duelEvents || [];

  return {
    recentMatches: allMatches,
    allDuelEvents: allEvents,
    summary: {
      totalMatches: allMatches.length,
      totalDuels: allEvents.length,
      team1Wins: allMatches.filter((m) => m.winner_team === 'team1').length,
      team2Wins: allMatches.filter((m) => m.winner_team === 'team2').length,
      shieldedDuels: allEvents.filter((e) => e.shielded).length
    }
  };
}
```

- [ ] **Step 2: Write tests for match payload creation and save failure**

Create `app/features/dashboard/services/matchService.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import {
  saveMatch,
  fetchDashboardData
} from '~/features/dashboard/services/matchService';
import type { Database, LocalDuelEvent } from '~/features/dashboard/types';
import type { TeamData } from '~/models/TeamData';

const mockTeam = (overrides?: Partial<TeamData>): TeamData => ({
  name: 'Team',
  score: 3,
  scoreClass: '',
  totalPowerUps: 4,
  powerUps: { secondChance: 1, revealTwo: 1, lifeShield: 1, removeWorst: 1 },
  players: ['A', 'B'],
  ...overrides
});

const mockEvent = (overrides?: Partial<LocalDuelEvent>): LocalDuelEvent => ({
  round: 1,
  winnerName: 'A',
  loserName: 'B',
  winnerTeam: 'team1',
  loserTeam: 'team2',
  shielded: false,
  winnerCards: [{ value: 1, suit: '♦' }],
  loserCards: [{ value: 2, suit: '♥' }],
  winnerSum: 1,
  loserSum: 2,
  powerUpsUsed: {},
  ...overrides
});

function createMockSupabase(
  insertSequence: { data?: unknown; error?: { message: string } | null }[]
) {
  let callIndex = 0;
  const fromImpl = vi.fn(() => {
    const chain = {
      insert: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn(() => {
        const result = insertSequence[callIndex] ?? { data: null, error: null };
        callIndex++;
        return Promise.resolve(result);
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
    };
    return chain;
  });
  return { from: fromImpl } as unknown as Parameters<
    typeof saveMatch
  >[0]['supabase'];
}

describe('saveMatch', () => {
  it('inserts a match and its duel events', async () => {
    const supabase = createMockSupabase([
      { data: { id: 'match-1' }, error: null },
      { data: null, error: null }
    ]);

    await saveMatch({
      supabase,
      teamWinner: 'Team 1 is winner',
      team1Data: mockTeam(),
      team2Data: mockTeam(),
      duelEvents: [mockEvent()]
    });

    expect(supabase.from).toHaveBeenCalledWith('matches');
    expect(supabase.from).toHaveBeenCalledWith('duel_events');
  });

  it('throws when match insert fails', async () => {
    const supabase = createMockSupabase([
      { data: null, error: { message: 'db down' } }
    ]);

    await expect(
      saveMatch({
        supabase,
        teamWinner: 'Team 1 is winner',
        team1Data: mockTeam(),
        team2Data: mockTeam(),
        duelEvents: []
      })
    ).rejects.toThrow('db down');
  });

  it('throws when duel_events insert fails', async () => {
    const supabase = createMockSupabase([
      { data: { id: 'match-1' }, error: null },
      { data: null, error: { message: 'events error' } }
    ]);

    await expect(
      saveMatch({
        supabase,
        teamWinner: 'Team 2 is winner',
        team1Data: mockTeam(),
        team2Data: mockTeam(),
        duelEvents: [mockEvent()]
      })
    ).rejects.toThrow('events error');
  });
});

describe('fetchDashboardData', () => {
  it('returns empty data when no rows exist', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    } as unknown as Parameters<typeof fetchDashboardData>[0];

    const data = await fetchDashboardData(supabase);
    expect(data.summary.totalMatches).toBe(0);
    expect(data.summary.totalDuels).toBe(0);
  });
});
```

Run tests:

```bash
npx vitest run app/features/dashboard/services/matchService.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 3: Commit**

```bash
git add app/features/dashboard/services/matchService.ts app/features/dashboard/services/matchService.test.ts
git commit -m "feat: add match save service with tests"
```

---

### Task 5: Save on Game Over with Retry UI

**Files:**

- Modify: `app/routes/game.tsx`
- Modify: `app/features/game/components/GameOverScreen.tsx`

- [ ] **Step 1: Add save status state and save effect to `game.tsx`**

In `app/routes/game.tsx`, add the save status state after `duelEvents`:

```typescript
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
```

Add a `useEffect` that triggers when `gameState` becomes `'gameOver'`:

```typescript
useEffect(() => {
  if (gameState !== 'gameOver') return;
  if (saveStatus !== 'idle') return;
  const url = clientSecrets?.SUPABASE_URL;
  const key = clientSecrets?.SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const supabase = getSupabaseClient(url, key);
  setSaveStatus('saving');
  saveMatch({ supabase, teamWinner, team1Data, team2Data, duelEvents })
    .then(() => setSaveStatus('saved'))
    .catch(() => setSaveStatus('error'));
}, [
  gameState,
  saveStatus,
  clientSecrets,
  teamWinner,
  team1Data,
  team2Data,
  duelEvents
]);
```

Add a retry handler:

```typescript
const handleRetrySave = useCallback(() => {
  const url = clientSecrets?.SUPABASE_URL;
  const key = clientSecrets?.SUPABASE_ANON_KEY;
  if (!url || !key) return;
  const supabase = getSupabaseClient(url, key);
  setSaveStatus('saving');
  saveMatch({ supabase, teamWinner, team1Data, team2Data, duelEvents })
    .then(() => setSaveStatus('saved'))
    .catch(() => setSaveStatus('error'));
}, [clientSecrets, teamWinner, team1Data, team2Data, duelEvents]);
```

Import `getSupabaseClient` and `saveMatch`:

```typescript
import { getSupabaseClient } from '~/lib/supabase';
import { saveMatch } from '~/features/dashboard/services/matchService';
```

- [ ] **Step 2: Reset save status when a new game starts**

In `startGameWithTeams`, add:

```typescript
setSaveStatus('idle');
```

- [ ] **Step 3: Pass save props to `GameOverScreen`**

Update the `gameOver` render in `app/routes/game.tsx`:

```typescript
{gameState == 'gameOver' && (
  <GameOverScreen
    teamWinner={teamWinner}
    canUndo={canUndo}
    onUndo={undoLastAction}
    saveStatus={saveStatus}
    onRetrySave={handleRetrySave}
  />
)}
```

- [ ] **Step 4: Update `GameOverScreen` with save status and retry**

Modify `app/features/game/components/GameOverScreen.tsx`:

```typescript
import { useLanguage } from '~/contexts/LanguageContext';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type GameOverScreenProps = {
  teamWinner: string;
  canUndo: boolean;
  onUndo: () => void;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
};

const GameOverScreen = ({
  teamWinner,
  canUndo,
  onUndo,
  saveStatus,
  onRetrySave
}: GameOverScreenProps) => {
  const { t } = useLanguage();

  const saveStatusText =
    saveStatus === 'saving'
      ? t('game.savingMatch')
      : saveStatus === 'saved'
        ? t('game.matchSaved')
        : saveStatus === 'error'
          ? t('game.saveFailed')
          : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        gap: '30px'
      }}
    >
      <div
        className="rpg-panel"
        style={{
          padding: '40px 60px',
          textAlign: 'center',
          background: 'var(--color-panel-bg)',
          border: '3px solid var(--color-accent)'
        }}
      >
        <h2
          className="text-glow"
          style={{
            color: 'var(--color-primary)',
            margin: '0 0 20px 0',
            fontSize: '32px',
            letterSpacing: '3px'
          }}
        >
          {t('game.battleComplete')}
        </h2>
        <h1
          className="text-gradient"
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            margin: '20px 0',
            textShadow: '0 0 20px var(--color-accent)'
          }}
        >
          {teamWinner}
        </h1>

        {saveStatusText && (
          <div
            style={{
              marginTop: '16px',
              fontSize: '18px',
              color:
                saveStatus === 'error'
                  ? '#ff4d4d'
                  : saveStatus === 'saved'
                    ? '#4dff88'
                    : '#ccc'
            }}
          >
            {saveStatusText}
            {saveStatus === 'error' && (
              <button
                onClick={onRetrySave}
                className="rpg-button secondary"
                style={{
                  marginLeft: '12px',
                  fontSize: '14px',
                  padding: '6px 16px'
                }}
              >
                {t('game.retrySave')}
              </button>
            )}
          </div>
        )}

        <div
          className="rpg-panel"
          style={{
            marginTop: '30px',
            padding: '20px',
            background: 'rgba(0,0,0,0.3)'
          }}
        >
          <img
            src="/images/the-end.webp"
            alt="Victory"
            style={{
              width: '600px',
              maxWidth: '100%',
              opacity: 0.9
            }}
          />
        </div>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rpg-button secondary"
          style={{
            marginTop: '24px',
            fontSize: '18px',
            padding: '10px 36px',
            opacity: canUndo ? 1 : 0.45,
            cursor: canUndo ? 'pointer' : 'not-allowed'
          }}
        >
          {t('game.undo')}
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
```

- [ ] **Step 5: Commit**

```bash
git add app/routes/game.tsx app/features/game/components/GameOverScreen.tsx
git commit -m "feat: save match on game over with retry ui"
```

---

### Task 6: Dashboard Analytics Aggregation

**Files:**

- Create: `app/features/dashboard/services/analytics.ts`
- Create: `app/features/dashboard/services/analytics.test.ts`

- [ ] **Step 1: Create pure analytics functions**

Create `app/features/dashboard/services/analytics.ts`:

```typescript
import type { LocalDuelEvent } from '~/features/dashboard/types';
import type { TeamName } from '~/features/game/types/gameTypes';

export interface LeaderboardEntry {
  name: string;
  winCount: number;
}

export function buildPlayerLeaderboard(
  events: Pick<LocalDuelEvent, 'winnerName'>[]
): LeaderboardEntry[] {
  const wins: Record<string, number> = {};
  for (const event of events) {
    wins[event.winnerName] = (wins[event.winnerName] || 0) + 1;
  }
  return Object.entries(wins)
    .map(([name, winCount]) => ({ name, winCount }))
    .sort((a, b) => b.winCount - a.winCount);
}

export interface HeadToHeadEntry {
  winner: string;
  loser: string;
  count: number;
}

export function buildHeadToHead(
  events: Pick<LocalDuelEvent, 'winnerName' | 'loserName'>[]
): HeadToHeadEntry[] {
  const map: Record<string, number> = {};
  for (const event of events) {
    const key = `${event.winnerName}|${event.loserName}`;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([key, count]) => {
      const [winner, loser] = key.split('|');
      return { winner, loser, count };
    })
    .sort((a, b) => b.count - a.count);
}

export interface TeamStreakEntry {
  team: TeamName;
  longestStreak: number;
}

export function buildTeamStreaks(
  events: Pick<LocalDuelEvent, 'winnerTeam'>[]
): TeamStreakEntry[] {
  const streaks: Record<TeamName, number> = { team1: 0, team2: 0 };
  let currentTeam: TeamName | '' = '';
  let currentCount = 0;

  for (const event of events) {
    if (event.winnerTeam === currentTeam) {
      currentCount++;
    } else {
      currentTeam = event.winnerTeam;
      currentCount = 1;
    }
    streaks[event.winnerTeam] = Math.max(
      streaks[event.winnerTeam],
      currentCount
    );
  }

  return [
    { team: 'team1' as const, longestStreak: streaks.team1 },
    { team: 'team2' as const, longestStreak: streaks.team2 }
  ];
}

export interface MatchSummary {
  totalDuels: number;
  shieldedDuels: number;
  mostWinsPlayer: string | null;
  mostWinsCount: number;
}

export function calculateMatchSummary(
  events: Pick<LocalDuelEvent, 'winnerName' | 'shielded'>[]
): MatchSummary {
  const wins: Record<string, number> = {};
  let shielded = 0;
  for (const event of events) {
    wins[event.winnerName] = (wins[event.winnerName] || 0) + 1;
    if (event.shielded) shielded++;
  }
  const entries = Object.entries(wins);
  const most = entries.length
    ? entries.reduce((a, b) => (a[1] > b[1] ? a : b))
    : null;
  return {
    totalDuels: events.length,
    shieldedDuels: shielded,
    mostWinsPlayer: most ? most[0] : null,
    mostWinsCount: most ? most[1] : 0
  };
}
```

- [ ] **Step 2: Write analytics tests**

Create `app/features/dashboard/services/analytics.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  buildPlayerLeaderboard,
  buildHeadToHead,
  buildTeamStreaks,
  calculateMatchSummary
} from '~/features/dashboard/services/analytics';
import type { LocalDuelEvent } from '~/features/dashboard/types';

const makeEvent = (
  overrides: Partial<LocalDuelEvent> = {}
): LocalDuelEvent => ({
  round: 1,
  winnerName: 'A',
  loserName: 'B',
  winnerTeam: 'team1',
  loserTeam: 'team2',
  shielded: false,
  winnerCards: [],
  loserCards: [],
  winnerSum: 1,
  loserSum: 2,
  powerUpsUsed: {},
  ...overrides
});

describe('buildPlayerLeaderboard', () => {
  it('returns empty for no events', () => {
    expect(buildPlayerLeaderboard([])).toEqual([]);
  });

  it('ranks players by duel wins descending', () => {
    const events = [
      makeEvent({ winnerName: 'A' }),
      makeEvent({ winnerName: 'A' }),
      makeEvent({ winnerName: 'B' })
    ];
    expect(buildPlayerLeaderboard(events)).toEqual([
      { name: 'A', winCount: 2 },
      { name: 'B', winCount: 1 }
    ]);
  });
});

describe('buildHeadToHead', () => {
  it('counts winner-loser pairings', () => {
    const events = [
      makeEvent({ winnerName: 'A', loserName: 'B' }),
      makeEvent({ winnerName: 'A', loserName: 'B' }),
      makeEvent({ winnerName: 'C', loserName: 'D' })
    ];
    expect(buildHeadToHead(events)).toEqual([
      { winner: 'A', loser: 'B', count: 2 },
      { winner: 'C', loser: 'D', count: 1 }
    ]);
  });
});

describe('buildTeamStreaks', () => {
  it('computes longest consecutive win streak per team', () => {
    const events = [
      makeEvent({ winnerTeam: 'team1' }),
      makeEvent({ winnerTeam: 'team1' }),
      makeEvent({ winnerTeam: 'team2' }),
      makeEvent({ winnerTeam: 'team2' }),
      makeEvent({ winnerTeam: 'team2' })
    ];
    expect(buildTeamStreaks(events)).toEqual([
      { team: 'team1', longestStreak: 2 },
      { team: 'team2', longestStreak: 3 }
    ]);
  });

  it('returns zero streaks when no events', () => {
    expect(buildTeamStreaks([])).toEqual([
      { team: 'team1', longestStreak: 0 },
      { team: 'team2', longestStreak: 0 }
    ]);
  });
});

describe('calculateMatchSummary', () => {
  it('summarizes empty events', () => {
    expect(calculateMatchSummary([])).toEqual({
      totalDuels: 0,
      shieldedDuels: 0,
      mostWinsPlayer: null,
      mostWinsCount: 0
    });
  });

  it('counts shielded duels and top winner', () => {
    const events = [
      makeEvent({ winnerName: 'A', shielded: true }),
      makeEvent({ winnerName: 'A', shielded: false }),
      makeEvent({ winnerName: 'B', shielded: true })
    ];
    expect(calculateMatchSummary(events)).toEqual({
      totalDuels: 3,
      shieldedDuels: 2,
      mostWinsPlayer: 'A',
      mostWinsCount: 2
    });
  });
});
```

Run tests:

```bash
npx vitest run app/features/dashboard/services/analytics.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 3: Commit**

```bash
git add app/features/dashboard/services/analytics.ts app/features/dashboard/services/analytics.test.ts
git commit -m "feat: add dashboard analytics aggregation with tests"
```

---

### Task 7: Dashboard Route and UI

**Files:**

- Create: `app/routes/dashboard.tsx`
- Create: `app/features/dashboard/components/DashboardScreen.tsx`

- [ ] **Step 1: Create dashboard Remix route**

Create `app/routes/dashboard.tsx`:

```typescript
import { json, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import DashboardScreen from '~/features/dashboard/components/DashboardScreen';
import { fetchDashboardData } from '~/features/dashboard/services/matchService';
import { getSupabaseClient } from '~/lib/supabase';

export const meta: MetaFunction = () => {
  const title = "Thor's 3Key — Dashboard";
  return [{ title }, { name: 'description', content: 'Match history and analytics dashboard' }];
};

export async function loader() {
  return json({
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? ''
  });
}

export default function DashboardRoute() {
  const { supabaseUrl, supabaseAnonKey } = useLoaderData<typeof loader>();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDashboardData>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase is not configured');
      return;
    }
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    fetchDashboardData(supabase)
      .then(setData)
      .catch((e) => setError(e.message ?? 'Failed to load dashboard'));
  }, [supabaseUrl, supabaseAnonKey]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ff4d4d' }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
        Loading dashboard...
      </div>
    );
  }

  return <DashboardScreen data={data} />;
}
```

- [ ] **Step 2: Create dashboard screen component**

Create `app/features/dashboard/components/DashboardScreen.tsx`:

```typescript
import { useLanguage } from '~/contexts/LanguageContext';
import {
  buildHeadToHead,
  buildPlayerLeaderboard,
  buildTeamStreaks,
  calculateMatchSummary
} from '~/features/dashboard/services/analytics';
import type { DashboardData } from '~/features/dashboard/services/matchService';

type DashboardScreenProps = {
  data: DashboardData;
};

const DashboardScreen = ({ data }: DashboardScreenProps) => {
  const { t } = useLanguage();
  const leaderboard = buildPlayerLeaderboard(data.allDuelEvents);
  const headToHead = buildHeadToHead(data.allDuelEvents);
  const streaks = buildTeamStreaks(data.allDuelEvents);
  const summary = calculateMatchSummary(data.allDuelEvents);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(15, 12, 41, 0.8)',
    border: '2px solid var(--color-secondary)',
    padding: '20px',
    borderRadius: '8px',
    minWidth: '180px',
    textAlign: 'center'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '12px'
  };

  const thStyle: React.CSSProperties = {
    borderBottom: '2px solid var(--color-secondary)',
    padding: '10px',
    textAlign: 'left',
    color: 'var(--color-primary)'
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1
        className="text-glow"
        style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          marginBottom: '40px',
          color: 'var(--color-primary)'
        }}
      >
        {t('dashboard.title')}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}
      >
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
            {data.summary.totalMatches}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>{t('dashboard.totalMatches')}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
            {data.summary.totalDuels}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>{t('dashboard.totalDuels')}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
            {data.summary.team1Wins}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>{t('dashboard.team1Wins')}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
            {data.summary.team2Wins}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>{t('dashboard.team2Wins')}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
            {data.summary.shieldedDuels}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>{t('dashboard.shieldedDuels')}</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '30px'
        }}
      >
        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2 className="text-glow" style={{ color: 'var(--color-primary)', marginTop: 0 }}>
            {t('dashboard.leaderboard')}
          </h2>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#888' }}>{t('dashboard.noData')}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('dashboard.player')}</th>
                  <th style={thStyle}>{t('dashboard.duelsWon')}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.name}>
                    <td style={tdStyle}>{entry.name}</td>
                    <td style={tdStyle}>{entry.winCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2 className="text-glow" style={{ color: 'var(--color-primary)', marginTop: 0 }}>
            {t('dashboard.headToHead')}
          </h2>
          {headToHead.length === 0 ? (
            <p style={{ color: '#888' }}>{t('dashboard.noData')}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('dashboard.winner')}</th>
                  <th style={thStyle}>{t('dashboard.loser')}</th>
                  <th style={thStyle}>{t('dashboard.count')}</th>
                </tr>
              </thead>
              <tbody>
                {headToHead.map((entry) => (
                  <tr key={`${entry.winner}-${entry.loser}`}>
                    <td style={tdStyle}>{entry.winner}</td>
                    <td style={tdStyle}>{entry.loser}</td>
                    <td style={tdStyle}>{entry.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2 className="text-glow" style={{ color: 'var(--color-primary)', marginTop: 0 }}>
            {t('dashboard.teamStreaks')}
          </h2>
          {streaks.map((s) => (
            <div key={s.team} style={{ marginBottom: '10px', color: '#ccc' }}>
              {t('common.team')} {s.team === 'team1' ? '1' : '2'}:{' '}
              <strong style={{ color: 'var(--color-accent)' }}>{s.longestStreak}</strong>{' '}
              {t('dashboard.consecutiveWins')}
            </div>
          ))}
          {summary.mostWinsPlayer && (
            <div style={{ marginTop: '16px', color: '#ccc' }}>
              {t('dashboard.mostWins')}:{' '}
              <strong style={{ color: 'var(--color-primary)' }}>
                {summary.mostWinsPlayer} ({summary.mostWinsCount})
              </strong>
            </div>
          )}
        </div>

        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2 className="text-glow" style={{ color: 'var(--color-primary)', marginTop: 0 }}>
            {t('dashboard.recentMatches')}
          </h2>
          {data.recentMatches.length === 0 ? (
            <p style={{ color: '#888' }}>{t('dashboard.noData')}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('dashboard.winner')}</th>
                  <th style={thStyle}>{t('dashboard.score')}</th>
                  <th style={thStyle}>{t('dashboard.duels')}</th>
                  <th style={thStyle}>{t('dashboard.date')}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMatches.map((match) => (
                  <tr key={match.id}>
                    <td style={tdStyle}>
                      {match.winner_team === 'team1' ? t('common.team') + ' 1' : t('common.team') + ' 2'}
                    </td>
                    <td style={tdStyle}>
                      {match.team1_score} - {match.team2_score}
                    </td>
                    <td style={tdStyle}>{match.total_duels}</td>
                    <td style={tdStyle}>
                      {new Date(match.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
```

- [ ] **Step 3: Commit**

```bash
git add app/routes/dashboard.tsx app/features/dashboard/components/DashboardScreen.tsx
git commit -m "feat: add dashboard route and analytics screen"
```

---

### Task 8: Add Locales for New UI Text

**Files:**

- Modify: `app/locales/en.ts`
- Modify: `app/locales/vi.ts`

- [ ] **Step 1: Add English labels**

Append to `app/locales/en.ts` inside the `game` object (after `navigationWarning`):

```typescript
    savingMatch: 'Saving match history...',
    matchSaved: 'Match saved!',
    saveFailed: 'Failed to save match history.',
    retrySave: 'Retry'
```

And add a new `dashboard` object at the top level after `powerups`:

```typescript
  dashboard: {
    title: 'BATTLE ARCHIVE',
    totalMatches: 'Total Matches',
    totalDuels: 'Total Duels',
    team1Wins: 'Team 1 Wins',
    team2Wins: 'Team 2 Wins',
    shieldedDuels: 'Shielded Duels',
    leaderboard: 'Player Leaderboard',
    player: 'Player',
    duelsWon: 'Duels Won',
    headToHead: 'Head-to-Head',
    winner: 'Winner',
    loser: 'Loser',
    count: 'Count',
    teamStreaks: 'Team Streaks',
    consecutiveWins: 'consecutive wins',
    mostWins: 'Most duel wins',
    recentMatches: 'Recent Matches',
    score: 'Score',
    duels: 'Duels',
    date: 'Date',
    noData: 'No data yet.'
  }
```

- [ ] **Step 2: Add Vietnamese labels**

Append to `app/locales/vi.ts` inside the `game` object (after `navigationWarning`):

```typescript
    savingMatch: 'Đang lưu lịch sử trận đấu...',
    matchSaved: 'Đã lưu trận đấu!',
    saveFailed: 'Lưu lịch sử thất bại.',
    retrySave: 'Thử lại'
```

And add a new `dashboard` object at the top level after `powerups`:

```typescript
  dashboard: {
    title: 'LỊCH SỬ CHIẾN ĐẤU',
    totalMatches: 'Tổng trận',
    totalDuels: 'Tổng đấu',
    team1Wins: 'Đội 1 thắng',
    team2Wins: 'Đội 2 thắng',
    shieldedDuels: 'Đấu có khiên',
    leaderboard: 'Bảng xếp hạng',
    player: 'Người chơi',
    duelsWon: 'Thắng đấu',
    headToHead: 'Đối đầu',
    winner: 'Người thắng',
    loser: 'Người thua',
    count: 'Số lần',
    teamStreaks: 'Chuỗi thắng đội',
    consecutiveWins: 'thắng liên tiếp',
    mostWins: 'Thắng đấu nhiều nhất',
    recentMatches: 'Trận gần đây',
    score: 'Tỷ số',
    duels: 'Số đấu',
    date: 'Ngày',
    noData: 'Chưa có dữ liệu.'
  }
```

- [ ] **Step 3: Commit**

```bash
git add app/locales/en.ts app/locales/vi.ts
git commit -m "feat: add dashboard and save status locale labels"
```

---

### Task 9: Verify with Tests and Typecheck

**Files:**

- All modified files

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```

Expected: All tests pass. If any fail, read the output, fix the offending file, and rerun.

- [ ] **Step 2: Run TypeScript type check**

```bash
npm run typecheck
```

Expected: `tsc` completes with no errors. If errors appear, fix type mismatches (common issues: missing `duelEvents` in snapshot input objects, incorrect Supabase generic usage).

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "test: verify all tests and types pass"
```

---

## Self-Review

**1. Spec coverage:**

- Supabase client with `@supabase/supabase-js@2` from env — **Task 1, 2**
- `matches` and `duel_events` tables with correct columns — **Task 2 (types), Task 4 (service)**
- RLS guidance noted in assumptions; policies are configured in Supabase console, not code — **Assumptions**
- Local duel events during gameplay, derived in-match stats — **Task 3**
- Save at game over — **Task 5**
- Non-blocking save error with retry — **Task 5**
- `/dashboard` with summary cards, leaderboard, streaks, head-to-head, recent matches — **Task 6, 7**
- English and Vietnamese labels — **Task 8**
- Unit tests for stats aggregation, match payload, save failure, undo snapshots — **Task 3, 4, 6, 9**
- Run `npm test` and `npm run typecheck` — **Task 9**

**2. Placeholder scan:**

- No "TBD", "TODO", or vague instructions.
- Every test step shows actual assertions.
- Every code step shows the exact file content to write.

**3. Type consistency:**

- `LocalDuelEvent` is defined once in `types.ts` and used in `historyStack.ts`, `game.tsx`, `matchService.ts`, and `analytics.ts`.
- `SaveStatus` is defined once in `GameOverScreen.tsx` and referenced in `game.tsx`.
- `TeamName` comes from the existing `gameTypes.ts` and is reused throughout.

**No gaps found.**

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-19-supabase-match-history-analytics.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach would you like?**
