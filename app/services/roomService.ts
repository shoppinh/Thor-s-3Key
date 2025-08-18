import { supabase } from '~/utils/supabaseClient'
import type { Database } from '~/utils/supabaseClient'
import { authService } from './supabaseAuthService'


type Room = Database['public']['Tables']['rooms']['Row']
type Player = Database['public']['Tables']['players']['Row']
// We'll use this type when implementing game session loading functionality
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type GameSession = Database['public']['Tables']['game_sessions']['Row']

// Define type for team data in game state
interface TeamData {
  score?: number;
  powerUps?: Record<string, number>;
}

// Define game state interface
interface GameState extends Record<string, unknown> {
  gameState?: string;
  roundNumber?: number;
  team1Data?: TeamData;
  team2Data?: TeamData;
}

export interface RoomServiceInterface {
  // Room Management
  createRoom(name: string, createdBy?: string): Promise<Room>
  joinRoom(roomId: string, playerName: string, userId?: string): Promise<Player>
  leaveRoom(roomId: string, playerId: string): Promise<void>
  getRooms(): Promise<Room[]>
  getRoom(roomId: string): Promise<Room | null>
  
  // Game State Management
  updateGameState(roomId: string, gameState: GameState): Promise<void>
  subscribeToRoom(roomId: string, callback: (payload: Record<string, unknown>) => void): void
  
  // Player Management
  getPlayersInRoom(roomId: string): Promise<Player[]>
  updatePlayerStatus(playerId: string, isOnline: boolean): Promise<void>
}

export class RoomService implements RoomServiceInterface {
  async createRoom(name: string, createdBy?: string): Promise<Room> {
    // Get current user to set as room creator
    if (!createdBy) {
      const { user, error } = await authService.getCurrentUser();
      
      if (error || !user) {
        throw new Error('You must be logged in to create a room');
      }
      
      createdBy = user.id;
    }
    
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name,
        created_by: createdBy,
        status: 'waiting',
        game_state: 'waiting',
        settings: {
          maxPlayers: 6,
          powerUpsPerTeam: 4,
          enablePowerups: true
        }
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async joinRoom(roomId: string, playerName: string, userId?: string): Promise<Player> {
    // Get current user if userId not provided
    if (!userId) {
      const { user, error } = await authService.getCurrentUser();
      
      if (error || !user) {
        throw new Error('You must be logged in to join a room');
      }
      
      userId = user.id;
    }
    // Check if room exists and has space
    const room = await this.getRoom(roomId)
    if (!room) throw new Error('Room not found')
    
    const players = await this.getPlayersInRoom(roomId)
    if (players.length >= room.max_players) {
      throw new Error('Room is full')
    }

    // Check if user is already in the room
      const existingPlayer = players.find(p => p.user_id === userId)
      if (existingPlayer) {
        // Update player status to online
        await this.updatePlayerStatus(existingPlayer.id, true)
        return existingPlayer
      }

    const { data, error } = await supabase
      .from('players')
      .insert({
        name: playerName,
        room_id: roomId,
        user_id: userId,
        is_online: true,
        is_admin: players.length === 0 // First player becomes admin
      })
      .select()
      .single()
    if (error) throw error
    return data

  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) throw error
  }

  async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async updateGameState(roomId: string, gameState: GameState): Promise<void> {
    // Update both the room status and create/update a game session
    const { error: roomError } = await supabase
      .from('rooms')
      .update({
        game_state: gameState.gameState,
        current_round: gameState.roundNumber || 0
      })
      .eq('id', roomId)

    if (roomError) throw roomError

    // Create or update game session
    const { data: existingSession } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('room_id', roomId)
      .single()

    if (existingSession) {
      const { error: sessionError } = await supabase
        .from('game_sessions')
        .update({
          session_data: gameState,
          round_number: gameState.roundNumber || 1,
          team1_score: gameState.team1Data?.score || 0,
          team2_score: gameState.team2Data?.score || 0,
          power_ups_used: {
            team1: gameState.team1Data?.powerUps || {},
            team2: gameState.team2Data?.powerUps || {}
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSession.id)

      if (sessionError) throw sessionError
    } else {
      const { error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          room_id: roomId,
          session_data: gameState,
          round_number: gameState.roundNumber || 1,
          team1_score: gameState.team1Data?.score || 0,
          team2_score: gameState.team2Data?.score || 0,
          power_ups_used: {
            team1: gameState.team1Data?.powerUps || {},
            team2: gameState.team2Data?.powerUps || {}
          }
        })

      if (sessionError) throw sessionError
    }
  }

  subscribeToRoom(roomId: string, callback: (payload: Record<string, unknown>) => void): void {
    supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => callback(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => callback(payload)
      )
      .subscribe()
  }

  async getPlayersInRoom(roomId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async updatePlayerStatus(playerId: string, isOnline: boolean): Promise<void> {
    const { error } = await supabase
      .from('players')
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', playerId)

    if (error) throw error
  }

  // Admin functions
  async updateRoomStatus(roomId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('id', roomId)

    if (error) throw error
  }

  async forceEndGame(roomId: string): Promise<void> {
    await this.updateRoomStatus(roomId, 'finished')
    
    // Mark game session as finished
    const { error } = await supabase
      .from('game_sessions')
      .update({ 
        finished_at: new Date().toISOString()
      })
      .eq('room_id', roomId)

    if (error) throw error
  }

  async kickPlayer(roomId: string, playerId: string): Promise<void> {
    await this.leaveRoom(roomId, playerId)
  }

  async updateScores(roomId: string, team1Score: number, team2Score: number): Promise<void> {
    const { error } = await supabase
      .from('game_sessions')
      .update({
        team1_score: team1Score,
        team2_score: team2Score,
        updated_at: new Date().toISOString()
      })
      .eq('room_id', roomId)

    if (error) throw error
  }
}

export const roomService = new RoomService()
