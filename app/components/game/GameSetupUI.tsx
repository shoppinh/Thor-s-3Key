import { PowerUpsAllocation, SetupMode } from '~/hooks/usePowerupAllocation';
import TeamData from '~/models/TeamData';
import { isStartGameDisabled } from '~/utils/gameUIUtils';
import { PowerupAllocationForm } from './PowerupAllocationForm';

interface GameSetupUIProps {
  gameState: string;
  team1Data: TeamData;
  team2Data: TeamData;
  team1Alloc: PowerUpsAllocation;
  setTeam1Alloc: React.Dispatch<React.SetStateAction<PowerUpsAllocation>>;
  team2Alloc: PowerUpsAllocation;
  setTeam2Alloc: React.Dispatch<React.SetStateAction<PowerUpsAllocation>>;
  setupMode: SetupMode;
  setSetupMode: (mode: SetupMode) => void;
  setupForBothTeams: boolean;
  setSetupForBothTeams: (value: boolean) => void;
  randomizeBothTeamsAllocation: () => void;
  sheetId: string;
  setSheetId: (value: string) => void;
  sheetRange: string;
  setSheetRange: (value: string) => void;
  startGame: () => void;
  setIsPowerupGuideOpen: (value: boolean) => void;
}

export const GameSetupUI = ({
  gameState,
  team1Data,
  team2Data,
  team1Alloc,
  setTeam1Alloc,
  team2Alloc,
  setTeam2Alloc,
  setupMode,
  setSetupMode,
  setupForBothTeams,
  setSetupForBothTeams,
  randomizeBothTeamsAllocation,
  sheetId,
  setSheetId,
  sheetRange,
  setSheetRange,
  startGame,
  setIsPowerupGuideOpen,
}: GameSetupUIProps) => {
  if (gameState !== 'setup' && gameState !== 'gameLoading') {
    return null;
  }

  const handleModeChange = (mode: SetupMode) => {
    setSetupMode(mode);
    if (mode === 'both') {
      setSetupForBothTeams(true);
    } else if (mode === 'random') {
      setSetupForBothTeams(true);
      randomizeBothTeamsAllocation();
    } else {
      setSetupForBothTeams(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 1150,
          alignItems: 'stretch',
          gap: 50,
          padding: 20
        }}
      >
        {/* Left: Setup UI */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              maxWidth: 920,
              margin: '0 0 0 auto'
            }}
          >
            <h2 style={{ textAlign: 'center', marginTop: 0, marginBottom: 0 }}>
              Power-ups Setup
            </h2>
            <SetupModeSelector setupMode={setupMode} onModeChange={handleModeChange} />
            <div
              className="setup-grid"
              style={setupForBothTeams ? { gridTemplateColumns: '1fr', justifyItems: 'center' } : undefined}
            >
              {setupForBothTeams ? (
                <PowerupAllocationForm
                  teamData={team1Data}
                  allocation={team1Alloc}
                  onChange={(allocation) => {
                    // Update both teams with the same allocation
                    setTeam1Alloc(allocation);
                    setTeam2Alloc(allocation);
                  }}
                  teamClass="both"
                  showTeamName={false}
                  isRandom={setupMode === 'random'}
                />
              ) : (
                <>
                  <PowerupAllocationForm
                    teamData={team1Data}
                    allocation={team1Alloc}
                    onChange={setTeam1Alloc}
                    teamClass="team1"
                  />
                  <PowerupAllocationForm
                    teamData={team2Data}
                    allocation={team2Alloc}
                    onChange={setTeam2Alloc}
                    teamClass="team2"
                  />
                </>
              )}
            </div>
            <p className="note" style={{ textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
              Each team must have a total of 4 power-ups, with no more than 2 of the same type.
            </p>
            <div style={{ textAlign: 'center' }}>
              <a
                href="#powerups-guide"
                onClick={(e) => {
                  e.preventDefault();
                  setIsPowerupGuideOpen(true);
                }}
              >
                Power-ups instruction
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#ccc' }} />

        {/* Right: Welcome UI */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <div>
            <h1>Thorlit 3Key</h1>
            <div className={'controlContainer'}>
              <label className={'labelControl'} htmlFor="sheetId">
                Sheet Id
              </label>
              <input
                className={'textControl'}
                id="sheetId"
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                disabled={gameState !== 'setup'}
              />
            </div>
            <div className={'controlContainer'}>
              <label className={'labelControl'} htmlFor="sheetRange">
                Sheet Range
              </label>
              <input
                className={'textControl'}
                id="sheetRange"
                type="text"
                value={sheetRange}
                onChange={(e) => setSheetRange(e.target.value)}
                disabled={gameState !== 'setup'}
              />
            </div>
            <div>
              <button
                onClick={() => startGame()}
                className={'btnStart'}
                disabled={isStartGameDisabled(gameState, team1Alloc, team2Alloc, team1Data, team2Data, setupMode)}
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SetupModeSelectorProps {
  setupMode: SetupMode;
  onModeChange: (mode: SetupMode) => void;
}

const SetupModeSelector = ({ setupMode, onModeChange }: SetupModeSelectorProps) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 6,
        marginBottom: 15
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          id="mode-per-team"
          name="setup-mode"
          type="radio"
          checked={setupMode === 'per-team'}
          onChange={() => onModeChange('per-team')}
        />
        <label htmlFor="mode-per-team">Each team setups their own power-ups</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          id="mode-both"
          name="setup-mode"
          type="radio"
          checked={setupMode === 'both'}
          onChange={() => onModeChange('both')}
        />
        <label htmlFor="mode-both">Setup power-ups for both teams</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          id="mode-random"
          name="setup-mode"
          type="radio"
          checked={setupMode === 'random'}
          onChange={() => onModeChange('random')}
        />
        <label htmlFor="mode-random">Random power-ups for both teams</label>
      </div>
    </div>
  );
};