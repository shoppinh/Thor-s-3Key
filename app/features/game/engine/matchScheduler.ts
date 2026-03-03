import { TeamData } from '~/models/TeamData';

type MatchResult = {
  winner: TeamData;
  loser: TeamData;
};

type NextMatchState = {
  isGameOver: boolean;
  winnerName?: string;
  nextTeam1?: TeamData;
  nextTeam2?: TeamData;
  remainingQueue: TeamData[];
};

/**
 * For multi-team mode, keep current 1v1 duel engine and rotate in queued teams.
 * Winner stays; next queued team challenges.
 */
export const getNextMatchState = (
  result: MatchResult,
  queuedTeams: TeamData[]
): NextMatchState => {
  if (queuedTeams.length === 0) {
    return {
      isGameOver: true,
      winnerName: result.winner.name,
      remainingQueue: []
    };
  }

  const challenger = queuedTeams[0];
  return {
    isGameOver: false,
    nextTeam1: result.winner,
    nextTeam2: challenger,
    remainingQueue: queuedTeams.slice(1)
  };
};
