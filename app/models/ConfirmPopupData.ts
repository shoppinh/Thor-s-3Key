export default interface ConfirmPopupData {
  isVisible: boolean;
  teamName: 'team1' | 'team2' | null;
  chanceType: 'secondChance' | 'revealTwo' | 'lifeShield' | 'removeWorst' | null;
  chanceItemName: string;
}
