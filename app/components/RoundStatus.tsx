import React from 'react';

/**
 * Props for RoundStatus component
 */
interface RoundStatusProps {
  duelResult: string;
  isFirstTurn: boolean;
  currentPlayerName: string;
  duelIndex: number;
  team1: string[];
  team2: string[];
  nextRound: (team1: string[], team2: string[]) => void;
}

/**
 * Renders the round status information at the bottom of the screen
 * @param duelResult - The result of the current duel (e.g. "Player A Wins!")
 * @param isFirstTurn - Whether this is the first turn of the game
 * @param currentPlayerName - The name of the current player
 * @param duelIndex - The current duel index
 * @param team1 - Array of team 1 members
 * @param team2 - Array of team 2 members
 * @param nextRound - Callback function to proceed to next round
 */
const RoundStatus: React.FC<RoundStatusProps> = ({
  duelResult,
  isFirstTurn,
  currentPlayerName,
  duelIndex,
  team1,
  team2,
  nextRound,
}) => (
  <div
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      padding: '20px',
      textAlign: 'center',
      zIndex: 1000,
      borderTop: '2px solid #ccc',
      backdropFilter: 'blur(5px)',
    }}
  >
    {isFirstTurn && (
      <>
        <h2 className={'playerStatus'}>FIRST PLAYER IS</h2>
        <h2 className={'blinkInfinite'}>{currentPlayerName}</h2>
      </>
    )}

    {!isFirstTurn && currentPlayerName && Math.min(team1.length, team2.length) > 0 && (
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
          onClick={() => nextRound(team1, team2)}
          className={'btnNextRound'}
        >
          {Math.min(team1.length, team2.length) == 0
            ? 'Finish'
            : 'Next Round'}
        </button>
        {/* <h2 style={{ marginTop: '20px' }}>{winner}</h2> */}
      </div>
    )}
  </div>
);

export default RoundStatus; 