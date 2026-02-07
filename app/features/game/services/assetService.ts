import { preloadImages } from '~/utils/gameUtil';

const SUIT_NAMES: Record<string, string> = {
  '♦': 'diamonds',
  '♥': 'hearts',
  '♠': 'spades',
  '♣': 'clubs'
};

const numToName = (num: number): string => (num === 1 ? 'ace' : `${num}`);

export const getThemeExtraCardBacks = (theme: string): string[] => {
  switch (theme) {
    case 'christmas':
      return ['/images/back_card_christmas.png'];
    case 'jrpg':
      return ['/images/back_card_cyber.jpg'];
    default:
      return ['/images/back_card.png'];
  }
};

export const preloadGameImages = async (extraImages: string[]): Promise<void> => {
  const urls: string[] = [];
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((value) => {
    Object.keys(SUIT_NAMES).forEach((suit) => {
      urls.push(`/images/${numToName(value)}_of_${SUIT_NAMES[suit]}.png`);
    });
  });
  urls.push(...extraImages);
  await preloadImages(urls);
};
