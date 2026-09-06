# Atomic Completed-Match Saving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save each completed match and all of its duel events atomically, so a retry from the open game records exactly one complete match.

**Architecture:** Capture an immutable completed-match payload once when the game reaches `gameOver`, including a browser-generated UUID and its final duration. `saveMatch` calls one typed Supabase RPC. The database function inserts the match and its events in its transaction, stores the canonical payload for idempotency, and returns the existing UUID only when a retry carries the identical payload. The game route remains the UI adapter: it presents `idle`, `saving`, `saved`, and `error` states and delegates persistence to the module.

**Tech Stack:** Remix, React 18, TypeScript, Vitest, Supabase/PostgreSQL, `@supabase/supabase-js@2`

## Global Constraints

- Node must remain `>=20.0.0`; use `crypto.randomUUID()` for the completed-match identity.
- Keep `matches` and `duel_events` readable publicly and preserve their existing direct insert RLS policies.
- The RPC is `SECURITY INVOKER`, uses fully-qualified table names, and is explicitly executable only by `anon` and `authenticated`.
- Preserve the current game-over status copy and manual retry control; do not add local-storage recovery, background retry, or historical-data cleanup.
- Update `app/features/dashboard/types.ts` before applying the Supabase migration.

---

## File Map

| File | Responsibility |
| --- | --- |
| `app/features/dashboard/types.ts` | Typed completed-match payload and `save_completed_match` RPC contract |
| `app/features/dashboard/services/matchService.ts` | Builds the immutable RPC payload and calls the Supabase adapter |
| `app/features/dashboard/services/matchService.test.ts` | Module-level success, failure, idempotency, and payload tests |
| `app/routes/game.tsx` | Captures one completed payload, coalesces in-flight saves, and ignores stale outcomes |
| `supabase/migrations/20260906000000_atomic_completed_match_saving.sql` | Adds canonical payload storage and the atomic, idempotent RPC |
| `supabase/tests/atomic_completed_match_saving.sql` | Database-level success, rollback, retry, conflict, and concurrency checks |
| `docs/SUPABASE_SETUP_GUIDE.md` | Documents the function as the required completed-match write path |
| `CONTEXT.md` | Defines the domain term “Completed Match” |

### Task 1: Define the completed-match contract

**Files:**

- Modify: `app/features/dashboard/types.ts`
- Modify: `app/features/dashboard/services/matchService.ts`
- Modify: `app/features/dashboard/services/matchService.test.ts`

**Interfaces:**

- Produces `CompletedMatch`, an immutable payload with `id`, `match`, and `duelEvents`.
- Produces `saveMatch(input: SaveMatchInput): Promise<string>`, returning the saved UUID.
- `SaveMatchInput` accepts `id: string` in addition to the existing game-final fields. It must no longer accept an implicit or generated identity.

- [x] **Step 1: Write failing payload and RPC tests**

Replace the current chained-insert mock with an RPC mock and add these tests to `app/features/dashboard/services/matchService.test.ts`:

```typescript
it('sends one completed match through save_completed_match', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: 'match-1', error: null });
  const supabase = { rpc } as unknown as Parameters<typeof saveMatch>[0]['supabase'];

  await expect(
    saveMatch({
      id: 'match-1',
      supabase,
      winnerTeam: 'team1',
      team1Data: mockTeam(),
      team2Data: mockTeam(),
      team1InitialRoster: ['A', 'B'],
      team2InitialRoster: ['C', 'D'],
      durationSeconds: 42,
      duelEvents: [mockEvent()]
    })
  ).resolves.toBe('match-1');

  expect(rpc).toHaveBeenCalledWith('save_completed_match', {
    p_match_id: 'match-1',
    p_match: expect.objectContaining({ total_duels: 1, duration_seconds: 42 }),
    p_events: [expect.objectContaining({ winner_name: 'A' })]
  });
});

it('returns a database failure without retrying or writing tables directly', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
  const supabase = { rpc, from: vi.fn() } as unknown as Parameters<typeof saveMatch>[0]['supabase'];

  await expect(saveMatch(makeSaveInput({ supabase }))).rejects.toThrow('db down');
  expect(supabase.from).not.toHaveBeenCalled();
});
```

