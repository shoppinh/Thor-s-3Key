import DuelData from '~/models/DuelData';
import { TeamData } from '~/models/TeamData';
import { PowerUpsAllocation } from '~/features/game/types/gameTypes';

export const createInitialTeamData = (
  teamNumber: 1 | 2,
  teamLabel: string
): TeamData => ({
  name: `${teamLabel} ${teamNumber}`,
  score: 0,
  scoreClass: '',
  totalPowerUps: 4,
  powerUps: { secondChance: 1, revealTwo: 1, lifeShield: 1, removeWorst: 1 },
  players: []
});

export const createInitialDuelData = (): DuelData => ({
  duelIndex: 0,
  currentPlayerName: '',
  player1Name: '',
  player1Team: undefined,
  player2Name: '',
  player2Team: undefined,
  isFinishDuel: false,
  topLeftCards: [],
  bottomLeftCards: [],
  topRightCards: [],
  bottomRightCards: [],
  topLeftRevealed: false,
  bottomLeftRevealed: false,
  topRightRevealed: false,
  bottomRightRevealed: false,
  topLeftPlayerData: { cards: [], name: '', sum: 0, team: '' },
  topRightPlayerData: { cards: [], name: '', sum: 0, team: '' },
  bottomLeftPlayerData: { cards: [], name: '', sum: 0, team: '' },
  bottomRightPlayerData: { cards: [], name: '', sum: 0, team: '' },
  revealedCards: {
    topLeft: [],
    bottomLeft: [],
    topRight: [],
    bottomRight: []
  },
  revealTwoUsedBy: undefined,
  lifeShieldUsedBy: undefined,
  removedWorstGroups: [],
  removeWorstUsedByTeams: [],
  secondChanceUsedByTeams: [],
  player1SideSelected: undefined,
  player2SideSelected: undefined,
  winningTeam: undefined
});

export const createAllocationFromTeam = (
  team: TeamData
): PowerUpsAllocation => ({
  secondChance: team.powerUps.secondChance,
  revealTwo: team.powerUps.revealTwo,
  lifeShield: team.powerUps.lifeShield,
  removeWorst: team.powerUps.removeWorst ?? 0
});
