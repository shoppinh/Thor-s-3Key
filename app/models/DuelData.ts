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
  revealTwoUsedBy?: 'team1' | 'team2' | null; // store team has used reveal two in the current duel
  lifeShieldUsedBy?: 'team1' | 'team2' | null; // if set, that team cannot be eliminated this duel
  /**
   * Card groups disabled by Remove Worst during the current duel.
   * When a group is listed here, its drawer is disabled and cannot be selected.
   */
  removedWorstGroups?: ('top-left' | 'bottom-left' | 'top-right' | 'bottom-right')[];
  /**
   * Tracks which teams have already used Remove Worst in this duel.
   * Each team can use it at most once per duel.
   */
  removeWorstUsedByTeams?: ('team1' | 'team2')[];
  /**
   * Tracks which teams have already used Second Chance in this duel.
   * Each team can use it at most once per duel.
   */
  secondChanceUsedByTeams?: ('team1' | 'team2')[];
}
