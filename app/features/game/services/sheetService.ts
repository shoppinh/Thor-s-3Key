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
}: LoadPlayersParams): Promise<{ teams: string[][] }> => {
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

  const teamCount = Math.max(...rows.map((row) => row.length), 0);
  if (teamCount < 2) {
    throw new Error('Sheet must contain at least 2 team columns');
  }

  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  const anonymousIndexes = Array.from({ length: teamCount }, () => 1);

  rows.slice(1).forEach((item) => {
    for (let columnIndex = 0; columnIndex < teamCount; columnIndex += 1) {
      if (item[columnIndex]) {
        teams[columnIndex].push(item[columnIndex]);
      } else {
        teams[columnIndex].push(
          `${anonymousLabel} #${anonymousIndexes[columnIndex]}`
        );
        anonymousIndexes[columnIndex] += 1;
      }
    }
  });

  return { teams: teams.map((team) => shuffleArray(team)) };
};
