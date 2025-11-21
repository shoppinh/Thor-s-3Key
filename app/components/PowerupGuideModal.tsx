import React from 'react';
import { useLanguage } from '~/contexts/LanguageContext';

export interface PowerupGuideModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const PowerupGuideModal: React.FC<PowerupGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const GuideItem = ({
    icon,
    title,
    desc
  }: {
    icon: string;
    title: string;
    desc: string;
  }) => (
    <div
      className="rpg-skewed"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '15px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <img
        src={icon}
        alt={title}
        width={64}
        height={64}
        style={{
          transform: 'skewX(10deg)', // Counter skew
          filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))'
        }}
      />
      <div style={{ transform: 'skewX(10deg)', textAlign: 'left' }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: '20px',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-header)',
            marginBottom: '5px'
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 16, color: '#ccc' }}>{desc}</div>
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="rpg-panel"
        style={{
          padding: '30px',
          width: 'min(600px, 90%)',
          background: 'rgba(15, 12, 41, 0.95)',
          border: '2px solid var(--color-secondary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-glow"
          style={{
            marginTop: 0,
            marginBottom: 25,
            textAlign: 'center',
            color: '#fff',
            fontSize: '32px'
          }}
        >
          {t('game.powerUpsGuide')}
        </h2>

        <div style={{ display: 'grid', gap: 15 }}>
          <GuideItem
            icon="/images/chance_second.png"
            title={t('powerups.secondChanceTitle')}
            desc={t('powerups.secondChanceDesc')}
          />
          <GuideItem
            icon="/images/chance_reveal.png"
            title={t('powerups.revealTwoTitle')}
            desc={t('powerups.revealTwoDesc')}
          />
          <GuideItem
            icon="/images/chance_shield.png"
            title={t('powerups.lifeShieldTitle')}
            desc={t('powerups.lifeShieldDesc')}
          />
          <GuideItem
            icon="/images/chance_remove.png"
            title={t('powerups.removeWorstTitle')}
            desc={t('powerups.removeWorstDesc')}
          />
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}
        >
          <button
            type="button"
            className="rpg-button"
            onClick={onClose}
            style={{ minWidth: '200px' }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PowerupGuideModal;
