import { useLanguage } from '~/contexts/LanguageContext';

type GameOverScreenProps = {
  teamWinner: string;
};

const GameOverScreen = ({ teamWinner }: GameOverScreenProps) => {
  const { t } = useLanguage();
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
      </div>
    </div>
  );
};

export default GameOverScreen;
