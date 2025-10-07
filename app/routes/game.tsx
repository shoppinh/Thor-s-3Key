import { useOutletContext } from '@remix-run/react';
import { useState } from 'react';
import { useDuelLogic } from '~/hooks/useDuelLogic';
import { useDuelState } from '~/hooks/useDuelState';
import { useGameSetup } from '~/hooks/useGameSetup';
import { GameState, useGameState } from '~/hooks/useGameState';
import { usePlayerSelection } from '~/hooks/usePlayerSelection';
import { usePowerupAllocation } from '~/hooks/usePowerupAllocation';
import { usePowerupConfirmation } from '~/hooks/usePowerupConfirmation';
import { useTeamData } from '~/hooks/useTeamData';
import ConfirmPopupData from '~/models/ConfirmPopupData';
import { renderTheCards } from '~/utils/gameUIUtils';
import { CARDS_COVER } from '~/utils/gameUtil';
import {
  implementRevealTwo,
  implementSecondChance
} from '~/utils/powerupManager';
import ChanceStar from '../components/ChanceStar';
import ConfirmPopup from '../components/ConfirmPopup';
import PlayerCardDrawer from '../components/PlayerCardDrawer';
import PowerupGuideModal from '../components/PowerupGuideModal';
import RoundStatus from '../components/RoundStatus';
import { GameSetupUI } from '../components/game/GameSetupUI';

