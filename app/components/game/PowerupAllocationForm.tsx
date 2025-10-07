import { PowerUpsAllocation } from '~/hooks/usePowerupAllocation';
import TeamData from '~/models/TeamData';
import { PowerupInputRow } from './PowerupInputRow';

interface PowerupAllocationFormProps {
  teamData: TeamData;
  allocation: PowerUpsAllocation;
  onChange: (allocation: PowerUpsAllocation) => void;
  teamClass: string;
  showTeamName?: boolean;
  isRandom?: boolean;
}

export const PowerupAllocationForm = ({
  teamData,
  allocation,
  onChange,
  teamClass,
  showTeamName = true,
  isRandom = false,
}: PowerupAllocationFormProps) => {
  const updateAllocation = (key: keyof PowerUpsAllocation, value: number) => {
    onChange({
      ...allocation,
      [key]: Math.max(0, Math.min(teamData.totalPowerUps, value))
    });
  };

  const total = allocation.secondChance + allocation.revealTwo + allocation.lifeShield + allocation.lockAll + allocation.removeWorst;
  const isTotalValid = total === teamData.totalPowerUps;

  return (
    <div className="setup-card">
      {showTeamName && (
        <h3 className={`teamName ${teamClass}`} style={{ marginTop: 0 }}>
          {teamData.name}
        </h3>
      )}
      <PowerupInputRow
        label="Second Chance"
        icon="chance_second.png"
        id={`${teamClass}-second`}
        value={allocation.secondChance}
        onChange={(value) => updateAllocation('secondChance', value)}
        isRandom={isRandom}
      />
      <PowerupInputRow
        label="Reveal Two"
        icon="chance_reveal.png"
        id={`${teamClass}-reveal`}
        value={allocation.revealTwo}
        onChange={(value) => updateAllocation('revealTwo', value)}
        isRandom={isRandom}
      />
      <PowerupInputRow
        label="Life Shield"
        icon="chance_shield.png"
        id={`${teamClass}-shield`}
        value={allocation.lifeShield}
        onChange={(value) => updateAllocation('lifeShield', value)}
        isRandom={isRandom}
      />
      <PowerupInputRow
        label="Lock All"
        icon="chance_block.png"
        id={`${teamClass}-lock`}
        value={allocation.lockAll}
        onChange={(value) => updateAllocation('lockAll', value)}
        isRandom={isRandom}
      />
      <PowerupInputRow
        label="Remove Worst"
        icon="chance_remove.png"
        id={`${teamClass}-remove`}
        value={allocation.removeWorst}
        onChange={(value) => updateAllocation('removeWorst', value)}
        isRandom={isRandom}
      />
      <div className="setup-row">
        <strong>Total</strong>
        <strong style={{ color: isTotalValid ? undefined : 'red' }}>
          {total} / {teamData.totalPowerUps}
        </strong>
      </div>
    </div>
  );
};