import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, CheckCircle, Clock, AlertCircle, User, Building } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface StudentInfo {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  university: string | null;
}

interface TeacherCourse {
  id: string;
  userId: string;
  courseName: string;
  courseCode: string | null;
  institution: string | null;
  instructor: string | null;
  semester: string | null;
  year: number | null;
  grade: string | null;
  credits: number | null;
  description: string | null;
  isValidated: boolean;
  validatedBy: string | null;
  validatedAt: Date | null;
  validationNote: string | null;
  assignedTeacherId: string | null;
  student: StudentInfo;
  canValidate?: boolean;
  validationBlockedReason?: string | null;
}

export function TeacherCoursesSection() {
  const { toast } = useToast();
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TeacherCourse | null>(null);
  const [validationNote, setValidationNote] = useState("");

  const { data: courses = [], isLoading } = useQuery<TeacherCourse[]>({
    queryKey: ['/api/teacher/courses'],
  });

  const validateMutation = useMutation({
    mutationFn: async ({ courseId, validationNote }: { courseId: string; validationNote?: string }) => {
      return apiRequest("POST", `/api/student-courses/${courseId}/validate`, { validationNote });
    },
    onMutate: async ({ courseId }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/teacher/courses'] });
      const previousCourses = queryClient.getQueryData<TeacherCourse[]>(['/api/teacher/courses']);
      queryClient.setQueryData<TeacherCourse[]>(
        ['/api/teacher/courses'],
        (old = []) => old.map(course =>
          course.id === courseId
            ? { ...course, isValidated: true, canValidate: false }
            : course
        )
      );
      return { previousCourses };
    },
    onSuccess: () => {
      toast({ title: "Course validated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/pending-validations'] });
      setValidateDialogOpen(false);
      setSelectedCourse(null);
      setValidationNote("");
    },
    onError: (err: any, variables, context) => {
      queryClient.setQueryData(['/api/teacher/courses'], context?.previousCourses);
      toast({
        title: "Failed to validate course",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const unvalidateMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("DELETE", `/api/student-courses/${courseId}/validation`, {});
    },
    onMutate: async (courseId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/teacher/courses'] });
      const previousCourses = queryClient.getQueryData<TeacherCourse[]>(['/api/teacher/courses']);
      queryClient.setQueryData<TeacherCourse[]>(
        ['/api/teacher/courses'],
        (old = []) => old.map(course =>
          course.id === courseId
            ? { ...course, isValidated: false, canValidate: true }
            : course
        )
      );
      return { previousCourses };
    },
    onSuccess: () => {
      toast({ title: "Validation removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/courses'] });
    },
    onError: (err: any, variables, context) => {
      queryClient.setQueryData(['/api/teacher/courses'], context?.previousCourses);
      toast({
        title: "Failed to remove validation",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const openValidateDialog = (course: TeacherCourse) => {
    setSelectedCourse(course);
    setValidationNote("");
    setValidateDialogOpen(true);
  };

  const handleValidate = () => {
    if (!selectedCourse) return;
    validateMutation.mutate({
      courseId: selectedCourse.id,
      validationNote: validationNote.trim() || undefined,
    });
  };

  const pendingCourses = courses.filter(c => !c.isValidated);
  const validatedCourses = courses.filter(c => c.isValidated);

  const getStudentName = (student: StudentInfo) => {
    return student.displayName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student';
  };

  const getStudentInitials = (student: StudentInfo) => {
    const name = getStudentName(student);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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

  if (courses.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <h2 className="font-heading text-xl font-semibold">My Courses</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No courses have been assigned to you yet. Students will assign you when adding courses to their profiles.
        </p>
      </Card>
    );
  }

  const renderCourseCard = (course: TeacherCourse) => (
    <div
      key={course.id}
      className="border rounded-md p-4 space-y-3"
      data-testid={`teacher-course-${course.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{course.courseName}</h3>
            {course.courseCode && (
              <Badge variant="outline" className="text-xs">
                {course.courseCode}
              </Badge>
            )}
            {course.isValidated ? (
              <Badge variant="default" className="bg-green-600 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Validated
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
            {course.institution && (
              <p className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {course.institution}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {course.semester && course.year && (
                <span>{course.semester} {course.year}</span>
              )}
              {course.grade && (
                <Badge variant="secondary" className="text-xs">Grade: {course.grade}</Badge>
              )}
              {course.credits && (
                <span>{course.credits} credits</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={course.student.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {getStudentInitials(course.student)}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{getStudentName(course.student)}</p>
              {course.student.university && (
                <p className="text-xs text-muted-foreground">{course.student.university}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {course.description && (
        <p className="text-sm text-muted-foreground">{course.description}</p>
      )}

      {course.validationNote && course.isValidated && (
        <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded text-sm">
          <span className="font-medium text-green-700 dark:text-green-400">Note: </span>
          <span className="text-green-600 dark:text-green-300">{course.validationNote}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {course.isValidated ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => unvalidateMutation.mutate(course.id)}
            disabled={unvalidateMutation.isPending}
            data-testid={`button-unvalidate-course-${course.id}`}
          >
            Remove Validation
          </Button>
        ) : course.canValidate ? (
          <Button
            size="sm"
            onClick={() => openValidateDialog(course)}
            data-testid={`button-validate-course-${course.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Validate
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span>{course.validationBlockedReason || "Cannot validate"}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            <h2 className="font-heading text-xl font-semibold">My Courses ({courses.length})</h2>
          </div>
          {pendingCourses.length > 0 && (
            <Badge variant="secondary">
              {pendingCourses.length} pending validation
            </Badge>
          )}
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" data-testid="tab-pending-courses">
              Pending ({pendingCourses.length})
            </TabsTrigger>
            <TabsTrigger value="validated" data-testid="tab-validated-courses">
              Validated ({validatedCourses.length})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all-courses">
              All ({courses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending validation requests
              </p>
            ) : (
              pendingCourses.map(renderCourseCard)
            )}
          </TabsContent>

          <TabsContent value="validated" className="space-y-4">
            {validatedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No validated courses yet
              </p>
            ) : (
              validatedCourses.map(renderCourseCard)
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {courses.map(renderCourseCard)}
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validate Course</DialogTitle>
            <DialogDescription>
              Confirm that {selectedCourse?.student && getStudentName(selectedCourse.student)} completed{' '}
              {selectedCourse?.courseName} in your class.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCourse && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p><span className="font-medium">Course:</span> {selectedCourse.courseName}</p>
                {selectedCourse.courseCode && (
                  <p><span className="font-medium">Code:</span> {selectedCourse.courseCode}</p>
                )}
                {selectedCourse.semester && selectedCourse.year && (
                  <p><span className="font-medium">Period:</span> {selectedCourse.semester} {selectedCourse.year}</p>
                )}
                {selectedCourse.grade && (
                  <p><span className="font-medium">Grade:</span> {selectedCourse.grade}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="validationNote">Validation Note (optional)</Label>
              <Textarea
                id="validationNote"
                placeholder="Add a note about the student's performance..."
                value={validationNote}
                onChange={(e) => setValidationNote(e.target.value)}
                rows={3}
                data-testid="input-validation-note"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setValidateDialogOpen(false)}
                data-testid="button-cancel-validation"
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidate}
                disabled={validateMutation.isPending}
                data-testid="button-confirm-validation"
              >
                {validateMutation.isPending ? "Validating..." : "Validate Course"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
