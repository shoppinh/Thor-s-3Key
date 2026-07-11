import type { TeamName } from '~/features/game/types/gameTypes';
import type { TeamData } from '~/models/TeamData';
import type { LocalDuelEvent } from '~/features/dashboard/types';
import type { SetupRosters } from './rosterSetup';

export interface SaveMatchInput {
  winnerTeam: TeamName;
  team1Data: TeamData;
  team2Data: TeamData;
  team1InitialRoster: string[];
  team2InitialRoster: string[];
  durationSeconds?: number;
  duelEvents: LocalDuelEvent[];
}

export interface MatchRepository {
  saveMatch(input: SaveMatchInput): Promise<void>;
}

export interface LoadRosterInput {
  sheetId: string;
  sheetRange: string;
}

export interface RosterLoader {
  loadRoster(input: LoadRosterInput): Promise<SetupRosters>;
}
