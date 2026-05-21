import { SFX_REGISTRY, type SoundEvent, type BgmTrack } from './soundRegistry';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private bgmElement: HTMLAudioElement | null = null;
  private _isMuted = false;
  private _sfxVolume = 0.5;
  private _bgmVolume = 0.3;
  private _bgmOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
      }
    } catch {
      // audio unavailable
    }
    return this.ctx;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  setMuted(muted: boolean): void {
    this._isMuted = muted;
    if (this.bgmElement) {
      if (muted) {
        this.bgmElement.pause();
      } else {
        this.bgmElement.play().catch(() => {});
      }
    }
    try {
      localStorage.setItem('thors3key_audio_muted', String(muted));
    } catch {
      // storage unavailable
    }
  }

  getSfxVolume(): number {
    return this._sfxVolume;
  }

  setSfxVolume(v: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, v));
  }

  getBgmVolume(): number {
    return this._bgmVolume;
  }

  setBgmVolume(v: number): void {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmElement) {
      this.bgmElement.volume = this._bgmVolume;
    }
  }

  play(event: SoundEvent): void {
    if (this._isMuted) return;
    const ctx = this.getContext();
    const def = SFX_REGISTRY[event];
    if (!ctx || !def) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = def.type;
    osc.frequency.value = def.frequency;
    gain.gain.value = this._sfxVolume * 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + def.duration);
  }

  playBgm(track: BgmTrack): void {
    this.stopBgm();

    const audio = new Audio();
    audio.volume = this._bgmVolume;
    audio.loop = true;
    this.bgmElement = audio;

    this._startBgmOscillator(track);
  }

  private _startBgmOscillator(track: BgmTrack): void {
    if (this._isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs: Record<BgmTrack, [number, number]> = {
      bgm_summer: [261, 329],
      bgm_xmas: [294, 370],
      bgm_jrpg: [220, 277]
    };

    const [f1, f2] = freqs[track];
    const gain = ctx.createGain();
    gain.gain.value = this._bgmVolume * 0.05;

    for (const freq of [f1, f2]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this._bgmOscillators.push({ osc, gain });
    }
  }

  stopBgm(): void {
    for (const { osc } of this._bgmOscillators) {
      try {
        osc.stop();
      } catch {
        // oscillator already stopped
      }
    }
    this._bgmOscillators = [];
    if (this.bgmElement) {
      this.bgmElement.pause();
      this.bgmElement = null;
    }
  }

  initFromStorage(): void {
    try {
      const muted = localStorage.getItem('thors3key_audio_muted');
      if (muted === 'true') {
        this._isMuted = true;
      }
    } catch {
      // storage unavailable
    }
  }
}