Add a `makeSaveInput` helper that supplies `id: 'match-1'`; update existing tests to use it. Add one test that invokes `saveMatch` twice with the same input and asserts two identical `rpc` calls. This verifies the module preserves its caller-provided identity rather than producing a new one.

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npx vitest run app/features/dashboard/services/matchService.test.ts
```

Expected: FAIL because `SaveMatchInput` has no `id` and `saveMatch` still calls `.from()`.

- [x] **Step 3: Define the exact TypeScript payload and RPC type**

In `app/features/dashboard/types.ts`, add these types after `LocalDuelEvent`:

```typescript
export type CompletedMatchRecord = {
  winner_team: TeamName;
  team1_roster: string[];
  team2_roster: string[];
  team1_initial_roster: string[];
  team2_initial_roster: string[];
  team1_powerups: SavedPowerUps;
  team2_powerups: SavedPowerUps;
  team1_score: number;
  team2_score: number;
  total_duels: number;
  duration_seconds: number | null;
};

export type CompletedDuelEventRecord = {
  round: number;
  winner_name: string;
  loser_name: string;
  winner_team: TeamName;
  loser_team: TeamName;
  shielded: boolean;
  winner_cards: Card[];
  loser_cards: Card[];
  winner_sum: number;
  loser_sum: number;
  power_ups_used: PowerUpsUsed;
};
```

Add this function type under `Database['public']['Functions']`:

```typescript
save_completed_match: {
  Args: {
    p_match_id: string;
    p_match: CompletedMatchRecord;
    p_events: CompletedDuelEventRecord[];
  };
  Returns: string;
};
```

Keep `save_payload?: Json | null` in the `matches` Row, Insert, and Update contracts, using a local recursive `Json` type if the generated-style type does not already define one. It represents internal canonical persistence data and is never displayed by dashboard modules.

- [x] **Step 4: Replace the two-write implementation with one RPC call**

Replace `saveMatch` in `app/features/dashboard/services/matchService.ts` with the following shape. Keep `fetchDashboardData` unchanged.

```typescript
export interface SaveMatchInput {
  id: string;
  supabase: SupabaseClient<Database>;
  winnerTeam: TeamName;
  team1Data: TeamData;
  team2Data: TeamData;
  team1InitialRoster: string[];
  team2InitialRoster: string[];
  durationSeconds?: number;
  duelEvents: LocalDuelEvent[];
}

