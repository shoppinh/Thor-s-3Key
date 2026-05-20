import type { TeamName } from '~/features/game/types/gameTypes';

export type SetupRosters = {
  team1: string[];
  team2: string[];
};

export type RosterValidationResult = {
  isValid: boolean;
  errors: string[];
};

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
  const errors: string[] = [];
  const allNames = [...team1, ...team2];
  const trimmedNames = allNames.map(normalizeName);

  if (team1.length === 0 || team2.length === 0) {
    errors.push('Each team must have at least one member.');
  }

  if (trimmedNames.some((name) => !name)) {
    errors.push('Member names cannot be blank.');
  }

  const uniqueNames = new Set(
    trimmedNames.filter(Boolean).map((name) => name.toLocaleLowerCase())
  );

  if (uniqueNames.size !== trimmedNames.filter(Boolean).length) {
    errors.push('Member names must be unique across both teams.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
