import ChanceStar from '~/components/ChanceStar';
import PlayerCardDrawer from '~/components/PlayerCardDrawer';
import RoundStatus from '~/components/RoundStatus';
import Card from '~/models/Card';
import DuelData from '~/models/DuelData';
import { PlayerData } from '~/models/PlayerData';
import { ChanceType, TeamData } from '~/models/TeamData';
import { CARDS_COVER } from '~/utils/gameUtil';
import { useLanguage } from '~/contexts/LanguageContext';
import { Side, TeamName } from '../types/gameTypes';

type GameArenaScreenProps = {
  duelResult: string;
  isFirstTurn: boolean;
  duelData: DuelData;
  team1Data: TeamData;
  team2Data: TeamData;
  theme: string;
  onSelect: (
    side: Side 
  ) => void;
  isPlayerCardDrawerDisabled: (playerData: PlayerData) => boolean;
  renderTheCards: (
    cards: Card[],
    onCardClick?: () => void,
    disabled?: boolean
  ) => JSX.Element[];
  nextRound: (team1: string[], team2: string[]) => void;
  onChanceClick: (
    teamName: TeamName,
    chanceType: ChanceType
  ) => void;
};

const GameArenaScreen = ({
  duelResult,
  isFirstTurn,
  duelData,
  team1Data,
  team2Data,
  theme,
  onSelect,
  isPlayerCardDrawerDisabled,
  renderTheCards,
  nextRound,
  onChanceClick
}: GameArenaScreenProps) => {
  const { t } = useLanguage();

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '40px',
          padding: '20px'
        }}
      >
        <div
          className="rpg-panel"
          style={{
            width: '200px',
            padding: '20px',
            background: 'var(--color-panel-bg)',
            border: '2px solid var(--color-primary)',
            position: 'relative',
            zIndex: 10
          }}
        >
          <div
            className={team1Data.scoreClass}
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              textAlign: 'center',
              color: 'var(--color-accent)',
              marginBottom: '10px',
              textShadow: '0 0 10px var(--color-accent)'
            }}
          >
            {team1Data.score}
          </div>
          <h2
            className="text-glow"
            style={{
              textAlign: 'center',
              color: 'var(--color-primary)',
              fontSize: '24px',
              margin: '10px 0',
              position: 'relative'
            }}
          >
            {team1Data.totalPowerUps > 0 && (
              <ChanceStar
                number={team1Data.totalPowerUps}
                theme={theme}
                style={{
                  top: '50%',
                  left: 'calc(100% + 10px)',
                  transform: 'translateY(-50%)'
                }}
              />
            )}
            {t('common.team')} 1
          </h2>
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.2)',
              paddingTop: '15px'
            }}
          >
            {team1Data.players.map((member, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  marginBottom: '5px',
                  background: 'rgba(255, 0, 85, 0.1)',
                  border: '1px solid rgba(255, 0, 85, 0.3)',
                  color: '#fff',
                  fontSize: '18px',
                  fontFamily: 'var(--font-body)'
                }}
              >
                {member}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', gap: '100px' }}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <PlayerCardDrawer
                className={'mb-1'}
                playerData={duelData.topLeftPlayerData}
                onSelect={() => onSelect('top-left')}
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
                onSelect={() => onSelect('bottom-left')}
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
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <PlayerCardDrawer
                className={'mb-1'}
                playerData={duelData.topRightPlayerData}
                onSelect={() => onSelect('top-right')}
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
                onSelect={() => onSelect('bottom-right')}
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

        <div
          className="rpg-panel"
          style={{
            width: '200px',
            padding: '20px',
            background: 'var(--color-panel-bg)',
            border: '2px solid var(--color-secondary)',
            position: 'relative',
            zIndex: 10
          }}
        >
          <div
            className={team2Data.scoreClass}
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              textAlign: 'center',
              color: 'var(--color-accent)',
              marginBottom: '10px',
              textShadow: '0 0 10px var(--color-accent)'
            }}
          >
            {team2Data.score}
          </div>
          <h2
            className="text-glow"
            style={{
              textAlign: 'center',
              color: 'var(--color-secondary)',
              fontSize: '24px',
              margin: '10px 0',
              position: 'relative'
            }}
          >
            {team2Data.totalPowerUps > 0 && (
              <ChanceStar
                number={team2Data.totalPowerUps}
                theme={theme}
                style={{
                  top: '50%',
                  right: 'calc(100% + 10px)',
                  transform: 'translateY(-50%)'
                }}
              />
            )}
            {t('common.team')} 2
          </h2>
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.2)',
              paddingTop: '15px'
            }}
          >
            {team2Data.players.map((member, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  marginBottom: '5px',
                  background: 'rgba(0, 242, 255, 0.1)',
                  border: '1px solid rgba(0, 242, 255, 0.3)',
                  color: '#fff',
                  fontSize: '18px',
                  fontFamily: 'var(--font-body)'
                }}
              >
                {member}
              </div>
            ))}
          </div>
        </div>
      </div>

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
        onChanceClick={onChanceClick}
      />
    </>
  );
};

export default GameArenaScreen;
