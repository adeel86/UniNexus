import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  useUniversityDashboard,
  type LeaderboardEntry,
} from "@/components/university";

const TIER_COLORS: Record<string, string> = {
  platinum: "bg-gradient-to-r from-purple-400 to-indigo-400 text-white",
  gold: "bg-gradient-to-r from-yellow-400 to-amber-400 text-white",
  silver: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800",
  bronze: "bg-gradient-to-r from-orange-300 to-amber-500 text-white",
};

export default function UniversityLeaderboard() {
  const { userData: currentUser } = useAuth();
  const { leaderboard, isLeaderboardLoading } = useUniversityDashboard();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-heading font-semibold text-lg">University Leaderboard</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            Top students · {currentUser?.university ?? 'your university'}
          </Badge>
        </div>

        {isLeaderboardLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No student data yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry: LeaderboardEntry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                data-testid={`leaderboard-entry-${entry.id}`}
              >
                <div className="w-8 text-center font-bold text-sm text-muted-foreground">
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                </div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                  {entry.firstName?.[0]}{entry.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {entry.firstName} {entry.lastName}
                  </div>
                  {entry.major && (
                    <div className="text-xs text-muted-foreground truncate">{entry.major}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm">{entry.totalPoints.toLocaleString()} pts</div>
                  <Badge className={`text-xs capitalize ${TIER_COLORS[entry.rankTier] || TIER_COLORS.bronze}`}>
                    {entry.rankTier}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
