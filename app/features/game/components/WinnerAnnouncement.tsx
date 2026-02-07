type WinnerAnnouncementProps = {
  show: boolean;
  duelResult: string;
  team1Name: string;
  team2Name: string;
};

const WinnerAnnouncement = ({
  show,
  duelResult,
  team1Name,
  team2Name
}: WinnerAnnouncementProps) => {
  if (!show) {
    return null;
  }

  const hasTeam1 = duelResult.includes(team1Name);
  const hasTeam2 = duelResult.includes(team2Name);
  const color = hasTeam1
    ? 'var(--color-secondary)'
    : hasTeam2
      ? 'var(--color-primary)'
      : 'var(--color-accent)';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          animation: 'fade-in 0.3s ease-out'
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translate(-50%, 0)',
          zIndex: 9999,
          animation: 'fade-in 0.3s ease-out'
        }}
      >
        <div
          className="rpg-panel"
          style={{
            background: 'var(--color-panel-bg)',
            border: `4px solid ${color}`,
            padding: '20px 60px',
            boxShadow: `0 0 50px ${color}`,
            minWidth: '500px'
          }}
        >
          <div
            className="text-glow"
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              padding: '20px',
              color,
              letterSpacing: '2px',
              animation: 'pulse-glow 1.5s infinite',
              textTransform: 'uppercase'
            }}
          >
            {duelResult}
          </div>
        </div>
      </div>
    </>
  );
};

export default WinnerAnnouncement;
