import React from 'react';

interface ChanceStarProps {
  number?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const ChanceStar: React.FC<ChanceStarProps> = ({
  number = '2',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        width: '70px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {/* Outer Spinning Ring */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: '50%',
        border: '3px solid transparent',
        borderTopColor: 'var(--color-accent)',
        borderRightColor: 'var(--color-accent)',
        boxShadow: '0 0 20px var(--color-accent)',
        animation: 'spin 1.5s linear infinite'
      }} />
      
      {/* Middle Spinning Ring (Counter-rotation) */}
      <div style={{
        position: 'absolute',
        top: '8px', left: '8px', right: '8px', bottom: '8px',
        borderRadius: '50%',
        border: '2px solid transparent',
        borderBottomColor: 'var(--color-accent)',
        borderLeftColor: 'var(--color-accent)',
        boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
        animation: 'spin-reverse 2s linear infinite'
      }} />
      
      {/* Number */}
      <span style={{
        position: 'relative',
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#fff',
        textShadow: '0 0 10px var(--color-accent), 0 0 20px var(--color-accent)',
        fontFamily: 'var(--font-header)',
        zIndex: 2
      }}>
        {number}
      </span>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
      `}</style>
    </div>
  );
};

export default ChanceStar;
