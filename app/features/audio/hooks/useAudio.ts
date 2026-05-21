import { useEffect, useMemo, useState } from 'react';
import { AudioManager } from '../audioManager';
import type { SoundEvent, BgmTrack } from '../soundRegistry';

export function useAudio() {
  const mgr = useMemo(() => AudioManager.getInstance(), []);
  const [isMuted, setIsMuted] = useState(mgr.isMuted);
  const [sfxVolume, setSfxVolumeState] = useState(mgr.getSfxVolume());
  const [bgmVolume, setBgmVolumeState] = useState(mgr.getBgmVolume());

  useEffect(() => {
    mgr.initFromStorage();
    setIsMuted(mgr.isMuted);
    setSfxVolumeState(mgr.getSfxVolume());
    setBgmVolumeState(mgr.getBgmVolume());
  }, [mgr]);

  const toggleMute = () => {
    const next = !mgr.isMuted;
    mgr.setMuted(next);
    setIsMuted(next);
  };

  const setSfxVolume = (v: number) => {
    mgr.setSfxVolume(v);
    setSfxVolumeState(v);
  };

  const setBgmVolume = (v: number) => {
    mgr.setBgmVolume(v);
    setBgmVolumeState(v);
  };

  return {
    isMuted,
    sfxVolume,
    bgmVolume,
    toggleMute,
    setSfxVolume,
    setBgmVolume,
    ensureAudioResumed: () => mgr.ensureAudioResumed(),
    playSfx: (event: SoundEvent) => mgr.play(event),
    playBgm: (track: BgmTrack) => mgr.playBgm(track),
    stopBgm: () => mgr.stopBgm()
  };
}
