import { TeamName } from '~/features/game/types/gameTypes';
import { ChanceType } from './TeamData';

export default interface ConfirmPopupData {
  isVisible: boolean;
  teamName?: TeamName;
  chanceType?: ChanceType;
  chanceItemName: string;
}
