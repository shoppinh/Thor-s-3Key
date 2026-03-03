import { TeamId } from '~/features/game/types/gameTypes';
import { ChanceType } from './TeamData';

export default interface ConfirmPopupData {
  isVisible: boolean;
  teamName?: TeamId;
  chanceType?: ChanceType;
  chanceItemName: string;
}
