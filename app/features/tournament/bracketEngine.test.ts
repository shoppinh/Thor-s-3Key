import { describe, it, expect } from 'vitest';
import {
  createBracket,
  recordMatchResult,
  getNextSlot,
  getCurrentSlot,
  isBracketComplete
} from './bracketEngine';
import type { TournamentConfig } from './types';

const config: TournamentConfig = {
  format: 'single-elim',
  bestOfCount: 3,
  teamNames: ['Avengers', 'Thanos']
};

describe('bracketEngine', () => {
  describe('createBracket', () => {
    it('creates a bracket with correct match count for best-of-3', () => {
      const bracket = createBracket(config);
      expect(bracket.slots.length).toBe(3);
      expect(bracket.totalMatches).toBe(3);
      expect(bracket.currentSlotIndex).toBe(0);
      expect(bracket.isComplete).toBe(false);
    });

    it('creates slots with correct team names', () => {
      const bracket = createBracket(config);
      for (const slot of bracket.slots) {
        expect(slot.team1).toBe('Avengers');
        expect(slot.team2).toBe('Thanos');
        expect(slot.played).toBe(false);
      }
    });

    it('creates 1 match for single match (no best-of)', () => {
      const cfg: TournamentConfig = { ...config, bestOfCount: undefined };
      const bracket = createBracket(cfg);
      expect(bracket.slots.length).toBe(1);
    });

    it('creates 5 matches for best-of-5', () => {
      const cfg: TournamentConfig = { ...config, bestOfCount: 5 };
      const bracket = createBracket(cfg);
      expect(bracket.slots.length).toBe(5);
    });
  });

  describe('recordMatchResult', () => {
    it('records a win and advances slot index', () => {
      const bracket = createBracket(config);
      const updated = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      expect(updated.slots[0].played).toBe(true);
      expect(updated.slots[0].winner).toBe('Avengers');
      expect(updated.currentSlotIndex).toBe(1);
      expect(updated.isComplete).toBe(false);
    });

    it('completes bracket when a team reaches majority', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(b.isComplete).toBe(true);
      expect(b.champion).toBe('Avengers');
    });

    it('does not complete bracket until majority reached', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Thanos', 'Avengers', 4, 2);
      expect(b.isComplete).toBe(false);
      expect(b.champion).toBeUndefined();
      expect(b.currentSlotIndex).toBe(2);
    });

    it('throws on already-complete bracket', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(() => recordMatchResult(b, 'Avengers', 'Thanos', 3, 1)).toThrow(
        'Bracket is already complete'
      );
    });
  });

  describe('getNextSlot', () => {
    it('returns the next unplayed slot', () => {
      const bracket = createBracket(config);
      const slot = getNextSlot(bracket);
      expect(slot).toBe(bracket.slots[0]);
    });

    it('returns null if bracket is complete', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(getNextSlot(b)).toBeNull();
    });
  });

  describe('getCurrentSlot', () => {
    it('returns the slot at currentSlotIndex', () => {
      const bracket = createBracket(config);
      expect(getCurrentSlot(bracket)).toBe(bracket.slots[0]);
    });
  });

  describe('isBracketComplete', () => {
    it('returns true when champion is set', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(isBracketComplete(b)).toBe(true);
    });

    it('returns false for new bracket', () => {
      const bracket = createBracket(config);
      expect(isBracketComplete(bracket)).toBe(false);
    });
  });
});
