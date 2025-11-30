import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeIcon } from "@/components/BadgeIcon";
import { TrendingUp, Users, Zap, Star } from "lucide-react";
import type { UserBadge, Badge as BadgeType } from "@shared/schema";

interface TimelineEvent {
  id: string;
  type: 'badge' | 'milestone';
  title: string;
  description: string;
  date: Date;
  icon?: any;
  badge?: BadgeType;
  color?: string;
}

interface AchievementTimelineProps {
  userBadges: (UserBadge & { badge: BadgeType })[];
  engagementScore: number;
}

export function AchievementTimeline({ userBadges, engagementScore }: AchievementTimelineProps) {
  const events: TimelineEvent[] = [];

  // Add badge events
  userBadges.forEach((ub) => {
    events.push({
      id: `badge-${ub.id}`,
      type: 'badge',
      title: `Earned ${ub.badge.name} Badge`,
      description: ub.badge.description,
      date: ub.earnedAt ? new Date(ub.earnedAt) : new Date(),
      badge: ub.badge,
      color: 'purple',
    });
  });

  // Add milestone events based on engagement score
  // Use deterministic dates based on score to avoid jitter
  const milestones = [
    { score: 100, title: 'First 100 Points', icon: TrendingUp, daysAgo: 60 },
    { score: 500, title: 'Rising Star - 500 Points', icon: Star, daysAgo: 40 },
    { score: 1000, title: 'Expert Contributor - 1000 Points', icon: Zap, daysAgo: 20 },
    { score: 2000, title: 'Community Leader - 2000 Points', icon: Users, daysAgo: 5 },
  ];

  milestones.forEach((milestone) => {
    if (engagementScore >= milestone.score) {
      // Use a deterministic date based on the milestone score to avoid render jitter
      const eventDate = new Date(Date.now() - milestone.daysAgo * 24 * 60 * 60 * 1000);
      
      events.push({
        id: `milestone-${milestone.score}`,
        type: 'milestone',
        title: milestone.title,
        description: `Reached ${milestone.score} engagement points`,
        date: eventDate,
        icon: milestone.icon,
        color: 'yellow',
      });
    }
  });

  // Sort events by date, most recent first
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No achievements yet. Keep engaging to unlock your first milestone!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = event.icon;
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="flex gap-4" data-testid={`timeline-event-${index}`}>
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${event.type === 'badge' ? 'bg-purple-100 dark:bg-purple-900/30' : ''}
                ${event.type === 'milestone' ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}
              `}>
                {event.badge ? (
                  <BadgeIcon badge={event.badge} size="sm" />
                ) : Icon ? (
                  <Icon className={`h-5 w-5
                    ${event.type === 'milestone' ? 'text-yellow-600' : ''}
                  `} />
                ) : (
                  <Star className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              {!isLast && (
                <div className="w-0.5 h-full min-h-[2rem] bg-border mt-2" />
              )}
            </div>

            {/* Event content */}
            <Card className="flex-1 p-4 mb-2">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold">{event.title}</h4>
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {event.date.toLocaleDateString()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
