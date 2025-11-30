import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BookOpen, 
  Users, 
  MessageSquare, 
  Sparkles,
  GraduationCap,
  ArrowRight,
  CheckCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";

type EnrolledCourse = {
  id: string;
  studentCourseId: string;
  courseId: string | null;
  courseName: string;
  courseCode: string | null;
  description: string | null;
  institution: string | null;
  semester: string | null;
  teacher: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
  enrolledAt: string | null;
  validatedAt: string | null;
  materialCount: number;
  hasAIAccess: boolean;
};

export default function Courses() {
  const { data: enrolledCourses = [], isLoading } = useQuery<EnrolledCourse[]>({
    queryKey: ["/api/me/enrolled-courses"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading courses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            My Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Your enrolled courses with AI-powered learning assistance
          </p>
        </div>
      </div>

      {enrolledCourses.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold text-xl mb-2">No Enrolled Courses</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven't enrolled in any courses yet. Add courses to your profile and request teacher validation to gain access to AI tutoring.
          </p>
          <Link href="/settings#profile">
            <Button data-testid="button-add-courses">
              <GraduationCap className="h-4 w-4 mr-2" />
              Add Courses
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {enrolledCourses.map((course) => (
            <Card 
              key={course.id}
              className="hover-elevate transition-all"
              data-testid={`card-course-${course.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{course.courseName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {course.courseCode && (
                            <Badge variant="secondary">
                              {course.courseCode}
                            </Badge>
                          )}
                          <Badge variant="default" className="bg-green-600 gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            Validated & Enrolled
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-base line-clamp-2 mt-2">
                      {course.description || "No description available"}
                    </CardDescription>
                  </div>
                  {course.courseId && course.hasAIAccess && (
                    <Link href={`/courses/${course.courseId}`}>
                      <Button data-testid={`button-view-course-${course.id}`}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Ask Teacher's AI
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    {course.teacher && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={course.teacher.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {course.teacher.firstName?.[0]}
                            {course.teacher.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {course.teacher.firstName} {course.teacher.lastName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{course.materialCount} materials</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {course.hasAIAccess ? (
                      <Badge variant="outline" className="gap-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
                        <Sparkles className="h-3 w-3" />
                        AI Tutor Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        No materials yet
                      </Badge>
                    )}
                  </div>
                </div>
                {course.institution && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {course.institution} {course.semester && `- ${course.semester}`}
                  </div>
                )}
                {course.enrolledAt && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Enrolled {format(new Date(course.enrolledAt), 'MMM d, yyyy')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 p-6 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border-purple-500/20">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">AI-Powered Learning</h3>
            <p className="text-muted-foreground">
              Each course features a hyper-localized AI tutor trained on your teacher's materials. 
              Click on any course and use the "Ask Teacher's AI" button to get instant help with course-specific questions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
