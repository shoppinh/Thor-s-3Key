# Editable Roster Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Google Sheets into a roster import step, then let the host edit team members and turn order before starting the game.

**Architecture:** Keep roster edits as setup-only React state in `app/routes/game.tsx`, with a focused `RosterSetup` component for add/remove/reorder/move UI. Put roster parsing, validation, and movement rules in pure helpers so the risky behavior is covered by Vitest without needing browser tests. Preserve the existing gameplay engine and Supabase match-history schema by continuing to pass `string[]` rosters into `startGameWithTeams`. Native HTML drag/drop is the desktop pointer path; button controls are the supported keyboard and touch fallback.

**Tech Stack:** Remix v2, React 18, TypeScript, Vitest, native HTML drag-and-drop plus touch-safe button controls.

---

## File Map

| File | Responsibility |
| --- | --- |
| `app/features/game/services/rosterSetup.ts` | Pure roster parsing, add/remove, drag move, and validation helpers |
| `app/features/game/services/rosterSetup.test.ts` | Unit tests for roster helper behavior |
| `app/features/game/services/rosterSetupFlow.test.ts` | Route-adjacent flow test for import, edits, validation, and start rosters |
| `app/features/game/services/sheetService.ts` | Fetch Google Sheets rows and return ordered setup seed rosters |
| `app/features/game/services/sheetService.test.ts` | Unit tests for fetch success and failure behavior |
| `app/features/game/components/RosterSetup.tsx` | Editable two-column roster setup UI |
| `app/routes/game.tsx` | Own setup roster state, sheet import action, start validation, and game start wiring |
| `app/locales/en.ts` / `app/locales/vi.ts` | User-facing labels and validation messages |
| `app/app.css` | Roster setup layout and drag/drop styling |

---

### Task 1: Roster Setup Helpers

**Files:**
- Create: `app/features/game/services/rosterSetup.test.ts`
- Create: `app/features/game/services/rosterSetup.ts`

- [ ] **Step 1: Write failing tests for sheet parsing, movement, and validation**

