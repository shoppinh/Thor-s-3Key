import { useState, useEffect } from 'react'
import { roomService } from '~/services/roomService'

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string) => void
  playerName: string
  setPlayerName: (name: string) => void
}

interface Room {
  id: string
  name: string
  status: string
  game_state: string
  max_players: number
  current_round: number
  created_at: string
  playerCount?: number
}

export default function Lobby({ onJoinRoom, playerName, setPlayerName }: LobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadRooms()
    
    // Refresh rooms every 5 seconds
    const interval = setInterval(loadRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadRooms = async () => {
    try {
      const allRooms = await roomService.getRooms()
      
      // Get player count for each room
      const roomsWithCounts = await Promise.all(
        allRooms.map(async (room) => {
          const players = await roomService.getPlayersInRoom(room.id)
          return {
            ...room,
            playerCount: players.length
          }
        })
      )

      // Filter to show only waiting/setup rooms
      const availableRooms = roomsWithCounts.filter(
        room => room.game_state === 'waiting' || room.game_state === 'setup'
      )

      setRooms(availableRooms)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      alert('Please enter a room name')
      return
    }

    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }

    try {
      setCreating(true)
      const room = await roomService.createRoom(newRoomName.trim())
      await roomService.joinRoom(room.id, playerName.trim())
      
      // Join the created room
      onJoinRoom(room.id, playerName.trim())
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Failed to create room. Please try again.')
    } finally {
      setCreating(false)
      setNewRoomName('')
      setShowCreateForm(false)
    }
  }

  const handleJoinRoom = async (roomId: string) => {
    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }

    try {
      await roomService.joinRoom(roomId, playerName.trim())
      onJoinRoom(roomId, playerName.trim())
    } catch (error) {
      console.error('Failed to join room:', error)
      alert('Failed to join room. It might be full or no longer available.')
      loadRooms() // Refresh the room list
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#28a745'
      case 'setup': return '#ffc107'
      case 'playing': return '#dc3545'
      default: return '#6c757d'
    }
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Thor's 3Key - Game Lobby</h1>
      
      {/* Player Name Input */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3>Enter Your Name</h3>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name..."
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px'
          }}
          maxLength={20}
        />
      </div>

      {/* Create Room Section */}
      <div style={{ marginBottom: '30px' }}>
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={!playerName.trim()}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: playerName.trim() ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: playerName.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Create New Room
          </button>
        ) : (
          <div style={{ 
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <h3>Create New Room</h3>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                marginBottom: '15px'
              }}
              maxLength={30}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCreateRoom}
                disabled={creating || !newRoomName.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: creating || !newRoomName.trim() ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: creating || !newRoomName.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create & Join'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewRoomName('')
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rooms List */}
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3>Available Rooms</h3>
          <button
            onClick={loadRooms}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Loading rooms...
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            <h4>No rooms available</h4>
            <p>Create a new room to start playing!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {rooms.map((room) => (
              <div
                key={room.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0' }}>{room.name}</h4>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#666' }}>
                      <span style={{ 
                        color: getStatusColor(room.game_state),
                        fontWeight: 'bold'
                      }}>
                        {room.game_state.toUpperCase()}
                      </span>
                      <span>Players: {room.playerCount}/{room.max_players}</span>
                      {room.current_round > 0 && <span>Round: {room.current_round}</span>}
                      <span>Created: {new Date(room.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={
                      !playerName.trim() || 
                      (room.playerCount || 0) >= room.max_players ||
                      room.game_state === 'playing'
                    }
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 
                        !playerName.trim() || 
                        (room.playerCount || 0) >= room.max_players ||
                        room.game_state === 'playing'
                          ? '#6c757d' 
                          : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 
                        !playerName.trim() || 
                        (room.playerCount || 0) >= room.max_players ||
                        room.game_state === 'playing'
                          ? 'not-allowed' 
                          : 'pointer'
                    }}
                  >
                    {(room.playerCount || 0) >= room.max_players 
                      ? 'Full' 
                      : room.game_state === 'playing' 
                        ? 'In Progress' 
                        : 'Join'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
