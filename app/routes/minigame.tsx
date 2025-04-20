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
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentPlayer1, setCurrentPlayer1] = useState('');
  const [currentPlayer2, setCurrentPlayer2] = useState('');
  const [player1Cards, setPlayer1Cards] = useState<Card[]>([]);
  const [player2Cards, setPlayer2Cards] = useState<Card[]>([]);
  const [player1Sum, setPlayer1Sum] = useState(0);
  const [player2Sum, setPlayer2Sum] = useState(0);
  const [winner, setWinner] = useState('');
  const [isFirstTurn, setIsFirstTurn] = useState(true); // first turn of the entire game
  const [gameState, setGameState] = useState('welcome'); // welcome -> gameLoading -> gameLoaded -> gamePlaying -> gameOver
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRound, setTotalRound] = useState(0);
  // New state variables for a card draft system
  const [isDraftPhase, setIsDraftPhase] = useState(false);
  const [draftCards, setDraftCards] = useState<Card[]>([]);
  const [draftSide, setDraftSide] = useState<string>('');
  const [selectedDraftCards, setSelectedDraftCards] = useState<Card[]>([]);
  // Power play state variables
  const [team1PowerUsed, setTeam1PowerUsed] = useState(false);
  const [team2PowerUsed, setTeam2PowerUsed] = useState(false);

  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = clientSecrets.API_KEY;

  const startGame = () => {
    if (team1.length === 0 || team2.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }

    setGameState('gamePlaying');
    setTotalRound(Math.max(team1.length, team2.length));
    // Reset power play usage
    setTeam1PowerUsed(false);
    setTeam2PowerUsed(false);
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

      if (roundNumber === 0) {
        setCurrentPlayer(Math.random() >= 0.5 ? inputTeam1[0] : inputTeam2[0]); // random team to play first
      }

      setDuelIndex(0);

      setPlayer1Cards([]);
      setPlayer2Cards([]);
      setPlayer1Sum(0);
      setPlayer2Sum(0);
      setWinner('');
      setDeck(shuffleDeck(DECKS));
      setRoundNumber((prev) => prev + 1);
    },
    [roundNumber]
  );

  // Function to draw unique cards from the deck
  const drawUniqueCards = (count: number = 3) => {
    const drawnCards = deck.slice(0, count); // Draw the specified number of cards
    setDeck(deck.slice(count)); // Remove the drawn cards from the deck
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

  // Regular card draw function - draws 3 random cards
  const playerDraw = (side: string) => {
    const pCards = drawUniqueCards(3);
    const pSum = calculateSum(pCards);

    setDuelIndex((duelIndex) => duelIndex + 1);
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

  // Power play draft function - allows selecting from 6 cards
  const powerPlayDraft = (side: string) => {
    // Start the draft phase
    setIsDraftPhase(true);
    setDraftSide(side);
    setSelectedDraftCards([]); // Reset selected cards

    // Draw 6 cards for selection
    const availableCards = drawUniqueCards(6);
    setDraftCards(availableCards);

    // Mark the team's power as used
    if (side === 'left') {
      setTeam1PowerUsed(true);
    } else {
      setTeam2PowerUsed(true);
    }
  };

  // Function to handle card selection during draft phase
  const handleCardSelection = (selectedCards: Card[]) => {
    if (selectedCards.length !== 3) {
      return; // Must select exactly 3 cards
    }

    const pCards = selectedCards;
    const pSum = calculateSum(pCards);

    setDuelIndex((duelIndex) => duelIndex + 1);
    setIsFirstTurn(false);
    const opponent = getDuelOpponent();

    // End the draft phase
    setIsDraftPhase(false);
    setDraftCards([]);
    setSelectedDraftCards([]);

    if (draftSide === 'left') {
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
    return getTeamByCurrentPlayer(currentPlayer) === 'team1'
      ? team2[0]
      : team1[0];
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
        if (getTeamByCurrentPlayer(currentPlayer2) === 'team1') {
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

      // Update team members
      const updatedTeam1 = losingTeam === team1 ? team1.slice(1) : team1;
      const updatedTeam2 = losingTeam === team2 ? team2.slice(1) : team2;

      setTeam1(updatedTeam1);
      setTeam2(updatedTeam2);

      // Check if game is over
      if (updatedTeam1.length === 0 || updatedTeam2.length === 0) {
        setWinner(updatedTeam1.length === 0 ? 'Team 2 Wins!' : 'Team 1 Wins!');
        setGameState('gameOver');
      } else {
        // select next player from losing team
        setCurrentPlayer(losingTeam[1]);
      }
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

  // Function to toggle card selection during draft phase
  const toggleCardSelection = (card: Card) => {
    if (selectedDraftCards.some(c => c.value === card.value && c.suit === card.suit)) {
      // If card is already selected, remove it
      setSelectedDraftCards(selectedDraftCards.filter(c => !(c.value === card.value && c.suit === card.suit)));
    } else if (selectedDraftCards.length < 3) {
      // If less than 3 cards are selected, add this card
      setSelectedDraftCards([...selectedDraftCards, card]);
    }
  };

  // Function to check if a card is selected
  const isCardSelected = (card: Card) => {
    return selectedDraftCards.some(c => c.value === card.value && c.suit === card.suit);
  };

  // Component to render cards for selection during draft phase
  const renderDraftCards = () => {
    return (
      <div className="draft-phase-container">
        <h2>Select 3 Cards</h2>
        <div className="draft-cards">
          {draftCards.map((card, index) => (
            <div 
              key={index} 
              className={`draft-card ${isCardSelected(card) ? 'selected' : ''}`}
              onClick={() => toggleCardSelection(card)}
            >
              <img
                src={getCardImage(card.value, card.suit)}
                alt={`${card.value}${card.suit}`}
                style={{ width: '120px' }}
              />
            </div>
          ))}
        </div>
        <button 
          onClick={() => handleCardSelection(selectedDraftCards)}
          disabled={selectedDraftCards.length !== 3}
          className="btn"
          style={{ marginTop: '20px' }}
        >
          Confirm Selection
        </button>
      </div>
    );
  };

  const renderPlayer1 = () => {
    switch (duelIndex) {
      case 0:
        return <h2 className={'m0'}>PLAYER</h2>;
      default:
        return <>{currentPlayer1 && <h2 className={'m0'}>{currentPlayer1}</h2>}</>;
    }
  };

  const renderPlayer2 = () => {
    switch (duelIndex) {
      case 0:
        return <h2 className={'m0'}>PLAYER</h2>;
      default:
        return <>{currentPlayer2 && <h2 className={'m0'}>{currentPlayer2}</h2>}</>;
    }
  };

  const renderRoundStatus = () => {
    return (
      <>
        {/*{*/}
        {/*  winner &&*/}
        {/*  <h2 style={{ marginTop: '20px' }}>{winner}</h2>*/}
        {/*}*/}

        {isFirstTurn && (
          <>
            <h2 className={'playerStatus'}>FIRST PLAYER IS</h2>
            <h2 className={'blinkInfinite'}>{currentPlayer}</h2>
          </>
        )}

        {!isFirstTurn && currentPlayer && (
          <>
            {duelIndex == 2 ? (
              <h2 className={'playerStatus'}>NEXT PLAYER IS</h2>
            ) : (
              <h2 className={'playerStatus'}>CURRENT PLAYER IS</h2>
            )}
            <h2 className={'blinkInfinite'}>{currentPlayer}</h2>
          </>
        )}

        {winner && Math.min(team1.length, team2.length) > 0 && (
          <div className={'relativeContainer'}>
            <img
              className={'leftHandPointer'}
              style={{ top: '25px' }}
              src='images/left-hand.png'
              alt='cursor'
            />
            <button
              onClick={() => nextRound(team1, team2)}
              className={'btnNextRound'}
            >
              Next Round
            </button>
          </div>
        )}
      </>
    );
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
                      onClick={() => loadDataFromGoogleSheet()} className={'btn'} disabled={gameState == 'gameLoading'}>
                      Load Game
                    </button>
                  </div>
                )}
                {team1.length > 0 && team2.length > 0 && (
                  <button onClick={startGame} className={'btnStart'}>
                    Start Game
                  </button>
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

      {isDraftPhase && renderDraftCards()}

      {gameState == 'gamePlaying' && (

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
                <h2>Team 1</h2>
                <ul className={'ulTeam'}>
                  {team1.map((member, index) => (
                    <li className={'memberItem'} key={index}>
                      {member}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => powerPlayDraft('left')}
                  className={'powerPlayBtn'}
                  disabled={team1PowerUsed || player1Cards.length > 0 || currentPlayer !== team1[0]}
                >
                  {team1PowerUsed ? 'Power Used' : 'Power Play'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, maxHeight: '82px' }}>
                  <h2 style={{ marginTop: 0, marginBottom: '5px' }}>
                    Current Round: {roundNumber}
                  </h2>
                  <h2 style={{ marginTop: 0, marginBottom: '5px' }}>
                    {' '}
                    Race to {totalRound}
                  </h2>
                </div>
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
                      <div className={'playerContainer'}>
                        {renderPlayer1()}
                        <div className={'drawCardsContainer'}>
                          {player1Cards.length == 0 && (
                            <img
                              className={'leftHandPointer'}
                              style={{ top: '25px' }}
                              src='images/left-hand.png'
                              alt='cursor'
                            />
                          )}
                          <button
                            onClick={() => playerDraw('left')}
                            className={'btn'}
                            style={{ width: '480px' }}
                            disabled={player1Cards.length > 0}
                          >
                            Draw Cards
                          </button>
                        </div>
                        <div className={'cardContainer'}>
                          {renderTheCards(
                            player1Cards.length > 0 ? player1Cards : CARDS_COVER
                          )}
                        </div>
                      </div>
                      <h2 className={'sumNumber'}>{player1Sum}</h2>
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
                      <h2 className={'sumNumber'}>{player2Sum}</h2>
                      <div className={'playerContainer'}>
                        {renderPlayer2()}
                        <div className={'drawCardsContainer'}>
                          {player2Cards.length == 0 && (
                            <img
                              className={'rightHandPointer'}
                              style={{ top: '25px' }}
                              src='images/right-hand.png'
                              alt='cursor'
                            />
                          )}
                          <button
                            onClick={() => playerDraw('right')}
                            className={'btn'}
                            style={{ width: '480px' }}
                            disabled={player2Cards.length > 0}
                          >
                            Draw Cards
                          </button>
                        </div>
                        <div className={'cardContainer'}>
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
                <div className={'scoreContainer ' + team2ScoreClass}>
                  <span style={{ paddingBottom: '10px' }}>{team2Score}</span>
                </div>
                <h2>Team 2</h2>
                <ul className={'ulTeam'}>
                  {team2.map((member, index) => (
                    <li className={'memberItem'} key={index}>
                      {member}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => powerPlayDraft('right')}
                  className={'powerPlayBtn'}
                  disabled={team2PowerUsed || player2Cards.length > 0 || currentPlayer !== team2[0]}
                >
                  {team2PowerUsed ? 'Power Used' : 'Power Play'}
                </button>
              </div>
            </div>
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
