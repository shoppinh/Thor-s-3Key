export type TeamName = 'team1' | 'team2';

export type Side = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type SetupMode = 'per-team' | 'both' | 'random' | 'random-each';

export type GameState = 'setup' | 'gameLoading' | 'gamePlaying' | 'gameOver';

export type PowerUpsAllocation = {
  secondChance: number;
  revealTwo: number;
  lifeShield: number;
  removeWorst: number;
};

export const SIDE_KEYS: Side[] = [
  'top-left',
  'bottom-left',
  'top-right',
  'bottom-right'
];
