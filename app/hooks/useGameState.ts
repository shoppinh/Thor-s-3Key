import { useState } from 'react';

export type GameState = 'setup' | 'gameLoading' | 'gamePlaying' | 'gameOver';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [roundNumber, setRoundNumber] = useState(0);
  const [teamWinner, setTeamWinner] = useState('');
  const [isFirstTurn, setIsFirstTurn] = useState(true);

  return {
    gameState,
    setGameState,
    roundNumber,
    setRoundNumber,
    teamWinner,
    setTeamWinner,
    isFirstTurn,
    setIsFirstTurn,
  };
};