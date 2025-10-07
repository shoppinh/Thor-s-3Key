import { useState } from 'react';
import TeamData from '~/models/TeamData';

export type PowerUpsAllocation = {
  secondChance: number;
  revealTwo: number;
  lifeShield: number;
  lockAll: number;
  removeWorst: number;
};

export type SetupMode = 'per-team' | 'both' | 'random';

export const usePowerupAllocation = (team1Data: TeamData, team2Data: TeamData) => {
  const [team1Alloc, setTeam1Alloc] = useState<PowerUpsAllocation>({
    secondChance: team1Data.powerUps.secondChance,
    revealTwo: team1Data.powerUps.revealTwo,
    lifeShield: team1Data.powerUps.lifeShield,
    lockAll: team1Data.powerUps.lockAll,
    removeWorst: team1Data.powerUps.removeWorst ?? 0
  });
  const [team2Alloc, setTeam2Alloc] = useState<PowerUpsAllocation>({
    secondChance: team2Data.powerUps.secondChance,
    revealTwo: team2Data.powerUps.revealTwo,
    lifeShield: team2Data.powerUps.lifeShield,
    lockAll: team2Data.powerUps.lockAll,
    removeWorst: team2Data.powerUps.removeWorst ?? 0
  });
  const [setupMode, setSetupMode] = useState<SetupMode>('per-team');
  const [setupForBothTeams, setSetupForBothTeams] = useState(false);

  const setBothTeamsAlloc = (key: keyof PowerUpsAllocation, value: number): void => {
    setTeam1Alloc((prev) => ({ ...prev, [key]: value }));
    setTeam2Alloc((prev) => ({ ...prev, [key]: value }));
  };

  const randomizeBothTeamsAllocation = (): void => {
    const total = team1Data.totalPowerUps;
    const maxPerType = 2;
    const result: PowerUpsAllocation = {
      secondChance: 0,
      revealTwo: 0,
      lifeShield: 0,
      lockAll: 0,
      removeWorst: 0
    };

    const keys: (keyof PowerUpsAllocation)[] = [
      'secondChance',
      'revealTwo',
      'lifeShield',
      'lockAll',
      'removeWorst'
    ];

    let placed = 0;
    while (placed < total) {
      const available = keys.filter((k) => result[k] < maxPerType);
      if (available.length === 0) break;
      const pick = available[Math.floor(Math.random() * available.length)];
      result[pick] += 1;
      placed += 1;
    }

    setTeam1Alloc(result);
    setTeam2Alloc(result);
  };

  return {
    team1Alloc,
    setTeam1Alloc,
    team2Alloc,
    setTeam2Alloc,
    setupMode,
    setSetupMode,
    setupForBothTeams,
    setSetupForBothTeams,
    setBothTeamsAlloc,
    randomizeBothTeamsAllocation,
  };
};