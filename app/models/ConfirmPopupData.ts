export default interface ConfirmPopupData {
  isVisible: boolean;
  teamName: 'team1' | 'team2' | null;
  chanceType: 'second' | 'reveal' | 'shield' | 'lock' | null;
  chanceItemName: string;
}