Create `app/features/game/services/rosterSetup.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  addRosterMember,
  moveRosterMember,
  parseSheetRowsToRosters,
  removeRosterMember,
  validateRosterSetup
} from './rosterSetup';

describe('parseSheetRowsToRosters', () => {
  it('skips the header, trims names, ignores blank cells, and preserves order', () => {
    const result = parseSheetRowsToRosters([
      ['Team 1', 'Team 2'],
      [' Alice ', ' Bob '],
      ['', ' Cindy'],
      ['Dan', '   '],
      [' ', ' '],
      ['Eve']
    ]);

    expect(result).toEqual({
      team1: ['Alice', 'Dan', 'Eve'],
      team2: ['Bob', 'Cindy']
    });
  });

  it('returns empty rosters when the sheet has only a header row', () => {
    expect(parseSheetRowsToRosters([['Team 1', 'Team 2']])).toEqual({
      team1: [],
      team2: []
    });
  });
});

describe('roster member changes', () => {
  it('adds a trimmed member to the requested team', () => {
    expect(addRosterMember(['Alice'], ' Bob ')).toEqual(['Alice', 'Bob']);
  });

  it('does not add an empty member', () => {
    expect(addRosterMember(['Alice'], '   ')).toEqual(['Alice']);
  });

  it('removes a member by index without mutating the original roster', () => {
    const roster = ['Alice', 'Bob', 'Cindy'];

    expect(removeRosterMember(roster, 1)).toEqual(['Alice', 'Cindy']);
    expect(roster).toEqual(['Alice', 'Bob', 'Cindy']);
  });

  it('moves a member within one team', () => {
    const result = moveRosterMember({
      team1: ['Alice', 'Bob', 'Cindy'],
      team2: ['Dan'],
      fromTeam: 'team1',
      fromIndex: 0,
      toTeam: 'team1',
      toIndex: 2
    });

    expect(result).toEqual({
      team1: ['Bob', 'Cindy', 'Alice'],
      team2: ['Dan']
    });
  });

  it('moves a member between teams at the target index', () => {
    const result = moveRosterMember({
      team1: ['Alice', 'Bob'],
      team2: ['Cindy', 'Dan'],
      fromTeam: 'team1',
      fromIndex: 1,
      toTeam: 'team2',
      toIndex: 1
    });

    expect(result).toEqual({
      team1: ['Alice'],
      team2: ['Cindy', 'Bob', 'Dan']
    });
  });

  it('ignores invalid source indexes', () => {
    const result = moveRosterMember({
      team1: ['Alice'],
      team2: ['Bob'],
      fromTeam: 'team1',
      fromIndex: 5,
      toTeam: 'team2',
      toIndex: 0
    });

    expect(result).toEqual({
      team1: ['Alice'],
      team2: ['Bob']
    });
  });

  it('ignores negative source indexes', () => {
    const result = moveRosterMember({
      team1: ['Alice', 'Bob'],
      team2: ['Cindy'],
      fromTeam: 'team1',
      fromIndex: -1,
      toTeam: 'team2',
      toIndex: 0
    });

    expect(result).toEqual({
      team1: ['Alice', 'Bob'],
      team2: ['Cindy']
    });
  });

  it('bounds negative target indexes to the start of the roster', () => {
    const result = moveRosterMember({
      team1: ['Alice', 'Bob'],
      team2: ['Cindy'],
      fromTeam: 'team1',
      fromIndex: 1,
      toTeam: 'team2',
      toIndex: -3
    });

    expect(result).toEqual({
      team1: ['Alice'],
      team2: ['Bob', 'Cindy']
    });
  });

  it('keeps a same-team self-drop unchanged', () => {
    const result = moveRosterMember({
      team1: ['Alice', 'Bob'],
      team2: ['Cindy'],
      fromTeam: 'team1',
      fromIndex: 1,
      toTeam: 'team1',
      toIndex: 1
    });

    expect(result).toEqual({
      team1: ['Alice', 'Bob'],
      team2: ['Cindy']
    });
  });
});

describe('validateRosterSetup', () => {
  it('accepts one or more unique members per team', () => {
    expect(validateRosterSetup(['Alice'], ['Bob'])).toEqual({
      isValid: true,
      errors: []
    });
  });

  it('rejects empty teams', () => {
    expect(validateRosterSetup([], ['Bob']).errors).toContain(
      'teamEmpty'
    );
  });

  it('rejects blank names after trimming', () => {
    expect(validateRosterSetup(['Alice', '   '], ['Bob']).errors).toContain(
      'blankName'
    );
  });

  it('rejects duplicate names across both teams case-insensitively', () => {
    expect(validateRosterSetup(['Alice'], [' alice ']).errors).toContain(
      'duplicateName'
    );
  });
});
```

- [ ] **Step 2: Run the focused helper test and verify it fails**

Run:

```bash
npx vitest run app/features/game/services/rosterSetup.test.ts
```

Expected: FAIL with an import error for `./rosterSetup`.

- [ ] **Step 3: Implement the roster helper module**

Create `app/features/game/services/rosterSetup.ts`:

