import { useCallback, useState } from 'react';

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

// css
const sumNumber = { margin: '0 40px', fontSize: 60, paddingTop: '213px', width: '48px' };
const cardContainer = { display: 'flex', justifyContent: 'space-between' };
const playerContainer = { display: 'flex', flexDirection: 'column', width: '480px' };
const memberItem = { border: '1px solid #aaa', padding: '0 5px', marginBottom: '5px', minWidth: '120px', width: '140px', fontWeight: 500, maxWidth: '140px' };
const btnNextRound = { padding: '20px 40px', fontSize: '20px', marginBottom: 10, marginTop: '20px', background: '#222', color: '#fff', minWidth: '400px' };
const btn = { padding: '20px 40px', fontSize: '20px', marginBottom: 30, marginTop: '20px', background: '#222', color: '#fff', minWidth: '300px' };
const btnStart = { padding: '20px 40px', fontSize: '20px', marginBottom: 30, marginTop: '20px', background: 'green', color: '#fff', minWidth: '300px' };
const blinkInfinite = { backgroundColor: 'red', animation: 'blink-bg 1s infinite alternate', display: 'block', padding: '20px 40px', color: '#fff', fontSize: '32px', maxWidth: '400px', margin: '0 auto' };
const scoreContainer = { width: '140px', height: '140px', background: 'green', display: 'flex', fontSize: '96px', color: '#fff', fontWeight: 'bold', justifyContent: 'center', alignItems: 'center' };
const ulTeam = { padding: 0, listStyle: 'none' };
const m0 = { margin: 0 };
const playerStatus = { marginTop: 0, marginBottom: '20px' };
const relativeContainer = { position: 'relative', width: '400px', margin: '0 auto' };
const drawCardsContainer = { position: 'relative' };
const leftHandPointer = { position: 'absolute', top: '50px', right: '-50px', width: '100px', animation: 'left-point-to-button 1.5s infinite ease-in-out', pointerEvents: 'none' };
const rightHandPointer = { position: 'absolute', top: '50px', left: '-50px', width: '100px', animation: 'right-point-to-button 1.5s infinite ease-in-out', pointerEvents: 'none' };
const labelControl = { width: '100px', display: 'inline-block', textAlign: 'left' };
const textControl = { width: '300px', border: '1px solid #aaa' };
const controlContainer = { margin: '20px 0 0 0' };

