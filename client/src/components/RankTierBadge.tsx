import { Trophy, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface RankTierInfo {
  tier: RankTier;
  label: string;
  minPoints: number;
  maxPoints: number | null;
  gradient: string;
  icon: typeof Trophy;
}

const RANK_TIERS: RankTierInfo[] = [
  {
    tier: 'bronze',
    label: 'Bronze',
    minPoints: 0,
    maxPoints: 999,
    gradient: 'from-amber-700 to-amber-900',
    icon: Award,
  },
  {
    tier: 'silver',
    label: 'Silver',
    minPoints: 1000,
    maxPoints: 2999,
    gradient: 'from-gray-300 to-gray-500',
    icon: Award,
  },
  {
    tier: 'gold',
    label: 'Gold',
    minPoints: 3000,
    maxPoints: 6999,
    gradient: 'from-yellow-400 to-yellow-600',
    icon: Trophy,
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    minPoints: 7000,
    maxPoints: null,
    gradient: 'from-purple-400 to-pink-500',
    icon: Trophy,
  },
];

function getRankTierInfo(tier: RankTier): RankTierInfo {
  return RANK_TIERS.find(t => t.tier === tier) || RANK_TIERS[0];
}

function getNextRankTier(currentTier: RankTier): RankTierInfo | null {
  const currentIndex = RANK_TIERS.findIndex(t => t.tier === currentTier);
  if (currentIndex === -1 || currentIndex === RANK_TIERS.length - 1) {
    return null;
  }
  return RANK_TIERS[currentIndex + 1];
}

interface RankTierBadgeProps {
  rankTier: RankTier;
  totalPoints?: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export function RankTierBadge({ 
  rankTier, 
  totalPoints = 0, 
  size = 'md', 
  showProgress = false,
  className 
}: RankTierBadgeProps) {
  const tierInfo = getRankTierInfo(rankTier);
  const nextTier = getNextRankTier(rankTier);
  const Icon = tierInfo.icon;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const progress = nextTier
    ? Math.min(
        100,
        ((totalPoints - tierInfo.minPoints) /
          (nextTier.minPoints - tierInfo.minPoints)) *
          100
      )
    : 100;

  return (
    <div className={cn("flex flex-col gap-2", className)} data-testid="rank-tier-badge">
      <div className="flex items-center gap-2">
        <Badge 
          className={cn(
            `bg-gradient-to-r ${tierInfo.gradient} text-white border-0`,
            sizeClasses[size]
          )}
          data-testid={`badge-rank-${rankTier}`}
        >
          <Icon className={cn(iconSizes[size], "mr-1")} />
          {tierInfo.label}
        </Badge>
        {totalPoints > 0 && (
          <span className="text-xs text-muted-foreground" data-testid="text-total-points">
            {totalPoints.toLocaleString()} pts
          </span>
        )}
      </div>

      {showProgress && nextTier && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-white">
            <span>Progress to {nextTier.label}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2" data-testid="progress-bar">
            <div
              className={cn(
                `h-2 rounded-full bg-gradient-to-r ${nextTier.gradient} transition-all duration-300`
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-white">
            {nextTier.minPoints - totalPoints} points to {nextTier.label}
          </div>
        </div>
      )}
    </div>
  );
}

interface RankTierIconProps {
  rankTier: RankTier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RankTierIcon({ rankTier, size = 'md', className }: RankTierIconProps) {
  const tierInfo = getRankTierInfo(rankTier);
  const Icon = tierInfo.icon;

  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-10 w-10 p-2',
    lg: 'h-16 w-16 p-3',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={cn(
        `bg-gradient-to-br ${tierInfo.gradient} rounded-full flex items-center justify-center`,
        sizeClasses[size],
        className
      )}
      data-testid={`icon-rank-${rankTier}`}
    >
      <Icon className={cn(iconSizes[size], "text-white")} />
    </div>
  );
}