```typescript
import type { TeamName } from '~/features/game/types/gameTypes';

export type SetupRosters = {
  team1: string[];
  team2: string[];
};

export type RosterValidationResult = {
  isValid: boolean;
  errors: RosterValidationError[];
};

export type RosterValidationError = 'teamEmpty' | 'blankName' | 'duplicateName';

export type MoveRosterMemberParams = SetupRosters & {
  fromTeam: TeamName;
  fromIndex: number;
  toTeam: TeamName;
  toIndex: number;
};

const normalizeName = (name: string): string => name.trim();

export function parseSheetRowsToRosters(rows: string[][]): SetupRosters {
  return rows.slice(1).reduce<SetupRosters>(
    (result, row) => {
      const team1Name = normalizeName(row[0] ?? '');
      const team2Name = normalizeName(row[1] ?? '');

      if (team1Name) result.team1.push(team1Name);
      if (team2Name) result.team2.push(team2Name);

      return result;
    },
    { team1: [], team2: [] }
  );
}

export function addRosterMember(roster: string[], rawName: string): string[] {
  const name = normalizeName(rawName);
  if (!name) return roster;
  return [...roster, name];
}

export function removeRosterMember(roster: string[], index: number): string[] {
  return roster.filter((_, currentIndex) => currentIndex !== index);
}

export function moveRosterMember({
  team1,
  team2,
  fromTeam,
  fromIndex,
  toTeam,
  toIndex
}: MoveRosterMemberParams): SetupRosters {
  const next: SetupRosters = {
    team1: [...team1],
    team2: [...team2]
  };
  const source = next[fromTeam];
  const target = next[toTeam];
  if (fromIndex < 0 || fromIndex >= source.length) {
    return { team1, team2 };
  }

  if (fromTeam === toTeam && fromIndex === toIndex) {
    return next;
  }

  const [member] = source.splice(fromIndex, 1);

  if (!member) {
    return { team1, team2 };
  }

  const boundedTargetIndex = Math.max(0, Math.min(toIndex, target.length));
  target.splice(boundedTargetIndex, 0, member);

  return next;
}

export function validateRosterSetup(
  team1: string[],
  team2: string[]
): RosterValidationResult {
  const errors: RosterValidationError[] = [];
  const allNames = [...team1, ...team2];
  const trimmedNames = allNames.map(normalizeName);

  if (team1.length === 0 || team2.length === 0) {
    errors.push('teamEmpty');
  }

  if (trimmedNames.some((name) => !name)) {
    errors.push('blankName');
  }

  const uniqueNames = new Set(
    trimmedNames.filter(Boolean).map((name) => name.toLocaleLowerCase())
  );

  if (uniqueNames.size !== trimmedNames.filter(Boolean).length) {
    errors.push('duplicateName');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

- [ ] **Step 4: Run helper tests and typecheck**

Run:

```bash
npx vitest run app/features/game/services/rosterSetup.test.ts
npm run typecheck
```

Expected: helper tests PASS and typecheck exits successfully.

- [ ] **Step 5: Commit helper changes**

```bash
git add app/features/game/services/rosterSetup.ts app/features/game/services/rosterSetup.test.ts
git commit -m "feat: add editable roster helpers"
```

---

### Task 2: Sheet Import Service

**Files:**
- Create: `app/features/game/services/sheetService.test.ts`
- Modify: `app/features/game/services/sheetService.ts`

- [ ] **Step 1: Write failing tests for ordered sheet import**

Create `app/features/game/services/sheetService.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPlayersFromSheet } from './sheetService';

describe('loadPlayersFromSheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches sheet rows and returns ordered setup rosters', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        values: [
          ['Team 1', 'Team 2'],
          [' Alice ', 'Bob'],
          ['', 'Cindy'],
          ['Dan', '']
        ]
      })
    } as Response);

    await expect(
      loadPlayersFromSheet({
        apiKey: 'api-key',
        sheetId: 'sheet-id',
        sheetRange: '3Key Game!A1:B30'
      })
    ).resolves.toEqual({
      team1: ['Alice', 'Dan'],
      team2: ['Bob', 'Cindy']
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/3Key%20Game!A1%3AB30?key=api-key'
    );
  });

  it('throws when the sheet request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden'
    } as Response);

    await expect(
      loadPlayersFromSheet({
        apiKey: 'api-key',
        sheetId: 'sheet-id',
        sheetRange: 'Roster!A1:B30'
      })
    ).rejects.toThrow('Failed to fetch sheet data: 403 Forbidden');
  });

  it('throws when the sheet has no values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    await expect(
      loadPlayersFromSheet({
        apiKey: 'api-key',
        sheetId: 'sheet-id',
        sheetRange: 'Roster!A1:B30'
      })
    ).rejects.toThrow('Sheet contains no data');
  });
});
```

- [ ] **Step 2: Run the sheet service test and verify it fails**

Run:

```bash
npx vitest run app/features/game/services/sheetService.test.ts
```

Expected: FAIL because `loadPlayersFromSheet` still requires `anonymousLabel` and shuffles results.

- [ ] **Step 3: Refactor `sheetService` to import seed rosters**

Replace `app/features/game/services/sheetService.ts` with:

```typescript
import { parseSheetRowsToRosters, type SetupRosters } from './rosterSetup';

type LoadPlayersParams = {
  apiKey: string;
  sheetId: string;
  sheetRange: string;
};

