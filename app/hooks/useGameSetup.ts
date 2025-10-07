import { useState } from 'react';
import { preloadImages, shuffleArray } from '~/utils/gameUtil';
import TeamData from '~/models/TeamData';
import { PowerUpsAllocation } from './usePowerupAllocation';

type RootContext = {
  API_KEY: string;
  SITE_URL?: string;
  ANALYTICS_DOMAIN?: string;
  TWITTER_HANDLE?: string;
};

export const useGameSetup = (clientSecrets: RootContext | null) => {
  const SHEET_ID = '1xFtX7mZT1yiEd4EyD6Wc4PF3LvMq9M3EzHnDdLqPaxM';
  const SHEET_RANGE = '3Key Game!A1:B30';
  const API_KEY = clientSecrets?.API_KEY ?? '';

  const [sheetId, setSheetId] = useState(SHEET_ID);
  const [sheetRange, setSheetRange] = useState(SHEET_RANGE);

  const numToName = (num: number): string => (num === 1 ? 'ace' : num.toString());

  const startGame = async (
    setGameState: (state: string) => void,
    setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>,
    setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>,
    team1Alloc: PowerUpsAllocation,
    team2Alloc: PowerUpsAllocation,
    setupMode: string,
    startGameWithTeams: (team1: string[], team2: string[]) => void
  ) => {
    setGameState('gameLoading');

    // Preload all card images
    try {
      const allValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const suitNames: { [key: string]: string } = {
        '♦': 'diamonds',
        '♥': 'hearts',
        '♠': 'spades',
        '♣': 'clubs'
      };
      const extraImages = ['/images/back_card.png'];
      const urls: string[] = [];
      allValues.forEach((v) => {
        Object.keys(suitNames).forEach((s) => {
          const suit = suitNames[s];
          urls.push(`/images/${numToName(v)}_of_${suit}.png`);
        });
      });
      urls.push(...extraImages);
      await preloadImages(urls);
    } catch (error) {
      console.error('Error preloading images:', error);
    }

    // Load team player names from Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const team1Temp: string[] = [];
      const team2Temp: string[] = [];
      let index = 1;
      data.values.slice(1).forEach((item: string[]) => {
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

      // Respect setup mode at start
      if (setupMode === 'both' || setupMode === 'random') {
        setTeam1Data((prev) => ({ ...prev, players: shuffledTeam1, powerUps: { ...team1Alloc } }));
        setTeam2Data((prev) => ({ ...prev, players: shuffledTeam2, powerUps: { ...team1Alloc } }));
      } else {
        setTeam1Data((prev) => ({ ...prev, players: shuffledTeam1, powerUps: { ...team1Alloc } }));
        setTeam2Data((prev) => ({ ...prev, players: shuffledTeam2, powerUps: { ...team2Alloc } }));
      }

      startGameWithTeams(shuffledTeam1, shuffledTeam2);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return {
    sheetId,
    setSheetId,
    sheetRange,
    setSheetRange,
    startGame,
  };
};