import Card from '~/models/Card';
import PlayerData from '~/models/PlayerData';

export default interface DuelData {
  duelIndex: number;
  currentPlayerName: string;
  player1Name: string;// player1 is the first player in the current duel
  player1Sum: number;
  player1Cards: Card[];
  player2Name: string;// player2 is the second player in the current duel
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
  revealTwoUsedBy?: 'team1' | 'team2' | null;// store team has used reveal two in the current duel
  player1SideSelected?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | '';// first player's selection
  player2SideSelected?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | '';// second player's selection
  winningTeam?: 'team1' | 'team2' | null;// store team has won the current duel
} 