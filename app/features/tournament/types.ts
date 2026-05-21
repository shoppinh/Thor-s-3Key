export type TournamentFormat = 'single-elim';

export interface TournamentConfig {
  format: TournamentFormat;
  bestOfCount?: number;
  teamNames: [string, string];
}

export interface TournamentSlot {
  id: string;
  team1: string;
  team2: string;
  winner?: string;
  loser?: string;
  team1Score: number;
  team2Score: number;
  played: boolean;
}

export interface Bracket {
  config: TournamentConfig;
  totalMatches: number;
  slots: TournamentSlot[];
  currentSlotIndex: number;
  champion?: string;
  isComplete: boolean;
}
