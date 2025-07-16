import Card from '~/models/Card';

export default interface PlayerData {
  name: string;
  team: string;
  sum: number;
  cards: Card[];
}
