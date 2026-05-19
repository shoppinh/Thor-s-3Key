import { useLanguage } from '~/contexts/LanguageContext';
import {
  buildHeadToHead,
  buildPlayerLeaderboard,
  buildTeamStreaks,
  calculateMatchSummary
} from '~/features/dashboard/services/analytics';
import type { DashboardData } from '~/features/dashboard/services/matchService';

type DashboardScreenProps = {
  data: DashboardData;
};

const DashboardScreen = ({ data }: DashboardScreenProps) => {
  const { t } = useLanguage();
  const leaderboard = buildPlayerLeaderboard(data.allDuelEvents);
  const headToHead = buildHeadToHead(data.allDuelEvents);
  const streaks = buildTeamStreaks(data.allDuelEvents);
  const summary = calculateMatchSummary(data.allDuelEvents);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(15, 12, 41, 0.8)',
    border: '2px solid var(--color-secondary)',
    padding: '20px',
    borderRadius: '8px',
    minWidth: '180px',
    textAlign: 'center'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '12px'
  };

  const thStyle: React.CSSProperties = {
    borderBottom: '2px solid var(--color-secondary)',
    padding: '10px',
    textAlign: 'left',
    color: 'var(--color-primary)'
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1
        className="text-glow"
        style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          marginBottom: '40px',
          color: 'var(--color-primary)'
        }}
      >
        {t('dashboard.title')}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'var(--color-accent)'
            }}
          >
            {data.summary.totalMatches}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>
            {t('dashboard.totalMatches')}
          </div>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'var(--color-accent)'
            }}
          >
            {data.summary.totalDuels}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>
            {t('dashboard.totalDuels')}
          </div>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'var(--color-accent)'
            }}
          >
            {data.summary.team1Wins}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>
            {t('dashboard.team1Wins')}
          </div>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'var(--color-accent)'
            }}
          >
            {data.summary.team2Wins}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>
            {t('dashboard.team2Wins')}
          </div>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'var(--color-accent)'
            }}
          >
            {data.summary.shieldedDuels}
          </div>
          <div style={{ color: '#ccc', marginTop: '8px' }}>
            {t('dashboard.shieldedDuels')}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '30px'
        }}
      >
        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2
            className="text-glow"
            style={{ color: 'var(--color-primary)', marginTop: 0 }}
          >
            {t('dashboard.leaderboard')}
          </h2>
          {leaderboard.length === 0 ? (
            <p style={{ color: '#888' }}>{t('dashboard.noData')}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('dashboard.player')}</th>
                  <th style={thStyle}>{t('dashboard.duelsWon')}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.name}>
                    <td style={tdStyle}>{entry.name}</td>
                    <td style={tdStyle}>{entry.winCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2
            className="text-glow"
            style={{ color: 'var(--color-primary)', marginTop: 0 }}
          >
            {t('dashboard.headToHead')}
          </h2>
          {headToHead.length === 0 ? (
            <p style={{ color: '#888' }}>{t('dashboard.noData')}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('dashboard.winner')}</th>
                  <th style={thStyle}>{t('dashboard.loser')}</th>
                  <th style={thStyle}>{t('dashboard.count')}</th>
                </tr>
              </thead>
              <tbody>
                {headToHead.map((entry) => (
                  <tr key={`${entry.winner}-${entry.loser}`}>
                    <td style={tdStyle}>{entry.winner}</td>
                    <td style={tdStyle}>{entry.loser}</td>
                    <td style={tdStyle}>{entry.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2
            className="text-glow"
            style={{ color: 'var(--color-primary)', marginTop: 0 }}
          >
            {t('dashboard.teamStreaks')}
          </h2>
          {data.allDuelEvents.length === 0 ? (
            <p style={{ color: '#888' }}>{t('dashboard.noData')}</p>
          ) : (
            <>
              {streaks.map((s) => (
                <div
                  key={s.team}
                  style={{ marginBottom: '10px', color: '#ccc' }}
                >
                  {t('common.team')} {s.team === 'team1' ? '1' : '2'}:{' '}
                  <strong style={{ color: 'var(--color-accent)' }}>
                    {s.longestStreak}
                  </strong>{' '}
                  {t('dashboard.consecutiveWins')}
                </div>
              ))}
              {summary.mostWinsPlayer && (
                <div style={{ marginTop: '16px', color: '#ccc' }}>
                  {t('dashboard.mostWins')}:{' '}
                  <strong style={{ color: 'var(--color-primary)' }}>
                    {summary.mostWinsPlayer} ({summary.mostWinsCount})
                  </strong>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rpg-panel" style={{ padding: '20px' }}>
          <h2
            className="text-glow"
            style={{ color: 'var(--color-primary)', marginTop: 0 }}
          >
            {t('dashboard.recentMatches')}
          </h2>
          {data.recentMatches.length === 0 ? (
            <p style={{ color: '#888' }}>{t('dashboard.noData')}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('dashboard.winner')}</th>
                  <th style={thStyle}>{t('dashboard.score')}</th>
                  <th style={thStyle}>{t('dashboard.duels')}</th>
                  <th style={thStyle}>{t('dashboard.date')}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMatches.map((match) => (
                  <tr key={match.id}>
                    <td style={tdStyle}>
                      {match.winner_team === 'team1'
                        ? t('common.team') + ' 1'
                        : t('common.team') + ' 2'}
                    </td>
                    <td style={tdStyle}>
                      {match.team1_score} - {match.team2_score}
                    </td>
                    <td style={tdStyle}>{match.total_duels}</td>
                    <td style={tdStyle}>
                      {new Date(match.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
