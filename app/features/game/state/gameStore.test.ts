import { describe, expect, it, vi } from 'vitest';
import { useGameStore } from './gameStore';
import { MatchRepository, RosterLoader } from '../services/ports';

class MockMatchRepository implements MatchRepository {
  saveMatch = vi.fn().mockResolvedValue(true);
}

class MockRosterLoader implements RosterLoader {
  loadRoster = vi.fn().mockResolvedValue({
    team1: ['Player A1', 'Player A2', 'Player A3'],
    team2: ['Player B1', 'Player B2', 'Player B3']
  });
}

describe('gameStore', () => {
  it('initializes with repository and loader and can configure settings', () => {
    const mockRepo = new MockMatchRepository();
    const mockLoader = new MockRosterLoader();
    const t = (key: string) => key;

    const { initialize, setSheetId, setSetupMode } = useGameStore.getState();

    initialize({ matchRepository: mockRepo, rosterLoader: mockLoader, t });

    setSheetId('test-sheet-id');
    setSetupMode('both');

    expect(useGameStore.getState().sheetId).toBe('test-sheet-id');
    expect(useGameStore.getState().setupMode).toBe('both');
  });

  it('updates setup rosters correctly', () => {
    const { addSetupRosterMember, removeSetupRosterMember, moveSetupRosterMember } = useGameStore.getState();

    // Reset setup rosters to initial empty states or test defaults
    useGameStore.setState({
      setupTeam1Roster: ['P1', 'P2'],
      setupTeam2Roster: ['Q1', 'Q2']
    });

    addSetupRosterMember('team1', 'P3');
    expect(useGameStore.getState().setupTeam1Roster).toEqual(['P1', 'P2', 'P3']);

    removeSetupRosterMember('team1', 0);
    expect(useGameStore.getState().setupTeam1Roster).toEqual(['P2', 'P3']);

    moveSetupRosterMember('team1', 0, 'team2', 0);
    expect(useGameStore.getState().setupTeam1Roster).toEqual(['P3']);
    expect(useGameStore.getState().setupTeam2Roster).toEqual(['P2', 'Q1', 'Q2']);
  });
});
