import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Calendar, Rocket, Award } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface ChallengeMilestone {
  id: string;
  participationStatus: string;
  placement: string | null;
  submittedAt: Date | null;
  joinedAt: Date;
  challenge: {
    id: string;
    title: string;
    status: string;
    endDate: Date | null;
    category: string;
  } | null;
}

interface ChallengeMilestonesData {
  milestones: ChallengeMilestone[];
  stats: {
    activeCount: number;
    completedCount: number;
    winsCount: number;
  };
  upcomingDeadlines: ChallengeMilestone[];
}

interface Props {
  userId: string;
}

export function ChallengeMilestonesCard({ userId }: Props) {
  const { data, isLoading } = useQuery<ChallengeMilestonesData>({
    queryKey: [`/api/users/${userId}/challenge-milestones`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.milestones.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-purple-600" />
          Challenge Journey
        </h3>
        <div className="text-center py-6">
          <Rocket className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Start your hackathon journey!
          </p>
          <Link href="/challenges">
            <a data-testid="link-browse-challenges">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                <Target className="h-4 w-4 mr-2" />
                Browse Challenges
              </Button>
            </a>
          </Link>
        </div>
      </Card>
    );
  }

  const { stats } = data;

  return (
    <Card className="p-6">
      <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-purple-600" />
        Challenge Journey
      </h3>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-active-count">
            {stats.activeCount}
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300">Active</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-completed-count">
            {stats.completedCount}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300">Completed</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-wins-count">
            {stats.winsCount}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300">Wins</div>
        </div>
      </div>

      {data.upcomingDeadlines.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Upcoming Deadlines
          </h4>
          <div className="space-y-2">
            {data.upcomingDeadlines.map((milestone) => (
              <div key={milestone.id} className="bg-muted/50 rounded-md p-2" data-testid={`deadline-${milestone.challenge?.id}`}>
                <div className="text-xs font-medium truncate">{milestone.challenge?.title}</div>
                <div className="text-xs text-muted-foreground">
                  {milestone.challenge?.endDate && format(new Date(milestone.challenge.endDate), "MMM d, yyyy")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-semibold">Recent Milestones</h4>
        {data.milestones.slice(0, 3).map((milestone) => (
          <div key={milestone.id} className="flex items-start gap-2 text-xs" data-testid={`milestone-${milestone.id}`}>
            {milestone.placement ? (
              <Award className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            ) : milestone.participationStatus === 'submitted' ? (
              <Target className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Rocket className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{milestone.challenge?.title}</div>
              <div className="text-muted-foreground">
                {milestone.placement ? (
                  <Badge variant="default" className="bg-amber-500 text-xs">
                    {milestone.placement}
                  </Badge>
                ) : milestone.participationStatus === 'submitted' ? (
                  <span>Submitted</span>
                ) : (
                  <span>Joined</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Link href="/challenges">
          <a className="flex-1" data-testid="link-all-challenges">
            <Button variant="outline" className="w-full" size="sm">
              View All
            </Button>
          </a>
        </Link>
        <Link href="/challenges/map">
          <a className="flex-1" data-testid="link-challenge-map">
            <Button variant="default" className="w-full bg-gradient-to-r from-purple-600 to-pink-600" size="sm">
              Global Map
            </Button>
          </a>
        </Link>
      </div>
    </Card>
  );
}
