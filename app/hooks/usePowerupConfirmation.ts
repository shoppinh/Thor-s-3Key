import { useCallback } from 'react';
import DuelData from '~/models/DuelData';
import TeamData from '~/models/TeamData';
import Card from '~/models/Card';
import { calculateSum, getCardHighestSuitAndValue } from '~/utils/gameUtil';

interface UsePowerupConfirmationProps {
  confirmPopup: {
    teamName: 'team1' | 'team2' | null;
    chanceType: 'secondChance' | 'revealTwo' | 'lifeShield' | 'lockAll' | 'removeWorst' | null;
  };
  setConfirmPopup: React.Dispatch<React.SetStateAction<{
    isVisible: boolean;
    teamName: 'team1' | 'team2' | null;
    chanceType: 'secondChance' | 'revealTwo' | 'lifeShield' | 'lockAll' | 'removeWorst' | null;
    chanceItemName: string;
  }>>;
  setTeam1Data: React.Dispatch<React.SetStateAction<TeamData>>;
  setTeam2Data: React.Dispatch<React.SetStateAction<TeamData>>;
  setDuelData: React.Dispatch<React.SetStateAction<DuelData>>;
  duelData: DuelData;
  implementSecondChance: () => void;
  implementRevealTwo: () => void;
}

export const usePowerupConfirmation = ({
  confirmPopup,
  setConfirmPopup,
  setTeam1Data,
  setTeam2Data,
  setDuelData,
  duelData,
  implementSecondChance,
  implementRevealTwo,
}: UsePowerupConfirmationProps) => {
  const handleConfirmChance = useCallback(() => {
    const { teamName, chanceType } = confirmPopup;

    if (!teamName || !chanceType) {
      setConfirmPopup({
        isVisible: false,
        teamName: null,
        chanceType: null,
        chanceItemName: ''
      });
      return;
    }

    const setTeamData = teamName === 'team1' ? setTeam1Data : setTeam2Data;

    switch (chanceType) {
      case 'secondChance':
        setTeamData((prev) => ({
          ...prev,
          powerUps: { ...prev.powerUps, secondChance: prev.powerUps.secondChance - 1 },
          totalPowerUps: prev.totalPowerUps - 1
        }));
        implementSecondChance();
        setDuelData((prev) => ({
          ...prev,
          secondChanceUsedByTeams: [ ...(prev.secondChanceUsedByTeams || []), teamName ]
        }));
        break;

      case 'revealTwo':
        setTeamData((prev) => ({
          ...prev,
          powerUps: { ...prev.powerUps, revealTwo: prev.powerUps.revealTwo - 1 },
          totalPowerUps: prev.totalPowerUps - 1
        }));
        setDuelData((prev) => ({ ...prev, revealTwoUsedBy: teamName }));
        implementRevealTwo();
        break;

      case 'lifeShield':
        setTeamData((prev) => ({
          ...prev,
          powerUps: { ...prev.powerUps, lifeShield: prev.powerUps.lifeShield - 1 },
          totalPowerUps: prev.totalPowerUps - 1
        }));
        setDuelData((prev) => ({ ...prev, lifeShieldUsedBy: teamName }));
        break;

      case 'lockAll':
        setTeamData((prev) => ({
          ...prev,
          powerUps: { ...prev.powerUps, lockAll: prev.powerUps.lockAll - 1 },
          totalPowerUps: prev.totalPowerUps - 1
        }));
        setDuelData((prev) => ({ ...prev, lockAllUsedBy: teamName }));
        break;

      case 'removeWorst': {
        const disabled = new Set(duelData.removedWorstGroups || []);
        const availableGroups: { key: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right'; cards: Card[] }[] = [];
        if (!duelData.topLeftRevealed && !disabled.has('top-left')) availableGroups.push({ key: 'top-left', cards: duelData.topLeftCards });
        if (!duelData.bottomLeftRevealed && !disabled.has('bottom-left')) availableGroups.push({ key: 'bottom-left', cards: duelData.bottomLeftCards });
        if (!duelData.topRightRevealed && !disabled.has('top-right')) availableGroups.push({ key: 'top-right', cards: duelData.topRightCards });
        if (!duelData.bottomRightRevealed && !disabled.has('bottom-right')) availableGroups.push({ key: 'bottom-right', cards: duelData.bottomRightCards });

        if (availableGroups.length > 1) {
          let worst = availableGroups[0];
          for (let i = 1; i < availableGroups.length; i++) {
            const a = worst;
            const b = availableGroups[i];
            const sumA = calculateSum(a.cards);
            const sumB = calculateSum(b.cards);
            if (sumB < sumA || (sumB === sumA && getCardHighestSuitAndValue(b.cards).suit < getCardHighestSuitAndValue(a.cards).suit)) {
              worst = b;
            }
          }

          setTeamData((prev) => ({
            ...prev,
            powerUps: { ...prev.powerUps, removeWorst: prev.powerUps.removeWorst - 1 },
            totalPowerUps: prev.totalPowerUps - 1
          }));
          setDuelData((prev) => ({
            ...prev,
            removedWorstGroups: [ ...(prev.removedWorstGroups || []), worst.key ],
            removeWorstUsedByTeams: [ ...(prev.removeWorstUsedByTeams || []), teamName ]
          }));
        }
        break;
      }
    }

    // Hide popup
    setConfirmPopup({
      isVisible: false,
      teamName: null,
      chanceType: null,
      chanceItemName: ''
    });
  }, [confirmPopup, setConfirmPopup, setTeam1Data, setTeam2Data, setDuelData, duelData, implementSecondChance, implementRevealTwo]);

  const handleCancelChance = useCallback(() => {
    setConfirmPopup({
      isVisible: false,
      teamName: null,
      chanceType: null,
      chanceItemName: ''
    });
  }, [setConfirmPopup]);

  return { handleConfirmChance, handleCancelChance };
};