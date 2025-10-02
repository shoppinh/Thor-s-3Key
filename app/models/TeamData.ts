export default interface TeamData {
  name: string;
  score: number;
  scoreClass: string;
  totalPowerUps: number;
  powerUps: {
    secondChance: number;
    revealTwo: number;
    lifeShield: number;
    lockAll: number;
    removeWorst: number;
  };
  players: string[];
}
