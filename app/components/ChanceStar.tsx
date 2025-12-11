import React from 'react';

interface ChanceStarProps {
  number?: string | number;
  className?: string;
  style?: React.CSSProperties;
  theme?: string;
}

const ChanceStar: React.FC<ChanceStarProps> = ({
  number = '2',
  className = '',
  style = {},
  theme = 'default'
}) => {
  const isChristmas = theme === 'christmas';

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
      {isChristmas ? (
        // Christmas Star Implementation
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))'
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="url(#starGradient)"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient
                  id="starGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="50%" stopColor="#FFA500" />
                  <stop offset="100%" stopColor="#FFD700" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M12 1L14.5 9H23L16 14.5L18.5 23L12 17.5L5.5 23L8 14.5L1 9H9.5L12 1Z"
                stroke="#B8860B"
                strokeWidth="0.5"
                filter="url(#glow)"
              ></path>
            </svg>
          </div>
          {/* Sparkles */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              animation: 'spin 10s linear infinite'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '10%',
                left: '50%',
                width: '4px',
                height: '4px',
                background: 'white',
                borderRadius: '50%',
                boxShadow: '0 0 4px white',
                opacity: 0.8
              }}
            ></div>
            <div
              style={{
                position: 'absolute',
                bottom: '20%',
                right: '20%',
                width: '3px',
                height: '3px',
                background: '#FFFACD',
                borderRadius: '50%',
                boxShadow: '0 0 3px #FFFACD',
                opacity: 0.7
              }}
            ></div>
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '10%',
                width: '2px',
                height: '2px',
                background: 'white',
                borderRadius: '50%',
                opacity: 0.6
              }}
            ></div>
          </div>
        </>
      ) : (
        // Default Sci-fi/Modern Implementation
        <>
          {/* Outer Spinning Ring */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: 'var(--color-accent)',
              borderRightColor: 'var(--color-accent)',
              boxShadow: '0 0 20px var(--color-accent)',
              animation: 'spin 1.5s linear infinite'
            }}
          />

          {/* Middle Spinning Ring (Counter-rotation) */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              bottom: '8px',
              borderRadius: '50%',
              border: '2px solid transparent',
              borderBottomColor: 'var(--color-accent)',
              borderLeftColor: 'var(--color-accent)',
              boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
              animation: 'spin-reverse 2s linear infinite'
            }}
          />
        </>
      )}

      {/* Number */}
      <span
        style={{
          position: 'relative',
          fontSize: isChristmas ? '24px' : '32px',
          fontWeight: 'bold',
          color: isChristmas ? '#8B0000' : '#fff',
          textShadow: isChristmas
            ? '0 0 2px #fff, 0 0 5px #fff'
            : '0 0 10px var(--color-accent), 0 0 20px var(--color-accent)',
          fontFamily: 'var(--font-header)',
          zIndex: 2,
          marginTop: isChristmas ? '5px' : '0' // Adjust alignment for star center
        }}
      >
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
