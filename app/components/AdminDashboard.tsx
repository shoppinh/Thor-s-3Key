import { useState, useEffect } from 'react'
import { roomService } from '~/services/roomService'

interface AdminDashboardProps {
  isAdmin: boolean
}

interface RoomWithPlayers {
  id: string
  name: string
  status: string
  game_state: string
  current_round: number
  max_players: number
  created_at: string
  players: Array<{
    id: string
    name: string
    is_online: boolean
    is_admin: boolean
  }>
  session?: {
    team1_score: number
    team2_score: number
    round_number: number
  } | null
}

export default function AdminDashboard({ isAdmin }: AdminDashboardProps) {
  const [rooms, setRooms] = useState<RoomWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    loadRooms()
  }, [isAdmin])

  const loadRooms = async () => {
    try {
      setLoading(true)
      
      // Get all rooms
      const allRooms = await roomService.getRooms()
      
      // Get players and sessions for each room
      const roomsWithDetails = await Promise.all(
        allRooms.map(async (room) => {
          const players = await roomService.getPlayersInRoom(room.id)
          
          // Get session data if room is playing
          const session = null
          if (room.game_state === 'playing') {
            // This would require adding a method to get session by room_id
            // session = await roomService.getSessionByRoomId(room.id)
          }

          return {
            ...room,
            players: players.map(p => ({
              id: p.id,
              name: p.name,
              is_online: p.is_online,
              is_admin: p.is_admin
            })),
            session
          }
        })
      )

      setRooms(roomsWithDetails)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKickPlayer = async (roomId: string, playerId: string) => {
    if (!confirm('Are you sure you want to kick this player?')) return
    
    try {
      await roomService.kickPlayer(roomId, playerId)
      await loadRooms() // Refresh data
    } catch (error) {
      console.error('Failed to kick player:', error)
      alert('Failed to kick player')
    }
  }

  const handleEndGame = async (roomId: string) => {
    if (!confirm('Are you sure you want to end this game?')) return
    
    try {
      await roomService.forceEndGame(roomId)
      await loadRooms() // Refresh data
    } catch (error) {
      console.error('Failed to end game:', error)
      alert('Failed to end game')
    }
  }

  const handleUpdateScores = async (roomId: string, team1Score: number, team2Score: number) => {
    try {
      await roomService.updateScores(roomId, team1Score, team2Score)
      await loadRooms() // Refresh data
    } catch (error) {
      console.error('Failed to update scores:', error)
      alert('Failed to update scores')
    }
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You need admin privileges to access this dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Admin Dashboard</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={loadRooms}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
        <span>Total Rooms: {rooms.length}</span>
        <span>Active Games: {rooms.filter(r => r.game_state === 'playing').length}</span>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {rooms.map((room) => (
          <div
            key={room.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: room.game_state === 'playing' ? '#f0f8ff' : '#fff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{room.name}</h3>
                <div style={{ display: 'flex', gap: '10px', fontSize: '14px', color: '#666' }}>
                  <span>Status: <strong>{room.status}</strong></span>
                  <span>Game State: <strong>{room.game_state}</strong></span>
                  <span>Round: <strong>{room.current_round}</strong></span>
                  <span>Players: <strong>{room.players.length}/{room.max_players}</strong></span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                  style={{
                    padding: '5px 15px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  {selectedRoom === room.id ? 'Hide Details' : 'Show Details'}
                </button>
                
                {room.game_state === 'playing' && (
                  <button
                    onClick={() => handleEndGame(room.id)}
                    style={{
                      padding: '5px 15px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    End Game
                  </button>
                )}
              </div>
            </div>

            {selectedRoom === room.id && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Players List */}
                  <div>
                    <h4>Players</h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {room.players.map((player) => (
                        <div
                          key={player.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            border: '1px solid #eee',
                            borderRadius: '4px',
                            marginBottom: '5px',
                            backgroundColor: player.is_online ? '#e8f5e8' : '#f5f5f5'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: player.is_admin ? 'bold' : 'normal' }}>
                              {player.name}
                              {player.is_admin && ' (Admin)'}
                            </span>
                            <br />
                            <small style={{ color: player.is_online ? 'green' : 'red' }}>
                              {player.is_online ? 'Online' : 'Offline'}
                            </small>
                          </div>
                          <button
                            onClick={() => handleKickPlayer(room.id, player.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Kick
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Game Controls */}
                  <div>
                    <h4>Game Controls</h4>
                    {room.session && (
                      <div style={{ marginBottom: '15px' }}>
                        <h5>Current Scores</h5>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                          <label>
                            Team 1:
                            <input
                              type="number"
                              defaultValue={room.session.team1_score}
                              style={{ marginLeft: '5px', width: '60px' }}
                              onBlur={(e) => {
                                const newScore = parseInt(e.target.value) || 0
                                if (newScore !== room.session!.team1_score) {
                                  handleUpdateScores(room.id, newScore, room.session!.team2_score)
                                }
                              }}
                            />
                          </label>
                          <label>
                            Team 2:
                            <input
                              type="number"
                              defaultValue={room.session.team2_score}
                              style={{ marginLeft: '5px', width: '60px' }}
                              onBlur={(e) => {
                                const newScore = parseInt(e.target.value) || 0
                                if (newScore !== room.session!.team2_score) {
                                  handleUpdateScores(room.id, room.session!.team1_score, newScore)
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      <p>Room ID: <code>{room.id}</code></p>
                      <p>Created: {new Date(room.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>No rooms found</h3>
          <p>No game rooms are currently active.</p>
        </div>
      )}
    </div>
  )
}
