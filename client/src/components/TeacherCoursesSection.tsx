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
  major: string | null;
  graduationYear: string | null;
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
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Card className="p-12 text-center border-dashed border-2">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="font-heading text-xl font-semibold mb-2">No courses assigned</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            No courses have been assigned to you yet. Students will assign you when adding courses to their profiles.
          </p>
        </Card>
      </div>
    );
  }

  const renderCourseCard = (course: TeacherCourse) => (
    <Card
      key={course.id}
      className="overflow-hidden hover-elevate transition-all duration-300 border-0 shadow-md bg-card"
      data-testid={`teacher-course-${course.id}`}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg">
            <BookOpen className="h-6 w-6" />
          </div>
          {course.isValidated ? (
            <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200/50">
              <CheckCircle className="h-3 w-3 mr-1" />
              Validated
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200/50">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{course.courseName}</h3>
          {course.courseCode && (
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">{course.courseCode}</p>
          )}

          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-muted/50">
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarImage src={course.student.profileImageUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                {getStudentInitials(course.student)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{getStudentName(course.student)}</p>
              <p className="text-[10px] text-muted-foreground truncate">{course.student.university}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-auto border-t border-muted/50 flex items-center justify-between gap-2">
           <div className="text-[10px] text-muted-foreground font-medium">
             {course.semester} {course.year}
           </div>
           {course.isValidated ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => unvalidateMutation.mutate(course.id)}
              disabled={unvalidateMutation.isPending}
              data-testid={`button-unvalidate-course-${course.id}`}
            >
              Unvalidate
            </Button>
          ) : course.canValidate ? (
            <Button
              size="sm"
              className="h-8 text-xs px-4 rounded-full bg-primary hover:bg-primary/90"
              onClick={() => openValidateDialog(course)}
              data-testid={`button-validate-course-${course.id}`}
            >
              Validate
            </Button>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
              <AlertCircle className="h-3 w-3" />
              <span>Blocked</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-2">
        <div>
          <h2 className="font-heading text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            My Courses
          </h2>
          <p className="text-muted-foreground mt-1">Manage and validate student enrollment</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCourses.length > 0 && (
            <Badge variant="destructive" className="rounded-full px-3">
              {pendingCourses.length} Pending
            </Badge>
          )}
          <Badge variant="outline" className="rounded-full px-3 bg-card">
            Total: {courses.length}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-full mb-8 inline-flex">
          <TabsTrigger value="pending" className="rounded-full px-6" data-testid="tab-pending-courses">
            Pending ({pendingCourses.length})
          </TabsTrigger>
          <TabsTrigger value="validated" className="rounded-full px-6" data-testid="tab-validated-courses">
            Validated ({validatedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-full px-6" data-testid="tab-all-courses">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingCourses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 bg-transparent">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-20" />
              <p className="text-muted-foreground">All caught up! No pending requests.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingCourses.map(renderCourseCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="validated">
          {validatedCourses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 bg-transparent">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No validated courses yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {validatedCourses.map(renderCourseCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(renderCourseCard)}
          </div>
        </TabsContent>
      </Tabs>

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
              <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-muted-foreground/20">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedCourse.student.profileImageUrl || undefined} />
                    <AvatarFallback>{getStudentInitials(selectedCourse.student)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{getStudentName(selectedCourse.student)}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCourse.student.major} | {selectedCourse.student.university}
                    </p>
                  </div>
                </div>
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
    </div>
  );
}
