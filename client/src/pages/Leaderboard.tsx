import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { RankTierBadge, RankTierIcon } from "@/components/RankTierBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Award, Zap } from "lucide-react";

export default function Leaderboard() {
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/students"],
  });

  const engagementLeaders = [...students]
    .filter(s => s.role === 'student')
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));

  const problemSolverLeaders = [...students]
    .filter(s => s.role === 'student')
    .sort((a, b) => (b.problemSolverScore || 0) - (a.problemSolverScore || 0));

  const endorsementLeaders = [...students]
    .filter(s => s.role === 'student')
    .sort((a, b) => (b.endorsementScore || 0) - (a.endorsementScore || 0));

  const LeaderboardList = ({ students, scoreKey, label }: { 
    students: User[], 
    scoreKey: 'engagementScore' | 'problemSolverScore' | 'endorsementScore',
    label: string 
  }) => (
    <div className="space-y-2">
      {students.map((student, index) => {
        const score = student[scoreKey] || 0;
        const isTopThree = index < 3;
        
        return (
          <Card
            key={student.id}
            className={`p-4 ${isTopThree ? 'border-2 border-primary/50 bg-primary/5' : ''}`}
            data-testid={`leaderboard-${index}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`
                  flex items-center justify-center
                  font-bold text-lg min-w-[3rem]
                  ${index === 0 ? 'text-yellow-600' : ''}
                  ${index === 1 ? 'text-gray-500' : ''}
                  ${index === 2 ? 'text-amber-700' : ''}
                `}
              >
                {index === 0 ? <Trophy className="h-6 w-6 text-yellow-600" /> : 
                 index === 1 ? <Award className="h-6 w-6 text-gray-500" /> :
                 index === 2 ? <Award className="h-6 w-6 text-amber-700" /> :
                 `#${index + 1}`}
              </div>

              <UserAvatar user={student} size="md" />

              <div className="flex-1">
                <div className="font-semibold">
                  {student.firstName} {student.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {student.major || 'No major specified'}
                </div>
                <div className="mt-2">
                  <RankTierBadge 
                    rankTier={student.rankTier as 'bronze' | 'silver' | 'gold' | 'platinum' || 'bronze'}
                    totalPoints={student.totalPoints || 0}
                    size="sm"
                  />
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>

              {student.streak && student.streak > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {student.streak} day streak
                </Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-8 text-center">
        <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
        <h1 className="font-heading text-4xl font-bold mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">
          Top performers in the UniNexus community
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
          <TabsTrigger value="endorsements" className="gap-2" data-testid="tab-endorsements">
            <Award className="h-4 w-4" />
            Endorsements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement">
          <LeaderboardList 
            students={engagementLeaders} 
            scoreKey="engagementScore" 
            label="points"
          />
        </TabsContent>

        <TabsContent value="problem-solver">
          <LeaderboardList 
            students={problemSolverLeaders} 
            scoreKey="problemSolverScore" 
            label="points"
          />
        </TabsContent>

        <TabsContent value="endorsements">
          <LeaderboardList 
            students={endorsementLeaders} 
            scoreKey="endorsementScore" 
            label="endorsements"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
