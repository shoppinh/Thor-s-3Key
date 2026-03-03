import { PowerUpsAllocation, TeamId } from '~/features/game/types/gameTypes';
import { TeamData } from '~/models/TeamData';

export type TeamEntry = {
  id: TeamId;
  data: TeamData;
  allocation: PowerUpsAllocation;
};

export const buildTeamEntries = (
  teams: Array<{ id: TeamId; data: TeamData; allocation: PowerUpsAllocation }>
): TeamEntry[] => teams;

export const getTeamEntryById = (
  teams: TeamEntry[],
  teamId?: TeamId
): TeamEntry | undefined => {
  if (!teamId) {
    return undefined;
  }

  return teams.find((team) => team.id === teamId);
};

export const getTeamIdByPlayerName = (
  teams: TeamEntry[],
  playerName: string
): TeamId | undefined => {
  return teams.find((team) => team.data.players.includes(playerName))?.id;
};
