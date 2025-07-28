import React from 'react';
import TeamData from '~/models/TeamData';

/**
 * Props for RoundStatus component
 */
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
  onChanceClick: (teamName: 'team1' | 'team2', chanceType: 'second' | 'reveal') => void;
}

/**
 * Renders the round status information at the bottom of the screen
 * @param duelResult - The result of the current duel (e.g. "Player A Wins!")
 * @param isFirstTurn - Whether this is the first turn of the game
 * @param currentPlayerName - The name of the current player
 * @param duelIndex - The current duel index
 * @param team1 - Array of team 1 members
 * @param team2 - Array of team 2 members
 * @param team1Data - Team 1 data including chance usage flags
 * @param team2Data - Team 2 data including chance usage flags
 * @param nextRound - Callback function to proceed to next round
 * @param onChanceClick - Callback when a chance item is clicked
 */
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
  onChanceClick,
}) => {
  const renderTeamChances = (
    teamData: TeamData,
    teamKey: 'team1' | 'team2'
  ) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '300px'
    }}>
      {/* Team Name */}
      <h4
        className={'teamName ' + teamKey}
        style={{
          fontSize: '18px',
          margin: '0 0 10px 0',
          padding: '5px 10px'
        }}>
        {teamData.name}
      </h4>

      {/* Chance Items */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '15px',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Second Chance */}
        {!teamData.useChanceSecond && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            opacity: 1
          }}>
            <img
              src="/images/chance_second.png"
              alt="Second Chance"
              style={{
                width: '120px',
                height: '120px',
                marginBottom: '4px',
                filter: 'none'
              }}
              onClick={() => onChanceClick(teamKey, 'second')}
            />
            <span style={{
              fontSize: '15px',
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#333'
            }}>
              Second Chance
            </span>
          </div>
        )}

        {/* Reveal Two */}
        {!teamData.useChanceReveal && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: (duelData.revealTwoUsedBy || isFinishDuel) ? 'default' : 'pointer',
            opacity: (duelData.revealTwoUsedBy || isFinishDuel) ? 0.5 : 1
          }}>
            <img
              src="/images/chance_reveal.png"
              alt="Reveal Two"
              style={{
                width: '120px',
                height: '120px',
                marginBottom: '4px',
                filter: (duelData.revealTwoUsedBy || isFinishDuel) ? 'grayscale(100%)' : 'none'
              }}
              onClick={() => !duelData.revealTwoUsedBy && !isFinishDuel && onChanceClick(teamKey, 'reveal')}
            />
            <span style={{
              fontSize: '15px',
              fontWeight: 'bold',
              textAlign: 'center',
              color: (duelData.revealTwoUsedBy || isFinishDuel) ? '#999' : '#333'
            }}>
              Reveal Two
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '20px',
        zIndex: 1000,
        borderTop: '2px solid #ccc',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {/* Left Part - Team 1 Chances */}
      <div style={{ flex: '0 0 150px' }}>
        {renderTeamChances(team1Data, 'team1')}
      </div>

      {/* Middle Part - Current Content */}
      <div style={{
        flex: '1',
        textAlign: 'center',
        padding: '0 20px'
      }}>
        {isFirstTurn && (
          <>
            <h2 className={'playerStatus'}>FIRST PLAYER IS</h2>
            <h2 className={'blinkInfinite'}>{currentPlayerName}</h2>
          </>
        )}

        {!isFirstTurn && currentPlayerName && Math.min(team1Players.length, team2Players.length) > 0 && (
          <>
            {duelIndex == 2 ? (
              <h2 className={'playerStatus'}>NEXT PLAYER IS</h2>
            ) : (
              <h2 className={'playerStatus'}>CURRENT PLAYER IS</h2>
            )}
            <h2 className={'blinkInfinite'}>{currentPlayerName}</h2>
          </>
        )}

        {duelResult && (
          <div className={'relativeContainer'}>
            <img
              className={'leftHandPointer'}
              style={{ top: '25px' }}
              src='images/left-hand.png'
              alt='cursor'
            />
            <button
              onClick={() => nextRound(team1Players, team2Players)}
              className={'btnNextRound'}
              style={{ cursor: 'pointer' }}
            >
              {Math.min(team1Players.length, team2Players.length) == 0
                ? 'Finish'
                : 'Next Round'}
            </button>
            {/* <h2 style={{ marginTop: '20px' }}>{duelResult}</h2> */}
          </div>
        )}
      </div>

      {/* Right Part - Team 2 Chances */}
      <div style={{ flex: '0 0 150px' }}>
        {renderTeamChances(team2Data, 'team2')}
      </div>
    </div>
  );
};

export default RoundStatus; 