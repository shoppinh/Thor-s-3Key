import { useLanguage } from '~/contexts/LanguageContext';
import type { TournamentSlot } from '../types';

interface MatchSlotProps {
  slot: TournamentSlot;
  isCurrent: boolean;
  onPlay: () => void;
}

export function MatchSlotView({ slot, isCurrent, onPlay }: MatchSlotProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`tournament-slot ${isCurrent ? 'tournament-slot-current' : ''} ${slot.played ? 'tournament-slot-played' : ''}`}
    >
      <div className="tournament-slot-teams">
        <span className={slot.winner === slot.team1 ? 'tournament-winner' : ''}>
          {slot.team1}
        </span>
        <span className="tournament-vs">vs</span>
        <span className={slot.winner === slot.team2 ? 'tournament-winner' : ''}>
          {slot.team2}
        </span>
      </div>
      {slot.played ? (
        <div className="tournament-slot-result">
          <span>
            {slot.team1Score} - {slot.team2Score}
          </span>
          <span className="tournament-played-label">
            {t('tournament.played')}
          </span>
        </div>
      ) : isCurrent ? (
        <button className="rpg-button" onClick={onPlay}>
          {t('tournament.playMatch')}
        </button>
      ) : null}
    </div>
  );
}
