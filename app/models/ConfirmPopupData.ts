export default interface ConfirmPopupData {
  isVisible: boolean;
  teamName: 'team1' | 'team2' | null;
  chanceType: 'second' | 'reveal' | 'swap' | 'peek' | 'shield' | 'chaos' | 'mirror' | 'double' | null;
  chanceItemName: string;
  chanceCost?: number; // Some power-ups may cost more than 1
} 