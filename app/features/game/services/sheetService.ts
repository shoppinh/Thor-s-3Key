import { shuffleArray } from '~/utils/gameUtil';

type LoadPlayersParams = {
  apiKey: string;
  sheetId: string;
  sheetRange: string;
  anonymousLabel: string;
};

export const loadPlayersFromSheet = async ({
  apiKey,
  sheetId,
  sheetRange,
  anonymousLabel
}: LoadPlayersParams): Promise<{ team1: string[]; team2: string[] }> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange}?key=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
  }
  
  const data: { values?: string[][] } = await response.json();
  
  if (!data.values || data.values.length === 0) {
    throw new Error('Sheet contains no data');
  }
  
  const rows = data.values;

  const team1Temp: string[] = [];
  const team2Temp: string[] = [];
  let index1 = 1;
  let index2 = 1;

  rows.slice(1).forEach((item) => {
    if (item[0]) {
      team1Temp.push(item[0]);
    } else {
      team1Temp.push(`${anonymousLabel} #${index1}`);
      index1 += 1;
    }

    if (item[1]) {
      team2Temp.push(item[1]);
    } else {
      team2Temp.push(`${anonymousLabel} #${index2}`);
      index2 += 1;
    }
  });

  return {
    team1: shuffleArray(team1Temp),
    team2: shuffleArray(team2Temp)
  };
};
