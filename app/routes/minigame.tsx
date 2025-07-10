import { useCallback, useState } from 'react';
import PlayerCardDrawer from '../PlayerCardDrawer';
import RoundStatus from '../RoundStatus';

interface Card {
  value: number;
  suit: string;
}

// Card values (1-9) and suits
const cardValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const suits = ['♦', '♥', '♠', '♣']; // Suit hierarchy: Diamond > Heart > Spade > Clu
// Function to create a full deck of cards
const createDeck = () => {
  const deck: Card[] = [];
  cardValues.forEach((value) => {
    suits.forEach((suit) => {
      deck.push({ value, suit });
    });
  });
  return deck;
};

const DECKS = createDeck();

// Function to shuffle the deck
const shuffleDeck = (deck: Card[]) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// function to shuffle team members
const shuffleArray = (array: string[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    // Generate a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap the elements at i and j
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const suitRank: { [key: string]: number } = {
  '♦': 4,
  '♥': 3,
  '♠': 2,
  '♣': 1
};

const CARDS_COVER = [
  { value: 0, suit: '' },
  { value: 0, suit: '' },
  { value: 0, suit: '' }
];

interface Props {
  clientSecrets: {
    API_KEY: string;
  };
}

const CardGame = (props: Props) => {
  const { clientSecrets } = props;
  const [deck, setDeck] = useState<Card[]>(shuffleDeck(DECKS)); // Initialize and shuffle the deck
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team1ScoreClass, setTeam1ScoreClass] = useState('');
  const [team2Score, setTeam2Score] = useState(0);
  const [team2ScoreClass, setTeam2ScoreClass] = useState('');
  const [duelIndex, setDuelIndex] = useState(0); // determine turn in a single duel between two players
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [player1Name, setPlayer1Name] = useState('');// player1: first player in a duel
  const [player1Sum, setPlayer1Sum] = useState(0);
  const [player1Cards, setPlayer1Cards] = useState<Card[]>([]);
  const [isFinishDuel, setIsFinishDuel] = useState(false);
  const [topLeftRevealed, setTopLeftRevealed] = useState(false);
  const [bottomLeftRevealed, setBottomLeftRevealed] = useState(false);
  const [topRightRevealed, setTopRightRevealed] = useState(false);
  const [bottomRightRevealed, setBottomRightRevealed] = useState(false);
  const [topLeftTeamName, setTopLeftTeamName] = useState('');
  const [topLeftPlayerName, setTopLeftPlayerName] = useState('');
  const [topLeftPlayerSum, setTopLeftPlayerSum] = useState(0);
  const [topLeftPlayerCards, setTopLeftPlayerCards] = useState<Card[]>([]);
  const [bottomLeftTeamName, setBottomLeftTeamName] = useState('');
  const [bottomLeftPlayerName, setBottomLeftPlayerName] = useState('');
  const [bottomLeftPlayerSum, setBottomLeftPlayerSum] = useState(0);
  const [bottomLeftPlayerCards, setBottomLeftPlayerCards] = useState<Card[]>([]);
  const [topRightTeamName, setTopRightTeamName] = useState('');
  const [topRightPlayerName, setTopRightPlayerName] = useState('');
  const [topRightPlayerSum, setTopRightPlayerSum] = useState(0);
  const [topRightPlayerCards, setTopRightPlayerCards] = useState<Card[]>([]);
  const [bottomRightTeamName, setBottomRightTeamName] = useState('');
  const [bottomRightPlayerName, setBottomRightPlayerName] = useState('');
  const [bottomRightPlayerSum, setBottomRightPlayerSum] = useState(0);
  const [bottomRightPlayerCards, setBottomRightPlayerCards] = useState<Card[]>([]);
  const [winner, setWinner] = useState('');
  const [isFirstTurn, setIsFirstTurn] = useState(true); // first turn of the entire game
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

      setTeam1(shuffledTeam1);
      setTeam2(shuffledTeam2);
      setGameState('gameLoaded');

      // Pass the team data directly to startGame to avoid async state issues
      startGameWithTeams(shuffledTeam1, shuffledTeam2);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Function to select the next players for each team
  const nextRound = useCallback(
    (inputTeam1: string[], inputTeam2: string[]) => {
      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        setWinner(inputTeam1.length === 0 ? 'Team 2 Wins!' : 'Team 1 Wins!');
        setGameState('gameOver');
        return;
      }

      setIsFirstTurn(roundNumber == 0);

      if (roundNumber === 0) {
        setCurrentPlayerName(Math.random() >= 0.5 ? inputTeam1[0] : inputTeam2[0]); // random team to play first
      }

      setDuelIndex(0);

      setTopLeftRevealed(false);
      setBottomLeftRevealed(false);
      setTopRightRevealed(false);
      setBottomRightRevealed(false);
      setTopLeftPlayerName('');
      setBottomLeftPlayerName('');
      setTopRightPlayerName('');
      setBottomRightPlayerName('');
      setTopLeftTeamName('');
      setBottomLeftTeamName('');
      setTopRightTeamName('');
      setBottomRightTeamName('');
      setTopLeftPlayerCards([]);
      setBottomLeftPlayerCards([]);
      setTopRightPlayerCards([]);
      setBottomRightPlayerCards([]);
      setTopLeftPlayerSum(0);
      setBottomLeftPlayerSum(0);
      setTopRightPlayerSum(0);
      setBottomRightPlayerSum(0);
      setWinner('');
      setIsFinishDuel(false);
      setDeck(shuffleDeck(DECKS));
      setRoundNumber((prev) => prev + 1);
    },
    [roundNumber]
  );

  // Function to draw 3 unique cards from the deck
  const drawUniqueCards = () => {
    const drawnCards = deck.slice(0, 3); // Draw the first 3 cards
    setDeck(deck.slice(3)); // Remove the drawn cards from the deck
    return drawnCards;
  };

  const mapNumToCardValues = (num: number) => {
    if (num === 1) {
      return 'ace';
    }
    if (num === 11) {
      return 'jack';
    }
    if (num === 12) {
      return 'queen';
    }
    if (num === 13) {
      return 'king';
    }
    if (num === 0) {
      return 'back';
    }
    return num.toString();
  };

  const getCardImage = (value: number, suit: string) => {
    const suitNames: { [key: string]: string } = {
      '♦': 'diamonds',
      '♥': 'hearts',
      '♠': 'spades',
      '♣': 'clubs'
    };
    if (mapNumToCardValues(value) === 'back') {
      return '/images/back_card.png';
    }
    return `/images/${mapNumToCardValues(value)}_of_${suitNames[suit]}.png`; // Image file path
  };
  // Function to calculate the sum of the drawn cards' values
  const calculateSum = (cards: Card[]) => {
    const sum = cards.reduce((sum, card) => sum + card.value, 0);
    return sum > 10 ? sum % 10 || 10 : sum;
  };

  // Function to determine the highest suit from a player's cards
  const getCardHighestSuitAndValue = useCallback((cards: Card[]) => {
    return cards.reduce((highest, current) => {
      if (suitRank[current.suit] > suitRank[highest.suit]) {
        return current;
      }
      if (suitRank[current.suit] === suitRank[highest.suit]) {
        if (
          current.value === 1 ||
          (highest.value !== 1 && current.value > highest.value)
        ) {
          return current;
        }
      }
      return highest;
    });
  }, []);

  const playerDraw = (side: string) => {
    const pCards = drawUniqueCards();
    const pSum = calculateSum(pCards);

    setDuelIndex((duelIndex) => duelIndex + 1);
    setIsFirstTurn(false);
    const opponent = getDuelOpponent();
    setCurrentPlayerName(opponent);
    const teamName = getTeamByCurrentPlayer(currentPlayerName);

    if (side === 'top-left') {
      setTopLeftPlayerName(currentPlayerName);
      setTopLeftTeamName(teamName);
      setTopLeftPlayerCards(pCards);
      setTopLeftPlayerSum(pSum);
      setTopLeftRevealed(true);
    } else if (side === 'bottom-left') {
      setBottomLeftPlayerName(currentPlayerName);
      setBottomLeftTeamName(teamName);
      setBottomLeftPlayerCards(pCards);
      setBottomLeftPlayerSum(pSum);
      setBottomLeftRevealed(true);
    } else if (side === 'top-right') {
      setTopRightPlayerName(currentPlayerName);
      setTopRightTeamName(teamName);
      setTopRightPlayerCards(pCards);
      setTopRightPlayerSum(pSum);
      setTopRightRevealed(true);
    } else {// bottom-right
      setBottomRightPlayerName(currentPlayerName);
      setBottomRightTeamName(teamName);
      setBottomRightPlayerCards(pCards);
      setBottomRightPlayerSum(pSum);
      setBottomRightRevealed(true);
    }

    if (duelIndex == 0) {// first draw in a duel
      setPlayer1Name(currentPlayerName);
      setPlayer1Sum(pSum);
      setPlayer1Cards(pCards);
    } else {// second draw in a duel
      calculateResult(player1Sum, pSum, player1Cards, pCards, player1Name, currentPlayerName);
      setIsFinishDuel(true);
      let newDeck = deck.slice(3);
      if (topLeftPlayerCards.length == 0 || !topLeftRevealed) {
        const topLeftCards = newDeck.slice(0, 3);
        newDeck = newDeck.slice(3);
        setTopLeftPlayerCards(topLeftCards);
        setTopLeftPlayerSum(calculateSum(topLeftCards));
      }
      if (bottomLeftPlayerCards.length == 0 || !bottomLeftRevealed) {
        const bottomLeftCards = newDeck.slice(0, 3);
        newDeck = newDeck.slice(3);
        setBottomLeftPlayerCards(bottomLeftCards);
        setBottomLeftPlayerSum(calculateSum(bottomLeftCards));
      }
      if (topRightPlayerCards.length == 0 || !topRightRevealed) {
        const topRightCards = newDeck.slice(0, 3);
        newDeck = newDeck.slice(3);
        setTopRightPlayerCards(topRightCards);
        setTopRightPlayerSum(calculateSum(topRightCards));
      }
      if (bottomRightPlayerCards.length == 0 || !bottomRightRevealed) {// bottom right
        const bottomRightCards = newDeck.slice(0, 3);
        setBottomRightPlayerCards(bottomRightCards);
        setBottomRightPlayerSum(calculateSum(bottomRightCards));
      }
    }
  };

  const getTeamByCurrentPlayer = (player: string) => {
    return team1.includes(player) ? 'team1' : 'team2';
  };

  const getDuelOpponent = () => {
    return getTeamByCurrentPlayer(currentPlayerName) === 'team1'
      ? team2[0]
      : team1[0];
  };

  // Function to calculate the result and handle elimination
  const calculateResult = useCallback(
    (p1Sum: number, p2Sum: number, p1Cards: Card[], p2Cards: Card[], p1Name: string, p2Name: string) => {
      let winner: string;
      let losingTeam: string[];
      let isPlayer1Winner: boolean;

      if (p1Sum !== p2Sum) {
        isPlayer1Winner = p1Sum > p2Sum;
        winner = `${isPlayer1Winner ? p1Name : p2Name} Wins!`;
      } else {
        const p1HighestCard = getCardHighestSuitAndValue(p1Cards);
        const p2HighestCard = getCardHighestSuitAndValue(p2Cards);

        if (suitRank[p1HighestCard.suit] !== suitRank[p2HighestCard.suit]) {
          isPlayer1Winner =
            suitRank[p1HighestCard.suit] > suitRank[p2HighestCard.suit];
          winner = `${isPlayer1Winner ? p1Name : p2Name} Wins by Suit!`;
        } else {
          isPlayer1Winner =
            p1HighestCard.value === 1 ||
            (p2HighestCard.value !== 1 &&
              p1HighestCard.value > p2HighestCard.value);
          winner = `${isPlayer1Winner ? p1Name : p2Name} Wins By Highest Card in Suit!`;
        }
      }

      setTeam1ScoreClass('');
      setTeam2ScoreClass('');
      if (isPlayer1Winner) {
        if (getTeamByCurrentPlayer(p1Name) === 'team1') {
          setTeam1Score((score) => score + 1);
          losingTeam = team2;
          setTimeout(() => {
            setTeam1ScoreClass('blink-score');
          }, 10); // Short delay to allow the class removal and re-application
        } else {
          setTeam2Score((score) => score + 1);
          losingTeam = team1;
          setTimeout(() => {
            setTeam2ScoreClass('blink-score');
          }, 10); // Short delay to allow the class removal and re-application
        }
      } else {
        if (getTeamByCurrentPlayer(p2Name) === 'team1') {
          setTeam1Score((score) => score + 1);
          losingTeam = team2;
          setTimeout(() => {
            setTeam1ScoreClass('blink-score');
          }, 10); // Short delay to allow the class removal and re-application
        } else {
          setTeam2Score((score) => score + 1);
          losingTeam = team1;
          setTimeout(() => {
            setTeam2ScoreClass('blink-score');
          }, 10); // Short delay to allow the class removal and re-application
        }
      }

      setWinner(winner);
      setTeam1((prevTeam1) =>
        prevTeam1 === losingTeam ? prevTeam1.slice(1) : prevTeam1
      );
      setTeam2((prevTeam2) =>
        prevTeam2 === losingTeam ? prevTeam2.slice(1) : prevTeam2
      );

      // select next player from losing team
      setCurrentPlayerName(losingTeam[1]);

      // Move to the next round after result
      // setTimeout(() => nextRound(team1After, team2After), 4000);
    },
    [getCardHighestSuitAndValue, team1, team2]
  );

  const renderTheCards = (cards: Card[]) => {
    return cards.map((card, index) => (
      <img
        key={index}
        src={getCardImage(card.value, card.suit)}
        alt={`${card.value}${card.suit}`}
        style={{ width: '150px' }}
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
                  {team1.length === 0 && team2.length === 0 && (
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
              <div className={'scoreContainer ' + team1ScoreClass}>
                <span style={{ paddingBottom: '10px' }}>{team1Score}</span>
              </div>
              <h2 className='teamName team1'>Team 1</h2>
              <ul className={'ulTeam'}>
                {team1.map((member, index) => (
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
                    playerName={topLeftPlayerName || '?'}
                    teamName={topLeftTeamName}
                    cards={topLeftPlayerCards}
                    sum={topLeftPlayerSum}
                    onDraw={() => playerDraw('top-left')}
                    side="left"
                    disabled={isFinishDuel || topLeftPlayerCards.length > 0}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={CARDS_COVER}
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerName={bottomLeftPlayerName || '?'}
                    teamName={bottomLeftTeamName}
                    cards={bottomLeftPlayerCards}
                    sum={bottomLeftPlayerSum}
                    onDraw={() => playerDraw('bottom-left')}
                    side="left"
                    disabled={isFinishDuel || bottomLeftPlayerCards.length > 0}
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
                    playerName={topRightPlayerName || '?'}
                    teamName={topRightTeamName}
                    cards={topRightPlayerCards}
                    sum={topRightPlayerSum}
                    onDraw={() => playerDraw('top-right')}
                    side="right"
                    disabled={isFinishDuel || topRightPlayerCards.length > 0}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={CARDS_COVER}
                  />
                  <PlayerCardDrawer
                    className={''}
                    playerName={bottomRightPlayerName || '?'}
                    teamName={bottomRightTeamName}
                    cards={bottomRightPlayerCards}
                    sum={bottomRightPlayerSum}
                    onDraw={() => playerDraw('bottom-right')}
                    side="right"
                    disabled={isFinishDuel || bottomRightPlayerCards.length > 0}
                    renderTheCards={renderTheCards}
                    CARDS_COVER={CARDS_COVER}
                  />
                </div>
              </div>
            </div>
            <div style={{ width: '140px' }}>
              <div className={'scoreContainer ' + team2ScoreClass}>
                <span style={{ paddingBottom: '10px' }}>{team2Score}</span>
              </div>
              <h2 className='teamName team2'>Team 2</h2>
              <ul className={'ulTeam'}>
                {team2.map((member, index) => (
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
          winner={winner}
          isFirstTurn={isFirstTurn}
          currentPlayerName={currentPlayerName}
          duelIndex={duelIndex}
          team1={team1}
          team2={team2}
          nextRound={nextRound}
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
            <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>{winner}</h2>
            <img
              style={{ marginTop: '20px' }}
              src='/images/the-end.webp'
              alt=''
              width='600'
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CardGame;

