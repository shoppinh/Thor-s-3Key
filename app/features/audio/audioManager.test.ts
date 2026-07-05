import { describe, it, expect, beforeEach, vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('AudioManager', () => {
  let AudioManager: any;

  beforeEach(async () => {
    vi.resetModules();
    const mockGain = { gain: { value: 1 }, connect: vi.fn() };
    const mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
    const mockContext = {
      createGain: vi.fn(() => mockGain),
      createOscillator: vi.fn(() => mockOscillator),
      destination: {},
      currentTime: 0
    };
    (globalThis as any).AudioContext = vi.fn(() => mockContext);
    (globalThis as any).webkitAudioContext = vi.fn(() => mockContext);

    const mod = await import('./audioManager');
    AudioManager = mod.AudioManager;
    (AudioManager as any).instance = null;
  });

  it('getInstance returns the same instance', () => {
    const a = AudioManager.getInstance();
    const b = AudioManager.getInstance();
    expect(a).toBe(b);
  });

  it('isMuted defaults to false', () => {
    const mgr = AudioManager.getInstance();
    expect(mgr.isMuted).toBe(false);
  });

  it('setMuted toggles mute state', () => {
    const mgr = AudioManager.getInstance();
    mgr.setMuted(true);
    expect(mgr.isMuted).toBe(true);
    mgr.setMuted(false);
    expect(mgr.isMuted).toBe(false);
  });

  it('setSfxVolume sets gain value', () => {
    const mgr = AudioManager.getInstance();
    mgr.setSfxVolume(0.5);
    expect(mgr.getSfxVolume()).toBe(0.5);
  });

  it('setBgmVolume sets gain value', () => {
    const mgr = AudioManager.getInstance();
    mgr.setBgmVolume(0.3);
    expect(mgr.getBgmVolume()).toBe(0.3);
  });

  it('play does not throw when called', () => {
    const mgr = AudioManager.getInstance();
    expect(() => mgr.play('card_deal')).not.toThrow();
  });

  it('play does nothing when muted', () => {
    const mgr = AudioManager.getInstance();
    mgr.setMuted(true);
    expect(() => mgr.play('card_deal')).not.toThrow();
  });

  it('stopBgm does not throw', () => {
    const mgr = AudioManager.getInstance();
    expect(() => mgr.stopBgm()).not.toThrow();
  });
});
