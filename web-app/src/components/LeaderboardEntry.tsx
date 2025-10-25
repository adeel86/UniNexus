import { Trophy, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntryProps {
  rank: number;
  user: {
    name: string;
    username: string;
    avatar?: string;
    university: string;
  };
  score: number;
  change?: number;
}

export function LeaderboardEntry({ rank, user, score, change }: LeaderboardEntryProps) {
  const getRankBadge = () => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600";
    return "bg-muted";
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover-elevate" data-testid={`leaderboard-entry-${rank}`}>
      <div className={`h-10 w-10 rounded-full ${getRankBadge()} flex items-center justify-center flex-shrink-0`}>
        {rank <= 3 ? (
          <Trophy className="h-5 w-5 text-white" />
        ) : (
          <span className="font-display font-bold text-foreground" data-testid="text-rank">#{rank}</span>
        )}
      </div>
      
      <Avatar className="ring-2 ring-primary/10">
        <AvatarImage src={user.avatar} />
        <AvatarFallback>
          {user.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm" data-testid="text-user-name">{user.name}</h4>
        <p className="text-xs text-muted-foreground">@{user.username} · {user.university}</p>
      </div>
      
      <div className="text-right">
        <p className="text-lg font-display font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent" data-testid="text-score">
          {score.toLocaleString()}
        </p>
        {change !== undefined && (
          <Badge variant="secondary" className={`text-xs ${change > 0 ? 'text-green-600' : 'text-chart-3'}`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {change > 0 ? '+' : ''}{change}
          </Badge>
        )}
      </div>
    </div>
  );
}
