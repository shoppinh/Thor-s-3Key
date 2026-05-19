import { useLanguage } from '~/contexts/LanguageContext';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type GameOverScreenProps = {
  teamWinner: string;
  canUndo: boolean;
  onUndo: () => void;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
};

const GameOverScreen = ({
  teamWinner,
  canUndo,
  onUndo,
  saveStatus,
  onRetrySave
}: GameOverScreenProps) => {
  const { t } = useLanguage();

  const saveStatusText =
    saveStatus === 'saving'
      ? t('game.savingMatch')
      : saveStatus === 'saved'
        ? t('game.matchSaved')
        : saveStatus === 'error'
          ? t('game.saveFailed')
          : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        gap: '30px'
      }}
    >
      <div
        className="rpg-panel"
        style={{
          padding: '40px 60px',
          textAlign: 'center',
          background: 'var(--color-panel-bg)',
          border: '3px solid var(--color-accent)'
        }}
      >
        <h2
          className="text-glow"
          style={{
            color: 'var(--color-primary)',
            margin: '0 0 20px 0',
            fontSize: '32px',
            letterSpacing: '3px'
          }}
        >
          {t('game.battleComplete')}
        </h2>
        <h1
          className="text-gradient"
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            margin: '20px 0',
            textShadow: '0 0 20px var(--color-accent)'
          }}
        >
          {teamWinner}
        </h1>

        {saveStatusText && (
          <div
            style={{
              marginTop: '16px',
              fontSize: '18px',
              color:
                saveStatus === 'error'
                  ? '#ff4d4d'
                  : saveStatus === 'saved'
                    ? '#4dff88'
                    : '#ccc'
            }}
          >
            {saveStatusText}
            {saveStatus === 'error' && (
              <button
                onClick={onRetrySave}
                className="rpg-button secondary"
                style={{
                  marginLeft: '12px',
                  fontSize: '14px',
                  padding: '6px 16px'
                }}
              >
                {t('game.retrySave')}
              </button>
            )}
          </div>
        )}

        <div
          className="rpg-panel"
          style={{
            marginTop: '30px',
            padding: '20px',
            background: 'rgba(0,0,0,0.3)'
          }}
        >
          <img
            src="/images/the-end.webp"
            alt="Victory"
            style={{
              width: '600px',
              maxWidth: '100%',
              opacity: 0.9
            }}
          />
        </div>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rpg-button secondary"
          style={{
            marginTop: '24px',
            fontSize: '18px',
            padding: '10px 36px',
            opacity: canUndo ? 1 : 0.45,
            cursor: canUndo ? 'pointer' : 'not-allowed'
          }}
        >
          {t('game.undo')}
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
