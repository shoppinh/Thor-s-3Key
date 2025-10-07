import DuelData from '~/models/DuelData';
import TeamData from '~/models/TeamData';
import Card from '~/models/Card';
import { renderTheCards } from '~/utils/gameUIUtils';
import ChanceStar from '../ChanceStar';
import PlayerCardDrawer from '../PlayerCardDrawer';
import RoundStatus from '../RoundStatus';
import { CARDS_COVER } from '~/utils/gameUtil';

interface GamePlayingUIProps {
  duelData: DuelData;
  duelResult: string;
  team1Data: TeamData;
  team2Data: TeamData;
  isFirstTurn: boolean;
  playerSelect: (position: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right') => void;
  handleChanceClick: (chanceType: string) => void;
  isPlayerCardDrawerDisabled: (playerData: { name: string; team: string; sum: number; cards: Card[] }) => boolean;
  nextRound: () => void;
}

export const GamePlayingUI = ({
  duelData,
  duelResult,
  team1Data,
  team2Data,
  isFirstTurn,
  playerSelect,
  handleChanceClick,
  isPlayerCardDrawerDisabled,
  nextRound,
}: GamePlayingUIProps) => {
  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Thorlit 3Key</h1>
      </div>

      {/* Game Area */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          height: 'calc(100% - 120px)'
        }}
      >
        {/* Team 1 */}
        <div style={{ width: '140px' }}>
          <div className={'scoreContainer ' + team1Data.scoreClass}>
            <span style={{ paddingBottom: '10px' }}>{team1Data.score}</span>
          </div>
          <h2 className="teamName team1" style={{ position: 'relative' }}>
            {team1Data.name}
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

        {/* Center Duel Area */}
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
                disabled={isPlayerCardDrawerDisabled(duelData.topLeftPlayerData)}
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
                disabled={isPlayerCardDrawerDisabled(duelData.bottomLeftPlayerData)}
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
                disabled={isPlayerCardDrawerDisabled(duelData.topRightPlayerData)}
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
                disabled={isPlayerCardDrawerDisabled(duelData.bottomRightPlayerData)}
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

        {/* Team 2 */}
        <div style={{ width: '140px' }}>
          <div className={'scoreContainer ' + team2Data.scoreClass}>
            <span style={{ paddingBottom: '10px' }}>{team2Data.score}</span>
          </div>
          <h2 className="teamName team2" style={{ position: 'relative' }}>
            {team2Data.name}
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

      {/* Round Status */}
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
    </div>
  );
};