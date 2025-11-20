import { useMemo } from 'react';
import ShareButtons from '~/components/ShareButtons';
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
      <div style={styles.overlay} />
      
      <section style={styles.hero}>        
        <h1 className="text-glow" style={styles.h1}>THOR'S 3KEY</h1>
        <p style={styles.tagline}>
          CHAOTIC TEAM CARD BATTLES // POWER-UPS // RNG GLORY
        </p>
        
        <div style={styles.ctaRow}>
          <a href={ctaHref} className="rpg-button" style={styles.ctaPrimary}>
            START GAME
          </a>          
        </div>

        <div className="rpg-panel" style={styles.mediaFrame}>
          <img
            src="/images/the-end.webp"
            alt="Gameplay screenshot"
            style={{ width: '100%', display: 'block', opacity: 0.8 }}
            loading="lazy"
          />
          <div style={styles.scanline} />
        </div>

        <div style={styles.socialRow}>
          <a 
            href="https://twitter.com/intent/tweet?text=Playing%20Thor%27s%203Key%20now&url=" 
            target="_blank" 
            rel="noreferrer"
            style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 'bold' }}
          >
            [ POST YOUR RUN ]
          </a>
        </div>
      </section>

      <section id="how" style={styles.section}>
        <h2 className="text-glow" style={styles.h2}>SYSTEM GUIDE</h2>
        <div style={styles.featureGrid}>
          <div className="rpg-skewed" style={styles.featureCard}>
            <strong style={{ color: 'var(--color-primary)', fontSize: '24px' }}>01</strong>
            <p>LOAD PLAYERS FROM DATABASE</p>
          </div>
          <div className="rpg-skewed" style={styles.featureCard}>
            <strong style={{ color: 'var(--color-secondary)', fontSize: '24px' }}>02</strong>
            <p>DRAW CARDS & ACTIVATE SKILLS</p>
          </div>
          <div className="rpg-skewed" style={styles.featureCard}>
            <strong style={{ color: 'var(--color-accent)', fontSize: '24px' }}>03</strong>
            <p>HIGHEST SUM DOMINATES</p>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 className="text-glow" style={styles.h2}>WHY PLAY?</h2>
        <div style={styles.grid3}>
          <div className="rpg-panel" style={styles.card}>
            <h3 style={styles.h3}>STREAM READY</h3>
            <p>Zero setup. Share link. Chaos ensues.</p>
          </div>
          <div className="rpg-panel" style={styles.card}>
            <h3 style={styles.h3}>PARTY FRIENDLY</h3>
            <p>Quick rounds. Loud reveals. Instant drama.</p>
          </div>
          <div className="rpg-panel" style={styles.card}>
            <h3 style={styles.h3}>SKILL + LUCK</h3>
            <p>Bluff, allocate power-ups, pray to RNG.</p>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 className="text-glow" style={styles.h2}>COMMUNITY</h2>
        <p style={{ color: '#ccc' }}>
          Weekly seeds, challenge links, and simple leaderboards. 
          <br />
          <a href="mailto:mactrungkien2000@gmail.com" style={{ color: 'var(--color-secondary)' }}>
            CONTACT ADMIN
          </a>
        </p>
      </section>
      <ShareButtons siteUrl={typeof window !== 'undefined' ? window.location.origin : ''} />
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '40px 20px 80px',
    position: 'relative',
    zIndex: 1
  },
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'radial-gradient(circle at center, transparent 0%, #000 100%)',
    pointerEvents: 'none',
    zIndex: -1
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    textAlign: 'center',
    marginBottom: 80
  },
  h1: {
    fontSize: 72,
    margin: '0',
    color: '#fff',
    textShadow: '0 0 20px var(--color-primary)',
    letterSpacing: '4px'
  },
  tagline: {
    color: 'var(--color-secondary)',
    fontSize: 18,
    maxWidth: 720,
    margin: 0,
    fontFamily: 'var(--font-body)',
    letterSpacing: '2px'
  },
  ctaRow: {
    display: 'flex',
    gap: 20,
    marginTop: 20
  },
  ctaPrimary: {
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center',
    minWidth: 200
  },
  mediaFrame: {
    width: '100%',
    maxWidth: 800,
    marginTop: 40,
    overflow: 'hidden',
    position: 'relative'
  },
  scanline: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.2) 51%)',
    backgroundSize: '100% 4px',
    pointerEvents: 'none'
  },
  socialRow: {
    marginTop: 20,
    color: '#94a3b8'
  },
  section: {
    marginTop: 80,
    textAlign: 'center'
  },
  h2: {
    fontSize: 36,
    marginBottom: 40,
    color: '#fff'
  },
  featureGrid: {
    display: 'grid',
    gap: 20,
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
  },
  featureCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10
  },
  grid3: {
    display: 'grid',
    gap: 30,
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
  },
  card: {
    padding: 30,
    textAlign: 'left'
  },
  h3: {
    marginTop: 0,
    marginBottom: 15,
    color: 'var(--color-accent)',
    fontSize: 24
  }
};