export async function saveMatch(input: SaveMatchInput): Promise<string> {
  const p_match: CompletedMatchRecord = {
    winner_team: input.winnerTeam,
    team1_roster: input.team1Data.players,
    team2_roster: input.team2Data.players,
    team1_initial_roster: input.team1InitialRoster,
    team2_initial_roster: input.team2InitialRoster,
    team1_powerups: input.team1Data.powerUps,
    team2_powerups: input.team2Data.powerUps,
    team1_score: input.team1Data.score,
    team2_score: input.team2Data.score,
    total_duels: input.duelEvents.length,
    duration_seconds: input.durationSeconds ?? null
  };
  const p_events: CompletedDuelEventRecord[] = input.duelEvents.map((event) => ({
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
  const { data, error } = await input.supabase.rpc('save_completed_match', {
    p_match_id: input.id,
    p_match,
    p_events
  });
  if (error || !data) throw new Error(error?.message ?? 'Failed to save match');
  return data;
}
```

- [x] **Step 5: Run the focused tests and typecheck**

Run:

```bash
npx vitest run app/features/dashboard/services/matchService.test.ts
npm run typecheck
```

Expected: all match-service tests PASS; typecheck passes after adding the function contract.

- [x] **Step 6: Commit**

```bash
git add app/features/dashboard/types.ts app/features/dashboard/services/matchService.ts app/features/dashboard/services/matchService.test.ts
git commit -m "refactor: save completed matches through one rpc"
```

### Task 2: Add the atomic, idempotent database function

**Files:**

- Create: `supabase/migrations/20260906000000_atomic_completed_match_saving.sql`
- Create: `supabase/tests/atomic_completed_match_saving.sql`

**Interfaces:**

- Consumes `p_match_id uuid`, `p_match jsonb`, and `p_events jsonb` through `public.save_completed_match`.
- Produces the saved match UUID. It returns an existing UUID only when the canonical JSON payload matches exactly.
- Requires existing `matches` and `duel_events` tables with the columns described in `app/features/dashboard/types.ts`.

- [x] **Step 1: Write the failing database checks**

Create `supabase/tests/atomic_completed_match_saving.sql`. Use a transaction and a fixed UUID. The test script must:

```sql
begin;

select public.save_completed_match(
  '11111111-1111-1111-1111-111111111111',
  '{"winner_team":"team1","team1_roster":["A"],"team2_roster":[],"team1_initial_roster":["A"],"team2_initial_roster":["B"],"team1_powerups":{"secondChance":0,"revealTwo":0,"lifeShield":0,"removeWorst":0},"team2_powerups":{"secondChance":0,"revealTwo":0,"lifeShield":0,"removeWorst":0},"team1_score":1,"team2_score":0,"total_duels":1,"duration_seconds":12}'::jsonb,
  '[{"round":1,"winner_name":"A","loser_name":"B","winner_team":"team1","loser_team":"team2","shielded":false,"winner_cards":[],"loser_cards":[],"winner_sum":1,"loser_sum":2,"power_ups_used":{}}]'::jsonb
);

do $$
begin
  if (select count(*) from public.matches where id = '11111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'expected exactly one match';
  end if;
  if (select count(*) from public.duel_events where match_id = '11111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'expected exactly one duel event';
  end if;
end;
$$;

select public.save_completed_match(
  '11111111-1111-1111-1111-111111111111',
  '{"winner_team":"team1","team1_roster":["A"],"team2_roster":[],"team1_initial_roster":["A"],"team2_initial_roster":["B"],"team1_powerups":{"secondChance":0,"revealTwo":0,"lifeShield":0,"removeWorst":0},"team2_powerups":{"secondChance":0,"revealTwo":0,"lifeShield":0,"removeWorst":0},"team1_score":1,"team2_score":0,"total_duels":1,"duration_seconds":12}'::jsonb,
  '[{"round":1,"winner_name":"A","loser_name":"B","winner_team":"team1","loser_team":"team2","shielded":false,"winner_cards":[],"loser_cards":[],"winner_sum":1,"loser_sum":2,"power_ups_used":{}}]'::jsonb
);

do $$
begin
  if (select count(*) from public.matches where id = '11111111-1111-1111-1111-111111111111') <> 1
    or (select count(*) from public.duel_events where match_id = '11111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'idempotent retry created duplicate rows';
  end if;
  begin
    perform public.save_completed_match(
      '11111111-1111-1111-1111-111111111111',
      '{"winner_team":"team1","team1_roster":["A"],"team2_roster":[],"team1_initial_roster":["A"],"team2_initial_roster":["B"],"team1_powerups":{"secondChance":0,"revealTwo":0,"lifeShield":0,"removeWorst":0},"team2_powerups":{"secondChance":0,"revealTwo":0,"lifeShield":0,"removeWorst":0},"team1_score":1,"team2_score":0,"total_duels":2,"duration_seconds":12}'::jsonb,
      '[{"round":1,"winner_name":"A","loser_name":"B","winner_team":"team1","loser_team":"team2","shielded":false,"winner_cards":[],"loser_cards":[],"winner_sum":1,"loser_sum":2,"power_ups_used":{}}]'::jsonb
    );
    raise exception 'expected conflict';
  exception when sqlstate 'P0001' then null;
  end;
  if (select count(*) from public.matches where id = '11111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'conflicting retry changed match history';
  end if;
end;
$$;
rollback;
```

Add a second transaction block with UUID `22222222-2222-2222-2222-222222222222`, a one-event payload whose event omits `winner_name`, and a nested `P0001` exception assertion. Then assert no row with that UUID exists in either table; it proves the function rolls back its parent insert when child validation fails.

- [x] **Step 2: Run the test against the development database and verify it fails**

Run after setting a non-production connection string:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/atomic_completed_match_saving.sql
```

Expected: FAIL because `save_completed_match` does not exist. Do not run this command against production.

- [x] **Step 3: Create the additive migration**

Create `supabase/migrations/20260906000000_atomic_completed_match_saving.sql` with this SQL.

```sql
alter table public.matches add column if not exists save_payload jsonb;

create or replace function public.save_completed_match(
  p_match_id uuid,
  p_match jsonb,
  p_events jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payload jsonb := jsonb_build_object('match', p_match, 'events', p_events);
  v_existing_payload jsonb;
  v_saved_id uuid;
begin
  if jsonb_typeof(p_match) <> 'object' or jsonb_typeof(p_events) <> 'array' then
    raise exception 'Completed Match payload is invalid' using errcode = 'P0001';
  end if;

  if jsonb_array_length(p_events) <> coalesce((p_match->>'total_duels')::integer, -1) then
    raise exception 'Completed Match total_duels must equal event count' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_events) as event(
      winner_name text, loser_name text, winner_team text, loser_team text,
      shielded boolean, winner_cards jsonb, loser_cards jsonb,
      power_ups_used jsonb
    ) where winner_name is null or loser_name is null or winner_team is null
      or loser_team is null or shielded is null or winner_cards is null
      or loser_cards is null or power_ups_used is null
  ) then
    raise exception 'Completed Match contains an invalid Duel Event' using errcode = 'P0001';
  end if;

  insert into public.matches (
    id, winner_team, team1_roster, team2_roster,
    team1_initial_roster, team2_initial_roster,
    team1_powerups, team2_powerups, team1_score, team2_score,
    total_duels, duration_seconds, save_payload
  ) values (
    p_match_id,
    p_match->>'winner_team',
    array(select jsonb_array_elements_text(p_match->'team1_roster')),
    array(select jsonb_array_elements_text(p_match->'team2_roster')),
    array(select jsonb_array_elements_text(p_match->'team1_initial_roster')),
    array(select jsonb_array_elements_text(p_match->'team2_initial_roster')),
    p_match->'team1_powerups', p_match->'team2_powerups',
    (p_match->>'team1_score')::bigint, (p_match->>'team2_score')::bigint,
    (p_match->>'total_duels')::bigint,
    (p_match->>'duration_seconds')::integer,
    v_payload
  ) on conflict (id) do nothing
  returning id into v_saved_id;

  if v_saved_id is null then
    select save_payload into v_existing_payload
    from public.matches where id = p_match_id;
    if v_existing_payload = v_payload then return p_match_id; end if;
    raise exception 'Completed Match id conflicts with a different payload' using errcode = 'P0001';
  end if;

  insert into public.duel_events (
    match_id, round, winner_name, loser_name, winner_team, loser_team,
    shielded, winner_cards, loser_cards, winner_sum, loser_sum, power_ups_used
  )
  select p_match_id, event.round, event.winner_name, event.loser_name,
    event.winner_team, event.loser_team, event.shielded,
    event.winner_cards, event.loser_cards, event.winner_sum, event.loser_sum,
    event.power_ups_used
  from jsonb_to_recordset(p_events) as event(
    round integer, winner_name text, loser_name text, winner_team text,
    loser_team text, shielded boolean, winner_cards jsonb, loser_cards jsonb,
    winner_sum integer, loser_sum integer, power_ups_used jsonb
  );

  return p_match_id;
end;
$$;

revoke all on function public.save_completed_match(uuid, jsonb, jsonb) from public;
grant execute on function public.save_completed_match(uuid, jsonb, jsonb) to anon, authenticated;
```

Before applying, inspect the live table schema with the Supabase MCP. If it lacks one of the typed columns, stop and align the type contract and migration rather than applying this SQL. Apply the migration only through `supabase_apply_migration`.

- [x] **Step 4: Run database tests, including concurrency**

Run the script from Step 2. In terminal A, begin a transaction and call the function with UUID `33333333-3333-3333-3333-333333333333`; do not commit. In terminal B, call the same UUID and identical payload. Commit terminal A, let terminal B return, then run:

```sql
select count(*) as matches from public.matches where id = '33333333-3333-3333-3333-333333333333';
select count(*) as events from public.duel_events where match_id = '33333333-3333-3333-3333-333333333333';
```

Both queries must return `1`. Delete the fixed test UUID rows only in the non-production database after verification.

Expected: every assertion passes; no partial parent or child records remain after invalid payloads.

- [x] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat: atomically persist completed matches"
```

### Task 3: Capture once and make route retries safe

**Files:**

- Modify: `app/routes/game.tsx`
- Modify: `app/features/game/components/GameOverScreen.tsx`
- Create: `app/features/dashboard/services/completedMatchSave.ts`
- Create: `app/features/dashboard/services/completedMatchSave.test.ts`

**Interfaces:**

- Produces `createCompletedMatchSave()` with `capture(input)`, `save()`, and `reset()`.
- `capture` is idempotent and freezes one `SaveMatchInput`; `save` returns the same in-flight promise while saving and never mutates the frozen input.
- The UI adapter passes status to `GameOverScreen`; no screen copy or callback contract changes.

- [x] **Step 1: Write failing lifecycle tests**

Create `app/features/dashboard/services/completedMatchSave.test.ts` with a controlled `save` mock. Test all of these observable outcomes:

```typescript
it('captures duration and id once, then retries the identical input', async () => {
  const persist = vi.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce('match-1');
  const flow = createCompletedMatchSave({ createId: () => 'match-1', persist });

  flow.capture(makeSaveInput({ durationSeconds: 42 }));
  await expect(flow.save()).rejects.toThrow('offline');
  await expect(flow.save()).resolves.toBe('match-1');
  expect(persist).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'match-1', durationSeconds: 42 }));
  expect(persist).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'match-1', durationSeconds: 42 }));
});

it('coalesces overlapping saves and lets a reset start a new match', async () => {
  let resolveFirst: (value: string) => void = () => undefined;
  const first = new Promise<string>((resolve) => { resolveFirst = resolve; });
  const persist = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce('match-2');
  const flow = createCompletedMatchSave({
    createId: vi.fn().mockReturnValueOnce('match-1').mockReturnValueOnce('match-2'),
    persist
  });
  flow.capture(makeSaveInput());
  const pendingA = flow.save();
  const pendingB = flow.save();
  expect(pendingA).toBe(pendingB);
  expect(persist).toHaveBeenCalledTimes(1);
  flow.reset();
  flow.capture(makeSaveInput({ team1InitialRoster: ['new'] }));
  resolveFirst('match-1');
  await expect(pendingA).resolves.toBe('match-1');
  await expect(flow.save()).resolves.toBe('match-2');
  expect(persist).toHaveBeenLastCalledWith(expect.objectContaining({
    id: 'match-2', team1InitialRoster: ['new']
  }));
});
```

The test helper must make a complete `SaveMatchInput` fixture, including a mock Supabase client, rosters, scores, and duel events. It must not test module internals.

- [x] **Step 2: Run the lifecycle test and verify it fails**

Run:

```bash
npx vitest run app/features/dashboard/services/completedMatchSave.test.ts
```

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the completed-match save module**

Create `app/features/dashboard/services/completedMatchSave.ts` with the following public contract:

```typescript
export type CompletedMatchSave = {
  capture(input: Omit<SaveMatchInput, 'id'>): SaveMatchInput;
  save(): Promise<string>;
  reset(): void;
  getId(): string | null;
};

export function createCompletedMatchSave({
  createId = crypto.randomUUID,
  persist = saveMatch
}: {
  createId?: () => string;
  persist?: (input: SaveMatchInput) => Promise<string>;
} = {}): CompletedMatchSave {
  let captured: SaveMatchInput | null = null;
  let inFlight: Promise<string> | null = null;

  const cloneInput = (input: Omit<SaveMatchInput, 'id'>, id: string): SaveMatchInput => ({
    ...input,
    id,
    team1Data: structuredClone(input.team1Data),
    team2Data: structuredClone(input.team2Data),
    team1InitialRoster: [...input.team1InitialRoster],
    team2InitialRoster: [...input.team2InitialRoster],
    duelEvents: structuredClone(input.duelEvents)
  });

  return {
    capture(input) {
      if (!captured) captured = cloneInput(input, createId());
      return captured;
    },
    save() {
      if (!captured) return Promise.reject(new Error('No Completed Match captured'));
      if (inFlight) return inFlight;
      const operation = persist(captured).finally(() => {
        if (inFlight === operation) inFlight = null;
      });
      inFlight = operation;
      return operation;
    },
    reset() {
      captured = null;
      inFlight = null;
    },
    getId() {
      return captured?.id ?? null;
    }
  };
}
```

Freeze only the captured payload, not React state. The implementation must not change status; the route owns display state.

- [x] **Step 4: Integrate the module in the route**

In `app/routes/game.tsx`, add `useRef` to the React import and add the module import:

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createCompletedMatchSave,
  type CompletedMatchSave
} from '~/features/dashboard/services/completedMatchSave';
```

Create one stable flow directly after the existing save-status state:

```typescript
const completedMatchSaveRef = useRef<CompletedMatchSave | null>(null);
if (!completedMatchSaveRef.current) {
  completedMatchSaveRef.current = createCompletedMatchSave();
}
```

Replace `performSave`, its game-over effect, and `handleRetrySave` with:

```typescript
const saveCapturedMatch = useCallback(async () => {
  const flow = completedMatchSaveRef.current;
  const id = flow?.getId();
  if (!flow || !id) return;
  setSaveStatus('saving');
  try {
    await flow.save();
    if (flow.getId() === id) setSaveStatus('saved');
  } catch {
    if (flow.getId() === id) setSaveStatus('error');
  }
}, []);

useEffect(() => {
  if (gameState !== 'gameOver' || saveStatus !== 'idle') return;
  const url = clientSecrets?.SUPABASE_URL;
  const key = clientSecrets?.SUPABASE_ANON_KEY;
  if (!url || !key) return;
  const winnerTeam: TeamName = team1Data.players.length === 0 ? 'team2' : 'team1';
  const durationSeconds = gameStartTime == null
    ? undefined
    : Math.floor((Date.now() - gameStartTime) / 1000);
  completedMatchSaveRef.current?.capture({
    supabase: getSupabaseClient(url, key),
    winnerTeam,
    team1Data,
    team2Data,
    team1InitialRoster: initialTeam1Roster,
    team2InitialRoster: initialTeam2Roster,
    durationSeconds,
    duelEvents
  });
  void saveCapturedMatch();
}, [
  clientSecrets, duelEvents, gameStartTime, gameState, initialTeam1Roster,
  initialTeam2Roster, saveCapturedMatch, saveStatus, team1Data, team2Data
]);

const handleRetrySave = useCallback(() => {
  void saveCapturedMatch();
}, [saveCapturedMatch]);
```

At the start of `startGameWithTeams`, before `setSaveStatus('idle')`, add:

```typescript
completedMatchSaveRef.current?.reset();
```

This preserves the current absence of a message when Supabase is unconfigured. `handleRetrySave` never reconstructs the payload or calls `Date.now()`.

Remove the current `performSave` closure, which derives duration and recreates the payload on every retry. Keep `GameOverScreen`’s `SaveStatus` and `onRetrySave` props unchanged; only update it if a TypeScript import move requires it.

- [x] **Step 5: Run focused tests and app checks**

Run:

```bash
npx vitest run app/features/dashboard/services/completedMatchSave.test.ts app/features/dashboard/services/matchService.test.ts
npm run typecheck
npm run lint
npm run build
```

Expected: all pass. Then run `npm run dev`, finish a match with valid Supabase configuration, simulate one failed save in the browser network panel, click Retry, and verify one dashboard match with its full duel-event count.

- [x] **Step 6: Commit**

```bash
git add app/routes/game.tsx app/features/game/components/GameOverScreen.tsx app/features/dashboard/services/completedMatchSave.ts app/features/dashboard/services/completedMatchSave.test.ts
git commit -m "feat: retry completed match saves safely"
```

### Task 4: Document the domain term and operational migration path

**Files:**

- Create: `CONTEXT.md`
- Modify: `docs/SUPABASE_SETUP_GUIDE.md`

**Interfaces:**

- Defines the canonical domain term used by the persistence module and documentation.
- Documents RPC-based completed-match writes without changing dashboard read behavior.

- [x] **Step 1: Add the domain glossary**

Create `CONTEXT.md` with:

```markdown
# Thor’s 3Key

This context runs card duels between two teams and retains finished games for historical analysis.

## Language

**Completed Match**:
A game whose winner, final team state, duration, and duel events are fixed for historical recording.
_Avoid_: save payload, game result

**Duel Event**:
The recorded outcome of one duel within a Completed Match.
_Avoid_: round record
```

- [x] **Step 2: Update the Supabase guide**

Add a short section after the table and RLS setup explaining that the application writes a Completed Match only through `public.save_completed_match(uuid, jsonb, jsonb)`. State that it atomically records the match and all Duel Events, and that retrying the same UUID/payload is safe. Do not instruct readers to call direct table inserts for completed-match writes.

- [x] **Step 3: Verify documentation and commit**

Run:

```bash
rg -n "save_completed_match|Completed Match|Duel Event" CONTEXT.md docs/SUPABASE_SETUP_GUIDE.md
git diff --check
```

Expected: the term and RPC appear in both documents; `git diff --check` produces no output.

```bash
git add CONTEXT.md docs/SUPABASE_SETUP_GUIDE.md
git commit -m "docs: define completed match persistence"
```

## Final verification

- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` after all commits.
- [ ] Inspect the applied migration in Supabase and execute `supabase/tests/atomic_completed_match_saving.sql` against a non-production database.
- [ ] Verify a normal completed game yields one `matches` row and exactly `total_duels` child rows.
- [ ] Verify an event-write validation failure yields neither a parent nor child row.
- [ ] Verify a retry after a client-observed failure displays the existing success state and creates no duplicate row or duel event.
- [ ] Verify starting a new game before an old request resolves cannot change the new game’s save status.
