import type Card from '~/models/Card';
import type {
  TeamName,
  PowerUpsAllocation
} from '~/features/game/types/gameTypes';

export interface PowerUpsUsed {
  revealTwo?: TeamName;
  lifeShield?: TeamName;
  removeWorst?: TeamName[];
  secondChance?: TeamName[];
}

export interface LocalDuelEvent {
  round: number;
  winnerName: string;
  loserName: string;
  winnerTeam: TeamName;
  loserTeam: TeamName;
  shielded: boolean;
  winnerCards: Card[];
  loserCards: Card[];
  winnerSum: number;
  loserSum: number;
  powerUpsUsed: PowerUpsUsed;
}

export interface SavedPowerUps {
  secondChance: number;
  revealTwo: number;
  lifeShield: number;
  removeWorst: number;
}

export interface Database {
  public: {
    Tables: {
      matches: {
        Row: {
          id: string;
          winner_team: TeamName;
          team1_roster: string[];
          team2_roster: string[];
          team1_initial_roster: string[];
          team2_initial_roster: string[];
          team1_powerups: SavedPowerUps;
          team2_powerups: SavedPowerUps;
          team1_score: number;
          team2_score: number;
          total_duels: number;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          winner_team: TeamName;
          team1_roster: string[];
          team2_roster: string[];
          team1_initial_roster: string[];
          team2_initial_roster: string[];
          team1_powerups: SavedPowerUps;
          team2_powerups: SavedPowerUps;
          team1_score: number;
          team2_score: number;
          total_duels: number;
          duration_seconds?: number | null;
        };
        Update: {
          winner_team?: TeamName;
          team1_roster?: string[];
          team2_roster?: string[];
          team1_initial_roster?: string[];
          team2_initial_roster?: string[];
          team1_powerups?: SavedPowerUps;
          team2_powerups?: SavedPowerUps;
          team1_score?: number;
          team2_score?: number;
          total_duels?: number;
          duration_seconds?: number | null;
        };
        Relationships: [];
      };
      duel_events: {
        Row: {
          id: string;
          match_id: string;
          round: number;
          winner_name: string;
          loser_name: string;
          winner_team: TeamName;
          loser_team: TeamName;
          shielded: boolean;
          winner_cards: Card[];
          loser_cards: Card[];
          winner_sum: number;
          loser_sum: number;
          power_ups_used: PowerUpsUsed;
          created_at: string;
        };
        Insert: {
          match_id: string;
          round: number;
          winner_name: string;
          loser_name: string;
          winner_team: TeamName;
          loser_team: TeamName;
          shielded: boolean;
          winner_cards: Card[];
          loser_cards: Card[];
          winner_sum: number;
          loser_sum: number;
          power_ups_used: PowerUpsUsed;
        };
        Update: {
          match_id?: string;
          round?: number;
          winner_name?: string;
          loser_name?: string;
          winner_team?: TeamName;
          loser_team?: TeamName;
          shielded?: boolean;
          winner_cards?: Card[];
          loser_cards?: Card[];
          winner_sum?: number;
          loser_sum?: number;
          power_ups_used?: PowerUpsUsed;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
  };
}
