import React from 'react';

/**
 * Props for ChanceStar component
 */
interface ChanceStarProps {
  number?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ChanceStar component that displays a number centered over a star background
 * @param number - The number to display (default is "2")
 * @param className - Additional CSS classes
 * @param style - Additional inline styles
 */
const ChanceStar: React.FC<ChanceStarProps> = ({ 
  number = "2", 
  className = "",
  style = {} 
}) => {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        width: '80px',
        height: '80px',
        backgroundImage: 'url(/images/star.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '45px',
        fontWeight: 'bold',
        color: '#333',
        textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8)',
        ...style
      }}
    >
      {number}
    </div>
  );
};

export default ChanceStar; 