export const loadPlayersFromSheet = async ({
  apiKey,
  sheetId,
  sheetRange
}: LoadPlayersParams): Promise<SetupRosters> => {
  const encodedRange = encodeURIComponent(sheetRange);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sheet data: ${response.status} ${response.statusText}`
    );
  }

  const data: { values?: string[][] } = await response.json();

  if (!data.values || data.values.length === 0) {
    throw new Error('Sheet contains no data');
  }

  return parseSheetRowsToRosters(data.values);
};
```

- [ ] **Step 4: Run service tests**

Run:

```bash
npx vitest run app/features/game/services/rosterSetup.test.ts app/features/game/services/sheetService.test.ts
```

Expected: both test files PASS.

- [ ] **Step 5: Commit sheet service changes**

```bash
git add app/features/game/services/sheetService.ts app/features/game/services/sheetService.test.ts
git commit -m "feat: import ordered rosters from sheets"
```

---

### Task 3: Editable Roster Setup Component

**Files:**
- Create: `app/features/game/components/RosterSetup.tsx`
- Modify: `app/locales/en.ts`
- Modify: `app/locales/vi.ts`
- Modify: `app/app.css`

- [ ] **Step 1: Create the `RosterSetup` component**

Create `app/features/game/components/RosterSetup.tsx`:

```tsx
import { type DragEvent, useState } from 'react';
import type { TeamName } from '~/features/game/types/gameTypes';
import type { SetupRosters } from '~/features/game/services/rosterSetup';

type DragPayload = {
  team: TeamName;
  index: number;
};

type RosterSetupLabels = {
  add: string;
  dragMember: (member: string) => string;
  moveMemberUp: (member: string) => string;
  moveMemberDown: (member: string) => string;
  moveMemberToOtherTeam: (member: string) => string;
  removeMember: (member: string) => string;
  newMemberForTeam: (teamName: string) => string;
};

type RosterSetupProps = SetupRosters & {
  team1Name: string;
  team2Name: string;
  isLoading: boolean;
  errors: string[];
  labels: RosterSetupLabels;
  onAddMember: (team: TeamName, name: string) => void;
  onRemoveMember: (team: TeamName, index: number) => void;
  onMoveMember: (
    fromTeam: TeamName,
    fromIndex: number,
    toTeam: TeamName,
    toIndex: number
  ) => void;
};

const teamLabels: Record<TeamName, 'team1' | 'team2'> = {
  team1: 'team1',
  team2: 'team2'
};

export function RosterSetup({
  team1,
  team2,
  team1Name,
  team2Name,
  isLoading,
  errors,
  labels,
  onAddMember,
  onRemoveMember,
  onMoveMember
}: RosterSetupProps) {
  const [newMemberNames, setNewMemberNames] = useState<Record<TeamName, string>>(
    {
      team1: '',
      team2: ''
    }
  );

  const submitMember = (team: TeamName) => {
    const name = newMemberNames[team];
    onAddMember(team, name);
    setNewMemberNames((prev) => ({ ...prev, [team]: '' }));
  };

  const handleDrop = (
    event: DragEvent<HTMLLIElement | HTMLOListElement>,
    toTeam: TeamName,
    toIndex: number
  ) => {
    event.preventDefault();
    const rawPayload = event.dataTransfer.getData('application/json');
    if (!rawPayload) return;

    let payload: DragPayload;
    try {
      payload = JSON.parse(rawPayload) as DragPayload;
    } catch {
      return;
    }

    if (
      (payload.team !== 'team1' && payload.team !== 'team2') ||
      !Number.isInteger(payload.index)
    ) {
      return;
    }

    onMoveMember(payload.team, payload.index, toTeam, toIndex);
  };

  const renderTeam = (team: TeamName, roster: string[], title: string) => (
    <section className={`roster-card roster-card--${teamLabels[team]}`}>
      <div className="roster-card__header">
        <h3>{title}</h3>
        <span>{roster.length}</span>
      </div>

      <ol
        className="roster-list"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, team, roster.length)}
      >
        {roster.map((member, index) => (
          <li
            className="roster-member"
            draggable={!isLoading}
            key={`${team}-${member}-${index}`}
            onDragStart={(event) => {
              event.dataTransfer.setData(
                'application/json',
                JSON.stringify({ team, index } satisfies DragPayload)
              );
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, team, index)}
          >
            <button
              aria-label={labels.dragMember(member)}
              className="roster-member__handle"
              disabled={isLoading}
              type="button"
            >
              =
            </button>
            <span className="roster-member__position">{index + 1}</span>
            <span className="roster-member__name">{member}</span>
            <div className="roster-member__actions">
              <button
                aria-label={labels.moveMemberUp(member)}
                disabled={isLoading || index === 0}
                onClick={() => onMoveMember(team, index, team, index - 1)}
                type="button"
              >
                ^
              </button>
              <button
                aria-label={labels.moveMemberDown(member)}
                disabled={isLoading || index === roster.length - 1}
                onClick={() => onMoveMember(team, index, team, index + 1)}
                type="button"
              >
                v
              </button>
              <button
                aria-label={labels.moveMemberToOtherTeam(member)}
                disabled={isLoading}
                onClick={() =>
                  onMoveMember(
                    team,
                    index,
                    team === 'team1' ? 'team2' : 'team1',
                    team === 'team1' ? team2.length : team1.length
                  )
                }
                type="button"
              >
                &gt;
              </button>
              <button
                aria-label={labels.removeMember(member)}
                disabled={isLoading}
                onClick={() => onRemoveMember(team, index)}
                type="button"
              >
                x
              </button>
            </div>
          </li>
        ))}
      </ol>

      <form
        className="roster-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitMember(team);
        }}
      >
        <input
          aria-label={labels.newMemberForTeam(title)}
          className="rpg-input"
          disabled={isLoading}
          onChange={(event) =>
            setNewMemberNames((prev) => ({
              ...prev,
              [team]: event.target.value
            }))
          }
          type="text"
          value={newMemberNames[team]}
        />
        <button className="rpg-button secondary" disabled={isLoading} type="submit">
          {labels.add}
        </button>
      </form>
    </section>
  );

  return (
    <div className="roster-setup">
      <div className="roster-setup__grid">
        {renderTeam('team1', team1, team1Name)}
        {renderTeam('team2', team2, team2Name)}
      </div>

      {errors.length > 0 && (
        <ul className="roster-errors" aria-live="polite">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add locale strings**

Add these keys inside the `game` object in `app/locales/en.ts`:

```typescript
    rosterSetup: 'ROSTER SETUP',
    loadRoster: 'LOAD ROSTER',
    loadingRoster: 'Loading roster...',
    rosterLoadFailed: 'Failed to load roster from Google Sheets.',
    rosterTeamEmpty: 'Each team must have at least one member.',
    rosterBlankName: 'Member names cannot be blank.',
    rosterDuplicateName: 'Member names must be unique across both teams.',
    rosterAddMember: 'Add',
    rosterDragMember: 'Drag {{member}}',
    rosterMoveMemberUp: 'Move {{member}} up',
    rosterMoveMemberDown: 'Move {{member}} down',
    rosterMoveMemberToOtherTeam: 'Move {{member}} to other team',
    rosterRemoveMember: 'Remove {{member}}',
    rosterNewMemberForTeam: 'New member for {{team}}',
```

Add these keys inside the `game` object in `app/locales/vi.ts`:

```typescript
    rosterSetup: 'CÀI ĐẶT ĐỘI HÌNH',
    loadRoster: 'TẢI ĐỘI HÌNH',
    loadingRoster: 'Đang tải đội hình...',
    rosterLoadFailed: 'Không tải được đội hình từ Google Sheets.',
    rosterTeamEmpty: 'Mỗi đội phải có ít nhất một thành viên.',
    rosterBlankName: 'Tên thành viên không được để trống.',
    rosterDuplicateName: 'Tên thành viên không được trùng giữa hai đội.',
    rosterAddMember: 'Thêm',
    rosterDragMember: 'Kéo {{member}}',
    rosterMoveMemberUp: 'Chuyển {{member}} lên',
    rosterMoveMemberDown: 'Chuyển {{member}} xuống',
    rosterMoveMemberToOtherTeam: 'Chuyển {{member}} sang đội còn lại',
    rosterRemoveMember: 'Xóa {{member}}',
    rosterNewMemberForTeam: 'Thành viên mới cho {{team}}',
```

- [ ] **Step 3: Add roster setup CSS**

Append to `app/app.css`:

```css
.roster-setup {
  margin-top: 20px;
}

.setup-roster-load {
  margin-bottom: 20px;
  text-align: center;
}

.setup-roster-load .rpg-button {
  width: 100%;
  padding: 12px 20px;
  font-size: 1.1rem;
}

.setup-roster-title {
  margin: 24px 0 12px;
  color: var(--color-primary);
  font-size: 2rem;
  letter-spacing: 0;
  text-align: center;
}

.roster-setup__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.roster-card {
  background: rgba(15, 12, 41, 0.8);
  border: 2px solid var(--color-secondary);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
}

.roster-card--team1 {
  border-color: var(--color-primary);
}

.roster-card--team2 {
  border-color: var(--color-secondary);
}

.roster-card__header,
.roster-member,
.roster-add-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.roster-card__header {
  justify-content: space-between;
  margin-bottom: 12px;
}

.roster-card__header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.roster-card__header span {
  color: var(--color-accent);
  font-family: var(--font-header);
}

.roster-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 56px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.roster-member {
  min-height: 44px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
}

.roster-member__handle,
.roster-member__actions button {
  min-width: 32px;
  min-height: 32px;
  border: 1px solid var(--color-secondary);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  color: var(--color-text);
  cursor: pointer;
}

.roster-member__handle:disabled,
.roster-member__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.roster-member__position {
  color: var(--color-accent);
  font-family: var(--font-header);
  min-width: 24px;
}

.roster-member__name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: left;
}

