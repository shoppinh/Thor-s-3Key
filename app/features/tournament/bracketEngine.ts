import type { TournamentConfig, TournamentSlot, Bracket } from './types';

let idCounter = 0;
function nextId(): string {
  return `slot_${++idCounter}`;
}

function majorityNeeded(bestOf?: number): number {
  const n = bestOf || 1;
  return Math.ceil(n / 2);
}

export function createBracket(config: TournamentConfig): Bracket {
  const totalMatches = config.bestOfCount || 1;
  const slots: TournamentSlot[] = [];

  for (let i = 0; i < totalMatches; i++) {
    slots.push({
      id: nextId(),
      team1: config.teamNames[0],
      team2: config.teamNames[1],
      team1Score: 0,
      team2Score: 0,
      played: false
    });
  }

  return {
    config,
    totalMatches,
    slots,
    currentSlotIndex: 0,
    isComplete: false
  };
}

export function recordMatchResult(
  bracket: Bracket,
  winner: string,
  loser: string,
  winnerScore: number,
  loserScore: number
): Bracket {
  if (bracket.isComplete) {
    throw new Error('Bracket is already complete');
  }

  const newSlots = bracket.slots.map((slot, i) => {
    if (i !== bracket.currentSlotIndex) return slot;
    return {
      ...slot,
      played: true,
      winner,
      loser,
      team1Score: slot.team1 === winner ? winnerScore : loserScore,
      team2Score: slot.team2 === winner ? winnerScore : loserScore
    };
  });

  let team1Wins = 0;
  let team2Wins = 0;
  for (const slot of newSlots) {
    if (!slot.played) continue;
    if (slot.winner === bracket.config.teamNames[0]) team1Wins++;
    if (slot.winner === bracket.config.teamNames[1]) team2Wins++;
  }

  const needed = majorityNeeded(bracket.config.bestOfCount);
  const champion =
    team1Wins >= needed
      ? bracket.config.teamNames[0]
      : team2Wins >= needed
        ? bracket.config.teamNames[1]
        : undefined;

  const isComplete = !!champion;

  return {
    ...bracket,
    slots: newSlots,
    currentSlotIndex: isComplete
      ? bracket.currentSlotIndex
      : bracket.currentSlotIndex + 1,
    champion,
    isComplete
  };
}

export function getNextSlot(bracket: Bracket): TournamentSlot | null {
  if (bracket.isComplete) return null;
  return bracket.slots[bracket.currentSlotIndex] || null;
}

export function getCurrentSlot(bracket: Bracket): TournamentSlot {
  return bracket.slots[bracket.currentSlotIndex];
}

export function isBracketComplete(bracket: Bracket): boolean {
  return bracket.isComplete;
}
