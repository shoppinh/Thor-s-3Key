import { useState } from 'react';
import { useLanguage } from '~/contexts/LanguageContext';
import type { TournamentConfig } from '../types';

interface TournamentSetupProps {
  onStart: (config: TournamentConfig) => void;
}

export function TournamentSetup({ onStart }: TournamentSetupProps) {
  const { t } = useLanguage();
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [bestOf, setBestOf] = useState(3);

  const handleStart = () => {
    onStart({
      format: 'single-elim',
      bestOfCount: bestOf,
      teamNames: [team1Name || 'Team 1', team2Name || 'Team 2']
    });
  };

  return (
    <div className="tournament-setup">
      <h2
        className="text-glow"
        style={{ textAlign: 'center', color: 'var(--color-primary)' }}
      >
        {t('tournament.title')}
      </h2>
      <div className="rpg-panel tournament-setup-form">
        <div className="tournament-field">
          <label>{t('tournament.team1Name')}</label>
          <input
            className="rpg-input"
            value={team1Name}
            onChange={(e) => setTeam1Name(e.target.value)}
          />
        </div>
        <div className="tournament-field">
          <label>{t('tournament.team2Name')}</label>
          <input
            className="rpg-input"
            value={team2Name}
            onChange={(e) => setTeam2Name(e.target.value)}
          />
        </div>
        <div className="tournament-field">
          <label>{t('tournament.bestOf')}</label>
          <select
            className="rpg-input"
            value={bestOf}
            onChange={(e) => setBestOf(Number(e.target.value))}
          >
            <option value={1}>{t('tournament.singleMatch')}</option>
            <option value={3}>Bo3</option>
            <option value={5}>Bo5</option>
            <option value={7}>Bo7</option>
          </select>
        </div>
        <button
          className="rpg-button"
          onClick={handleStart}
          style={{ width: '100%' }}
        >
          {t('tournament.startTournament')}
        </button>
      </div>
    </div>
  );
}
