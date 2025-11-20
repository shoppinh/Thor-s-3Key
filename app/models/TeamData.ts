export default interface TeamData {
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
