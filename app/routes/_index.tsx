import { useMemo } from 'react';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
  const title = "Thor's 3Key — Chaotic team card showdown";
  const description =
    'Fast, silly, team-based card chaos. Load players from Google Sheets, slam power-ups, and trash talk your way to victory.';
  return [
    { title },
    { name: 'description', content: description }
  ];
};

export default function IndexRoute() {
  const ctaHref = useMemo(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      return `/game${search || ''}`;
    }
    return '/game';
  }, []);

  return (
    <main style={styles.wrapper}>
      <section style={styles.hero}>
        <div style={styles.badge}>New</div>
        <h1 style={styles.h1}>Thor's 3Key</h1>
        <p style={styles.tagline}>
          Team-based card chaos with power-ups. Stream-friendly. Stupidly fun.
        </p>
        <div style={styles.ctaRow}>
          <a href={ctaHref} style={styles.ctaPrimary}>
            Play now
          </a>
          <a href="#how" style={styles.ctaSecondary}>
            How it works
          </a>
        </div>
        <div style={styles.mediaFrame}>
          <img
            src="/images/the-end.webp"
            alt="Gameplay screenshot"
            style={{ width: '100%', borderRadius: 12 }}
            loading="lazy"
          />
        </div>
        <div style={styles.socialRow}>
          <a href="https://twitter.com/intent/tweet?text=Playing%20Thor%27s%203Key%20now&url=" target="_blank" rel="noreferrer">
            Post your run →
          </a>
        </div>
      </section>

      <section id="how" style={styles.section}>
        <h2 style={styles.h2}>How it works</h2>
        <ul style={styles.featureList}>
          <li>
            <strong>1.</strong> Load players from Google Sheets or add them manually.
          </li>
          <li>
            <strong>2.</strong> Draw, reveal, and slam power-ups (Second, Reveal, Shield, Lock).
          </li>
          <li>
            <strong>3.</strong> Highest sum wins the duel. First team to clear wins the match.
          </li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Why people stick</h2>
        <div style={styles.grid3}>
          <div style={styles.card}>
            <h3 style={styles.h3}>Stream-ready</h3>
            <p>Zero setup. Share link, press play, chaos ensues.</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.h3}>Party-friendly</h3>
            <p>Quick rounds, loud reveals, instant drama. Great on TV.</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.h3}>Skill + luck</h3>
            <p>Bluff, allocate power-ups, and pray to RNGesus.</p>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>For communities</h2>
        <p>
          Weekly seeds, challenge links, and simple leaderboards. Want a banner or
          custom card backs for your org? Email
          {' '}
          <a href="mailto:mactrungkien2000@gmail.com">mactrungkien2000@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '32px 16px 64px'
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    textAlign: 'center'
  },
  badge: {
    background: '#10b981',
    color: 'white',
    borderRadius: 9999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5
  },
  h1: {
    fontSize: 48,
    margin: '8px 0 0'
  },
  tagline: {
    color: '#94a3b8',
    maxWidth: 720
  },
  ctaRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8
  },
  ctaPrimary: {
    background: '#0ea5e9',
    color: 'white',
    textDecoration: 'none',
    padding: '12px 16px',
    borderRadius: 10,
    fontWeight: 700
  },
  ctaSecondary: {
    background: 'transparent',
    color: '#0ea5e9',
    border: '2px solid #0ea5e9',
    textDecoration: 'none',
    padding: '10px 14px',
    borderRadius: 10,
    fontWeight: 700
  },
  mediaFrame: {
    width: '100%',
    maxWidth: 960,
    marginTop: 16,
    border: '1px solid rgba(148,163,184,0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(2,6,23,0.2)'
  },
  socialRow: {
    marginTop: 8,
    color: '#94a3b8'
  },
  section: {
    marginTop: 56
  },
  h2: {
    fontSize: 28,
    marginBottom: 12
  },
  featureList: {
    display: 'grid',
    gap: 8,
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  grid3: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
  },
  card: {
    border: '1px solid rgba(148,163,184,0.2)',
    borderRadius: 10,
    padding: 16
  },
  h3: {
    marginTop: 0,
    marginBottom: 8
  }
};


