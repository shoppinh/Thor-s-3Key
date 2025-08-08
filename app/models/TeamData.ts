export default interface TeamData {
  name: string;
  score: number;
  scoreClass: string;
  totalChance: number;
  powerUps: {
    second: number;
    reveal: number;
    shield: number;
    lock: number;
  };
  players: string[];
}
