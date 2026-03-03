import { CSSProperties } from 'react';
import { PowerUpsAllocation, SetupMode } from '~/features/game/types/gameTypes';
import { TeamData } from '~/models/TeamData';

type AllocationKey = keyof PowerUpsAllocation;
type Language = 'en' | 'vi';

type TranslateFn = (key: string) => string;

type ModeSelectorProps = {
  setupMode: SetupMode;
  t: TranslateFn;
  onPerTeamMode: () => void;
  onBothMode: () => void;
  onRandomEachMode: () => void;
  onRandomMode: () => void;
};

type AllocationCardProps = {
  title?: string;
  titleClassName?: string;
  alloc: PowerUpsAllocation;
  totalPowerUps: number;
  randomMode: 'none' | 'question';
  idPrefix: string;
  t: TranslateFn;
  onChange: (key: AllocationKey, value: number) => void;
};

type SetupPanelProps = {
  setupMode: SetupMode;
  setupForBothTeams: boolean;
  team1Data: TeamData;
  team2Data: TeamData;
  team1Alloc: PowerUpsAllocation;
  team2Alloc: PowerUpsAllocation;
  t: TranslateFn;
  onPerTeamMode: () => void;
  onBothMode: () => void;
  onRandomEachMode: () => void;
  onRandomMode: () => void;
  onSetBothTeamsAlloc: (key: AllocationKey, value: number) => void;
  onSetTeam1Alloc: (key: AllocationKey, value: number) => void;
  onSetTeam2Alloc: (key: AllocationKey, value: number) => void;
  onOpenPowerupGuide: () => void;
};

type WelcomePanelProps = {
  language: Language;
  gameState: 'setup' | 'gameLoading';
  sheetId: string;
  sheetRange: string;
  t: TranslateFn;
  onSetLanguage: (language: Language) => void;
  onSetSheetId: (sheetId: string) => void;
  onSetSheetRange: (sheetRange: string) => void;
  onStartGame: () => void;
  isStartGameDisabled: boolean;
};

type GameSetupScreenProps = {
  gameState: 'setup' | 'gameLoading' | 'gamePlaying' | 'gameOver';
  setupMode: SetupMode;
  setupForBothTeams: boolean;
  team1Data: TeamData;
  team2Data: TeamData;
  team1Alloc: PowerUpsAllocation;
  team2Alloc: PowerUpsAllocation;
  language: Language;
  sheetId: string;
  sheetRange: string;
  t: TranslateFn;
  onSetLanguage: (language: Language) => void;
  onSetSheetId: (sheetId: string) => void;
  onSetSheetRange: (sheetRange: string) => void;
  onStartGame: () => void;
  isStartGameDisabled: boolean;
  onPerTeamMode: () => void;
  onBothMode: () => void;
  onRandomEachMode: () => void;
  onRandomMode: () => void;
  onSetBothTeamsAlloc: (key: AllocationKey, value: number) => void;
  onSetTeam1Alloc: (key: AllocationKey, value: number) => void;
  onSetTeam2Alloc: (key: AllocationKey, value: number) => void;
  onOpenPowerupGuide: () => void;
};

const INPUT_STYLE: CSSProperties = {
  width: '20px',
  height: '20px',
  accentColor: 'var(--color-primary)',
  cursor: 'pointer'
};

const LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '1.1rem',
  cursor: 'pointer'
};

function renderLabelWithIcon(
  labelText: string,
  imageFileName: string,
  htmlFor: string
) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img
        src={`/images/${imageFileName}`}
        alt=""
        width={22}
        height={22}
        style={{ display: 'inline-block' }}
      />
      <span>{labelText}</span>
    </label>
  );
}

