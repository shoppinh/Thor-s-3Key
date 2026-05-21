import { describe, it, expect } from 'vitest';
import { SFX_REGISTRY, ALL_SOUND_EVENTS } from './soundRegistry';

describe('soundRegistry', () => {
  const requiredEvents = [
    'card_deal',
    'card_flip',
    'group_pick',
    'duel_win',
    'duel_lose',
    'duel_tie',
    'powerup_activate',
    'kill_streak_3',
    'kill_streak_4',
    'kill_streak_5',
    'kill_streak_6',
    'kill_streak_7',
    'kill_streak_8',
    'round_start',
    'game_start',
    'game_over'
  ];

  it('has entries for all required sound events', () => {
    for (const event of requiredEvents) {
      expect(SFX_REGISTRY[event as keyof typeof SFX_REGISTRY]).toBeDefined();
    }
  });

  it('all registered events have frequency and duration', () => {
    for (const event of ALL_SOUND_EVENTS) {
      const def = SFX_REGISTRY[event];
      expect(def.frequency).toBeGreaterThan(0);
      expect(def.duration).toBeGreaterThan(0);
    }
  });
});
