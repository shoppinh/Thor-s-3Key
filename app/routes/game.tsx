import { useOutletContext } from '@remix-run/react';
import { useEffect, useMemo } from 'react';
import { useLanguage } from '~/contexts/LanguageContext';
import { getSupabaseClient } from '~/lib/supabase';
import { useTheme } from '~/contexts/ThemeContext';
import GameArenaScreen from '~/features/game/components/GameArenaScreen';
import GameOverScreen from '~/features/game/components/GameOverScreen';
import WinnerAnnouncement from '~/features/game/components/WinnerAnnouncement';
import { RosterSetup } from '~/features/game/components/RosterSetup';
import {
  getThemeExtraCardBacks,
  preloadGameImages
} from '~/features/game/services/assetService';
import { PlayerData } from '~/models/PlayerData';
import { getCardImage } from '~/utils/gameUtil';
import useNavigationGuard from '~/utils/hooks/useNavigationGuard';
import ConfirmPopup from '../components/ConfirmPopup';
import PowerupGuideModal from '../components/PowerupGuideModal';
import Card from '../models/Card';

import { useGameStore } from '~/features/game/state/gameStore';
import { SupabaseMatchRepository } from '~/features/game/services/supabaseMatchRepository';
import { GoogleSheetsRosterLoader } from '~/features/game/services/googleSheetsRosterLoader';
import { validateRosterSetup } from '~/features/game/services/rosterSetup';
import { isStartGameDisabledByAllocation } from '~/features/game/engine/powerupAllocation';
import { calculateDuelEquity } from '~/features/game/engine/equityEngine';

