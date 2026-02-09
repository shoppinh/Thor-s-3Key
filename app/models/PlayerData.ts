import Card from '~/models/Card';

export interface PlayerData {
  name: string;
  team: string;
  sum: number;
  cards: Card[];
}
