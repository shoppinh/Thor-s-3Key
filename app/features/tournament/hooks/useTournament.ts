import { useCallback, useState } from 'react';
import type { Bracket, TournamentConfig, TournamentSlot } from '../types';
import {
  createBracket,
  recordMatchResult,
  getNextSlot
} from '../bracketEngine';

export function useTournament() {
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [hasActiveTournament, setHasActiveTournament] = useState(false);

  const startTournament = useCallback((config: TournamentConfig) => {
    const b = createBracket(config);
    setBracket(b);
    setHasActiveTournament(true);
    return b;
  }, []);

  const beginMatch = useCallback((slotId: string) => {
    setCurrentSlotId(slotId);
  }, []);

  const finishMatch = useCallback(
    (
      winner: string,
      loser: string,
      winnerScore: number,
      loserScore: number
    ) => {
      setBracket((prev) => {
        if (!prev) return prev;
        const updated = recordMatchResult(
          prev,
          winner,
          loser,
          winnerScore,
          loserScore
        );
        return updated;
      });
      setCurrentSlotId(null);
    },
    []
  );

  const nextSlot = useCallback((): TournamentSlot | null => {
    if (!bracket) return null;
    return getNextSlot(bracket);
  }, [bracket]);

  const resetTournament = useCallback(() => {
    setBracket(null);
    setCurrentSlotId(null);
    setHasActiveTournament(false);
  }, []);

  return {
    bracket,
    currentSlotId,
    hasActiveTournament,
    startTournament,
    beginMatch,
    finishMatch,
    nextSlot,
    resetTournament
  };
}
