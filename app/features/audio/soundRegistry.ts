export type SoundEvent =
  | 'card_deal'
  | 'card_flip'
  | 'group_pick'
  | 'duel_win'
  | 'duel_lose'
  | 'duel_tie'
  | 'powerup_activate'
  | 'kill_streak_3'
  | 'kill_streak_4'
  | 'kill_streak_5'
  | 'kill_streak_6'
  | 'kill_streak_7'
  | 'kill_streak_8'
  | 'round_start'
  | 'game_start'
  | 'game_over';

export type BgmTrack = 'bgm_summer' | 'bgm_xmas' | 'bgm_jrpg';

export interface SfxDefinition {
  frequency: number;
  duration: number;
  type: OscillatorType;
}

export const SFX_REGISTRY: Record<SoundEvent, SfxDefinition> = {
  card_deal: { frequency: 440, duration: 0.08, type: 'sine' },
  card_flip: { frequency: 520, duration: 0.06, type: 'triangle' },
  group_pick: { frequency: 660, duration: 0.1, type: 'square' },
  duel_win: { frequency: 880, duration: 0.3, type: 'sine' },
  duel_lose: { frequency: 220, duration: 0.4, type: 'triangle' },
  duel_tie: { frequency: 330, duration: 0.15, type: 'sawtooth' },
  powerup_activate: { frequency: 1000, duration: 0.15, type: 'sine' },
  kill_streak_3: { frequency: 600, duration: 0.2, type: 'sawtooth' },
  kill_streak_4: { frequency: 700, duration: 0.25, type: 'sawtooth' },
  kill_streak_5: { frequency: 800, duration: 0.3, type: 'sawtooth' },
  kill_streak_6: { frequency: 900, duration: 0.35, type: 'sawtooth' },
  kill_streak_7: { frequency: 1000, duration: 0.4, type: 'sawtooth' },
  kill_streak_8: { frequency: 1200, duration: 0.5, type: 'sawtooth' },
  round_start: { frequency: 500, duration: 0.12, type: 'sine' },
  game_start: { frequency: 660, duration: 0.5, type: 'sine' },
  game_over: { frequency: 880, duration: 0.6, type: 'sine' }
};

export const ALL_SOUND_EVENTS: SoundEvent[] = Object.keys(
  SFX_REGISTRY
) as SoundEvent[];
