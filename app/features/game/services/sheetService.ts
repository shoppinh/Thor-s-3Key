import { parseSheetRowsToRosters, type SetupRosters } from './rosterSetup';

type LoadPlayersParams = {
  apiKey: string;
  sheetId: string;
  sheetRange: string;
};

export const loadPlayersFromSheet = async ({
  apiKey,
  sheetId,
  sheetRange
}: LoadPlayersParams): Promise<SetupRosters> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange}?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sheet data: ${response.status} ${response.statusText}`
    );
  }

  const data: { values?: string[][] } = await response.json();

  if (!data.values || data.values.length === 0) {
    throw new Error('Sheet contains no data');
  }

  return parseSheetRowsToRosters(data.values);
};
