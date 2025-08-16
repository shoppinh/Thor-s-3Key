import { useState } from 'react'
import { useNavigate } from '@remix-run/react'
import Lobby from '~/components/Lobby'

export default function Play() {
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')

  const handleJoinRoom = (roomId: string, playerName: string) => {
    navigate(`/game?room=${roomId}&player=${encodeURIComponent(playerName)}`)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Lobby 
        onJoinRoom={handleJoinRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
      />
    </div>
  )
}