const CardGame = () => {
  const [deck, setDeck] = useState<Card[]>(shuffleDeck(DECKS)); // Initialize and shuffle the deck
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team1ScoreClass, setTeam1ScoreClass] = useState('');
  const [team2Score, setTeam2Score] = useState(0);
  const [team2ScoreClass, setTeam2ScoreClass] = useState('');
  const [duelIndex, setDuelIndex] = useState(0);// determine turn in a single duel between two players
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentPlayer1, setCurrentPlayer1] = useState('');
  const [currentPlayer2, setCurrentPlayer2] = useState('');
  const [player1Cards, setPlayer1Cards] = useState<Card[]>([]);
  const [player2Cards, setPlayer2Cards] = useState<Card[]>([]);
  const [player1Sum, setPlayer1Sum] = useState(0);
  const [player2Sum, setPlayer2Sum] = useState(0);
  const [winner, setWinner] = useState('');
  const [isFirstTurn, setIsFirstTurn] = useState(true);// first turn of the entire game
  const [gameState, setGameState] = useState('welcome');// welcome -> gameLoading -> gameLoaded -> gamePlaying -> gameOver
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRound, setTotalRound] = useState(0);

  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = 'AIzaSyCrqoI0XIFLTXcbIHS8xrdNRmeRAB4VV4o';

  const startGame = () => {
    if (team1.length === 0 || team2.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }

    setGameState('gamePlaying');
    setTotalRound(Math.max(team1.length, team2.length));
    // Start the first round
    nextRound(team1, team2);
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
      data.values.slice(1).forEach((item) => {
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

      setTeam1(shuffleArray(team1Temp));
      setTeam2(shuffleArray(team2Temp));
      setGameState('gameLoaded');
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

      if (isFirstTurn) {
        setCurrentPlayer(Math.random() >= 0.5 ? inputTeam1[0] : inputTeam2[0]);// random team to play first
      }

      setDuelIndex(0);

      setPlayer1Cards([]);
      setPlayer2Cards([]);
      setPlayer1Sum(0);
      setPlayer2Sum(0);
      setWinner('');
      setDeck(shuffleDeck(DECKS));
      setRoundNumber((prev) => (prev + 1));
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
      return 'joker';
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
    if (mapNumToCardValues(value) === 'joker') {
      return '/images/red_joker.png';
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

    setDuelIndex(duelIndex => duelIndex + 1);
    setIsFirstTurn(false);
    const opponent = getDuelOpponent();

    if (side === 'left') {
      setCurrentPlayer1(currentPlayer);
      setCurrentPlayer2(opponent);
      setCurrentPlayer(opponent);
      setPlayer1Cards(pCards);
      setPlayer1Sum(pSum);

      if (player2Cards.length > 0) {
        calculateResult(pSum, player2Sum, pCards, player2Cards);
      }
    } else {
      setCurrentPlayer2(currentPlayer);
      setCurrentPlayer1(opponent);
      setCurrentPlayer(opponent);
      setPlayer2Cards(pCards);
      setPlayer2Sum(pSum);

      if (player1Cards.length > 0) {
        calculateResult(player1Sum, pSum, player1Cards, pCards);
      }
    }
  };

  const getTeamByCurrentPlayer = (player: string) => {
    return team1.includes(player) ? 'team1' : 'team2';
  };

  const getDuelOpponent = () => {
    return getTeamByCurrentPlayer(currentPlayer) === 'team1' ? team2[0] : team1[0];
  };

  // Function to calculate the result and handle elimination
  const calculateResult = useCallback(
    (p1Sum: number, p2Sum: number, p1Cards: Card[], p2Cards: Card[]) => {
      let winner: string;
      let losingTeam: string[];
      let isPlayer1Winner: boolean;

      if (p1Sum !== p2Sum) {
        isPlayer1Winner = p1Sum > p2Sum;
        winner = `${isPlayer1Winner ? currentPlayer1 : currentPlayer2} Wins!`;
      } else {
        const p1HighestCard = getCardHighestSuitAndValue(p1Cards);
        const p2HighestCard = getCardHighestSuitAndValue(p2Cards);

        if (suitRank[p1HighestCard.suit] !== suitRank[p2HighestCard.suit]) {
          isPlayer1Winner =
            suitRank[p1HighestCard.suit] > suitRank[p2HighestCard.suit];
          winner = `${isPlayer1Winner ? currentPlayer1 : currentPlayer2} Wins by Suit!`;
        } else {
          isPlayer1Winner =
            p1HighestCard.value === 1 ||
            (p2HighestCard.value !== 1 &&
              p1HighestCard.value > p2HighestCard.value);
          winner = `${isPlayer1Winner ? currentPlayer1 : currentPlayer2} Wins By Highest Card in Suit!`;
        }
      }

      setTeam1ScoreClass('');
      setTeam2ScoreClass('');
      if (isPlayer1Winner) {
        if (getTeamByCurrentPlayer(currentPlayer1) === 'team1') {
          setTeam1Score(score => score + 1);
          losingTeam = team2;
          setTimeout(() => {
            setTeam1ScoreClass('blink-score');
          }, 10); // Short delay to allow the class removal and re-application
        } else {
          setTeam2Score(score => score + 1);
          losingTeam = team1;
          setTimeout(() => {
            setTeam2ScoreClass('blink-score');
          }, 10); // Short delay to allow the class removal and re-application
        }
      } else {
        if (getTeamByCurrentPlayer(currentPlayer2) === 'team1') {
          setTeam1Score(score => score + 1);
          losingTeam = team2;
          setTimeout(() => {
            setTeam1ScoreClass('blink-score');
          }, 10); // Short delay to allow the class removal and re-application
        } else {
          setTeam2Score(score => score + 1);
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
      setCurrentPlayer(losingTeam[1]);

      // Move to the next round after result
      // setTimeout(() => nextRound(team1After, team2After), 4000);
    },
    [currentPlayer1, currentPlayer2, getCardHighestSuitAndValue, team1, team2]
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

  const renderPlayer1 = () => {
    switch (duelIndex) {
      case 0:
        return <h2 style={m0}>PLAYER</h2>;
      default:
        return <>
          {
            currentPlayer1 &&
            <h2 style={m0}>{currentPlayer1}</h2>
          }
        </>;
    }
  };

  const renderPlayer2 = () => {
    switch (duelIndex) {
      case 0:
        return <h2 style={m0}>PLAYER</h2>;
      default:
        return <>
          {
            currentPlayer2 &&
            <h2 style={m0}>{currentPlayer2}</h2>
          }
        </>;
    }
  };

  const renderRoundStatus = () => {
    return <>
      {/*{*/}
      {/*  winner &&*/}
      {/*  <h2 style={{ marginTop: '20px' }}>{winner}</h2>*/}
      {/*}*/}

      {
        isFirstTurn &&
        <>
          <h2 style={playerStatus}>FIRST PLAYER IS</h2>
          <h2 style={blinkInfinite}>{currentPlayer}</h2>
        </>
      }

      {
        !isFirstTurn && currentPlayer &&
        <>
          {
            duelIndex == 2 ? <h2 style={playerStatus}>NEXT PLAYER IS</h2> : <h2 style={playerStatus}>CURRENT PLAYER IS</h2>
          }
          <h2 style={blinkInfinite}>{currentPlayer}</h2>
        </>
      }

      {winner && (
        <div style={relativeContainer}>
          <img style={{ ...leftHandPointer, top: '25px' }} src='images/left-hand.png' alt='cursor' />
          <button
            onClick={() => nextRound(team1, team2)}
            style={btnNextRound}
          >
            {Math.min(team1.length, team2.length) == 0 ? 'Finish' : 'Next Round'}
          </button>
        </div>
      )}
    </>;
  };

  function renderGameInput() {
    return <>
      {(gameState == 'welcome' || gameState == 'gameLoading' || gameState == 'gameLoaded') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div>
            <h1>Thorlit 3Key</h1>
            <div style={controlContainer}>
              <label style={labelControl} htmlFor='sheetId'>Sheet Id</label>
              <input style={textControl} id='sheetId' type='text' value={SHEET_ID} disabled={gameState != 'welcome'} />
            </div>
            <div style={controlContainer}>
              <label style={labelControl} htmlFor='sheetRange'>Sheet Range</label>
              <input style={textControl} id='sheetRange' type='text' value={SHEET_RANGE} disabled={gameState != 'welcome'} />
            </div>
            <div>
              {team1.length === 0 && team2.length === 0 && (
                <div>
                  <button onClick={() => loadDataFromGoogleSheet()} style={btn} disabled={gameState == 'gameLoading'}>
                    Load Game
                  </button>
                </div>
              )}
              {
                team1.length > 0 && team2.length > 0 &&
                <button onClick={startGame} style={btnStart}>
                  Start Game
                </button>
              }
            </div>
          </div>
        </div>
      )}
    </>;
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 20px', height: '100%' }}>
      {renderGameInput()}

      {gameState == 'gamePlaying' && (
        <>
          <div style={{ display: 'flex' }}>
            <div style={scoreContainer} className={team1ScoreClass}>
              <span style={{ paddingBottom: '10px' }}>{team1Score}</span>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ marginBottom: '5px' }}>Thorlit 3Key</h1>
              <h2 style={{ marginTop: '10px', marginBottom: '5px' }}>Current Round: {roundNumber}</h2>
              <h2 style={{ marginTop: '10px', marginBottom: '5px' }}> Race to {totalRound}</h2>
            </div>
            <div style={scoreContainer} className={team2ScoreClass}>
              <span style={{ paddingBottom: '10px' }}>{team2Score}</span>
            </div>
          </div>
          <div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '140px' }}>
                <h2>Team 1</h2>
                <ul style={ulTeam}>
                  {team1.map((member, index) => (
                    <li style={memberItem} key={index}>{member}</li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={playerContainer}>
                        {
                          renderPlayer1()
                        }
                        <div style={drawCardsContainer}>
                          {
                            player1Cards.length == 0 &&
                            <img style={{ ...leftHandPointer, top: '25px' }} src='images/left-hand.png' alt='cursor' />
                          }
                          <button
                            onClick={() => playerDraw('left')}
                            style={{ ...btn, width: '480px' }}
                            disabled={player1Cards.length > 0}
                          >
                            Draw Cards
                          </button>
                        </div>
                        <div style={cardContainer}>
                          {renderTheCards(
                            player1Cards.length > 0 ? player1Cards : CARDS_COVER
                          )}
                        </div>
                      </div>
                      <h2 style={sumNumber}>
                        {player1Sum}
                      </h2>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <h2 style={sumNumber}>
                        {player2Sum}
                      </h2>
                      <div style={playerContainer}>
                        {
                          renderPlayer2()
                        }
                        <div style={drawCardsContainer}>
                          {
                            player2Cards.length == 0 &&
                            <img style={{ ...rightHandPointer, top: '25px' }} src='images/right-hand.png' alt='cursor' />
                          }
                          <button
                            onClick={() => playerDraw('right')}
                            style={{ ...btn, width: '480px' }}
                            disabled={player2Cards.length > 0}
                          >
                            Draw Cards
                          </button>
                        </div>
                        <div style={cardContainer}>
                          {renderTheCards(
                            player2Cards.length > 0 ? player2Cards : CARDS_COVER
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, marginTop: '40px' }}>
                  {renderRoundStatus()}
                </div>
              </div>
              <div style={{ width: '140px' }}>
                <h2>Team 2</h2>
                <ul style={ulTeam}>
                  {team2.map((member, index) => (
                    <li style={memberItem} key={index}>{member}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {
        gameState == 'gameOver' && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div>
              <h2 style={{ color: 'red' }}>Game Over</h2>
              <h2 style={{ fontSize: '48px', fontWeight: 'bold' }}>{winner}</h2>
              <img style={{ marginTop: '20px' }} src='/images/the-end.webp' alt='' width='600' />
            </div>
          </div>
        )
      }
    </div>
  );
};

export default CardGame;
