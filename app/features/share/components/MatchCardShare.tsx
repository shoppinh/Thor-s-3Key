import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLanguage } from '~/contexts/LanguageContext';
import {
  type MatchCardData,
  renderMatchCardToCanvas,
  canvasToPngBlob
} from '../renderMatchCard';

interface MatchCardShareProps {
  isOpen: boolean;
  data: MatchCardData;
  onClose: () => void;
}

export function MatchCardShare({ isOpen, data, onClose }: MatchCardShareProps) {
  const { t } = useLanguage();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [pngUrl, setPngUrl] = useState('');
  const [error, setError] = useState('');
  const pngUrlRef = useRef('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setPngUrl('');
    const styles = getComputedStyle(document.documentElement);
    const themedData: MatchCardData = {
      ...data,
      colors: {
        background:
          styles.getPropertyValue('--color-panel-bg').trim() || '#0a0a1a',
        border: styles.getPropertyValue('--color-accent').trim() || '#ffd700',
        primary:
          styles.getPropertyValue('--color-primary').trim() || '#ffd700',
        secondary:
          styles.getPropertyValue('--color-secondary').trim() || '#00ff88',
        accent: styles.getPropertyValue('--color-accent').trim() || '#aaa',
        text: '#ffffff',
        muted: '#888888'
      }
    };
    const canvas = renderMatchCardToCanvas(themedData);
    const container = canvasContainerRef.current;
    if (container) {
      container.innerHTML = '';
      container.appendChild(canvas);
    }
    canvasToPngBlob(canvas)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        pngUrlRef.current = url;
        setPngUrl(url);
      })
      .catch(() => {
        setError(t('game.shareRenderFailed'));
      });
    return () => {
      if (pngUrlRef.current) {
        URL.revokeObjectURL(pngUrlRef.current);
        pngUrlRef.current = '';
      }
    };
  }, [data, isOpen, t]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `thors3key-match-${Date.now()}.png`;
    a.click();
  };

  const handleTweet = () => {
    const text = encodeURIComponent(
      `${data.team1Name} ${data.team1Score} - ${data.team2Score} ${data.team2Name} in Thor's 3Key!`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      onClose();
    }
  };

  return (
    <div
      className="share-modal-overlay"
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
    >
      <div
        className="share-modal"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="share-modal-close" onClick={onClose}>
          ×
        </button>
        <div
          ref={canvasContainerRef}
          style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        />
        <div className="share-modal-buttons">
          {error && <span style={{ color: '#ff6b6b' }}>{error}</span>}
          <button
            className="rpg-button"
            onClick={handleDownload}
            disabled={!pngUrl}
          >
            {t('game.shareDownload')}
          </button>
          <button className="rpg-button secondary" onClick={handleTweet}>
            {t('game.shareTweet')}
          </button>
        </div>
      </div>
    </div>
  );
}
