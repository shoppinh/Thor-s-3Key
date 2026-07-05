import { useLanguage } from '~/contexts/LanguageContext';

interface AudioControlsProps {
  isMuted: boolean;
  sfxVolume: number;
  bgmVolume: number;
  onToggleMute: () => void;
  onSfxVolumeChange: (v: number) => void;
  onBgmVolumeChange: (v: number) => void;
}

export function AudioControls({
  isMuted,
  sfxVolume,
  bgmVolume,
  onToggleMute,
  onSfxVolumeChange,
  onBgmVolumeChange
}: AudioControlsProps) {
  const { t } = useLanguage();

  return (
    <div className="audio-controls">
      <button
        className="audio-mute-btn"
        onClick={onToggleMute}
        title={isMuted ? t('game.audioUnmute') : t('game.audioMute')}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      {!isMuted && (
        <div className="audio-sliders">
          <label>
            SFX
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(sfxVolume * 100)}
              onChange={(e) => onSfxVolumeChange(Number(e.target.value) / 100)}
            />
          </label>
          <label>
            BGM
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(bgmVolume * 100)}
              onChange={(e) => onBgmVolumeChange(Number(e.target.value) / 100)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
