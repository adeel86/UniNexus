import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserListCard } from "@/components/UserListCard";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, Building2, Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

type TeacherWithStats = User & {
  courseCount: number;
  validatedCourseCount: number;
  pendingCourseCount: number;
};

export default function UniversityTeachers() {
  const { userData: user } = useAuth();

  const { data: teachers = [], isLoading } = useQuery<TeacherWithStats[]>({
    queryKey: ["/api/university/teachers"],
    enabled: !!user && (user.role === 'university' || user.role === 'master_admin'),
  });

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Please log in to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== 'university' && user.role !== 'master_admin') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              This page is only available for university administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>University Teachers</CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4" />
                  {user.university}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              <Users className="h-4 w-4 mr-1" />
              {teachers.length} teachers
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : teachers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No teachers registered at {user.university} yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Teachers will appear here once they join and set their university.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teachers.map((teacher) => (
            <UserListCard 
              key={teacher.id} 
              user={teacher} 
              showTeacherStats 
            />
          ))}
        </div>
      )}
    </div>
  );
}
