import React from 'react';

/**
 * Props for ConfirmPopup component
 */
interface ConfirmPopupProps {
  isVisible: boolean;
  chanceItemName: string;
  chanceCost?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation popup component for chance item usage
 * @param isVisible - Whether the popup should be displayed
 * @param chanceItemName - Name of the chance item being used
 * @param onConfirm - Callback when user clicks Yes
 * @param onCancel - Callback when user clicks No
 */
const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
  isVisible,
  chanceItemName,
  chanceCost = 1,
  onConfirm,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        minWidth: '300px'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '18px',
          color: '#333'
        }}>
          Do you want to use {chanceItemName}?
        </h3>
        
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: '#666'
        }}>
          Cost: {chanceCost} chance{chanceCost > 1 ? 's' : ''}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onConfirm}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minWidth: '120px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#45a049';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
            }}
          >
            Yes
          </button>
          
          <button
            onClick={onCancel}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minWidth: '120px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#da190b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f44336';
            }}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPopup; 