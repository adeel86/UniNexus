import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Star } from "lucide-react";
import type { User } from "@shared/schema";

interface TalentCardProps {
  student: User;
  onFeedback: (student: User) => void;
}

export function TalentCard({ student, onFeedback }: TalentCardProps) {
  return (
    <Card
      className="p-5 hover-elevate active-elevate-2"
      data-testid={`talent-${student.id}`}
    >
      <div className="flex items-start gap-4">
        <UserAvatar user={student} size="lg" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-semibold text-lg">
                {student.firstName} {student.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {student.major || "No major specified"}
              </p>
              {student.university && (
                <p className="text-xs text-muted-foreground">
                  {student.university}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onFeedback(student)}
                data-testid={`button-feedback-${student.id}`}
              >
                <Star className="mr-1 h-4 w-4" />
                Feedback
              </Button>
              <Button size="sm" variant="outline" data-testid={`button-view-${student.id}`}>
                View
              </Button>
            </div>
          </div>

          {student.bio && (
            <p className="text-sm mt-2 line-clamp-2">{student.bio}</p>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              Engagement: {student.engagementScore || 0}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Problem Solver: {student.problemSolverScore || 0}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {student.endorsementScore || 0} Endorsements
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
