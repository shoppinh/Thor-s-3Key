import { useState, useEffect } from 'react'
import { useNavigate } from '@remix-run/react'
import Lobby from '~/components/Lobby'
import { authService, type AuthUser } from '~/services/supabaseAuthService'

export default function Play() {
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const { user, error } = await authService.getCurrentUser()
      
      if (error) {
        console.error('Auth error:', error)
      }

      if (user) {
        setUser(user)
        if (user.email) {
          setPlayerName(user.email.split('@')[0])
        }
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = (roomId: string, playerName: string) => {
    navigate(`/game?room=${roomId}&player=${encodeURIComponent(playerName)}`)
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError(null)
    try {
      const { user, error } = await authService.signIn({
        email,
        password
      })
      
      if (error) {
        setAuthError(error.message)
        console.error('Sign in error:', error)
      } else if (user) {
        setUser(user)
        if (user.email) {
          setPlayerName(user.email.split('@')[0])
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAuthError(errorMessage)
      console.error('Sign in error:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px'
      }}>
        <h1>Login Required</h1>
        <p>You need to sign in to create or join game rooms.</p>
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 300 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Sign In
          </button>
          {authError && <div style={{ color: 'red', fontSize: 14 }}>{authError}</div>}
        </form>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Lobby 
        onJoinRoom={handleJoinRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
        user={user}
      />
    </div>
  )
}