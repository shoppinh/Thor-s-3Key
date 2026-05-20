import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPlayersFromSheet } from './sheetService';

describe('loadPlayersFromSheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches sheet rows and returns ordered setup rosters', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        values: [
          ['Team 1', 'Team 2'],
          [' Alice ', 'Bob'],
          ['', 'Cindy'],
          ['Dan', '']
        ]
      })
    } as Response);

    await expect(
      loadPlayersFromSheet({
        apiKey: 'api-key',
        sheetId: 'sheet-id',
        sheetRange: 'Roster!A1:B30'
      })
    ).resolves.toEqual({
      team1: ['Alice', 'Dan'],
      team2: ['Bob', 'Cindy']
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/Roster!A1:B30?key=api-key'
    );
  });

  it('throws when the sheet request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden'
    } as Response);

    await expect(
      loadPlayersFromSheet({
        apiKey: 'api-key',
        sheetId: 'sheet-id',
        sheetRange: 'Roster!A1:B30'
      })
    ).rejects.toThrow('Failed to fetch sheet data: 403 Forbidden');
  });

  it('throws when the sheet has no values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    await expect(
      loadPlayersFromSheet({
        apiKey: 'api-key',
        sheetId: 'sheet-id',
        sheetRange: 'Roster!A1:B30'
      })
    ).rejects.toThrow('Sheet contains no data');
  });
});
