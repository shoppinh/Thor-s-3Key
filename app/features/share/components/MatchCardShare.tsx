import { useEffect, useRef, useState } from 'react';
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
  const pngUrlRef = useRef('');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = renderMatchCardToCanvas(data);
    const container = canvasContainerRef.current;
    if (container) {
      container.innerHTML = '';
      container.appendChild(canvas);
    }
    canvasToPngBlob(canvas).then((blob) => {
      const url = URL.createObjectURL(blob);
      pngUrlRef.current = url;
      setPngUrl(url);
    });
    return () => {
      if (pngUrlRef.current) {
        URL.revokeObjectURL(pngUrlRef.current);
        pngUrlRef.current = '';
      }
    };
  }, [isOpen]);

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

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
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
          <button className="rpg-button" onClick={handleDownload}>
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
