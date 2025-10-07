import { useState } from 'react';

export type GameState = 'setup' | 'gameLoading' | 'gamePlaying' | 'gameOver';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>('setup');

  return {
    gameState,
    setGameState,
  };
};