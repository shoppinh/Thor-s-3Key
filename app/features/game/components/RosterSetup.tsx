import { type DragEvent, useState } from 'react';
import type { TeamName } from '~/features/game/types/gameTypes';
import type { SetupRosters } from '~/features/game/services/rosterSetup';

type DragPayload = {
  team: TeamName;
  index: number;
};

type RosterSetupProps = SetupRosters & {
  team1Name: string;
  team2Name: string;
  isLoading: boolean;
  errors: string[];
  onAddMember: (team: TeamName, name: string) => void;
  onRemoveMember: (team: TeamName, index: number) => void;
  onMoveMember: (
    fromTeam: TeamName,
    fromIndex: number,
    toTeam: TeamName,
    toIndex: number
  ) => void;
};

const teamLabels: Record<TeamName, 'team1' | 'team2'> = {
  team1: 'team1',
  team2: 'team2'
};

export function RosterSetup({
  team1,
  team2,
  team1Name,
  team2Name,
  isLoading,
  errors,
  onAddMember,
  onRemoveMember,
  onMoveMember
}: RosterSetupProps) {
  const [newMemberNames, setNewMemberNames] = useState<
    Record<TeamName, string>
  >({
    team1: '',
    team2: ''
  });

  const submitMember = (team: TeamName) => {
    const name = newMemberNames[team];
    onAddMember(team, name);
    setNewMemberNames((prev) => ({ ...prev, [team]: '' }));
  };

  const handleDrop = (
    event: DragEvent<HTMLLIElement | HTMLOListElement>,
    toTeam: TeamName,
    toIndex: number
  ) => {
    event.preventDefault();
    const rawPayload = event.dataTransfer.getData('application/json');
    if (!rawPayload) return;

    const payload = JSON.parse(rawPayload) as DragPayload;
    onMoveMember(payload.team, payload.index, toTeam, toIndex);
  };

  const renderTeam = (team: TeamName, roster: string[], title: string) => (
    <section className={`roster-card roster-card--${teamLabels[team]}`}>
      <div className="roster-card__header">
        <h3>{title}</h3>
        <span>{roster.length}</span>
      </div>

      <ol
        className="roster-list"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, team, roster.length)}
      >
        {roster.map((member, index) => (
          <li
            className="roster-member"
            draggable={!isLoading}
            key={`${team}-${member}-${index}`}
            onDragStart={(event) => {
              event.dataTransfer.setData(
                'application/json',
                JSON.stringify({ team, index } satisfies DragPayload)
              );
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, team, index)}
          >
            <button
              aria-label={`Drag ${member}`}
              className="roster-member__handle"
              disabled={isLoading}
              type="button"
            >
              =
            </button>
            <span className="roster-member__position">{index + 1}</span>
            <span className="roster-member__name">{member}</span>
            <div className="roster-member__actions">
              <button
                aria-label={`Move ${member} up`}
                disabled={isLoading || index === 0}
                onClick={() => onMoveMember(team, index, team, index - 1)}
                type="button"
              >
                Up
              </button>
              <button
                aria-label={`Move ${member} down`}
                disabled={isLoading || index === roster.length - 1}
                onClick={() => onMoveMember(team, index, team, index + 1)}
                type="button"
              >
                Down
              </button>
              <button
                aria-label={`Move ${member} to other team`}
                disabled={isLoading}
                onClick={() =>
                  onMoveMember(
                    team,
                    index,
                    team === 'team1' ? 'team2' : 'team1',
                    team === 'team1' ? team2.length : team1.length
                  )
                }
                type="button"
              >
                Move
              </button>
              <button
                aria-label={`Remove ${member}`}
                disabled={isLoading}
                onClick={() => onRemoveMember(team, index)}
                type="button"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>

      <form
        className="roster-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitMember(team);
        }}
      >
        <input
          aria-label={`New member for ${title}`}
          className="rpg-input"
          disabled={isLoading}
          onChange={(event) =>
            setNewMemberNames((prev) => ({
              ...prev,
              [team]: event.target.value
            }))
          }
          type="text"
          value={newMemberNames[team]}
        />
        <button
          className="rpg-button secondary"
          disabled={isLoading}
          type="submit"
        >
          Add
        </button>
      </form>
    </section>
  );

  return (
    <div className="roster-setup">
      <div className="roster-setup__grid">
        {renderTeam('team1', team1, team1Name)}
        {renderTeam('team2', team2, team2Name)}
      </div>

      {errors.length > 0 && (
        <ul className="roster-errors" aria-live="polite">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