.roster-member__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.roster-add-form {
  margin-top: 12px;
}

.roster-add-form input {
  flex: 1;
  min-width: 0;
}

.roster-add-form .rpg-button {
  padding: 8px 12px;
  font-size: 0.95rem;
}

.roster-errors {
  margin: 12px 0 0;
  padding-left: 20px;
  color: #ff8f8f;
  font-family: var(--font-body);
  text-align: left;
}

[data-theme='summer'] .roster-card {
  background: var(--color-surface);
}

@media (max-width: 900px) {
  .roster-setup__grid {
    grid-template-columns: 1fr;
  }

  .roster-member {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .roster-member__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit roster UI component changes**

```bash
git add app/features/game/components/RosterSetup.tsx app/locales/en.ts app/locales/vi.ts app/app.css
git commit -m "feat: add editable roster setup UI"
```

---

### Task 4: Wire Roster Setup Into Game Route

**Files:**
- Create: `app/features/game/services/rosterSetupFlow.test.ts`
- Modify: `app/routes/game.tsx`

- [ ] **Step 1: Add imports**

In `app/routes/game.tsx`, add:

```typescript
import { RosterSetup } from '~/features/game/components/RosterSetup';
import {
  addRosterMember,
  moveRosterMember,
  removeRosterMember,
  validateRosterSetup
} from '~/features/game/services/rosterSetup';
import type { TeamName } from '~/features/game/types/gameTypes';
```

If `TeamName` is already imported from `gameTypes`, merge the import instead of adding a duplicate.

- [ ] **Step 2: Add setup roster state near existing setup state**

Add these state values near `sheetId`, `sheetRange`, and `setupMode`:

```typescript
  const [setupTeam1Roster, setSetupTeam1Roster] = useState<string[]>([]);
  const [setupTeam2Roster, setSetupTeam2Roster] = useState<string[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterLoadError, setRosterLoadError] = useState('');
```

- [ ] **Step 3: Add derived roster validation**

Add this after `canRedo`:

```typescript
  const rosterValidation = useMemo(
    () => validateRosterSetup(setupTeam1Roster, setupTeam2Roster),
    [setupTeam1Roster, setupTeam2Roster]
  );

  const rosterErrors = [
    ...(rosterLoadError ? [t('game.rosterLoadFailed')] : []),
    ...rosterValidation.errors.map((error) => {
      if (error === 'teamEmpty') {
        return t('game.rosterTeamEmpty');
      }
      if (error === 'blankName') {
        return t('game.rosterBlankName');
      }
      if (error === 'duplicateName') {
        return t('game.rosterDuplicateName');
      }
      return error;
    })
  ];

  const rosterSetupLabels = {
    add: t('game.rosterAddMember'),
    dragMember: (member: string) => t('game.rosterDragMember', { member }),
    moveMemberUp: (member: string) =>
      t('game.rosterMoveMemberUp', { member }),
    moveMemberDown: (member: string) =>
      t('game.rosterMoveMemberDown', { member }),
    moveMemberToOtherTeam: (member: string) =>
      t('game.rosterMoveMemberToOtherTeam', { member }),
    removeMember: (member: string) =>
      t('game.rosterRemoveMember', { member }),
    newMemberForTeam: (team: string) =>
      t('game.rosterNewMemberForTeam', { team })
  };
```

- [ ] **Step 4: Replace sheet-loading inside `startGame` with a separate `loadRoster` action**

Add this function above `startGame`:

```typescript
  const loadRoster = async () => {
    setIsRosterLoading(true);
    setRosterLoadError('');

    try {
      const { team1, team2 } = await loadPlayersFromSheet({
        apiKey: API_KEY,
        sheetId,
        sheetRange
      });

      setSetupTeam1Roster(team1);
      setSetupTeam2Roster(team2);
    } catch (error) {
      console.error('Error fetching roster:', error);
      setRosterLoadError('failed');
    } finally {
      setIsRosterLoading(false);
    }
  };
```

Then replace the current `startGame` body with:

```typescript
  const startGame = async () => {
    if (!rosterValidation.isValid) {
      return;
    }

    setGameState('gameLoading');
    try {
      await preloadGameImages(getThemeExtraCardBacks(theme));
    } catch (error) {
      setGameState('setup');
      console.error('Error preloading images:', error);
      return;
    }

    const team1Players = [...setupTeam1Roster];
    const team2Players = [...setupTeam2Roster];

    if (setupMode === 'both' || setupMode === 'random') {
      setTeam1Data((prev) => ({
        ...prev,
        players: team1Players,
        powerUps: { ...team1Alloc }
      }));
      setTeam2Data((prev) => ({
        ...prev,
        players: team2Players,
        powerUps: { ...team1Alloc }
      }));
    } else {
      setTeam1Data((prev) => ({
        ...prev,
        players: team1Players,
        powerUps: { ...team1Alloc }
      }));
      setTeam2Data((prev) => ({
        ...prev,
        players: team2Players,
        powerUps: { ...team2Alloc }
      }));
    }

    startGameWithTeams(team1Players, team2Players);
  };
```

- [ ] **Step 5: Add roster mutation handlers**

Add these functions above `renderLabelWithIcon`:

```typescript
  const addSetupRosterMember = (team: TeamName, name: string) => {
    setRosterLoadError('');
    if (team === 'team1') {
      setSetupTeam1Roster((prev) => addRosterMember(prev, name));
      return;
    }

    setSetupTeam2Roster((prev) => addRosterMember(prev, name));
  };

  const removeSetupRosterMember = (team: TeamName, index: number) => {
    setRosterLoadError('');
    if (team === 'team1') {
      setSetupTeam1Roster((prev) => removeRosterMember(prev, index));
      return;
    }

    setSetupTeam2Roster((prev) => removeRosterMember(prev, index));
  };

  const moveSetupRosterMember = (
    fromTeam: TeamName,
    fromIndex: number,
    toTeam: TeamName,
    toIndex: number
  ) => {
    setRosterLoadError('');
    const result = moveRosterMember({
      team1: setupTeam1Roster,
      team2: setupTeam2Roster,
      fromTeam,
      fromIndex,
      toTeam,
      toIndex
    });

    setSetupTeam1Roster(result.team1);
    setSetupTeam2Roster(result.team2);
  };
```

- [ ] **Step 6: Include roster validation in `isStartGameDisabled`**

Change `isStartGameDisabled` to:

```typescript
  const isStartGameDisabled = (): boolean => {
    return (
      isRosterLoading ||
      !rosterValidation.isValid ||
      isStartGameDisabledByAllocation({
        gameState,
        setupMode,
        team1Alloc,
        team2Alloc,
        team1Total: team1Data.totalPowerUps,
        team2Total: team2Data.totalPowerUps
      })
    );
  };
```

- [ ] **Step 7: Render Load Roster and `RosterSetup` in the setup screen**

Inside the right-side sheet panel area, below the sheet range input panel and above the Start Game button, insert:

```tsx
                  <div className="setup-roster-load">
                    <button
                      onClick={() => loadRoster()}
                      className="rpg-button secondary"
                      disabled={gameState !== 'setup' || isRosterLoading}
                    >
                      {isRosterLoading
                        ? t('game.loadingRoster')
                        : t('game.loadRoster')}
                    </button>
                  </div>
```

Inside the left setup column, below the power-up guide link block, insert:

```tsx
                  <h2
                    className="setup-roster-title text-glow"
                  >
                    {t('game.rosterSetup')}
                  </h2>
                  <RosterSetup
                    team1={setupTeam1Roster}
                    team2={setupTeam2Roster}
                    team1Name={team1Data.name}
                    team2Name={team2Data.name}
                    isLoading={isRosterLoading || gameState !== 'setup'}
                    errors={rosterErrors}
                    labels={rosterSetupLabels}
                    onAddMember={addSetupRosterMember}
                    onRemoveMember={removeSetupRosterMember}
                    onMoveMember={moveSetupRosterMember}
                  />
```

- [ ] **Step 8: Add route-adjacent flow coverage**

Create `app/features/game/services/rosterSetupFlow.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  addRosterMember,
  moveRosterMember,
  parseSheetRowsToRosters,
  removeRosterMember,
  validateRosterSetup
} from './rosterSetup';

describe('editable roster setup flow', () => {
  it('uses sheet rows as seeds, applies manual edits, and produces start rosters', () => {
    const seeded = parseSheetRowsToRosters([
      ['Team 1', 'Team 2'],
      ['Alice', 'Bob'],
      ['Cindy', 'Dan']
    ]);
    const withAddedMember = {
      ...seeded,
      team1: addRosterMember(seeded.team1, ' Eve ')
    };
    const withMovedMember = moveRosterMember({
      ...withAddedMember,
      fromTeam: 'team1',
      fromIndex: 2,
      toTeam: 'team2',
      toIndex: 1
    });
    const edited = {
      ...withMovedMember,
      team2: removeRosterMember(withMovedMember.team2, 0)
    };

    expect(validateRosterSetup(edited.team1, edited.team2).isValid).toBe(true);
    expect({ team1: [...edited.team1], team2: [...edited.team2] }).toEqual({
      team1: ['Alice', 'Cindy'],
      team2: ['Eve', 'Dan']
    });
  });
});
```

This repo's Vitest environment is `node`, so this route-adjacent test covers the real import/edit/start roster behavior without adding a browser test dependency.

- [ ] **Step 9: Run focused tests and typecheck**

Run:

```bash
npx vitest run app/features/game/services/rosterSetup.test.ts app/features/game/services/sheetService.test.ts app/features/game/services/rosterSetupFlow.test.ts
npm run typecheck
```

Expected: tests PASS and typecheck exits successfully.

- [ ] **Step 10: Commit route integration**

```bash
git add app/routes/game.tsx app/features/game/services/rosterSetupFlow.test.ts
git commit -m "feat: start games from edited rosters"
```

---

### Task 5: Final Verification

**Files:**
- Verify: full repository

- [ ] **Step 1: Run all automated checks**

Run:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit successfully.

- [ ] **Step 2: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Remix dev server starts on `http://localhost:5173`.

- [ ] **Step 3: Manually verify roster setup behavior**

In the browser at `http://localhost:5173/game`, verify:

```text
1. Start Game is disabled before each team has at least one roster member.
2. Load Roster fills both setup columns from the configured Google Sheet.
3. Blank sheet cells do not create Anonymous members.
4. Adding a member trims surrounding whitespace.
5. Duplicate names across teams show a validation error and block Start Game.
6. Dragging within a team changes that team's order.
7. Dragging a member to the other team moves them to the drop position.
8. Arrow buttons move a member up and down without using the mouse.
9. The cross-team button moves a member to the other team.
10. Removing a member updates validation immediately.
11. Starting the game uses the edited top member as the first eligible member for that team.
12. Game over still saves match history with the edited initial roster.
```

- [ ] **Step 4: Commit any final fixes**

If manual verification required fixes, commit them:

```bash
git add app/features/game app/routes/game.tsx app/locales/en.ts app/locales/vi.ts app/app.css
git commit -m "fix: polish editable roster setup"
```

If no fixes were needed, skip this commit.

---

## Self-Review

- Spec coverage: Google Sheets is an initial import only, manual setup is in memory, drag reorder and cross-team movement are included, add/remove is included, duplicates are blocked, blank sheet cells are ignored, and no Supabase schema change is planned.
- Placeholder scan: The plan contains concrete file paths, function names, commands, code snippets, and expected outcomes.
- Type consistency: `SetupRosters`, `TeamName`, `RosterSetup`, `loadPlayersFromSheet`, and helper names are consistent across tasks.
