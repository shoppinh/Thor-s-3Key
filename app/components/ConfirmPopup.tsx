import React from 'react';

interface ConfirmPopupProps {
  isVisible: boolean;
  chanceItemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
  isVisible,
  chanceItemName,
  onConfirm,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000
      }}
    >
      <div
        className="rpg-panel"
        style={{
          padding: '40px',
          textAlign: 'center',
          minWidth: '400px',
          background: 'rgba(15, 12, 41, 0.95)',
          border: '2px solid var(--color-primary)'
        }}
      >
        <h3
          className="text-glow"
          style={{
            margin: '0 0 30px 0',
            fontSize: '24px',
            color: '#fff',
            fontFamily: 'var(--font-header)',
            letterSpacing: '1px'
          }}
        >
          ACTIVATE <span style={{ color: 'var(--color-accent)' }}>{chanceItemName.toUpperCase()}</span>?
        </h3>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={onConfirm}
            className="rpg-button"
            style={{
              minWidth: '140px',
              background: 'var(--color-primary)',
              fontSize: '18px'
            }}
          >
            CONFIRM
          </button>

          <button
            onClick={onCancel}
            className="rpg-button secondary"
            style={{
              minWidth: '140px',
              fontSize: '18px'
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPopup;
