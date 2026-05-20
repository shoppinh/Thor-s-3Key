import { useLanguage } from '~/contexts/LanguageContext';
import type { SavedPowerUps } from '~/features/dashboard/types';
import type { TeamName } from '~/features/game/types/gameTypes';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    winner_team: TeamName;
    team1_initial_roster: string[];
    team2_initial_roster: string[];
    team1_powerups: SavedPowerUps;
    team2_powerups: SavedPowerUps;
    team1_score: number;
    team2_score: number;
    total_duels: number;
    duration_seconds: number | null;
    created_at: string;
  } | null;
}

const MatchDetailModal = ({
  isOpen,
  onClose,
  match
}: MatchDetailModalProps) => {
  const { t } = useLanguage();
  if (!isOpen || !match) return null;

  const formatDuration = (seconds: number | null) => {
    if (seconds == null) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}${t('dashboard.minuteAbbr')} ${secs}${t('dashboard.secondAbbr')}`;
  };

  const renderPowerUps = (powerups: SavedPowerUps) => {
    const items = [
      { key: 'secondChance', label: t('game.secondChance') },
      { key: 'revealTwo', label: t('game.revealTwo') },
      { key: 'lifeShield', label: t('game.lifeShield') },
      { key: 'removeWorst', label: t('game.removeWorst') }
    ] as const;

    return items.map(({ key, label }) => (
      <div
        key={key}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 0'
        }}
      >
        <span>{label}</span>
        <strong style={{ color: 'var(--color-accent)' }}>
          {powerups[key]}
        </strong>
      </div>
    ));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3000
      }}
      onClick={onClose}
    >
      <div
        className="rpg-panel"
        style={{
          padding: '32px',
          minWidth: '420px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(15, 12, 41, 0.98)',
          border: '2px solid var(--color-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}
        >
          <h2
            className="text-glow"
            style={{
              margin: 0,
              color: 'var(--color-primary)',
              fontSize: '1.5rem'
            }}
          >
            {t('dashboard.matchDetail')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              lineHeight: 1
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span style={{ color: '#aaa' }}>{t('dashboard.winner')}</span>
            <strong style={{ color: 'var(--color-accent)' }}>
              {match.winner_team === 'team1'
                ? `${t('common.team')} 1`
                : `${t('common.team')} 2`}
            </strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span style={{ color: '#aaa' }}>{t('dashboard.score')}</span>
            <strong>
              {match.team1_score} - {match.team2_score}
            </strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span style={{ color: '#aaa' }}>{t('dashboard.duels')}</span>
            <strong>{match.total_duels}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span style={{ color: '#aaa' }}>{t('dashboard.duration')}</span>
            <strong>{formatDuration(match.duration_seconds)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>{t('dashboard.date')}</span>
            <strong>{new Date(match.created_at).toLocaleString()}</strong>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginTop: '24px'
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                color: 'var(--color-secondary)',
                fontSize: '1.1rem'
              }}
            >
              {t('common.team')} 1
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  color: '#aaa',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {t('dashboard.roster')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {match.team1_initial_roster.map((name, idx) => (
                  <span
                    key={`t1-${name}-${idx}`}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div
                style={{
                  color: '#aaa',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {t('dashboard.powerUps')}
              </div>
              {renderPowerUps(match.team1_powerups)}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                color: 'var(--color-secondary)',
                fontSize: '1.1rem'
              }}
            >
              {t('common.team')} 2
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  color: '#aaa',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {t('dashboard.roster')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {match.team2_initial_roster.map((name, idx) => (
                  <span
                    key={`t2-${name}-${idx}`}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div
                style={{
                  color: '#aaa',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {t('dashboard.powerUps')}
              </div>
              {renderPowerUps(match.team2_powerups)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetailModal;
