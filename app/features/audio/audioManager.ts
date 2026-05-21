import { SFX_REGISTRY, type SoundEvent, type BgmTrack } from './soundRegistry';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private muted = false;
  private sfxVolume = 0.5;
  private bgmVolume = 0.3;
  private bgmOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private currentBgmTrack: BgmTrack | null = null;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  ensureAudioResumed(): void {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
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
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopBgm();
    } else if (this.currentBgmTrack) {
      this.startBgmOscillator(this.currentBgmTrack);
    }
    try {
      localStorage.setItem('thors3key_audio_muted', String(muted));
    } catch {
      // storage unavailable
    }
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('thors3key_sfx_volume', String(this.sfxVolume));
    } catch {
      // storage unavailable
    }
  }

  getBgmVolume(): number {
    return this.bgmVolume;
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('thors3key_bgm_volume', String(this.bgmVolume));
    } catch {
      // storage unavailable
    }
  }

  play(event: SoundEvent): void {
    if (this.muted) return;
    const ctx = this.getContext();
    const def = SFX_REGISTRY[event];
    if (!ctx || !def) return;

    ctx.resume().catch(() => {});

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = def.type;
    osc.frequency.value = def.frequency;
    gain.gain.value = this.sfxVolume * 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + def.duration);
  }

  playBgm(track: BgmTrack): void {
    this.stopBgm();
    this.currentBgmTrack = track;
    this.startBgmOscillator(track);
  }

  private startBgmOscillator(track: BgmTrack): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs: Record<BgmTrack, [number, number]> = {
      bgm_summer: [261, 329],
      bgm_xmas: [294, 370],
      bgm_jrpg: [220, 277]
    };

    const [f1, f2] = freqs[track];
    const gain = ctx.createGain();
    gain.gain.value = this.bgmVolume * 0.05;
    gain.connect(ctx.destination);

    for (const freq of [f1, f2]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      this.bgmOscillators.push({ osc, gain });
    }
  }

  stopBgm(): void {
    for (const { osc } of this.bgmOscillators) {
      try {
        osc.stop();
      } catch {
        // oscillator already stopped
      }
    }
    this.bgmOscillators = [];
    this.currentBgmTrack = null;
  }

  initFromStorage(): void {
    try {
      const muted = localStorage.getItem('thors3key_audio_muted');
      if (muted === 'true') {
        this.muted = true;
      }
      const sfx = localStorage.getItem('thors3key_sfx_volume');
      if (sfx !== null) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(sfx)));
      }
      const bgm = localStorage.getItem('thors3key_bgm_volume');
      if (bgm !== null) {
        this.bgmVolume = Math.max(0, Math.min(1, parseFloat(bgm)));
      }
    } catch {
      // storage unavailable
    }
  }
}
