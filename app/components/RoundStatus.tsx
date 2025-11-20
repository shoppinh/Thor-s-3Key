import React, { useState, useEffect } from 'react';
import TeamData from '~/models/TeamData';
import DuelData from '~/models/DuelData';

interface RoundStatusProps {
  duelResult: string;
  isFirstTurn: boolean;
  currentPlayerName: string;
  duelIndex: number;
  team1: string[];
  team2: string[];
  team1Data: TeamData;
  team2Data: TeamData;
  isFinishDuel: boolean;
  duelData: DuelData;
  nextRound: (team1: string[], team2: string[]) => void;
  onChanceClick: (
    teamName: 'team1' | 'team2',
    chanceType: 'secondChance' | 'revealTwo' | 'lifeShield' | 'removeWorst'
  ) => void;
}

const RoundStatus: React.FC<RoundStatusProps> = ({
  duelResult,
  isFirstTurn,
  currentPlayerName,
  duelIndex,
  team1: team1Players,
  team2: team2Players,
  team1Data,
  team2Data,
  isFinishDuel,
  duelData,
  nextRound,
  onChanceClick
}) => {
  const [showWinnerAnnouncement, setShowWinnerAnnouncement] = useState(false);

  // Show winner announcement when duelResult changes
  useEffect(() => {
    if (duelResult && isFinishDuel) {
      setShowWinnerAnnouncement(true);
      
      // Hide after 2 seconds
      const timer = setTimeout(() => {
        setShowWinnerAnnouncement(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [duelResult, isFinishDuel]);

  // Auto-advance logic (kept from original)
  React.useEffect(() => {
    const noPlayersLeft = Math.min(team1Players.length, team2Players.length) === 0;
    const bothSelected = !!duelData.player1SideSelected && !!duelData.player2SideSelected;
    const secondPlayerTeam = duelData.player2Team;
    const secondTeamData = secondPlayerTeam === 'team1' ? team1Data : team2Data;
    const secondTeamHasSecondChance = secondTeamData.powerUps?.secondChance > 0;
    const secondTeamIsWinner = duelData.winningTeam === secondPlayerTeam;
    const canSecondChanceNow = bothSelected && !!secondPlayerTeam && secondTeamHasSecondChance && !secondTeamIsWinner;

    if (duelResult && isFinishDuel && noPlayersLeft && !canSecondChanceNow) {
      const timerId = setTimeout(() => {
        nextRound(team1Players, team2Players);
      }, 5000);
      return () => clearTimeout(timerId);
    }
  }, [duelResult, isFinishDuel, team1Players, team2Players, nextRound, duelData, team1Data, team2Data]);

  const renderTeamChances = (teamData: TeamData, teamKey: 'team1' | 'team2') => {
    const isTeam1 = teamKey === 'team1';
    const teamColor = isTeam1 ? 'var(--color-secondary)' : 'var(--color-primary)';
    
    // Helper logic for enabling buttons (simplified for brevity, logic matches original)
    const getPlayerTeams = () => ({ firstPlayerTeam: duelData.player1Team, secondPlayerTeam: duelData.player2Team });
    const getCurrentTurnTeam = () => {
      if (!duelData.currentPlayerName) return null;
      if (team1Data.players.includes(duelData.currentPlayerName)) return 'team1';
      if (team2Data.players.includes(duelData.currentPlayerName)) return 'team2';
      return null;
    };

    const isSecondChanceEnabled = () => {
      const { firstPlayerTeam, secondPlayerTeam } = getPlayerTeams();
      const currentTurnTeam = getCurrentTurnTeam();
      if ((duelData.secondChanceUsedByTeams || []).includes(teamKey)) return false;
      
      // Check available groups
      const disabledByRemoveWorst = new Set(duelData.removedWorstGroups || []);
      const availableCount = [
        !disabledByRemoveWorst.has('top-left') && !duelData.topLeftRevealed && duelData.topLeftPlayerData.cards.length === 0,
        !disabledByRemoveWorst.has('bottom-left') && !duelData.bottomLeftRevealed && duelData.bottomLeftPlayerData.cards.length === 0,
        !disabledByRemoveWorst.has('top-right') && !duelData.topRightRevealed && duelData.topRightPlayerData.cards.length === 0,
        !disabledByRemoveWorst.has('bottom-right') && !duelData.bottomRightRevealed && duelData.bottomRightPlayerData.cards.length === 0
      ].filter(Boolean).length;
      if (availableCount === 0) return false;

      if (duelData.player1SideSelected && !duelData.player2SideSelected) return teamKey === firstPlayerTeam;
      if (duelData.player1SideSelected && duelData.player2SideSelected) {
        if (teamKey === secondPlayerTeam) return duelData.winningTeam !== secondPlayerTeam;
        return false;
      }
      if (currentTurnTeam !== teamKey) return false;
      return false;
    };

    const isRevealTwoEnabled = () => {
      const { firstPlayerTeam, secondPlayerTeam } = getPlayerTeams();
      const currentTurnTeam = getCurrentTurnTeam();
      if (currentTurnTeam !== teamKey) return false;
      if (duelData.revealTwoUsedBy || isFinishDuel) return false;
      
      const isFirstPlayerTeamSelected = teamKey === firstPlayerTeam && duelData.player1SideSelected;
      const isSecondPlayerTeamSelected = teamKey === secondPlayerTeam && duelData.player2SideSelected;
      
      if (isFirstPlayerTeamSelected && duelData.player1Name === '?') return true;
      if (isSecondPlayerTeamSelected && duelData.player2Name === '?') return true;
      
      return !(isFirstPlayerTeamSelected || isSecondPlayerTeamSelected);
    };

    const isLifeShieldEnabled = () => {
      const currentTurnTeam = getCurrentTurnTeam();
      return currentTurnTeam === teamKey && !isFinishDuel;
    };

    const isRemoveWorstEnabled = () => {
      const currentTurnTeam = getCurrentTurnTeam();
      if (currentTurnTeam !== teamKey || isFinishDuel) return false;
      if ((duelData.removeWorstUsedByTeams || []).includes(teamKey)) return false;
      const { firstPlayerTeam, secondPlayerTeam } = getPlayerTeams();
      const hasThisTeamSelected = (teamKey === firstPlayerTeam && !!duelData.player1SideSelected) || (teamKey === secondPlayerTeam && !!duelData.player2SideSelected);
      if (hasThisTeamSelected) return false;
      
      const disabled = new Set(duelData.removedWorstGroups || []);
      const availableCount = [
        !disabled.has('top-left') && !duelData.topLeftRevealed && duelData.topLeftPlayerData.cards.length === 0,
        !disabled.has('bottom-left') && !duelData.bottomLeftRevealed && duelData.bottomLeftPlayerData.cards.length === 0,
        !disabled.has('top-right') && !duelData.topRightRevealed && duelData.topRightPlayerData.cards.length === 0,
        !disabled.has('bottom-right') && !duelData.bottomRightRevealed && duelData.bottomRightPlayerData.cards.length === 0
      ].filter(Boolean).length;
      return availableCount > 1;
    };

    const PowerUpButton = ({ type, count, enabled, icon, label, color }: any) => (
      count > 0 && (
        <div style={{ position: 'relative', margin: '0 8px' }}>
          <button
            onClick={() => enabled && onChanceClick(teamKey, type)}
            disabled={!enabled}
            className="rpg-skewed"
            style={{
              width: '80px',
              height: '80px',
              background: enabled ? `rgba(0,0,0,0.6)` : 'rgba(0,0,0,0.3)',
              border: `3px solid ${enabled ? color : '#555'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: enabled ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: enabled ? `0 0 15px ${color}` : 'none'
            }}
          >
            <img 
              src={icon} 
              alt={label} 
              style={{ 
                width: '55px', 
                height: '55px', 
                filter: enabled ? 'none' : 'grayscale(100%)',
                transform: 'skewX(5deg)' // Counter skew
              }} 
            />
            <div 
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: color,
                color: '#000',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                fontSize: '16px',
                fontWeight: 'bold',
                lineHeight: '28px',
                transform: 'skewX(5deg)',
                boxShadow: `0 0 10px ${color}`
              }}
            >
              {count}
            </div>
          </button>
          <div style={{ 
            fontSize: '11px', 
            marginTop: '5px', 
            color: enabled ? '#fff' : '#777',
            textAlign: 'center',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.5px'
          }}>
            {label}
          </div>
        </div>
      )
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h4 style={{ color: teamColor, marginBottom: '10px', textShadow: `0 0 5px ${teamColor}` }}>
          {teamData.name}
        </h4>
        <div style={{ display: 'flex' }}>
          <PowerUpButton 
            type="secondChance" 
            count={teamData.powerUps.secondChance} 
            enabled={isSecondChanceEnabled()} 
            icon="/images/chance_second.png" 
            label="Retry"
            color="#4CAF50"
          />
          <PowerUpButton 
            type="revealTwo" 
            count={teamData.powerUps.revealTwo} 
            enabled={isRevealTwoEnabled()} 
            icon="/images/chance_reveal.png" 
            label="Reveal"
            color="#2196F3"
          />
          <PowerUpButton 
            type="lifeShield" 
            count={teamData.powerUps.lifeShield} 
            enabled={isLifeShieldEnabled()} 
            icon="/images/chance_shield.png" 
            label="Shield"
            color="#FFC107"
          />
          <PowerUpButton 
            type="removeWorst" 
            count={teamData.powerUps.removeWorst} 
            enabled={isRemoveWorstEnabled()} 
            icon="/images/chance_remove.png" 
            label="Remove"
            color="#F44336"
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="rpg-panel"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        padding: '15px 30px',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 12, 41, 0.95)',
        borderTop: '2px solid var(--color-secondary)'
      }}
    >
      {/* Team 1 Status */}
      <div style={{ flex: 1 }}>
        {renderTeamChances(team1Data, 'team1')}
      </div>

      {/* Center Status Display */}
      <div style={{ flex: 2, textAlign: 'center', position: 'relative' }}>
        {/* Round Winner Announcement */}
        {showWinnerAnnouncement && (
          <>
            {/* Backdrop */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                zIndex: 9998,
                pointerEvents: 'none',
                animation: 'fade-in 0.3s ease-out'
              }}
            />
            
            {/* Winner Announcement */}
            <div 
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                animation: 'fade-in 0.3s ease-out',
                pointerEvents: 'none'
              }}
            >
              <div 
                className="rpg-panel"
                style={{
                  background: 'rgba(15, 12, 41, 0.98)',
                  border: `4px solid ${duelResult.includes(team1Data.name) ? 'var(--color-secondary)' : duelResult.includes(team2Data.name) ? 'var(--color-primary)' : 'var(--color-accent)'}`,
                  padding: '40px 60px',
                  boxShadow: `0 0 50px ${duelResult.includes(team1Data.name) ? 'var(--color-secondary)' : duelResult.includes(team2Data.name) ? 'var(--color-primary)' : 'var(--color-accent)'}`,
                  minWidth: '500px'
                }}
              >
                <div style={{ fontSize: '18px', color: '#aaa', letterSpacing: '3px', marginBottom: '10px' }}>
                  ROUND RESULT
                </div>
                <div 
                  className="text-glow"
                  style={{ 
                    fontSize: '48px', 
                    fontWeight: 'bold',
                    color: duelResult.includes(team1Data.name) ? 'var(--color-secondary)' : duelResult.includes(team2Data.name) ? 'var(--color-primary)' : 'var(--color-accent)',
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
        )}
        
        <div 
          className="rpg-skewed"
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--color-text)',
            padding: '10px 40px',
            display: 'inline-block',
            minWidth: '300px'
          }}
        >
          <div style={{ transform: 'skewX(10deg)' }}>
            {isFirstTurn ? (
              <>
                <div style={{ fontSize: '14px', color: '#aaa', letterSpacing: '2px' }}>CHALLENGER APPROACHING</div>
                <div className="text-glow" style={{ fontSize: '32px', color: 'var(--color-accent)' }}>{currentPlayerName}</div>
              </>
            ) : (
              <>
                {currentPlayerName && Math.min(team1Players.length, team2Players.length) > 0 && (
                  <>
                    <div style={{ fontSize: '14px', color: '#aaa', letterSpacing: '2px' }}>
                      {duelIndex === 2 ? 'NEXT TURN' : 'CURRENT TURN'}
                    </div>
                    <div className="text-glow" style={{ fontSize: '32px', color: '#fff' }}>{currentPlayerName}</div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {duelResult && isFinishDuel && (
          <div style={{ marginTop: '15px' }}>
            {Math.min(team1Players.length, team2Players.length) > 0 && (
              <button
                onClick={() => nextRound(team1Players, team2Players)}
                className="rpg-button"
                style={{ 
                  fontSize: '18px',
                  padding: '10px 40px',
                  animation: 'pulse-glow 2s infinite'
                }}
              >
                NEXT ROUND
              </button>
            )}
          </div>
        )}
      </div>

      {/* Team 2 Status */}
      <div style={{ flex: 1 }}>
        {renderTeamChances(team2Data, 'team2')}
      </div>
    </div>
  );
};

export default RoundStatus;
