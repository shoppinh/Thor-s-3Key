import { useCallback, useMemo, useState } from 'react';
import { AudioManager } from '../audioManager';
import type { SoundEvent, BgmTrack } from '../soundRegistry';

export function useAudio() {
  const mgr = useMemo(() => {
    const instance = AudioManager.getInstance();
    instance.initFromStorage();
    return instance;
  }, []);
  const [isMuted, setIsMuted] = useState(mgr.isMuted);
  const [sfxVolume, setSfxVolumeState] = useState(mgr.getSfxVolume());
  const [bgmVolume, setBgmVolumeState] = useState(mgr.getBgmVolume());

  const toggleMute = useCallback(() => {
    const next = !mgr.isMuted;
    mgr.setMuted(next);
    setIsMuted(next);
  }, [mgr]);

  const setSfxVolume = useCallback(
    (v: number) => {
      mgr.setSfxVolume(v);
      setSfxVolumeState(mgr.getSfxVolume());
    },
    [mgr]
  );

  const setBgmVolume = useCallback(
    (v: number) => {
      mgr.setBgmVolume(v);
      setBgmVolumeState(mgr.getBgmVolume());
    },
    [mgr]
  );

  const ensureAudioResumed = useCallback(() => mgr.ensureAudioResumed(), [mgr]);
  const playSfx = useCallback((event: SoundEvent) => mgr.play(event), [mgr]);
  const playBgm = useCallback((track: BgmTrack) => mgr.playBgm(track), [mgr]);
  const preloadBgm = useCallback(
    (track: BgmTrack) => mgr.preloadBgm(track),
    [mgr]
  );
  const stopBgm = useCallback(() => mgr.stopBgm(), [mgr]);

  return {
    isMuted,
    sfxVolume,
    bgmVolume,
    toggleMute,
    setSfxVolume,
    setBgmVolume,
    ensureAudioResumed,
    playSfx,
    playBgm,
    preloadBgm,
    stopBgm
  };
}