function SetupModeSelector({
  setupMode,
  t,
  onPerTeamMode,
  onBothMode,
  onRandomEachMode,
  onRandomMode
}: ModeSelectorProps) {
  return (
    <div
      className="rpg-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        marginTop: 6,
        marginBottom: 15,
        padding: '20px',
        background: 'rgba(15, 12, 41, 0.8)',
        border: '2px solid var(--color-secondary)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          id="mode-per-team"
          name="setup-mode"
          type="radio"
          checked={setupMode === 'per-team'}
          onChange={onPerTeamMode}
          style={INPUT_STYLE}
        />
        <label
          htmlFor="mode-per-team"
          style={{
            ...LABEL_STYLE,
            color: setupMode === 'per-team' ? 'var(--color-primary)' : '#fff'
          }}
        >
          {t('game.eachTeamSetup')}
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          id="mode-both"
          name="setup-mode"
          type="radio"
          checked={setupMode === 'both'}
          onChange={onBothMode}
          style={INPUT_STYLE}
        />
        <label
          htmlFor="mode-both"
          style={{
            ...LABEL_STYLE,
            color: setupMode === 'both' ? 'var(--color-primary)' : '#fff'
          }}
        >
          {t('game.setupBothTeams')}
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          id="mode-random-each"
          name="setup-mode"
          type="radio"
          checked={setupMode === 'random-each'}
          onChange={onRandomEachMode}
          style={INPUT_STYLE}
        />
        <label
          htmlFor="mode-random-each"
          style={{
            ...LABEL_STYLE,
            color: setupMode === 'random-each' ? 'var(--color-primary)' : '#fff'
          }}
        >
          {t('game.generateSeparate')}
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          id="mode-random"
          name="setup-mode"
          type="radio"
          checked={setupMode === 'random'}
          onChange={onRandomMode}
          style={INPUT_STYLE}
        />
        <label
          htmlFor="mode-random"
          style={{
            ...LABEL_STYLE,
            color: setupMode === 'random' ? 'var(--color-primary)' : '#fff'
          }}
        >
          {t('game.randomBoth')}
        </label>
      </div>
    </div>
  );
}

const POWER_UP_FIELDS: Array<{
  key: AllocationKey;
  labelKey: string;
  icon: string;
  inputSuffix: string;
}> = [
  {
    key: 'secondChance',
    labelKey: 'game.secondChance',
    icon: 'chance_second.png',
    inputSuffix: 'second'
  },
  {
    key: 'revealTwo',
    labelKey: 'game.revealTwo',
    icon: 'chance_reveal.png',
    inputSuffix: 'reveal'
  },
  {
    key: 'lifeShield',
    labelKey: 'game.lifeShield',
    icon: 'chance_shield.png',
    inputSuffix: 'shield'
  },
  {
    key: 'removeWorst',
    labelKey: 'game.removeWorst',
    icon: 'chance_remove.png',
    inputSuffix: 'remove'
  }
];

function PowerUpAllocationCard({
  title,
  titleClassName,
  alloc,
  totalPowerUps,
  randomMode,
  idPrefix,
  t,
  onChange
}: AllocationCardProps) {
  const total =
    alloc.secondChance + alloc.revealTwo + alloc.lifeShield + alloc.removeWorst;

  return (
    <div className="setup-card">
      {title && (
        <h3 className={titleClassName} style={{ marginTop: 0 }}>
          {title}
        </h3>
      )}

      {POWER_UP_FIELDS.map((field) => {
        const inputId = `${idPrefix}-${field.inputSuffix}`;

        return (
          <div className="setup-row" key={field.key}>
            {renderLabelWithIcon(t(field.labelKey), field.icon, inputId)}
            {randomMode === 'question' ? (
              <strong>?</strong>
            ) : (
              <input
                className="num-input"
                style={alloc[field.key] > 2 ? { borderColor: 'red' } : undefined}
                type="number"
                min={0}
                max={2}
                id={inputId}
                value={alloc[field.key]}
                onChange={(e) => onChange(field.key, Number(e.target.value))}
              />
            )}
          </div>
        );
      })}

      <div className="setup-row">
        <strong>{t('game.total')}</strong>
        <strong style={{ color: total !== totalPowerUps ? 'red' : undefined }}>
          {total} / {totalPowerUps}
        </strong>
      </div>
    </div>
  );
}

