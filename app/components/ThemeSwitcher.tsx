import { useLocation } from '@remix-run/react';
import { useTheme } from '~/contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  if (location.pathname !== '/') return null;

  return (
    <button
      onClick={toggleTheme}
      style={styles.button}
      className="theme-switcher"
      aria-label="Toggle Theme"
      title={`Switch to ${theme === 'jrpg' ? 'Christmas' : 'JRPG'} Theme`}
    >
      <span aria-hidden="true">{theme === 'jrpg' ? '🎄' : '⚔️'}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    position: 'fixed',
    bottom: 80,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: '50%',
    background: 'var(--color-panel-bg)',
    border: '2px solid var(--color-secondary)',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    transition: 'all 0.3s ease'
  }
};