type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
};
const CardGame = () => {
  const clientSecrets = useOutletContext<RootContext>();

  // Use extracted hooks for state management
  const {
    gameState,
    setGameState,
    roundNumber,
    setRoundNumber,
    teamWinner,
    isFirstTurn,
    setIsFirstTurn
  } = useGameState();

  const { team1Data, setTeam1Data, team2Data, setTeam2Data } = useTeamData();

  const { duelData, setDuelData, duelResult, setDuelResult } = useDuelState();

  const {
    team1Alloc,
    setTeam1Alloc,
    team2Alloc,
    setTeam2Alloc,
    setupMode,
    setSetupMode,
    setupForBothTeams,
    setSetupForBothTeams,
    randomizeBothTeamsAllocation
  } = usePowerupAllocation(team1Data, team2Data);

  const {
    sheetId,
    setSheetId,
    sheetRange,
    setSheetRange,
    startGame: startGameFromHook
  } = useGameSetup(clientSecrets);

  // Wrapper function to call the hook's startGame with required parameters
  const startGame = () => {
    const setGameStateString = (state: string) =>
      setGameState(state as GameState);
    startGameFromHook(
      setGameStateString,
      setTeam1Data,
      setTeam2Data,
      team1Alloc,
      team2Alloc,
      setupMode,
      startGameWithTeams
    );
  };

  const { nextRound, isPlayerCardDrawerDisabled, calculateResult } =
    useDuelLogic(
      duelData,
      setDuelData,
      team1Data,
      team2Data,
      roundNumber,
      setRoundNumber,
      setDuelResult,
      setTeam1Data,
      setTeam2Data
    );

  const { playerSelect } = usePlayerSelection({
    duelData,
    setDuelData,
    team1Data,
    team2Data,
    setIsFirstTurn,
    calculateResult
  });

  // Local state for UI components
  const [confirmPopup, setConfirmPopup] = useState<ConfirmPopupData>({
    isVisible: false,
    teamName: null,
    chanceType: null,
    chanceItemName: ''
  });
  const [isPowerupGuideOpen, setIsPowerupGuideOpen] = useState(false);

  // Wrapper functions for powerup implementations
  const wrappedImplementSecondChance = () =>
    implementSecondChance(setDuelData, setTeam1Data, setTeam2Data);
  const wrappedImplementRevealTwo = () => implementRevealTwo(setDuelData);

  const { handleConfirmChance, handleCancelChance } = usePowerupConfirmation({
    confirmPopup,
    setConfirmPopup,
    setTeam1Data,
    setTeam2Data,
    setDuelData,
    duelData,
    implementSecondChance: wrappedImplementSecondChance,
    implementRevealTwo: wrappedImplementRevealTwo
  });

  /**
   * Starts the game with the provided team data
   * @param team1Data - Array of team 1 player names
   * @param team2Data - Array of team 2 player names
   */
  const startGameWithTeams = (team1: string[], team2: string[]) => {
    setGameState('gamePlaying');
    // setTotalRound(Math.max(team1Data.length, team2Data.length));
    // Start the first round
    nextRound(team1, team2);
  };

  const handleChanceClick = (
    teamName: 'team1' | 'team2',
    chanceType:
      | 'secondChance'
      | 'revealTwo'
      | 'lifeShield'
      | 'lockAll'
      | 'removeWorst'
  ) => {
    let chanceItemName: string;
    if (chanceType === 'secondChance') {
      chanceItemName = 'Second Chance';
    } else if (chanceType === 'revealTwo') {
      chanceItemName = 'Reveal Two';
    } else if (chanceType === 'lifeShield') {
      chanceItemName = 'Life Shield';
    } else if (chanceType === 'lockAll') {
      chanceItemName = 'Lock All';
    } else {
      chanceItemName = 'Remove Worst';
    }

    setConfirmPopup({
      isVisible: true,
      teamName,
      chanceType,
      chanceItemName
    });
  };

  return (
    <div style={{ textAlign: 'center', padding: '0 20px', height: '100%' }}>
      <GameSetupUI
        gameState={gameState}
        team1Data={team1Data}
        team2Data={team2Data}
        team1Alloc={team1Alloc}
        setTeam1Alloc={setTeam1Alloc}
        team2Alloc={team2Alloc}
        setTeam2Alloc={setTeam2Alloc}
        setupMode={setupMode}
        setSetupMode={setSetupMode}
        setupForBothTeams={setupForBothTeams}
        setSetupForBothTeams={setSetupForBothTeams}
        randomizeBothTeamsAllocation={randomizeBothTeamsAllocation}
        sheetId={sheetId}
        setSheetId={setSheetId}
        sheetRange={sheetRange}
        setSheetRange={setSheetRange}
        startGame={startGame}
        setIsPowerupGuideOpen={setIsPowerupGuideOpen}
      />
      <PowerupGuideModal
        isOpen={isPowerupGuideOpen}
        onClose={() => setIsPowerupGuideOpen(false)}
      />

      {gameState == 'gamePlaying' && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ width: '140px' }}>
              <div className={'scoreContainer ' + team1Data.scoreClass}>
                <span style={{ paddingBottom: '10px' }}>{team1Data.score}</span>
              </div>
              <h2 className="teamName team1" style={{ position: 'relative' }}>
                Team 1
                {team1Data.totalPowerUps > 0 && (
                  <ChanceStar
                    number={team1Data.totalPowerUps}
                    style={{
                      top: '50%',
                      left: 'calc(100% + 10px)',
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
              </h2>
              <ul className={'ulTeam'}>
                {team1Data.players.map((member) => (
                  <li className={'memberItem'} key={member}>
                    {member}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    marginRight: '70px'
                  }}
                >
                  <PlayerCardDrawer
                    className={'mb-1'}
                    playerData={duelData.topLeftPlayerData}
                    onSelect={() => playerSelect('top-left')}
                    side="left"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.topLeftPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.topLeft.length > 0
                        ? duelData.revealedCards.topLeft
                        : CARDS_COVER
                    }
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerData={duelData.bottomLeftPlayerData}
                    onSelect={() => playerSelect('bottom-left')}
                    side="left"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.bottomLeftPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.bottomLeft.length > 0
                        ? duelData.revealedCards.bottomLeft
                        : CARDS_COVER
                    }
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    marginLeft: '70px'
                  }}
                >
                  <PlayerCardDrawer
                    className={'mb-1'}
                    playerData={duelData.topRightPlayerData}
                    onSelect={() => playerSelect('top-right')}
                    side="right"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.topRightPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.topRight.length > 0
                        ? duelData.revealedCards.topRight
                        : CARDS_COVER
                    }
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerData={duelData.bottomRightPlayerData}
                    onSelect={() => playerSelect('bottom-right')}
                    side="right"
                    duelData={duelData}
                    disabled={isPlayerCardDrawerDisabled(
                      duelData.bottomRightPlayerData
                    )}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={
                      duelData.revealedCards.bottomRight.length > 0
                        ? duelData.revealedCards.bottomRight
                        : CARDS_COVER
                    }
                  />
                </div>
              </div>
            </div>
            <div style={{ width: '140px' }}>
              <div className={'scoreContainer ' + team2Data.scoreClass}>
                <span style={{ paddingBottom: '10px' }}>{team2Data.score}</span>
              </div>
              <h2 className="teamName team2" style={{ position: 'relative' }}>
                {team2Data.totalPowerUps > 0 && (
                  <ChanceStar
                    number={team2Data.totalPowerUps}
                    style={{
                      top: '50%',
                      right: 'calc(100% + 10px)',
                      transform: 'translateY(-50%)'
                    }}
                  />
                )}
                Team 2
              </h2>
              <ul className={'ulTeam'}>
                {team2Data.players.map((member) => (
                  <li className={'memberItem'} key={member}>
                    {member}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Add RoundStatus component at the bottom */}
      {gameState == 'gamePlaying' && (
        <RoundStatus
          duelResult={duelResult}
          isFirstTurn={isFirstTurn}
          currentPlayerName={duelData.currentPlayerName}
          duelIndex={duelData.duelIndex}
          team1={team1Data.players}
          team2={team2Data.players}
          team1Data={team1Data}
          team2Data={team2Data}
          isFinishDuel={duelData.isFinishDuel}
          duelData={duelData}
          nextRound={nextRound}
          onChanceClick={handleChanceClick}
        />
      )}

      {gameState == 'gameOver' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}
        >
          <div>
            <h2 style={{ color: 'red', margin: 0 }}>Game Over</h2>
            <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>
              {teamWinner}
            </h2>
            <img
              style={{ marginTop: '20px' }}
              src="/images/the-end.webp"
              alt=""
              width="600"
            />
          </div>
        </div>
      )}

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
