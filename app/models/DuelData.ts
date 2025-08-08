import Card from '~/models/Card';
import PlayerData from '~/models/PlayerData';

export default interface DuelData {
  duelIndex: number;
  currentPlayerName: string;
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
  revealTwoUsedBy?: 'team1' | 'team2' | null; // store team has used reveal two in the current duel
  winningTeam?: 'team1' | 'team2' | null; // store team has won the current duel
  player1SideSelected?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | ''; // first player's selection
  player2SideSelected?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | ''; // second player's selection
  player1Name: string; // player1 is the first player in the current duel
  player1Team: 'team1' | 'team2' | null; // store team of the first player
  player2Name: string; // player2 is the second player in the current duel
  player2Team: 'team1' | 'team2' | null; // store team of the second player
  // New power-up state (per duel)
  shieldUsedBy?: 'team1' | 'team2' | null; // if set, that team cannot be eliminated this duel
  lockUsedBy?: 'team1' | 'team2' | null; // if set, the other team cannot use power-ups this duel
}