type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const CardGame = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const clientSecrets = useOutletContext<RootContext>();

  const matchRepository = useMemo(() => {
    const url = clientSecrets?.SUPABASE_URL;
    const key = clientSecrets?.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return new SupabaseMatchRepository(getSupabaseClient(url, key));
  }, [clientSecrets]);

  const rosterLoader = useMemo(() => {
    return new GoogleSheetsRosterLoader(clientSecrets?.API_KEY ?? '');
  }, [clientSecrets]);

  const initialize = useGameStore((state) => state.initialize);

  useEffect(() => {
    if (rosterLoader) {
      initialize({ matchRepository, rosterLoader, t });
    }
  }, [initialize, matchRepository, rosterLoader, t]);

  const {
    sheetId,
    sheetRange,
    setupTeam1Roster,
    setupTeam2Roster,
    isRosterLoading,
    rosterLoadError,
    setupForBothTeams,
    setupMode,
    undoEnabled,
    redoEnabled,
    aiEnabled,
    team1Data,
    team2Data,
    duelData,
    teamWinner,
    duelResult,
    isFirstTurn,
    gameState,
    saveStatus,
    showWinnerAnnouncement,
    team1Alloc,
    team2Alloc,
    confirmPopup,
    isPowerupGuideOpen,
    historyStack,
    redoStack,

    setSheetId,
    setSheetRange,
    setSetupMode,
    setSetupForBothTeams,
    setUndoEnabled,
    setRedoEnabled,
    setAiEnabled,
    setPowerupGuideOpen,
    setGameState,
    addSetupRosterMember,
    removeSetupRosterMember,
    moveSetupRosterMember,
    shuffleSetupRoster,
    loadRoster,
    setAlloc,
    randomizeBothAlloc,
    randomizeEachAlloc,
    startGame: triggerStartGameStore,
    nextRound,
    playerSelect,
    handleAiPick,
    handleChanceClick,
    handleConfirmChance,
    handleCancelChance,
    undoLastAction,
    redoLastAction,
    performSave
  } = useGameStore();

  const canUndo = undoEnabled && historyStack.length > 0;
  const canRedo = undoEnabled && redoEnabled && redoStack.length > 0;

  const shouldGuardNavigation = gameState === 'gamePlaying';
  useNavigationGuard(shouldGuardNavigation, t('game.navigationWarning'));

  const rosterValidation = useMemo(
    () => validateRosterSetup(setupTeam1Roster, setupTeam2Roster),
    [setupTeam1Roster, setupTeam2Roster]
  );

  const rosterErrors = [
    ...(rosterLoadError ? [t('game.rosterLoadFailed')] : []),
    ...rosterValidation.errors.map((error) => {
      if (error === 'Each team must have at least one member.') {
        return t('game.rosterTeamEmpty');
      }
      if (error === 'Member names cannot be blank.') {
        return t('game.rosterBlankName');
      }
      if (error === 'Member names must be unique across both teams.') {
        return t('game.rosterDuplicateName');
      }
      return error;
    })
  ];

  const startGame = async () => {
    if (!rosterValidation.isValid) {
      return;
    }

    setGameState('gameLoading');
    try {
      await preloadGameImages(getThemeExtraCardBacks(theme));
    } catch (error) {
      setGameState('setup');
      console.error('Error preloading images:', error);
      return;
    }

    triggerStartGameStore();
  };

  const isPlayerCardDrawerDisabled = (playerData: PlayerData) => {
    if (duelData.isFinishDuel) {
      return true;
    }
    if (playerData.cards.length === 0) {
      return false;
    }
    if (playerData.name === '?' && playerData.team === '') {
      return false;
    }
    return true;
  };


  /**
   * Renders the cards with optional click functionality
   * @param cards - Array of cards to render
   * @param onCardClick - Optional click handler for card images
   * @param disabled - Whether card clicks are disabled
   * @returns React elements for the cards
   */
  const renderTheCards = (
    cards: Card[],
    onCardClick?: () => void,
    disabled?: boolean
  ) => {
    return cards.map((card, index) => (
      <img
        key={index}
        src={getCardImage(card.value, card.suit, theme)}
        alt={`${card.value}${card.suit}`}
        style={{
          width: '150px',
          cursor: onCardClick && !disabled ? 'pointer' : 'default'
        }}
        role={onCardClick && !disabled ? 'button' : undefined}
        tabIndex={onCardClick && !disabled ? 0 : undefined}
        onClick={onCardClick && !disabled ? onCardClick : undefined}
        onKeyDown={
          onCardClick && !disabled
            ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick();
              }
            }
            : undefined
        }
      />
    ));
  };

  /**
   * Determines whether the "Start Game" button should be disabled.
   *
   * Rules:
   * - Disabled while the app is loading data (gameState is 'gameLoading').
   * - If both teams already have players, then each team's allocated power-ups
   *   must exactly equal their `totalPowerUps`. If either team does not match,
   *   the button is disabled.
   * - If players are not loaded yet, the button remains enabled to allow
   *   kicking off the sheet loading.
   *
   * @returns true if the button should be disabled; otherwise false
   */
  const isStartGameDisabled = (): boolean => {
    return (
      isRosterLoading ||
      !rosterValidation.isValid ||
      isStartGameDisabledByAllocation({
        gameState,
        setupMode,
        team1Alloc,
        team2Alloc,
        team1Total: team1Data.totalPowerUps,
        team2Total: team2Data.totalPowerUps
      })
    );
  };



  /**
   * Renders a label with a small preview icon positioned to the left of the text.
   * Used in the combined 'setup' screen for power-up labels.
   *
   * @param labelText - The text content of the label
   * @param imageFileName - The image file name in `/public/images`, e.g. `chance_second.png`
   * @param htmlFor - The input id this label is associated with
   */
  const renderLabelWithIcon = (
    labelText: string,
    imageFileName: string,
    htmlFor: string
  ) => {
    return (
      <label
        htmlFor={htmlFor}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
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
  };

  /**
   * Renders the combined Welcome (right) and Setup (left) UI in a two-column layout
   * with a gray vertical divider in the middle. Visible during 'setup' and 'gameLoading'.
   */
  function renderGameInput() {
    return (
      <>
        {(gameState === 'setup' || gameState === 'gameLoading') && (
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
                maxWidth: 1600,
                alignItems: 'stretch',
                gap: 50,
                padding: 20
              }}
            >
              {/* Left: Setup UI */}
              <div style={{ flex: 1 }}>
                <div data-summer-wave-safe-bottom>
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
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-per-team"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'per-team'}
                        onChange={() => {
                          setSetupMode('per-team');
                          setSetupForBothTeams(false);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-per-team"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'per-team'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.eachTeamSetup')}
                      </label>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-both"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'both'}
                        onChange={() => {
                          setSetupMode('both');
                          setSetupForBothTeams(true);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-both"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'both'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.setupBothTeams')}
                      </label>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-random-each"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'random-each'}
                        onChange={() => {
                          setSetupMode('random-each');
                          setSetupForBothTeams(false);
                          randomizeEachAlloc();
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-random-each"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'random-each'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.generateSeparate')}
                      </label>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <input
                        id="mode-random"
                        name="setup-mode"
                        type="radio"
                        checked={setupMode === 'random'}
                        onChange={() => {
                          setSetupMode('random');
                          setSetupForBothTeams(true);
                          randomizeBothAlloc();
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor="mode-random"
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color:
                            setupMode === 'random'
                              ? 'var(--color-primary)'
                              : '#fff'
                        }}
                      >
                        {t('game.randomBoth')}
                      </label>
                    </div>
                  </div>
                  <div
                    className="rpg-panel"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 20,
                      marginTop: 6,
                      marginBottom: 15,
                      padding: '16px 20px',
                      background: 'rgba(15, 12, 41, 0.8)',
                      border: '2px solid var(--color-accent)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <label
                        htmlFor="enable-undo"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          color: undoEnabled ? 'var(--color-accent)' : '#fff'
                        }}
                      >
                        <input
                          id="enable-undo"
                          type="checkbox"
                          checked={undoEnabled}
                          onChange={(event) => {
                            setUndoEnabled(event.target.checked);
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            accentColor: 'var(--color-accent)',
                            cursor: 'pointer'
                          }}
                        />
                        {t('game.enableUndo')}
                      </label>
                      <label
                        htmlFor="enable-redo"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontFamily: 'var(--font-body)',
                          fontSize: '1.1rem',
                          cursor: undoEnabled ? 'pointer' : 'not-allowed',
                          color:
                            undoEnabled && redoEnabled
                              ? 'var(--color-accent)'
                              : '#fff',
                          opacity: undoEnabled ? 1 : 0.55
                        }}
                      >
                        <input
                          id="enable-redo"
                          type="checkbox"
                          checked={redoEnabled}
                          disabled={!undoEnabled}
                          onChange={(event) => {
                            setRedoEnabled(event.target.checked);
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            accentColor: 'var(--color-accent)',
                            cursor: undoEnabled ? 'pointer' : 'not-allowed'
                          }}
                        />
                        {t('game.enableRedo')}
                      </label>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        alignItems: 'flex-end'
                      }}
                    >
                      <span
                        style={{
                          color: '#ccc',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.95rem',
                          textAlign: 'right'
                        }}
                      >
                        {t('game.enableUndoHint')}
                      </span>
                      <span
                        style={{
                          color: '#ccc',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.95rem',
                          textAlign: 'right',
                          opacity: undoEnabled ? 1 : 0.55
                        }}
                      >
                        {t('game.enableRedoHint')}
                      </span>
                    </div>
                  </div>
                  <div
                    className="rpg-panel"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 20,
                      marginTop: 6,
                      marginBottom: 15,
                      padding: '16px 20px',
                      background: 'rgba(15, 12, 41, 0.8)',
                      border: '2px solid #E040FB'
                    }}
                  >
                    <label
                      htmlFor="enable-ai"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontFamily: 'var(--font-body)',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        color: aiEnabled ? '#E040FB' : '#fff'
                      }}
                    >
                      <input
                        id="enable-ai"
                        type="checkbox"
                        checked={aiEnabled}
                        onChange={(event) => {
                          setAiEnabled(event.target.checked);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: '#E040FB',
                          cursor: 'pointer'
                        }}
                      />
                      🎲 {t('game.enableAi')}
                    </label>
                    <span
                      style={{
                        color: '#ccc',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.95rem',
                        textAlign: 'right'
                      }}
                    >
                      {t('game.enableAiHint')}
                    </span>
                  </div>
                  <div
                    className="setup-grid"
                    style={
                      setupForBothTeams
                        ? { gridTemplateColumns: '1fr', justifyItems: 'center' }
                        : undefined
                    }
                  >
                    {setupForBothTeams ? (
                      <div className="setup-card">
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.secondChance'),
                            'chance_second.png',
                            'both-second'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.secondChance > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-second"
                              value={team1Alloc.secondChance}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setAlloc('team1', 'secondChance', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.revealTwo'),
                            'chance_reveal.png',
                            'both-reveal'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.revealTwo > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-reveal"
                              value={team1Alloc.revealTwo}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setAlloc('team1', 'revealTwo', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.lifeShield'),
                            'chance_shield.png',
                            'both-shield'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.lifeShield > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-shield"
                              value={team1Alloc.lifeShield}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setAlloc('team1', 'lifeShield', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          {renderLabelWithIcon(
                            t('game.removeWorst'),
                            'chance_remove.png',
                            'both-remove'
                          )}
                          {setupMode === 'random' ? (
                            <strong>?</strong>
                          ) : (
                            <input
                              className="num-input"
                              style={
                                team1Alloc.removeWorst > 2
                                  ? { borderColor: 'red' }
                                  : undefined
                              }
                              type="number"
                              min={0}
                              max={2}
                              id="both-remove"
                              value={team1Alloc.removeWorst}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(
                                    team1Data.totalPowerUps,
                                    Number(e.target.value)
                                  )
                                );
                                setAlloc('team1', 'removeWorst', v);
                              }}
                            />
                          )}
                        </div>
                        <div className="setup-row">
                          <strong>{t('game.total')}</strong>
                          <strong
                            style={{
                              color:
                                team1Alloc.secondChance +
                                  team1Alloc.revealTwo +
                                  team1Alloc.lifeShield +
                                  team1Alloc.removeWorst !==
                                  team1Data.totalPowerUps
                                  ? 'red'
                                  : undefined
                            }}
                          >
                            {team1Alloc.secondChance +
                              team1Alloc.revealTwo +
                              team1Alloc.lifeShield +
                              team1Alloc.removeWorst}{' '}
                            / {team1Data.totalPowerUps}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="setup-card">
                          <h3
                            className={'teamName team1'}
                            style={{ marginTop: 0 }}
                          >
                            {team1Data.name}
                          </h3>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.secondChance'),
                              'chance_second.png',
                              't1-second'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.secondChance > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-second"
                                value={team1Alloc.secondChance}
                                onChange={(e) =>
                                  setAlloc('team1', 'secondChance', Math.max(
                                    0,
                                    Math.min(
                                      team1Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.revealTwo'),
                              'chance_reveal.png',
                              't1-reveal'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.revealTwo > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-reveal"
                                value={team1Alloc.revealTwo}
                                onChange={(e) =>
                                  setAlloc('team1', 'revealTwo', Math.max(
                                    0,
                                    Math.min(
                                      team1Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.lifeShield'),
                              'chance_shield.png',
                              't1-shield'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.lifeShield > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-shield"
                                value={team1Alloc.lifeShield}
                                onChange={(e) =>
                                  setAlloc('team1', 'lifeShield', Math.max(
                                    0,
                                    Math.min(
                                      team1Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.removeWorst'),
                              'chance_remove.png',
                              't1-remove'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team1Alloc.removeWorst > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t1-remove"
                                value={team1Alloc.removeWorst}
                                onChange={(e) =>
                                  setAlloc('team1', 'removeWorst', Math.max(
                                    0,
                                    Math.min(
                                      team1Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            <strong>Total</strong>
                            <strong
                              style={{
                                color:
                                  team1Alloc.secondChance +
                                    team1Alloc.revealTwo +
                                    team1Alloc.lifeShield +
                                    team1Alloc.removeWorst !==
                                    team1Data.totalPowerUps
                                    ? 'red'
                                    : undefined
                              }}
                            >
                              {team1Alloc.secondChance +
                                team1Alloc.revealTwo +
                                team1Alloc.lifeShield +
                                team1Alloc.removeWorst}{' '}
                              / {team1Data.totalPowerUps}
                            </strong>
                          </div>
                        </div>

                        <div className="setup-card">
                          <h3
                            className={'teamName team2'}
                            style={{ marginTop: 0 }}
                          >
                            {team2Data.name}
                          </h3>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.secondChance'),
                              'chance_second.png',
                              't2-second'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.secondChance > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-second"
                                value={team2Alloc.secondChance}
                                onChange={(e) =>
                                  setAlloc('team2', 'secondChance', Math.max(
                                    0,
                                    Math.min(
                                      team2Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.revealTwo'),
                              'chance_reveal.png',
                              't2-reveal'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.revealTwo > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-reveal"
                                value={team2Alloc.revealTwo}
                                onChange={(e) =>
                                  setAlloc('team2', 'revealTwo', Math.max(
                                    0,
                                    Math.min(
                                      team2Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.lifeShield'),
                              'chance_shield.png',
                              't2-shield'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.lifeShield > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-shield"
                                value={team2Alloc.lifeShield}
                                onChange={(e) =>
                                  setAlloc('team2', 'lifeShield', Math.max(
                                    0,
                                    Math.min(
                                      team2Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            {renderLabelWithIcon(
                              t('game.removeWorst'),
                              'chance_remove.png',
                              't2-remove'
                            )}
                            {setupMode === 'random-each' ? (
                              <strong>?</strong>
                            ) : (
                              <input
                                className="num-input"
                                style={
                                  team2Alloc.removeWorst > 2
                                    ? { borderColor: 'red' }
                                    : undefined
                                }
                                type="number"
                                min={0}
                                max={2}
                                id="t2-remove"
                                value={team2Alloc.removeWorst}
                                onChange={(e) =>
                                  setAlloc('team2', 'removeWorst', Math.max(
                                    0,
                                    Math.min(
                                      team2Data.totalPowerUps,
                                      Number(e.target.value)
                                    )
                                  ))
                                }
                              />
                            )}
                          </div>
                          <div className="setup-row">
                            <strong>Total</strong>
                            <strong
                              style={{
                                color:
                                  team2Alloc.secondChance +
                                    team2Alloc.revealTwo +
                                    team2Alloc.lifeShield +
                                    team2Alloc.removeWorst !==
                                    team2Data.totalPowerUps
                                    ? 'red'
                                    : undefined
                              }}
                            >
                              {team2Alloc.secondChance +
                                team2Alloc.revealTwo +
                                team2Alloc.lifeShield +
                                team2Alloc.removeWorst}{' '}
                              / {team2Data.totalPowerUps}
                            </strong>
                          </div>
                        </div>
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
                        setPowerupGuideOpen(true);
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
                        e.currentTarget.style.textShadow =
                          '0 0 15px var(--color-accent)';
                        e.currentTarget.style.letterSpacing = '1px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textShadow =
                          '0 0 5px var(--color-accent)';
                        e.currentTarget.style.letterSpacing = '0px';
                      }}
                    >
                      {t('game.powerUpsGuide')}
                    </a>
                  </div>
                  <h2
                    className="text-glow"
                    style={{
                      textAlign: 'center',
                      marginTop: 24,
                      marginBottom: 12,
                      fontSize: '2rem',
                      color: 'var(--color-primary)',
                      letterSpacing: '2px'
                    }}
                  >
                    {t('game.rosterSetup')}
                  </h2>
                  <RosterSetup
                    team1={setupTeam1Roster}
                    team2={setupTeam2Roster}
                    team1Name={team1Data.name}
                    team2Name={team2Data.name}
                    isLoading={isRosterLoading || gameState !== 'setup'}
                    errors={rosterErrors}
                    onAddMember={addSetupRosterMember}
                    onRemoveMember={removeSetupRosterMember}
                    onMoveMember={moveSetupRosterMember}
                    onShuffleTeam={shuffleSetupRoster}
                    shuffleLabel={t('game.shuffleRoster')}
                  />
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: 2,
                  background:
                    'linear-gradient(180deg, transparent, var(--color-secondary), transparent)'
                }}
              />

              {/* Right: Welcome UI */}
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

                  {/* Language Switcher */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '10px',
                      marginBottom: '20px'
                    }}
                  >
                    <button
                      onClick={() => setLanguage('en')}
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
                      onClick={() => setLanguage('vi')}
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
                      onChange={(e) => setSheetId(e.target.value)}
                      disabled={gameState != 'setup'}
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
                      onChange={(e) => setSheetRange(e.target.value)}
                      disabled={gameState != 'setup'}
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

                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <button
                      onClick={() => loadRoster()}
                      className="rpg-button secondary"
                      disabled={gameState !== 'setup' || isRosterLoading}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        fontSize: '1.1rem'
                      }}
                    >
                      {isRosterLoading
                        ? t('game.loadingRoster')
                        : t('game.loadRoster')}
                    </button>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => startGame()}
                      className="rpg-button"
                      disabled={isStartGameDisabled()}
                      style={{
                        width: '100%',
                        padding: '15px 30px',
                        fontSize: '1.5rem',
                        letterSpacing: '2px',
                        background: isStartGameDisabled()
                          ? '#333'
                          : 'var(--color-primary)',
                        cursor: isStartGameDisabled()
                          ? 'not-allowed'
                          : 'pointer',
                        opacity: isStartGameDisabled() ? 0.5 : 1
                      }}
                    >
                      {t('common.startGame')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const duelEquity = useMemo(() => calculateDuelEquity(duelData), [duelData]);

  return (
    <div style={{ textAlign: 'center', padding: '0 20px', height: '100%' }}>
      {renderGameInput()}
      <PowerupGuideModal
        isOpen={isPowerupGuideOpen}
        onClose={() => setPowerupGuideOpen(false)}
      />

      {gameState == 'gamePlaying' && (
        <GameArenaScreen
          duelResult={duelResult}
          isFirstTurn={isFirstTurn}
          duelData={duelData}
          team1Data={team1Data}
          team2Data={team2Data}
          theme={theme}
          onSelect={playerSelect}
          isPlayerCardDrawerDisabled={isPlayerCardDrawerDisabled}
          renderTheCards={renderTheCards}
          nextRound={nextRound}
          onChanceClick={handleChanceClick}
          duelEquity={duelEquity}
          canUndo={canUndo}
          onUndo={undoLastAction}
          canRedo={canRedo}
          onRedo={redoLastAction}
          onAiPick={aiEnabled ? handleAiPick : undefined}
        />
      )}

      {gameState == 'gameOver' && (
        <GameOverScreen
          teamWinner={teamWinner}
          saveStatus={saveStatus}
          onRetrySave={performSave}
        />
      )}

      <WinnerAnnouncement
        show={showWinnerAnnouncement}
        duelResult={duelResult}
        team1Name={team1Data.name}
        team2Name={team2Data.name}
      />
      {/* Confirmation Popup */}
      <ConfirmPopup
        isVisible={confirmPopup.isVisible}
        chanceItemName={confirmPopup.chanceItemName}
        onConfirm={handleConfirmChance}
        onCancel={handleCancelChance}
      />
    </div>
  );
};

export default CardGame;
