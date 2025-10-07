import { useCallback, useMemo } from 'react';

interface ShareButtonsProps {
  readonly siteUrl: string;
}

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export default function ShareButtons(props: ShareButtonsProps) {
  const { siteUrl } = props;

  const shareUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return siteUrl.replace(/\/$/, '');
  }, [siteUrl]);
  const shareTitle = "Thor's 3Key — Chaotic team card showdown";
  const shareText =
    "Fast, silly, team-based card chaos. Load players from Google Sheets, slam power-ups, and trash talk your way to victory.";

  const canNativeShare =
    typeof window !== 'undefined' && typeof navigator !== 'undefined' &&
    'share' in navigator && typeof navigator.share === 'function';

  const onNativeShare = useCallback(async () => {
    const shareData: ShareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl
    };
    await navigator.share(shareData).catch(() => {});
  }, [shareTitle, shareText, shareUrl]);

  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl)
      .then(() => {
        // eslint-disable-next-line no-alert
        alert('Link copied!');
      })
      .catch(() => {
        // eslint-disable-next-line no-alert
        alert('Could not copy.');
      });
  }, [shareUrl]);

  const twitterHref = useMemo(() => {
    const params = new URLSearchParams({
      text: `${shareTitle} — ${shareText}`,
      url: shareUrl
    });
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  }, [shareTitle, shareText, shareUrl]);

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 50,
        display: 'flex',
        gap: 8
      }}
    >
      {canNativeShare ? (
        <button
          type="button"
          onClick={onNativeShare}
          style={buttonStyle}
          aria-label="Share"
        >
          Share
        </button>
      ) : null}
      <a href={twitterHref} target="_blank" rel="noreferrer" style={buttonStyle}>
        Tweet
      </a>
      <button type="button" onClick={onCopy} style={buttonStyle}>
        Copy link
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: '#0ea5e9',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '10px 12px',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none'
};


