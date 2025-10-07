import { useState } from 'react';

export interface PowerUpsAllocation {
  secondChance: number;
  revealTwo: number;
  lifeShield: number;
  lockAll: number;
  removeWorst: number;
}

export type SetupMode = 'team1' | 'team2' | null;

export const usePowerupAllocation = () => {
  const [team1Alloc, setTeam1Alloc] = useState<PowerUpsAllocation>({
    secondChance: 0,
    revealTwo: 0,
    lifeShield: 0,
    lockAll: 0,
    removeWorst: 0,
  });

  const [team2Alloc, setTeam2Alloc] = useState<PowerUpsAllocation>({
    secondChance: 0,
    revealTwo: 0,
    lifeShield: 0,
    lockAll: 0,
    removeWorst: 0,
  });

  const [setupMode, setSetupMode] = useState<SetupMode>(null);

  return {
    team1Alloc,
    setTeam1Alloc,
    team2Alloc,
    setTeam2Alloc,
    setupMode,
    setSetupMode,
  };
};