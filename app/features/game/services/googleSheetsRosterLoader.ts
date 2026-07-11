import { loadPlayersFromSheet } from './sheetService';
import type { RosterLoader, LoadRosterInput } from './ports';
import type { SetupRosters } from './rosterSetup';

export class GoogleSheetsRosterLoader implements RosterLoader {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async loadRoster(input: LoadRosterInput): Promise<SetupRosters> {
    return loadPlayersFromSheet({
      apiKey: this.apiKey,
      sheetId: input.sheetId,
      sheetRange: input.sheetRange
    });
  }
}
