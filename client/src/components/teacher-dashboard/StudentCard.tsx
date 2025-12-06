import type { User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Award, Shield, Sparkles } from "lucide-react";

interface StudentCardProps {
  student: User;
  onViewProfile: (student: User) => void;
  onEndorse: (student: User) => void;
  onIssueCertificate: (student: User) => void;
  onCareerInsights: (student: User) => void;
}

export function StudentCard({
  student,
  onViewProfile,
  onEndorse,
  onIssueCertificate,
  onCareerInsights,
}: StudentCardProps) {
  return (
    <Card
      className="p-4 hover-elevate"
      data-testid={`student-${student.id}`}
    >
      <div className="flex items-center gap-4">
        <UserAvatar user={student} size="md" />
        <div className="flex-1">
          <div className="font-semibold">
            {student.firstName} {student.lastName}
          </div>
          <div className="text-sm text-muted-foreground">
            {student.major || "No major specified"}
            {student.university && ` · ${student.university}`}
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              Engagement: {student.engagementScore || 0}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Streak: {student.streak || 0}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewProfile(student)}
            data-testid={`button-view-profile-${student.id}`}
          >
            View Profile
          </Button>
          <Button
            size="sm"
            onClick={() => onEndorse(student)}
            data-testid={`button-endorse-${student.id}`}
          >
            <Award className="mr-2 h-4 w-4" />
            Endorse
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onIssueCertificate(student)}
            data-testid={`button-issue-certificate-${student.id}`}
          >
            <Shield className="mr-2 h-4 w-4" />
            Certificate
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onCareerInsights(student)}
            data-testid={`button-career-insights-${student.id}`}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Career Insights
          </Button>
        </div>
      </div>
    </Card>
  );
}
