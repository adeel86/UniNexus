import { 
  Trophy, 
  Star, 
  Shield, 
  Zap, 
  Award, 
  Target,
  Flame,
  Heart,
  Users,
  BookOpen,
  Code,
  Sparkles,
  LucideIcon
} from "lucide-react";
import { Badge as BadgeType } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgeIconProps {
  badge: BadgeType;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  star: Star,
  shield: Shield,
  zap: Zap,
  award: Award,
  target: Target,
  flame: Flame,
  heart: Heart,
  users: Users,
  book: BookOpen,
  code: Code,
  sparkles: Sparkles,
};

const tierColors = {
  bronze: "from-amber-700 to-amber-900",
  silver: "from-gray-300 to-gray-500",
  gold: "from-yellow-400 to-yellow-600",
  platinum: "from-purple-400 to-pink-500",
};

export function BadgeIcon({ badge, size = "md", showTooltip = true }: BadgeIconProps) {
  const Icon = iconMap[badge.icon] || Trophy;
  
  const sizeClasses = {
    sm: "h-8 w-8 p-1.5",
    md: "h-12 w-12 p-2.5",
    lg: "h-16 w-16 p-3.5",
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 28,
  };

  const badgeElement = (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        bg-gradient-to-br ${tierColors[badge.tier as keyof typeof tierColors] || tierColors.bronze}
        shadow-lg
        flex items-center justify-center
        hover:scale-110 transition-transform duration-200
      `}
      data-testid={`badge-${badge.id}`}
    >
      <Icon size={iconSizes[size]} className="text-white" />
    </div>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
            <p className="text-xs text-primary font-medium capitalize">{badge.tier} Tier</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
