import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, TrendingUp, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { RankTierBadge } from "@/components/RankTierBadge";
import {
  useUniversityDashboard,
  type LeaderboardEntry,
} from "@/components/university";

export default function UniversityLeaderboard() {
  const { userData: currentUser } = useAuth();
  const { leaderboard, isLeaderboardLoading } = useUniversityDashboard();

  const engagementLeaders = [...leaderboard].sort(
    (a, b) => (b.engagementScore || 0) - (a.engagementScore || 0)
  );

  const problemSolverLeaders = [...leaderboard].sort(
    (a, b) => (b.problemSolverScore || 0) - (a.problemSolverScore || 0)
  );

  const challengeLeaders = [...leaderboard].sort(
    (a, b) => (b.challengePoints || 0) - (a.challengePoints || 0)
  );

  const LeaderboardList = ({
    entries,
    scoreKey,
    label,
  }: {
    entries: LeaderboardEntry[];
    scoreKey: "engagementScore" | "problemSolverScore" | "challengePoints";
    label: string;
  }) => {
    if (isLeaderboardLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (entries.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No student data yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const score = entry[scoreKey] || 0;
          const isTopThree = index < 3;

          return (
            <Card
              key={entry.id}
              className={`p-4 ${isTopThree ? "border-2 border-primary/50 bg-primary/5" : ""}`}
              data-testid={`leaderboard-entry-${entry.id}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`
                    flex items-center justify-center
                    font-bold text-lg min-w-[3rem]
                    ${index === 0 ? "text-yellow-600" : ""}
                    ${index === 1 ? "text-gray-500" : ""}
                    ${index === 2 ? "text-amber-700" : ""}
                  `}
                >
                  {index === 0 ? (
                    <Trophy className="h-6 w-6 text-yellow-600" />
                  ) : index === 1 ? (
                    <Award className="h-6 w-6 text-gray-500" />
                  ) : index === 2 ? (
                    <Award className="h-6 w-6 text-amber-700" />
                  ) : (
                    `#${index + 1}`
                  )}
                </div>

                <UserAvatar user={entry} size="md" />

                <div className="flex-1">
                  <div className="font-semibold">
                    {entry.firstName} {entry.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.major || "No major specified"}
                  </div>
                  <div className="mt-2">
                    <RankTierBadge
                      rankTier={entry.rankTier || "bronze"}
                      totalPoints={entry.totalPoints || 0}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold">{score}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-8 text-center">
        <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
        <h1 className="font-heading text-4xl font-bold mb-2">University Leaderboard</h1>
        <p className="text-muted-foreground">
          Top performers at {currentUser?.university ?? "your university"}
        </p>
      </div>

      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="engagement" className="gap-2" data-testid="tab-engagement">
            <TrendingUp className="h-4 w-4" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="problem-solver" className="gap-2" data-testid="tab-problem-solver">
            <Trophy className="h-4 w-4" />
            Problem Solver
          </TabsTrigger>
          <TabsTrigger value="challenge" className="gap-2" data-testid="tab-challenge">
            <Zap className="h-4 w-4" />
            Challenge Points
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement">
          <LeaderboardList
            entries={engagementLeaders}
            scoreKey="engagementScore"
            label="points"
          />
        </TabsContent>

        <TabsContent value="problem-solver">
          <LeaderboardList
            entries={problemSolverLeaders}
            scoreKey="problemSolverScore"
            label="points"
          />
        </TabsContent>

        <TabsContent value="challenge">
          <LeaderboardList
            entries={challengeLeaders}
            scoreKey="challengePoints"
            label="points"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