function SetupPanel({
  setupMode,
  setupForBothTeams,
  team1Data,
  team2Data,
  team1Alloc,
  team2Alloc,
  t,
  onPerTeamMode,
  onBothMode,
  onRandomEachMode,
  onRandomMode,
  onSetBothTeamsAlloc,
  onSetTeam1Alloc,
  onSetTeam2Alloc,
  onOpenPowerupGuide
}: SetupPanelProps) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ maxWidth: 920, margin: '0 0 0 auto' }}>
        <h2
          className="text-glow"
          style={{
            textAlign: 'center',
            marginTop: 0,
            marginBottom: '20px',
            fontSize: '2.5rem',
            color: 'var(--color-primary)',
            letterSpacing: '3px'
          }}
        >
          {t('game.powerUpsSetup')}
        </h2>

        <SetupModeSelector
          setupMode={setupMode}
          t={t}
          onPerTeamMode={onPerTeamMode}
          onBothMode={onBothMode}
          onRandomEachMode={onRandomEachMode}
          onRandomMode={onRandomMode}
        />

        <div
          className="setup-grid"
          style={
            setupForBothTeams
              ? { gridTemplateColumns: '1fr', justifyItems: 'center' }
              : undefined
          }
        >
          {setupForBothTeams ? (
            <PowerUpAllocationCard
              alloc={team1Alloc}
              totalPowerUps={team1Data.totalPowerUps}
              randomMode={setupMode === 'random' ? 'question' : 'none'}
              idPrefix="both"
              t={t}
              onChange={onSetBothTeamsAlloc}
            />
          ) : (
            <>
              <PowerUpAllocationCard
                title={team1Data.name}
                titleClassName="teamName team1"
                alloc={team1Alloc}
                totalPowerUps={team1Data.totalPowerUps}
                randomMode={setupMode === 'random-each' ? 'question' : 'none'}
                idPrefix="t1"
                t={t}
                onChange={onSetTeam1Alloc}
              />
              <PowerUpAllocationCard
                title={team2Data.name}
                titleClassName="teamName team2"
                alloc={team2Alloc}
                totalPowerUps={team2Data.totalPowerUps}
                randomMode={setupMode === 'random-each' ? 'question' : 'none'}
                idPrefix="t2"
                t={t}
                onChange={onSetTeam2Alloc}
              />
            </>
          )}
        </div>

        <p
          className="note"
          style={{
            textAlign: 'center',
            marginTop: 10,
            marginBottom: 10,
            color: 'var(--color-secondary)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem'
          }}
        >
          {t('game.note')}
        </p>

        <div style={{ textAlign: 'center' }}>
          <a
            href="#powerups-guide"
            onClick={(e) => {
              e.preventDefault();
              onOpenPowerupGuide();
            }}
            style={{
              color: 'var(--color-accent)',
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              textShadow: '0 0 5px var(--color-accent)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textShadow = '0 0 15px var(--color-accent)';
              e.currentTarget.style.letterSpacing = '1px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textShadow = '0 0 5px var(--color-accent)';
              e.currentTarget.style.letterSpacing = '0px';
            }}
          >
            {t('game.powerUpsGuide')}
          </a>
        </div>
      </div>
    </div>
  );
}

