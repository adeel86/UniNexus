import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Users, MessageSquare, GraduationCap, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { Course, University } from "@shared/schema";

type CourseWithStats = Course & {
  discussionCount: number;
  enrollmentCount: number;
};

export function TeacherCreatedCourses() {
  const { toast } = useToast();
  const { userData } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSemester, setCourseSemester] = useState("");
  const [courseUniversity, setCourseUniversity] = useState("");

  const { data: createdCourses = [], isLoading } = useQuery<CourseWithStats[]>({
    queryKey: ["/api/me/created-courses"],
    enabled: userData?.role === 'teacher',
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/courses", {
        name: courseName,
        code: courseCode,
        description: courseDescription || null,
        semester: courseSemester || null,
        university: courseUniversity || userData?.university || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/created-courses"] });
      toast({
        title: "Course created successfully!",
        description: "Students can now enroll in your new course.",
      });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCourseName("");
    setCourseCode("");
    setCourseDescription("");
    setCourseSemester("");
    setCourseUniversity("");
  };

  const { data: universitiesData = [] } = useQuery<University[]>({
    queryKey: ['/api/universities'],
  });

  const handleCreateCourse = () => {
    if (!courseName.trim() || !courseCode.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please enter both course name and code",
        variant: "destructive",
      });
      return;
    }
    createCourseMutation.mutate();
  };

  if (userData?.role !== 'teacher') {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          <h2 className="font-heading text-xl font-semibold">My Created Courses</h2>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          data-testid="button-create-course"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : createdCourses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">You haven't created any courses yet</p>
          <p className="text-xs mt-1">
            Create a course to allow students to enroll and access AI tutoring
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {createdCourses.map((course) => (
            <Link 
              key={course.id} 
              href={`/courses/${course.id}`}
              data-testid={`link-created-course-${course.id}`}
            >
              <div
                className="border rounded-md p-4 hover-elevate cursor-pointer"
                data-testid={`card-created-course-${course.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{course.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {course.code}
                        </Badge>
                        {course.semester && (
                          <span className="text-xs text-muted-foreground">
                            {course.semester}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.enrollmentCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{course.discussionCount}</span>
                    </div>
                  </div>
                </div>
                {course.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {course.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              <GraduationCap className="inline-block mr-2 h-6 w-6" />
              Create New Course
            </DialogTitle>
            <DialogDescription>
              Create a course that students can enroll in. They will have access to AI tutoring based on your uploaded materials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="course-name">Course Name *</Label>
              <Input
                id="course-name"
                placeholder="e.g., Introduction to Computer Science"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                data-testid="input-course-name"
              />
            </div>

            <div>
              <Label htmlFor="course-code">Course Code *</Label>
              <Input
                id="course-code"
                placeholder="e.g., CS101"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                data-testid="input-course-code"
              />
            </div>

            <div>
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                placeholder="Describe what this course covers..."
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                rows={3}
                data-testid="textarea-course-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course-semester">Semester</Label>
                <Select
                  value={courseSemester}
                  onValueChange={setCourseSemester}
                >
                  <SelectTrigger id="course-semester" data-testid="select-course-semester">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                    <SelectItem value="Summer 2025">Summer 2025</SelectItem>
                    <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                    <SelectItem value="Winter 2025">Winter 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="course-university">University</Label>
                <Select
                  value={courseUniversity || userData?.university || ""}
                  onValueChange={setCourseUniversity}
                >
                  <SelectTrigger id="course-university" data-testid="select-course-university">
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent>
                    {universitiesData.map((uni) => (
                      <SelectItem key={uni.id} value={uni.name}>
                        {uni.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-create-course"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCourse}
                disabled={!courseName.trim() || !courseCode.trim() || createCourseMutation.isPending}
                data-testid="button-submit-create-course"
              >
                {createCourseMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
