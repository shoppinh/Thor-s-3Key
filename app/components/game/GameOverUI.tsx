import ShareButtons from '../ShareButtons';

interface GameOverUIProps {
  teamWinner: string;
}

export const GameOverUI = ({ teamWinner }: GameOverUIProps) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%'
      }}
    >
      <div>
        <h2 style={{ color: 'red', margin: 0 }}>Game Over</h2>
        <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>
          {teamWinner}
        </h2>
        <img
          style={{ marginTop: '20px' }}
          src="/images/the-end.webp"
          alt=""
          width="600"
        />
      </div>
      <div style={{ position: 'absolute', bottom: 20, right: 20 }}>
        <ShareButtons siteUrl="" />
      </div>
    </div>
  );
};