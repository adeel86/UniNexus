import { LeaderboardEntry } from "@/components/LeaderboardEntry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Trophy, Loader2 } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useState } from "react";

export default function Leaderboard() {
  const [filter, setFilter] = useState<string>("");
  const { data: users, isLoading } = useLeaderboard(filter, 50);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 pb-24 md:pb-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-display font-bold">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground">Top contributors ranked by UniNexus Score</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="rounded-full">
          <TabsTrigger value="" className="rounded-full" data-testid="tab-national">National</TabsTrigger>
          <TabsTrigger value="university" className="rounded-full" data-testid="tab-university">My University</TabsTrigger>
          <TabsTrigger value="course" className="rounded-full" data-testid="tab-course">My Course</TabsTrigger>
        </TabsList>
        
        <TabsContent value={filter} className="mt-6">
          {isLoading ? (
            <Card className="rounded-2xl p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          ) : users && users.length > 0 ? (
            <Card className="rounded-2xl p-4">
              <div className="space-y-2">
                {users.map((user, index) => (
                  <LeaderboardEntry
                    key={user.id}
                    rank={index + 1}
                    user={{ 
                      name: user.displayName, 
                      username: user.email?.split('@')[0] || '', 
                      university: user.university || '' 
                    }}
                    score={user.uniNexusScore}
                    change={0}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl p-8 text-center text-muted-foreground">
              No leaderboard data available.
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card className="rounded-2xl p-6 bg-gradient-to-r from-primary/10 to-chart-2/10 mt-6">
        <h3 className="font-display font-semibold mb-2">How to earn points</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Answer questions: +10 points</li>
          <li>• Get endorsements: +15 points</li>
          <li>• Create helpful posts: +5 points</li>
          <li>• Join study sessions: +8 points</li>
        </ul>
      </Card>
    </div>
  );
}
