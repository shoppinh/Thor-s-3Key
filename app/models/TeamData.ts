export default interface TeamData {
  name: string;
  score: number;
  scoreClass: string;
  totalChance: number;
  useChanceSecond: boolean;
  useChanceReveal: boolean;
  useSwapDestiny: boolean;
  usePeekMaster: boolean;
  useShieldGuardian: boolean;
  useChaosReshuffle: boolean;
  useMirrorStrike: boolean;
  useDoubleEdge: boolean;
  players: string[];
  shieldedPlayer?: string; // Player protected by Shield Guardian
}
