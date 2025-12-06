import { Card } from "@/components/ui/card";
import { BadgeIcon } from "@/components/BadgeIcon";
import { Trophy, Clock } from "lucide-react";
import { AchievementTimeline } from "@/components/AchievementTimeline";
import type { UserBadge, Badge as BadgeType } from "@shared/schema";

interface AchievementsSectionProps {
  userBadges: (UserBadge & { badge: BadgeType })[];
  engagementScore: number;
}

export function AchievementsSection({ userBadges, engagementScore }: AchievementsSectionProps) {
  return (
    <>
      <Card className="p-6">
        <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Achievements ({userBadges.length})
        </h2>
        {userBadges.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {userBadges.map((ub) => (
              <div key={ub.id} className="flex flex-col items-center gap-2">
                <BadgeIcon badge={ub.badge} size="lg" />
                <div className="text-xs text-center font-medium">{ub.badge.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No badges earned yet</p>
            <p className="text-sm">Keep engaging to unlock achievements!</p>
          </div>
        )}
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="font-heading text-xl font-semibold mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Achievement Timeline
        </h2>
        <AchievementTimeline 
          userBadges={userBadges}
          engagementScore={engagementScore}
        />
      </Card>
    </>
  );
}
