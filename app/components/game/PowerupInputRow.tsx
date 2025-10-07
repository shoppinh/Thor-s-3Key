import { renderLabelWithIcon } from '~/utils/gameUIUtils';

interface PowerupInputRowProps {
  label: string;
  icon: string;
  id: string;
  value: number;
  onChange: (value: number) => void;
  isRandom?: boolean;
}

export const PowerupInputRow = ({
  label,
  icon,
  id,
  value,
  onChange,
  isRandom = false,
}: PowerupInputRowProps) => {
  return (
    <div className="setup-row">
      {renderLabelWithIcon(label, icon, id)}
      {isRandom ? (
        <strong>?</strong>
      ) : (
        <input
          className="num-input"
          style={value > 2 ? { borderColor: 'red' } : undefined}
          type="number"
          min={0}
          max={2}
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </div>
  );
};