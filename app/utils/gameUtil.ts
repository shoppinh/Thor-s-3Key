import Card from '~/models/Card';

// Card values (1-9) and suits
export const cardValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const suits = ['♦', '♥', '♠', '♣']; // Suit hierarchy: Diamond > Heart > Spade > Club
export const suitRank: { [key: string]: number } = {
  '♦': 4,
  '♥': 3,
  '♠': 2,
  '♣': 1
};

export const CARDS_COVER = [
  { value: 0, suit: '' },
  { value: 0, suit: '' },
  { value: 0, suit: '' }
];

/**
 * Creates a full deck of cards
 * @returns Array of Card objects representing a complete deck
 */
export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  cardValues.forEach((value) => {
    suits.forEach((suit) => {
      deck.push({ value, suit });
    });
  });
  return deck;
};

/**
 * Shuffles a deck of cards using Fisher-Yates algorithm
 * @param deck - Array of cards to shuffle
 * @returns Shuffled array of cards
 */
export const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

/**
 * Shuffles an array of strings using Fisher-Yates algorithm
 * @param array - Array of strings to shuffle
 * @returns Shuffled array of strings
 */
export const shuffleArray = (array: string[]): string[] => {
  for (let i = array.length - 1; i > 0; i--) {
    // Generate a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap the elements at i and j
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Draws 3 unique cards from the deck
 * @param deck - Array of cards to draw from
 * @returns Array of 3 cards
 */
export const drawCards = (deck: Card[]): Card[] => {
  return deck.splice(0, 3);
};

/**
 * Maps numeric card values to their string representations
 * @param num - Numeric card value
 * @returns String representation of the card value
 */
export const mapNumToCardValues = (num: number): string => {
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

/**
 * Gets the image path for a card based on its value and suit
 * @param value - Card value
 * @param suit - Card suit
 * @returns Image file path for the card
 */
export const getCardImage = (value: number, suit: string): string => {
  const suitNames: { [key: string]: string } = {
    '♦': 'diamonds',
    '♥': 'hearts',
    '♠': 'spades',
    '♣': 'clubs'
  };
  if (mapNumToCardValues(value) === 'back') {
    return '/images/back_card.jpg';
  }
  return `/images/${mapNumToCardValues(value)}_of_${suitNames[suit]}.png`;
};

/**
 * Preloads a list of image URLs into the browser cache.
 * Returns a Promise that resolves when all images have attempted to load.
 */
export const preloadImages = (urls: string[]): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || urls.length === 0) {
      resolve();
      return;
    }
    let remaining = urls.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
    };
    urls.forEach((src) => {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
  });
};

/**
 * Calculates the sum of card values with special rule for values > 10
 * @param cards - Array of cards to calculate sum for
 * @returns Calculated sum (modulo 10 if > 10, or 10 if sum % 10 === 0)
 */
export const calculateSum = (cards: Card[]): number => {
  const sum = cards.reduce((sum, card) => sum + card.value, 0);
  return sum > 10 ? sum % 10 || 10 : sum;
};

/**
 * Determines the highest card from a player's cards based on suit hierarchy and value
 * @param cards - Array of cards to evaluate
 * @returns The highest card based on game rules
 */
export const getCardHighestSuitAndValue = (cards: Card[]): Card => {
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
};

/**
 * Determines the winner between two players and returns game result
 * @param p1Sum - Player 1's card sum
 * @param p2Sum - Player 2's card sum
 * @param p1Cards - Player 1's cards
 * @param p2Cards - Player 2's cards
 * @param p1Name - Player 1's name
 * @param p2Name - Player 2's name
 * @returns Object containing winner message and whether player 1 won
 */
export const determineWinner = (
  p1Sum: number,
  p2Sum: number,
  p1Cards: Card[],
  p2Cards: Card[],
  p1Name: string,
  p2Name: string
): { winner: string; isPlayer1Winner: boolean } => {
  let winner: string;
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

  return { winner, isPlayer1Winner };
};

/**
 * Checks which team a player belongs to
 * @param player - Player name to check
 * @param team1Players - Array of team 1 player names
 * @returns 'team1' or 'team2'
 */
export const getTeamByPlayer = (
  player: string,
  team1Players: string[]
): 'team1' | 'team2' => {
  return team1Players.includes(player) ? 'team1' : 'team2';
};
