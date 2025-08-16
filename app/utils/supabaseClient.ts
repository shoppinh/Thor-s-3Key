import { createClient } from '@supabase/supabase-js'


// Use Vite's import.meta.env for browser-safe environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          name: string
          status: 'waiting' | 'setup' | 'playing' | 'finished'
          max_players: number
          current_round: number
          game_state: 'waiting' | 'setup' | 'playing' | 'finished'
          settings: Record<string, any>
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'waiting' | 'setup' | 'playing' | 'finished'
          max_players?: number
          current_round?: number
          game_state?: 'waiting' | 'setup' | 'playing' | 'finished'
          settings?: Record<string, any>
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'waiting' | 'setup' | 'playing' | 'finished'
          max_players?: number
          current_round?: number
          game_state?: 'waiting' | 'setup' | 'playing' | 'finished'
          settings?: Record<string, any>
          created_by?: string
          created_at?: string
        }
      }
      players: {
        Row: {
          id: string
          name: string
          room_id: string
          user_id: string | null
          avatar_url: string | null
          is_admin: boolean
          is_online: boolean
          last_seen: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          room_id: string
          user_id?: string
          avatar_url?: string
          is_admin?: boolean
          is_online?: boolean
          last_seen?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          room_id?: string
          user_id?: string
          avatar_url?: string
          is_admin?: boolean
          is_online?: boolean
          last_seen?: string
          created_at?: string
        }
      }
      duels: {
        Row: {
          id: string
          room_id: string
          team1_score: number
          team2_score: number
          round: number
          duel_state: Record<string, any>
          status: 'active' | 'completed' | 'cancelled'
          winner_team: string | null
          metadata: Record<string, any>
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          team1_score?: number
          team2_score?: number
          round?: number
          duel_state: Record<string, any>
          status?: 'active' | 'completed' | 'cancelled'
          winner_team?: string
          metadata?: Record<string, any>
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          team1_score?: number
          team2_score?: number
          round?: number
          duel_state?: Record<string, any>
          status?: 'active' | 'completed' | 'cancelled'
          winner_team?: string
          metadata?: Record<string, any>
          updated_at?: string
        }
      }
      game_sessions: {
        Row: {
          id: string
          room_id: string
          session_data: Record<string, any>
          round_number: number
          current_player_id: string | null
          team1_score: number
          team2_score: number
          power_ups_used: Record<string, any>
          started_at: string
          updated_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          session_data: Record<string, any>
          round_number?: number
          current_player_id?: string
          team1_score?: number
          team2_score?: number
          power_ups_used?: Record<string, any>
          started_at?: string
          updated_at?: string
          finished_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          session_data?: Record<string, any>
          round_number?: number
          current_player_id?: string
          team1_score?: number
          team2_score?: number
          power_ups_used?: Record<string, any>
          started_at?: string
          updated_at?: string
          finished_at?: string
        }
      }
      game_events: {
        Row: {
          id: string
          session_id: string
          room_id: string
          player_id: string | null
          event_type: string
          event_data: Record<string, any>
          timestamp: string
        }
        Insert: {
          id?: string
          session_id: string
          room_id: string
          player_id?: string
          event_type: string
          event_data: Record<string, any>
          timestamp?: string
        }
        Update: {
          id?: string
          session_id?: string
          room_id?: string
          player_id?: string
          event_type?: string
          event_data?: Record<string, any>
          timestamp?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'super_admin'
          permissions: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'admin' | 'super_admin'
          permissions?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'super_admin'
          permissions?: Record<string, any>
          created_at?: string
        }
      }
    }
  }
}

export type SupabaseClient = typeof supabase
