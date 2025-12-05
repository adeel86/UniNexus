import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, Users, MessageSquare, FileText, Trash2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Course, User } from "@shared/schema";

interface TeacherValidatedCoursesSectionProps {
  teacherId: string;
  isOwnProfile?: boolean;
}

type CourseWithStats = Course & {
  discussionCount: number;
  enrollmentCount: number;
  instructor?: User | null;
};

export function TeacherValidatedCoursesSection({ teacherId, isOwnProfile = false }: TeacherValidatedCoursesSectionProps) {
  const { toast } = useToast();
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  const { data: courses = [], isLoading } = useQuery<CourseWithStats[]>({
    queryKey: isOwnProfile ? ["/api/me/created-courses"] : [`/api/teachers/${teacherId}/validated-courses`],
    enabled: !!teacherId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await apiRequest("DELETE", `/api/courses/${courseId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Course Deleted",
        description: `Course and ${data.deletedMaterialsCount || 0} materials have been permanently removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me/created-courses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/teachers/${teacherId}/validated-courses`] });
      setDeletingCourseId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete course",
        description: error.message,
        variant: "destructive",
      });
      setDeletingCourseId(null);
    },
  });

  const validatedCourses = courses.filter(c => c.isUniversityValidated);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (validatedCourses.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <h2 className="font-heading text-xl font-semibold">Validated Courses</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No university-validated courses yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-purple-600" />
        <h2 className="font-heading text-xl font-semibold">
          Validated Courses ({validatedCourses.length})
        </h2>
        <Badge variant="default" className="bg-green-600 text-xs ml-2">
          <CheckCircle className="h-3 w-3 mr-1" />
          University Approved
        </Badge>
      </div>

      <div className="space-y-4">
        {validatedCourses.map((course) => (
          <div
            key={course.id}
            className="border rounded-md p-4 space-y-3 hover-elevate"
            data-testid={`validated-course-${course.id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{course.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {course.code}
                  </Badge>
                  <Badge variant="default" className="bg-green-600 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Validated
                  </Badge>
                </div>
                
                {course.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {course.university && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {course.university}
                    </span>
                  )}
                  {course.semester && (
                    <span>{course.semester}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t gap-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.enrollmentCount} enrolled
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {course.discussionCount} discussions
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid={`link-view-course-${course.id}`}
                >
                  <Link href={`/courses/${course.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Course
                  </Link>
                </Button>

                {isOwnProfile && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-course-${course.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Delete Validated Course?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <span className="block">
                            You are about to permanently delete <strong>{course.name}</strong> ({course.code}).
                          </span>
                          <span className="block text-destructive font-medium">
                            This action cannot be undone. The following will be deleted:
                          </span>
                          <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                            <li>All uploaded course materials</li>
                            <li>Student enrollments and discussions</li>
                            <li>AI chat sessions and indexed content</li>
                            <li>University validation status</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setDeletingCourseId(course.id);
                            deleteMutation.mutate(course.id);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteMutation.isPending}
                          data-testid={`button-confirm-delete-course-${course.id}`}
                        >
                          {deleteMutation.isPending && deletingCourseId === course.id
                            ? "Deleting..."
                            : "Delete Course"
                          }
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
