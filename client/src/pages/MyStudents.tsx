import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserListCard } from "@/components/UserListCard";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, CheckCircle, Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

type StudentWithCourses = User & {
  validatedCourses: any[];
};

export default function MyStudents() {
  const { userData: user } = useAuth();

  const { data: students = [], isLoading } = useQuery<StudentWithCourses[]>({
    queryKey: ["/api/teachers", user?.id, "students"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/teachers/${user.id}/students`, {
        credentials: "include",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dev_token')}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!user?.id && user?.role === 'teacher',
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

  if (user.role !== 'teacher') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              This page is only available for teachers.
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
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>My Students</CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Students you've validated
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              <Users className="h-4 w-4 mr-1" />
              {students.length} students
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              You haven't validated any students yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              When students request course validation and you approve them, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <UserListCard 
              key={student.id} 
              user={student} 
              showStudentStats 
            />
          ))}
        </div>
      )}
    </div>
  );
}
