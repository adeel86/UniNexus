import type { User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Target, Award } from "lucide-react";

interface StatsGridProps {
  students: User[];
}

export function StatsGrid({ students }: StatsGridProps) {
  const avgEngagement = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / students.length)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-3xl font-bold">{students.length}</p>
          </div>
          <Users className="h-8 w-8 text-primary" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Avg Engagement</p>
            <p className="text-3xl font-bold">{avgEngagement}</p>
          </div>
          <TrendingUp className="h-8 w-8 text-green-600" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Active Courses</p>
            <p className="text-3xl font-bold">3</p>
          </div>
          <Target className="h-8 w-8 text-blue-600" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Endorsements Given</p>
            <p className="text-3xl font-bold">24</p>
          </div>
          <Award className="h-8 w-8 text-purple-600" />
        </div>
      </Card>
    </div>
  );
}
