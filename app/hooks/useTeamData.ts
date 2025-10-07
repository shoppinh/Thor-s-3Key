import { useState } from 'react';
import TeamData from '~/models/TeamData';

export const useTeamData = () => {
  const [team1Data, setTeam1Data] = useState<TeamData>({
    name: 'Team 1',
    score: 0,
    scoreClass: '',
    totalPowerUps: 4,
    powerUps: { secondChance: 1, revealTwo: 1, lifeShield: 1, lockAll: 1, removeWorst: 0 },
    players: []
  });
  const [team2Data, setTeam2Data] = useState<TeamData>({
    name: 'Team 2',
    score: 0,
    scoreClass: '',
    totalPowerUps: 4,
    powerUps: { secondChance: 1, revealTwo: 1, lifeShield: 1, lockAll: 1, removeWorst: 0 },
    players: []
  });

  return {
    team1Data,
    setTeam1Data,
    team2Data,
    setTeam2Data,
  };
};