function WelcomePanel({
  language,
  gameState,
  sheetId,
  sheetRange,
  t,
  onSetLanguage,
  onSetSheetId,
  onSetSheetRange,
  onStartGame,
  isStartGameDisabled
}: WelcomePanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: '',
        justifyContent: 'flex-start',
        padding: '0 20px'
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h1
          className="text-gradient"
          style={{
            fontSize: '3rem',
            margin: '0 0 10px 0',
            textAlign: 'center',
            letterSpacing: '2px'
          }}
        >
          THOR&apos;S 3KEY
        </h1>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}
        >
          <button
            onClick={() => onSetLanguage('en')}
            style={{
              background:
                language === 'en'
                  ? 'var(--color-primary)'
                  : 'rgba(255,255,255,0.1)',
              border: '1px solid var(--color-primary)',
              color: '#fff',
              padding: '5px 10px',
              cursor: 'pointer',
              borderRadius: '4px',
              fontWeight: language === 'en' ? 'bold' : 'normal'
            }}
          >
            EN
          </button>
          <button
            onClick={() => onSetLanguage('vi')}
            style={{
              background:
                language === 'vi'
                  ? 'var(--color-primary)'
                  : 'rgba(255,255,255,0.1)',
              border: '1px solid var(--color-primary)',
              color: '#fff',
              padding: '5px 10px',
              cursor: 'pointer',
              borderRadius: '4px',
              fontWeight: language === 'vi' ? 'bold' : 'normal'
            }}
          >
            VI
          </button>
        </div>

        <div
          className="rpg-panel"
          style={{
            padding: '20px',
            background: 'var(--color-panel-bg)',
            border: '2px solid var(--color-secondary)',
            marginBottom: '20px'
          }}
        >
          <label
            className="text-glow"
            htmlFor="sheetId"
            style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--color-secondary)',
              fontSize: '1.1rem',
              fontFamily: 'var(--font-body)',
              letterSpacing: '1px'
            }}
          >
            {t('game.sheetId')}
          </label>
          <input
            className="rpg-input"
            id="sheetId"
            type="text"
            value={sheetId}
            onChange={(e) => onSetSheetId(e.target.value)}
            disabled={gameState !== 'setup'}
            style={{
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid var(--color-secondary)',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)',
              borderRadius: '4px',
              boxShadow: '0 0 10px rgba(0, 242, 255, 0.3)',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        <div
          className="rpg-panel"
          style={{
            padding: '20px',
            background: 'var(--color-panel-bg)',
            border: '2px solid var(--color-secondary)',
            marginBottom: '30px'
          }}
        >
          <label
            className="text-glow"
            htmlFor="sheetRange"
            style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--color-secondary)',
              fontSize: '1.1rem',
              fontFamily: 'var(--font-body)',
              letterSpacing: '1px'
            }}
          >
            {t('game.sheetRange')}
          </label>
          <input
            className="rpg-input"
            id="sheetRange"
            type="text"
            value={sheetRange}
            onChange={(e) => onSetSheetRange(e.target.value)}
            disabled={gameState !== 'setup'}
            style={{
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid var(--color-secondary)',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)',
              borderRadius: '4px',
              boxShadow: '0 0 10px rgba(0, 242, 255, 0.3)',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        <p
          style={{
            marginTop: 0,
            marginBottom: '20px',
            color: 'var(--color-secondary)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            textAlign: 'left'
          }}
        >
          Team columns are loaded from the selected sheet range (A=Team 1, B=Team
          2, C+=queued challengers).
        </p>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onStartGame}
            className="rpg-button"
            disabled={isStartGameDisabled}
            style={{
              width: '100%',
              padding: '15px 30px',
              fontSize: '1.5rem',
              letterSpacing: '2px',
              background: isStartGameDisabled ? '#333' : 'var(--color-primary)',
              cursor: isStartGameDisabled ? 'not-allowed' : 'pointer',
              opacity: isStartGameDisabled ? 0.5 : 1
            }}
          >
            {t('common.startGame')}
          </button>
        </div>
      </div>
    </div>
  );
}

const GameSetupScreen = ({
  gameState,
  setupMode,
  setupForBothTeams,
  team1Data,
  team2Data,
  team1Alloc,
  team2Alloc,
  language,
  sheetId,
  sheetRange,
  t,
  onSetLanguage,
  onSetSheetId,
  onSetSheetRange,
  onStartGame,
  isStartGameDisabled,
  onPerTeamMode,
  onBothMode,
  onRandomEachMode,
  onRandomMode,
  onSetBothTeamsAlloc,
  onSetTeam1Alloc,
  onSetTeam2Alloc,
  onOpenPowerupGuide
}: GameSetupScreenProps) => {
  if (gameState !== 'setup' && gameState !== 'gameLoading') {
    return null;
  }

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
        <SetupPanel
          setupMode={setupMode}
          setupForBothTeams={setupForBothTeams}
          team1Data={team1Data}
          team2Data={team2Data}
          team1Alloc={team1Alloc}
          team2Alloc={team2Alloc}
          t={t}
          onPerTeamMode={onPerTeamMode}
          onBothMode={onBothMode}
          onRandomEachMode={onRandomEachMode}
          onRandomMode={onRandomMode}
          onSetBothTeamsAlloc={onSetBothTeamsAlloc}
          onSetTeam1Alloc={onSetTeam1Alloc}
          onSetTeam2Alloc={onSetTeam2Alloc}
          onOpenPowerupGuide={onOpenPowerupGuide}
        />

        <div
          style={{
            width: 2,
            background:
              'linear-gradient(180deg, transparent, var(--color-secondary), transparent)'
          }}
        />

        <WelcomePanel
          language={language}
          gameState={gameState}
          sheetId={sheetId}
          sheetRange={sheetRange}
          t={t}
          onSetLanguage={onSetLanguage}
          onSetSheetId={onSetSheetId}
          onSetSheetRange={onSetSheetRange}
          onStartGame={onStartGame}
          isStartGameDisabled={isStartGameDisabled}
        />
      </div>
    </div>
  );
};

export default GameSetupScreen;
