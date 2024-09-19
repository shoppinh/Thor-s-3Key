import * as Papa from 'papaparse';
import { useCallback, useRef, useState } from 'react';
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

const CardGame = () => {
  const [deck, setDeck] = useState(shuffleDeck(DECKS)); // Initialize and shuffle the deck
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [currentPlayer1, setCurrentPlayer1] = useState('');
  const [currentPlayer2, setCurrentPlayer2] = useState('');
  const [player1Cards, setPlayer1Cards] = useState<Card[]>([]);
  const [player2Cards, setPlayer2Cards] = useState<Card[]>([]);
  const [player1Sum, setPlayer1Sum] = useState(0);
  const [player2Sum, setPlayer2Sum] = useState(0);
  const [winner, setWinner] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roundNumber, setRoundNumber] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const startGame = () => {
    if (team1.length === 0 || team2.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }

    setGameStarted(true);
    // Start the first round
    nextRound(team1, team2);
  };

  const triggerLoadTeamMember = () => {
    inputRef.current?.click();
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Papa.parse(files[0], {
        complete: function (results) {
          const team1Temp: string[] = [];
          const team2Temp: string[] = [];
          results.data.slice(1).forEach((item) => {
            if (Array.isArray(item)) {
              team1Temp.push(item[0]);
              team2Temp.push(item[1]);
            }
          });

          setTeam1(team1Temp);
          setTeam2(team2Temp);
        }
      });
    }
  };

  // Function to select the next players for each team
  const nextRound = useCallback(
    (inputTeam1: string[], inputTeam2: string[]) => {
      if (inputTeam1.length === 0 || inputTeam2.length === 0) {
        setWinner(inputTeam1.length === 0 ? 'Team 2 Wins!' : 'Team 1 Wins!');
        setGameOver(true);
        return;
      }
      setTeam1(inputTeam1);
      setTeam2(inputTeam2);
      setCurrentPlayer1(inputTeam1[0]);
      setCurrentPlayer2(inputTeam2[0]);
      setPlayer1Cards([]);
      setPlayer2Cards([]);
      setPlayer1Sum(0);
      setPlayer2Sum(0);
      setWinner('');
      setDeck(shuffleDeck(DECKS));
      setRoundNumber((prev) => (prev += 1));
    },
    []
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

  // Function for player 1 to draw cards
  const player1Draw = () => {
    const p1Cards = drawUniqueCards();
    const p1Sum = calculateSum(p1Cards);

    setPlayer1Cards(p1Cards);
    setPlayer1Sum(p1Sum);

    if (player2Cards.length > 0) {
      calculateResult(p1Sum, player2Sum, p1Cards, player2Cards);
    }
  };

  // Function for player 2 to draw cards
  const player2Draw = () => {
    const p2Cards = drawUniqueCards();
    const p2Sum = calculateSum(p2Cards);

    setPlayer2Cards(p2Cards);
    setPlayer2Sum(p2Sum);

    if (player1Cards.length > 0) {
      calculateResult(player1Sum, p2Sum, player1Cards, p2Cards);
    }
  };

  // Function to calculate the result and handle elimination
  const calculateResult = useCallback(
    (p1Sum: number, p2Sum: number, p1Cards: Card[], p2Cards: Card[]) => {
      let winner: string;
      let losingTeam: string[];

      if (p1Sum !== p2Sum) {
        const isPlayer1Winner = p1Sum > p2Sum;
        winner = `${isPlayer1Winner ? currentPlayer1 : currentPlayer2} from Team ${isPlayer1Winner ? '1' : '2'} Wins!`;
        losingTeam = isPlayer1Winner ? team2 : team1;
      } else {
        const p1HighestCard = getCardHighestSuitAndValue(p1Cards);
        const p2HighestCard = getCardHighestSuitAndValue(p2Cards);

        if (suitRank[p1HighestCard.suit] !== suitRank[p2HighestCard.suit]) {
          const isPlayer1Winner =
            suitRank[p1HighestCard.suit] > suitRank[p2HighestCard.suit];
          winner = `${isPlayer1Winner ? currentPlayer1 : currentPlayer2} from Team ${isPlayer1Winner ? '1' : '2'} Wins by Suit!`;
          losingTeam = isPlayer1Winner ? team2 : team1;
        } else {
          const isPlayer1Winner =
            p1HighestCard.value === 1 ||
            (p2HighestCard.value !== 1 &&
              p1HighestCard.value > p2HighestCard.value);
          winner = `${isPlayer1Winner ? currentPlayer1 : currentPlayer2} from Team ${isPlayer1Winner ? '1' : '2'} Wins By Highest Card in Suit!`;
          losingTeam = isPlayer1Winner ? team2 : team1;
        }
      }

      setWinner(winner);
      setTeam1((prevTeam1) =>
        prevTeam1 === losingTeam ? prevTeam1.slice(1) : prevTeam1
      );
      setTeam2((prevTeam2) =>
        prevTeam2 === losingTeam ? prevTeam2.slice(1) : prevTeam2
      );

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
        style={{ width: '150px', marginRight: '10px' }}
      />
    ));
  };
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Thorlit 3Key</h1>

      {!gameStarted && !gameOver && (
        <div>
          <input
            hidden
            type="file"
            name="memberListcsv"
            id="memberListcsv"
            ref={inputRef}
            onChange={handleFileChange}
          />
          {team1.length === 0 && team2.length === 0 && (
            <div>
              <button
                onClick={triggerLoadTeamMember}
                style={{ padding: '10px 20px', marginTop: '10px' }}
              >
                Load the team members
              </button>
            </div>
          )}
          <button
            onClick={startGame}
            style={{ padding: '10px 20px', marginTop: '10px' }}
          >
            Start Game
          </button>
        </div>
      )}

      {gameStarted && !gameOver && (
        <div>
          <h2>Current Round {roundNumber}</h2>
          <div style={{ marginTop: '20px', display: 'flex' }}>
            <div style={{ marginTop: '20px', flex: 1 }}>
              <h2>Player 1 ({currentPlayer1})</h2>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div>
                  <h2>Team 1 Members:</h2>
                  <ul>
                    {team1.map((member, index) => (
                      <li key={index}>{member}</li>
                    ))}
                  </ul>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      marginTop: '10px'
                    }}
                  >
                    <button
                      onClick={player1Draw}
                      style={{
                        padding: '20px 40px',
                        fontSize: '20px',
                        marginBottom: 30,
                        color: 'black'
                      }}
                      disabled={player1Cards.length > 0}
                    >
                      Draw Cards
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                      {renderTheCards(
                        player1Cards.length > 0 ? player1Cards : CARDS_COVER
                      )}
                    </div>
                  </div>
                  <h2 style={{ margin: '0 40px', fontSize: 60 }}>
                    {player1Sum}
                  </h2>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', flex: 1 }}>
              <h2>Player 2 ({currentPlayer2})</h2>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <h2 style={{ margin: '0 40px', fontSize: 60 }}>
                    {player2Sum}
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      flexDirection: 'column',

                      marginTop: '10px'
                    }}
                  >
                    <button
                      onClick={player2Draw}
                      style={{
                        padding: '20px 40px',
                        fontSize: '20px',
                        marginBottom: 30,
                        color: 'black'
                      }}
                      disabled={player2Cards.length > 0}
                    >
                      Draw Cards
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                      {renderTheCards(
                        player2Cards.length > 0 ? player2Cards : CARDS_COVER
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h2>Team 2 Members:</h2>
                  <ul>
                    {team2.map((member, index) => (
                      <li key={index}>{member}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h2>{winner}</h2>
          </div>

          {winner && (
            <button
              onClick={() => nextRound(team1, team2)}
              style={{
                padding: '20px 40px',
                fontSize: '20px',
                marginBottom: 10
              }}
            >
              Next Round
            </button>
          )}
        </div>
      )}

      {gameOver && (
        <div>
          <h2>Game Over</h2>
          <h2>{winner}</h2>
          <img src="/images/the-end.webp" alt="" width="600" />
        </div>
      )}
    </div>
  );
};

export default CardGame;
