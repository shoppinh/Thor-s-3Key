import { useState } from 'react';
import TeamData from '~/models/TeamData';

export const useTeamData = () => {
  const [team1Data, setTeam1Data] = useState<TeamData>({
    name: '',
    players: [],
    score: 0,
    scoreClass: '',
    totalPowerUps: 0,
    powerUps: {
      secondChance: 0,
      revealTwo: 0,
      lifeShield: 0,
      lockAll: 0,
      removeWorst: 0,
    },
  });

  const [team2Data, setTeam2Data] = useState<TeamData>({
    name: '',
    players: [],
    score: 0,
    scoreClass: '',
    totalPowerUps: 0,
    powerUps: {
      secondChance: 0,
      revealTwo: 0,
      lifeShield: 0,
      lockAll: 0,
      removeWorst: 0,
    },
  });

  return {
    team1Data,
    setTeam1Data,
    team2Data,
    setTeam2Data,
  };
};