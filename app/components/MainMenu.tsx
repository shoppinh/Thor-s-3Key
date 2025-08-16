import { Link } from '@remix-run/react'

export default function MainMenu() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#1a1a2e',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '20px' }}>
        <h1 style={{
          fontSize: '3.5rem',
          marginBottom: '20px',
          background: 'linear-gradient(45deg, #ffd700, #ffaa00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Thor&apos;s 3Key
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          marginBottom: '40px',
          color: '#cccccc'
        }}>
          Strategic card game of wits and power-ups
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center'
        }}>
          <a
            href="/play"
            style={{
              display: 'block',
              padding: '15px 40px',
              backgroundColor: '#4CAF50',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              minWidth: '200px',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#45a049'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            🎮 Play Online
          </a>

          <a
            href="/game"
            style={{
              display: 'block',
              padding: '15px 40px',
              backgroundColor: '#2196F3',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              minWidth: '200px',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1976D2'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#2196F3'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            🏠 Local Game
          </a>

          <a
            href="/admin"
            style={{
              display: 'block',
              padding: '15px 40px',
              backgroundColor: '#FF9800',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              minWidth: '200px',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#F57C00'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#FF9800'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            ⚙️ Admin Panel
          </a>
        </div>

        <div style={{
          marginTop: '60px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#cccccc'
        }}>
          <h3 style={{ marginTop: 0 }}>How to Play</h3>
          <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
            <li>Choose your cards strategically</li>
            <li>Use power-ups to gain advantages</li>
            <li>Eliminate opponents to win</li>
            <li>Master the art of timing</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
