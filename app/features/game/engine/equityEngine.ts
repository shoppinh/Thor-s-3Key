import DuelData from '~/models/DuelData';
import Card from '~/models/Card';
import { Side } from '~/features/game/types/gameTypes';
import { compareHands, createDeck } from '~/utils/gameUtil';
import { getPlayerDataBySide } from './duelEngine';

export type DuelEquitySide = {
  winRate: number;
  equity: number;
};

export type DuelEquity = {
  player1: DuelEquitySide;
  player2: DuelEquitySide;
};

const hasCompleteHand = (cards: Card[]): boolean => {
  return cards.length === 3 && cards.every((card) => card.value > 0 && card.suit);
};

const isSameCard = (left: Card, right: Card): boolean => {
  return left.value === right.value && left.suit === right.suit;
};

const createEquity = (player1WinRate: number): DuelEquity => {
  const player2WinRate = 100 - player1WinRate;
  return {
    player1: {
      winRate: player1WinRate,
      equity: player1WinRate
    },
    player2: {
      winRate: player2WinRate,
      equity: player2WinRate
    }
  };
};

const createThreeCardCombinations = (cards: Card[]): Card[][] => {
  const combinations: Card[][] = [];

  for (let first = 0; first < cards.length - 2; first++) {
    for (let second = first + 1; second < cards.length - 1; second++) {
      for (let third = second + 1; third < cards.length; third++) {
        combinations.push([cards[first], cards[second], cards[third]]);
      }
    }
  }

  return combinations;
};

const getSelectedCards = (
  duelData: DuelData,
  selectedSide?: Side
): Card[] | null => {
  if (!selectedSide) {
    return null;
  }

  const cards = getPlayerDataBySide(duelData, selectedSide).cards;
  return hasCompleteHand(cards) ? cards : null;
};

const calculatePlayer1PublicWinRate = (player1Cards: Card[]): number => {
  const possibleOpponentCards = createDeck().filter(
    (card) => !player1Cards.some((selected) => isSameCard(card, selected))
  );
  const possibleOpponentHands =
    createThreeCardCombinations(possibleOpponentCards);
  const player1Wins = possibleOpponentHands.filter(
    (opponentCards) => compareHands(player1Cards, opponentCards) === 'player1'
  ).length;

  return Math.round((player1Wins / possibleOpponentHands.length) * 100);
};

export const calculateDuelEquity = (
  duelData: DuelData
): DuelEquity | null => {
  const player1Cards = getSelectedCards(
    duelData,
    duelData.player1SideSelected
  );

  if (!player1Cards) {
    return null;
  }

  const player2Cards = getSelectedCards(
    duelData,
    duelData.player2SideSelected
  );

  if (player2Cards) {
    return createEquity(
      compareHands(player1Cards, player2Cards) === 'player1' ? 100 : 0
    );
  }

  return createEquity(calculatePlayer1PublicWinRate(player1Cards));
};
