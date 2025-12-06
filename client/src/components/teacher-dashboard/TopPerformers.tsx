import type { User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";

interface TopPerformersProps {
  students: User[];
}

export function TopPerformers({ students }: TopPerformersProps) {
  return (
    <Card className="p-6">
      <h3 className="font-heading font-semibold text-lg mb-4">
        Top Performers
      </h3>
      <div className="space-y-3">
        {students.map((student, index) => (
          <div key={student.id} className="flex items-center gap-3">
            <div
              className={`
                h-8 w-8 rounded-full flex items-center justify-center font-bold
                ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' : ''}
                ${index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : ''}
                ${index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white' : ''}
                ${index > 2 ? 'bg-muted' : ''}
              `}
            >
              {index + 1}
            </div>
            <UserAvatar user={student} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {student.firstName} {student.lastName}
              </div>
              <div className="text-xs text-muted-foreground">
                {student.engagementScore || 0} points
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
