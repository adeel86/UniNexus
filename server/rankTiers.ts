export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface RankTierInfo {
  tier: RankTier;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  gradient: string;
}

export const RANK_TIERS: RankTierInfo[] = [
  {
    tier: 'bronze',
    minPoints: 0,
    maxPoints: 999,
    color: '#CD7F32',
    gradient: 'from-amber-700 to-amber-900'
  },
  {
    tier: 'silver',
    minPoints: 1000,
    maxPoints: 2999,
    color: '#C0C0C0',
    gradient: 'from-gray-300 to-gray-500'
  },
  {
    tier: 'gold',
    minPoints: 3000,
    maxPoints: 6999,
    color: '#FFD700',
    gradient: 'from-yellow-400 to-yellow-600'
  },
  {
    tier: 'platinum',
    minPoints: 7000,
    maxPoints: null,
    color: '#E5E4E2',
    gradient: 'from-purple-400 to-pink-500'
  },
];

export function calculateTotalPoints(
  engagementScore: number,
  problemSolverScore: number,
  endorsementScore: number,
  challengePoints: number
): number {
  return engagementScore + problemSolverScore + endorsementScore + challengePoints;
}

export function getRankTier(totalPoints: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (totalPoints >= RANK_TIERS[i].minPoints) {
      return RANK_TIERS[i].tier;
    }
  }
  return 'bronze';
}

export function getRankTierInfo(tier: RankTier): RankTierInfo {
  return RANK_TIERS.find(t => t.tier === tier) || RANK_TIERS[0];
}

export function getNextRankTier(currentTier: RankTier): RankTierInfo | null {
  const currentIndex = RANK_TIERS.findIndex(t => t.tier === currentTier);
  if (currentIndex === -1 || currentIndex === RANK_TIERS.length - 1) {
    return null;
  }
  return RANK_TIERS[currentIndex + 1];
}

export function calculateChallengePoints(rank: number | null, participantCount: number): number {
  if (!rank) return 50; // Participation points
  
  const rankPercentile = (rank / Math.max(participantCount, 1)) * 100;
  
  if (rank === 1) return 500; // 1st place
  if (rank === 2) return 300; // 2nd place
  if (rank === 3) return 200; // 3rd place
  if (rankPercentile <= 10) return 150; // Top 10%
  if (rankPercentile <= 25) return 100; // Top 25%
  
  return 50; // Participation
}
