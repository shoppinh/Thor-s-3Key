import { describe, expect, it } from 'vitest';
import {
  addRosterMember,
  moveRosterMember,
  parseSheetRowsToRosters,
  removeRosterMember,
  validateRosterSetup
} from './rosterSetup';

describe('parseSheetRowsToRosters', () => {
  it('skips the header, trims names, ignores blank cells, and preserves order', () => {
    const result = parseSheetRowsToRosters([
      ['Team 1', 'Team 2'],
      [' Alice ', ' Bob '],
      ['', ' Cindy'],
      ['Dan', '   '],
      [' ', ' '],
      ['Eve']
    ]);

    expect(result).toEqual({
      team1: ['Alice', 'Dan', 'Eve'],
      team2: ['Bob', 'Cindy']
    });
  });

  it('returns empty rosters when the sheet has only a header row', () => {
    expect(parseSheetRowsToRosters([['Team 1', 'Team 2']])).toEqual({
      team1: [],
      team2: []
    });
  });
});

describe('roster member changes', () => {
  it('adds a trimmed member to the requested team', () => {
    expect(addRosterMember(['Alice'], ' Bob ')).toEqual(['Alice', 'Bob']);
  });

  it('does not add an empty member', () => {
    expect(addRosterMember(['Alice'], '   ')).toEqual(['Alice']);
  });

  it('removes a member by index without mutating the original roster', () => {
    const roster = ['Alice', 'Bob', 'Cindy'];

    expect(removeRosterMember(roster, 1)).toEqual(['Alice', 'Cindy']);
    expect(roster).toEqual(['Alice', 'Bob', 'Cindy']);
  });

  it('moves a member within one team', () => {
    const result = moveRosterMember({
      team1: ['Alice', 'Bob', 'Cindy'],
      team2: ['Dan'],
      fromTeam: 'team1',
      fromIndex: 0,
      toTeam: 'team1',
      toIndex: 2
    });

    expect(result).toEqual({
      team1: ['Bob', 'Cindy', 'Alice'],
      team2: ['Dan']
    });
  });

  it('moves a member between teams at the target index', () => {
    const result = moveRosterMember({
      team1: ['Alice', 'Bob'],
      team2: ['Cindy', 'Dan'],
      fromTeam: 'team1',
      fromIndex: 1,
      toTeam: 'team2',
      toIndex: 1
    });

    expect(result).toEqual({
      team1: ['Alice'],
      team2: ['Cindy', 'Bob', 'Dan']
    });
  });

  it('ignores invalid source indexes', () => {
    const result = moveRosterMember({
      team1: ['Alice'],
      team2: ['Bob'],
      fromTeam: 'team1',
      fromIndex: 5,
      toTeam: 'team2',
      toIndex: 0
    });

    expect(result).toEqual({
      team1: ['Alice'],
      team2: ['Bob']
    });
  });
});

describe('validateRosterSetup', () => {
  it('accepts one or more unique members per team', () => {
    expect(validateRosterSetup(['Alice'], ['Bob'])).toEqual({
      isValid: true,
      errors: []
    });
  });

  it('rejects empty teams', () => {
    expect(validateRosterSetup([], ['Bob']).errors).toContain(
      'Each team must have at least one member.'
    );
  });

  it('rejects blank names after trimming', () => {
    expect(validateRosterSetup(['Alice', '   '], ['Bob']).errors).toContain(
      'Member names cannot be blank.'
    );
  });

  it('rejects duplicate names across both teams case-insensitively', () => {
    expect(validateRosterSetup(['Alice'], [' alice ']).errors).toContain(
      'Member names must be unique across both teams.'
    );
  });
});
