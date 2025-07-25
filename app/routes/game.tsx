import { useCallback, useState } from 'react';
import PlayerCardDrawer from '../components/PlayerCardDrawer';
import RoundStatus from '../components/RoundStatus';
import ChanceStar from '../components/ChanceStar';
import ConfirmPopup from '../components/ConfirmPopup';
import Card from '../models/Card';
import TeamData from '~/models/TeamData';
import DuelData from '~/models/DuelData';
import ConfirmPopupData from '~/models/ConfirmPopupData';
import {
  CARDS_COVER,
  createDeck,
  shuffleDeck,
  shuffleArray,
  drawCards,
  getCardImage,
  calculateSum,
  determineWinner,
  getTeamByPlayer
} from '~/utils/gameUtil';

const DECKS = createDeck();

interface Props {
  clientSecrets: {
    API_KEY: string;
  };
}

const CardGame = (props: Props) => {
  const { clientSecrets } = props;
  const [team1Data, setTeam1Data] = useState<TeamData>({
    name: 'Team 1',
    score: 0,
    scoreClass: '',
    totalChance: 2,
    useChanceSecond: false,
    useChanceReveal: false,
    players: []
  });
  const [team2Data, setTeam2Data] = useState<TeamData>({
    name: 'Team 2',
    score: 0,
    scoreClass: '',
    totalChance: 2,
    useChanceSecond: false,
    useChanceReveal: false,
    players: []
  });
  const [duelData, setDuelData] = useState<DuelData>({
    duelIndex: 0,
    currentPlayerName: '',
    player1Name: '',
    player1Sum: 0,
    player1Cards: [],
    isFinishDuel: false,
    topLeftCards: [],
    bottomLeftCards: [],
    topRightCards: [],
    bottomRightCards: [],
    topLeftRevealed: false,
    bottomLeftRevealed: false,
    topRightRevealed: false,
    bottomRightRevealed: false,
    topLeftPlayerData: { cards: [], name: '', sum: 0, team: '' },
    topRightPlayerData: { cards: [], name: '', sum: 0, team: '' },
    bottomLeftPlayerData: { cards: [], name: '', sum: 0, team: '' },
    bottomRightPlayerData: { cards: [], name: '', sum: 0, team: '' }
  });
  const [teamWinner, setTeamWinner] = useState('');
  const [duelResult, setDuelResult] = useState(''); // Individual duel winner (e.g. "Player A Wins!")
  const [isFirstTurn, setIsFirstTurn] = useState(true); // first turn of the entire game
  const [confirmPopup, setConfirmPopup] = useState<ConfirmPopupData>({
    isVisible: false,
    teamName: null,
    chanceType: null,
    chanceItemName: ''
  });
  const [gameState, setGameState] = useState('welcome'); // welcome -> gameLoading -> gameLoaded -> gamePlaying -> gameOver
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRound, setTotalRound] = useState(0);

  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = clientSecrets.API_KEY;

  /**
   * Starts the game with the provided team data
   * @param team1Data - Array of team 1 player names
   * @param team2Data - Array of team 2 player names
   */
  const startGameWithTeams = (team1Data: string[], team2Data: string[]) => {
    if (team1Data.length === 0 || team2Data.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }

    setGameState('gamePlaying');
    setTotalRound(Math.max(team1Data.length, team2Data.length));
    // Start the first round
    nextRound(team1Data, team2Data);
  };

  const loadDataFromGoogleSheet = async () => {
    setGameState('gameLoading');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const team1Temp: string[] = [];
      const team2Temp: string[] = [];
      let index = 1;
      data.values.slice(1).forEach((item: any[]) => {
        if (item[0]) {
          team1Temp.push(item[0]);
        } else {
          team1Temp.push(`ANONYMOUS #${index}`);
          index++;
        }

        if (item[1]) {
          team2Temp.push(item[1]);
        } else {
          team2Temp.push(`ANONYMOUS #${index}`);
          index++;
        }
      });

      const shuffledTeam1 = shuffleArray(team1Temp);
      const shuffledTeam2 = shuffleArray(team2Temp);

      setTeam1Data(prev => ({ ...prev, players: shuffledTeam1 }));
      setTeam2Data(prev => ({ ...prev, players: shuffledTeam2 }));
      setGameState('gameLoaded');

      // Pass the team data directly to startGame to avoid async state issues
      startGameWithTeams(shuffledTeam1, shuffledTeam2);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Function to select the next players for each team
  const nextRound = useCallback((inputTeam1: string[], inputTeam2: string[]) => {
      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        setTeamWinner(inputTeam1.length === 0 ? 'Team 2 Wins!' : 'Team 1 Wins!');
        setGameState('gameOver');
        return;
      }

      setIsFirstTurn(roundNumber == 0);

      const deck = shuffleDeck([...DECKS]);

      setDuelData(prev => ({
        ...prev,
        duelIndex: 0,
        currentPlayerName: roundNumber === 0 ? (Math.random() >= 0.5 ? inputTeam1[0] : inputTeam2[0]) : prev.currentPlayerName,
        topLeftCards: drawCards(deck),
        bottomLeftCards: drawCards(deck),
        topRightCards: drawCards(deck),
        bottomRightCards: drawCards(deck),
        topLeftRevealed: false,
        bottomLeftRevealed: false,
        topRightRevealed: false,
        bottomRightRevealed: false,
        topLeftPlayerData: { name: '', team: '', sum: -1, cards: [] },
        bottomLeftPlayerData: { name: '', team: '', sum: -1, cards: [] },
        topRightPlayerData: { name: '', team: '', sum: -1, cards: [] },
        bottomRightPlayerData: { name: '', team: '', sum: -1, cards: [] },
        isFinishDuel: false
      }));
      setDuelResult(''); // Clear previous duel result
      setRoundNumber((prev) => prev + 1);
    },
    [roundNumber]
  );


  const playerSelect = (side: string) => {
    let pCards: Card[];
    let pSum: number;

    const currentPlayer = duelData.currentPlayerName; // Capture current player before any updates
    const newDuelIndex = duelData.duelIndex + 1;
    setIsFirstTurn(false);
    const opponent = getDuelOpponent();
    const teamName = getTeamByCurrentPlayer(currentPlayer);

    if (side === 'top-left') {
      pCards = duelData.topLeftCards;
      pSum = calculateSum(pCards);
    } else if (side === 'bottom-left') {
      pCards = duelData.bottomLeftCards;
      pSum = calculateSum(pCards);
    } else if (side === 'top-right') {
      pCards = duelData.topRightCards;
      pSum = calculateSum(pCards);
    } else {// bottom-right
      pCards = duelData.bottomRightCards;
      pSum = calculateSum(pCards);
    }

    if (duelData.duelIndex == 0) {// first draw in a duel
      const updates: Partial<DuelData> = {
        duelIndex: newDuelIndex,
        currentPlayerName: opponent,
        player1Name: currentPlayer,
        player1Sum: pSum,
        player1Cards: pCards
      };

      if (side === 'top-left') {
        updates.topLeftPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.topLeftRevealed = true;
      } else if (side === 'bottom-left') {
        updates.bottomLeftPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.bottomLeftRevealed = true;
      } else if (side === 'top-right') {
        updates.topRightPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.topRightRevealed = true;
      } else {
        updates.bottomRightPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.bottomRightRevealed = true;
      }

      setDuelData(prev => ({ ...prev, ...updates }));
    } else {// second draw in a duel
      calculateResult(duelData.player1Sum, pSum, duelData.player1Cards, pCards, duelData.player1Name, currentPlayer);

      const updates: Partial<DuelData> = {
        duelIndex: newDuelIndex,
        // Don't set currentPlayerName here - let calculateResult handle it
        isFinishDuel: true
      };

      if (side === 'top-left') {
        updates.topLeftPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.topLeftRevealed = true;
      } else if (side === 'bottom-left') {
        updates.bottomLeftPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.bottomLeftRevealed = true;
      } else if (side === 'top-right') {
        updates.topRightPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.topRightRevealed = true;
      } else {
        updates.bottomRightPlayerData = { name: currentPlayer, team: teamName, sum: pSum, cards: pCards };
        updates.bottomRightRevealed = true;
      }

      setDuelData(prev => {
        const newData = { ...prev, ...updates };
        return {
          ...newData,
          topLeftPlayerData: newData.topLeftPlayerData.cards.length == 0 || !newData.topLeftRevealed
            ? { ...newData.topLeftPlayerData, cards: newData.topLeftCards, sum: calculateSum(newData.topLeftCards) }
            : newData.topLeftPlayerData,
          bottomLeftPlayerData: newData.bottomLeftPlayerData.cards.length == 0 || !newData.bottomLeftRevealed
            ? { ...newData.bottomLeftPlayerData, cards: newData.bottomLeftCards, sum: calculateSum(newData.bottomLeftCards) }
            : newData.bottomLeftPlayerData,
          topRightPlayerData: newData.topRightPlayerData.cards.length == 0 || !newData.topRightRevealed
            ? { ...newData.topRightPlayerData, cards: newData.topRightCards, sum: calculateSum(newData.topRightCards) }
            : newData.topRightPlayerData,
          bottomRightPlayerData: newData.bottomRightPlayerData.cards.length == 0 || !newData.bottomRightRevealed
            ? { ...newData.bottomRightPlayerData, cards: newData.bottomRightCards, sum: calculateSum(newData.bottomRightCards) }
            : newData.bottomRightPlayerData
        };
      });
    }
  };

  const getTeamByCurrentPlayer = (player: string) => {
    return getTeamByPlayer(player, team1Data.players);
  };

  const getDuelOpponent = () => {
    return getTeamByCurrentPlayer(duelData.currentPlayerName) === 'team1'
      ? team2Data.players[0]
      : team1Data.players[0];
  };

  /**
   * Handles chance item clicks - shows confirmation popup
   * @param teamName - Which team clicked the chance
   * @param chanceType - Type of chance (second or reveal)
   */
  const handleChanceClick = (teamName: 'team1' | 'team2', chanceType: 'second' | 'reveal') => {
    const chanceItemName = chanceType === 'second' ? 'Second Chance' : 'Reveal Two';
    
    setConfirmPopup({
      isVisible: true,
      teamName,
      chanceType,
      chanceItemName
    });
  };

  /**
   * Handles confirmation popup confirm action
   */
  const handleConfirmChance = () => {
    const { teamName, chanceType } = confirmPopup;
    
    if (teamName && chanceType) {
      if (chanceType === 'second') {
        // Handle Second Chance logic
        if (teamName === 'team1') {
          setTeam1Data(prev => ({ ...prev, useChanceSecond: true }));
        } else {
          setTeam2Data(prev => ({ ...prev, useChanceSecond: true }));
        }
        // TODO: Implement second chance functionality
        console.log(`${teamName} used Second Chance`);
      } else if (chanceType === 'reveal') {
        // Handle Reveal Two logic
        if (teamName === 'team1') {
          setTeam1Data(prev => ({ ...prev, useChanceReveal: true }));
        } else {
          setTeam2Data(prev => ({ ...prev, useChanceReveal: true }));
        }
        // TODO: Implement reveal two functionality
        console.log(`${teamName} used Reveal Two`);
      }
    }
    
    // Hide popup
    setConfirmPopup({
      isVisible: false,
      teamName: null,
      chanceType: null,
      chanceItemName: ''
    });
  };

  /**
   * Handles confirmation popup cancel action
   */
  const handleCancelChance = () => {
    setConfirmPopup({
      isVisible: false,
      teamName: null,
      chanceType: null,
      chanceItemName: ''
    });
  };

  // Function to calculate the result and handle elimination
  const calculateResult = useCallback((p1Sum: number, p2Sum: number, p1Cards: Card[], p2Cards: Card[], p1Name: string, p2Name: string) => {
      const { winner, isPlayer1Winner } = determineWinner(p1Sum, p2Sum, p1Cards, p2Cards, p1Name, p2Name);
      const losingPlayer = isPlayer1Winner ? p2Name : p1Name;
      const losingTeam = getTeamByCurrentPlayer(losingPlayer);

      setTeam1Data(prev => ({ ...prev, scoreClass: '' }));
      setTeam2Data(prev => ({ ...prev, scoreClass: '' }));
      // Update scores and determine losing team
      if (isPlayer1Winner) {
        if (getTeamByCurrentPlayer(p1Name) === 'team1') {
          setTeam1Data(prev => ({ ...prev, score: prev.score + 1 }));
          setTimeout(() => {
            setTeam1Data(prev => ({ ...prev, scoreClass: 'blink-score' }));
          }, 10);
        } else {
          setTeam2Data(prev => ({ ...prev, score: prev.score + 1 }));
          setTimeout(() => {
            setTeam2Data(prev => ({ ...prev, scoreClass: 'blink-score' }));
          }, 10);
        }
      } else {
        if (getTeamByCurrentPlayer(p2Name) === 'team1') {
          setTeam1Data(prev => ({ ...prev, score: prev.score + 1 }));
          setTimeout(() => {
            setTeam1Data(prev => ({ ...prev, scoreClass: 'blink-score' }));
          }, 10);
        } else {
          setTeam2Data(prev => ({ ...prev, score: prev.score + 1 }));
          setTimeout(() => {
            setTeam2Data(prev => ({ ...prev, scoreClass: 'blink-score' }));
          }, 10);
        }
      }

      // Set the duel result
      setDuelResult(winner);

      // Get the current team arrays
      const currentTeam1Players = team1Data.players;
      const currentTeam2Players = team2Data.players;

      // Eliminate the specific losing player from their team
      const updatedTeam1Players = losingTeam === 'team1'
        ? currentTeam1Players.filter(player => player !== losingPlayer)
        : currentTeam1Players;
      const updatedTeam2Players = losingTeam === 'team2'
        ? currentTeam2Players.filter(player => player !== losingPlayer)
        : currentTeam2Players;

      setTeam1Data(prev => ({ ...prev, players: updatedTeam1Players }));
      setTeam2Data(prev => ({ ...prev, players: updatedTeam2Players }));

      // Determine next player after elimination
      let nextPlayer: string;
      const losingTeamPlayers = losingTeam === 'team1' ? updatedTeam1Players : updatedTeam2Players;

      if (losingTeamPlayers.length > 0) {
        // Losing team still has players after elimination
        nextPlayer = losingTeamPlayers[0];
        setDuelData(prev => ({ ...prev, currentPlayerName: nextPlayer }));
      }

      // Move to the next round after result
      // setTimeout(() => nextRound(team1After, team2After), 4000);
    },
    [getTeamByCurrentPlayer, team1Data.players, team2Data.players, setTeam1Data, setTeam2Data, setDuelData]
  );

  /**
   * Renders the cards with optional click functionality
   * @param cards - Array of cards to render
   * @param onCardClick - Optional click handler for card images
   * @param disabled - Whether card clicks are disabled
   * @returns React elements for the cards
   */
  const renderTheCards = (cards: Card[], onCardClick?: () => void, disabled?: boolean) => {
    return cards.map((card, index) => (
      <img
        key={index}
        src={getCardImage(card.value, card.suit)}
        alt={`${card.value}${card.suit}`}
        style={{
          width: '150px',
          cursor: onCardClick && !disabled ? 'pointer' : 'default'
        }}
        onClick={onCardClick && !disabled ? onCardClick : undefined}
      />
    ));
  };

  function renderGameInput() {
    return (
      <>
        {(gameState == 'welcome' ||
          gameState == 'gameLoading' ||
          gameState == 'gameLoaded') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <div>
              <h1>Thorlit 3Key</h1>
              <div className={'controlContainer'}>
                <label className={'labelControl'} htmlFor='sheetId'>
                  Sheet Id
                </label>
                <input
                  className={'textControl'}
                  id='sheetId'
                  type='text'
                  value={SHEET_ID}
                  disabled={gameState != 'welcome'}
                />
              </div>
              <div className={'controlContainer'}>
                <label className={'labelControl'} htmlFor='sheetRange'>
                  Sheet Range
                </label>
                <input
                  className={'textControl'}
                  id='sheetRange'
                  type='text'
                  value={SHEET_RANGE}
                  disabled={gameState != 'welcome'}
                />
              </div>
              <div>
                {team1Data.players.length === 0 && team2Data.players.length === 0 && (
                  <div>
                    <button
                      onClick={() => loadDataFromGoogleSheet()} className={'btnStart'} disabled={gameState == 'gameLoading'}>
                      Start Game
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 20px', height: '100%' }}>
      {renderGameInput()}

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
              <h2 className='teamName team1' style={{ position: 'relative' }}>
                Team 1
                <ChanceStar
                  number={team1Data.totalChance}
                  style={{
                    top: '50%',
                    left: 'calc(100% + 10px)',
                    transform: 'translateY(-50%)'
                  }}
                />
              </h2>
              <ul className={'ulTeam'}>
                {team1Data.players.map((member, index) => (
                  <li className={'memberItem'} key={index}>
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
                    side='left'
                    disabled={duelData.isFinishDuel || duelData.topLeftPlayerData.cards.length > 0}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={CARDS_COVER}
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerData={duelData.bottomLeftPlayerData}
                    onSelect={() => playerSelect('bottom-left')}
                    side='left'
                    disabled={duelData.isFinishDuel || duelData.bottomLeftPlayerData.cards.length > 0}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={CARDS_COVER}
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
                    side='right'
                    disabled={duelData.isFinishDuel || duelData.topRightPlayerData.cards.length > 0}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={CARDS_COVER}
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerData={duelData.bottomRightPlayerData}
                    onSelect={() => playerSelect('bottom-right')}
                    side='right'
                    disabled={duelData.isFinishDuel || duelData.bottomRightPlayerData.cards.length > 0}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={CARDS_COVER}
                  />
                </div>
              </div>
            </div>
            <div style={{ width: '140px' }}>
              <div className={'scoreContainer ' + team2Data.scoreClass}>
                <span style={{ paddingBottom: '10px' }}>{team2Data.score}</span>
              </div>
              <h2 className='teamName team2' style={{ position: 'relative' }}>
                <ChanceStar
                  number={team2Data.totalChance}
                  style={{
                    top: '50%',
                    right: 'calc(100% + 10px)',
                    transform: 'translateY(-50%)'
                  }}
                />
                Team 2
              </h2>
              <ul className={'ulTeam'}>
                {team2Data.players.map((member, index) => (
                  <li className={'memberItem'} key={index}>
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
            <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>{teamWinner}</h2>
            <img
              style={{ marginTop: '20px' }}
              src='/images/the-end.webp'
              alt=''
              width='600'
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

