import Card from '~/models/Card';

export default interface TeamData {
  name: string;
  score: number;
  scoreClass: string;
  totalChance: number;
  useChanceSecond: boolean;
  useChanceReveal: boolean;
  players: string[];
}
