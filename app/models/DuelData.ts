import Card from '~/models/Card';
import PlayerData from '~/models/PlayerData';

export default interface DuelData {
  duelIndex: number;
  currentPlayerName: string;
  player1Name: string;
  player1Sum: number;
  player1Cards: Card[];
  isFinishDuel: boolean;
  topLeftCards: Card[];
  bottomLeftCards: Card[];
  topRightCards: Card[];
  bottomRightCards: Card[];
  topLeftRevealed: boolean;
  bottomLeftRevealed: boolean;
  topRightRevealed: boolean;
  bottomRightRevealed: boolean;
  topLeftPlayerData: PlayerData;
  topRightPlayerData: PlayerData;
  bottomLeftPlayerData: PlayerData;
  bottomRightPlayerData: PlayerData;
  revealedCards: {
    topLeft: Card[];
    bottomLeft: Card[];
    topRight: Card[];
    bottomRight: Card[];
  };
  revealTwoUsedBy?: 'team1' | 'team2' | null;
  player1SideSelected?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | '';
  player2SideSelected?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | '';
} 