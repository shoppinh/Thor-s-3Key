import { useLanguage } from '~/contexts/LanguageContext';
import type { Bracket } from '../types';
import { MatchSlotView } from './MatchSlot';

interface BracketViewProps {
  bracket: Bracket;
  onPlaySlot: (slotId: string) => void;
  onReset: () => void;
}

export function BracketView({
  bracket,
  onPlaySlot,
  onReset
}: BracketViewProps) {
  const { t } = useLanguage();

  const team1Wins = bracket.slots.filter(
    (s) => s.played && s.winner === bracket.config.teamNames[0]
  ).length;
  const team2Wins = bracket.slots.filter(
    (s) => s.played && s.winner === bracket.config.teamNames[1]
  ).length;

  return (
    <div className="tournament-bracket">
      <h2
        className="text-glow"
        style={{ textAlign: 'center', color: 'var(--color-primary)' }}
      >
        {bracket.config.teamNames[0]} vs {bracket.config.teamNames[1]}
      </h2>
      <p style={{ textAlign: 'center', color: '#ccc' }}>
        {t('tournament.bestOf')}: {bracket.config.bestOfCount || 1}
      </p>

      {bracket.isComplete && (
        <h3
          className="text-gradient"
          style={{ textAlign: 'center', fontSize: '2rem' }}
        >
          {t('tournament.champion')}: {bracket.champion}
        </h3>
      )}

      <div className="tournament-score-header">
        <span>
          {bracket.config.teamNames[0]}: {team1Wins}
        </span>
        <span>
          {bracket.config.teamNames[1]}: {team2Wins}
        </span>
      </div>

      <div className="tournament-slots">
        {bracket.slots.map((slot, i) => (
          <MatchSlotView
            key={slot.id}
            slot={slot}
            isCurrent={!bracket.isComplete && i === bracket.currentSlotIndex}
            onPlay={() => onPlaySlot(slot.id)}
          />
        ))}
      </div>

      {bracket.isComplete && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="rpg-button secondary" onClick={onReset}>
            {t('game.returnHome')}
          </button>
        </div>
      )}
    </div>
  );
}
