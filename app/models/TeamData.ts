export interface TeamData {
  name: string;
  score: number;
  scoreClass: string;
  totalPowerUps: number;
  powerUps: {
    secondChance: number;
    revealTwo: number;
    lifeShield: number;
    removeWorst: number;
  };
  players: string[];
}

export type ChanceType =
  | 'secondChance'
  | 'revealTwo'
  | 'lifeShield'
  | 'removeWorst';
