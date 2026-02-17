import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Edit, Trash2, CheckCircle, Clock, User as UserIcon, XCircle } from "lucide-react";
import type { StudentCourse } from "@shared/schema";
import { useState } from "react";
import { StudentCourseModal } from "./StudentCourseModal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StudentCourseWithValidator = StudentCourse & {
  validator?: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

interface StudentCoursesSectionProps {
  isOwnProfile: boolean;
  userId: string;
}

export function StudentCoursesSection({ isOwnProfile, userId }: StudentCoursesSectionProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<StudentCourseWithValidator | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [validatingCourse, setValidatingCourse] = useState<string | null>(null);
  const { toast } = useToast();
  const { userData: currentUser } = useAuth();

  const isTeacher = currentUser?.role === 'teacher';

  const { data: courses = [], isLoading } = useQuery<StudentCourseWithValidator[]>({
    queryKey: [`/api/users/${userId}/student-courses`],
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/student-courses/${id}`, {});
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      const previousCourses = queryClient.getQueryData<StudentCourseWithValidator[]>([`/api/users/${userId}/student-courses`]);
      queryClient.setQueryData<StudentCourseWithValidator[]>(
        [`/api/users/${userId}/student-courses`],
        (old = []) => old.filter(course => course.id !== deletedId)
      );
      return { previousCourses };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(
        [`/api/users/${userId}/student-courses`],
        context?.previousCourses
      );
      toast({ title: "Failed to delete course", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      toast({ title: "Course deleted" });
      setCourseToDelete(null);
    },
  });

  const validateMutation = useMutation({
    mutationFn: async ({ id, action, validationNote }: { id: string; action: 'approve' | 'reject'; validationNote?: string }) => {
      return apiRequest("POST", `/api/student-courses/${id}/validate`, { action, validationNote });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/pending-validations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/enrolled-courses'] });
      toast({ title: variables.action === 'approve' ? "Course validated successfully" : "Course validation rejected" });
      setValidatingCourse(null);
    },
    onError: (err: any) => {
      toast({ 
        title: "Action failed", 
        description: err.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const removeValidationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/student-courses/${id}/validation`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/enrolled-courses"] });
      toast({ title: "Validation removed" });
    },
    onError: (err: any) => {
      toast({ 
        title: "Action failed", 
        description: err.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (course: StudentCourseWithValidator) => {
    setEditingCourse(course);
    setAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setCourseToDelete(id);
  };

  const confirmDelete = () => {
    if (courseToDelete) {
      deleteMutation.mutate(courseToDelete);
    }
  };

  const handleValidate = (id: string) => {
    validateMutation.mutate({ id, action: 'approve' });
  };

  const handleReject = (id: string) => {
    const note = window.prompt("Enter rejection reason (optional):");
    if (note !== null) {
      validateMutation.mutate({ id, action: 'reject', validationNote: note || undefined });
    }
  };

  const handleRemoveValidation = (id: string) => {
    removeValidationMutation.mutate(id);
  };

  const canValidate = (course: StudentCourseWithValidator) => {
    if (!isTeacher) return false;
    if (course.isValidated) return false;
    if (course.assignedTeacherId && course.assignedTeacherId !== currentUser?.id) return false;
    return true;
  };

  const canRemoveValidation = (course: StudentCourseWithValidator) => {
    if (!course.isValidated) return false;
    return course.validatedBy === currentUser?.id || course.userId === currentUser?.id;
  };

  const getValidatorName = (course: StudentCourseWithValidator) => {
    if (!course.validator) return "Teacher";
    return course.validator.displayName || 
           `${course.validator.firstName || ''} ${course.validator.lastName || ''}`.trim() || 
           "Teacher";
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Courses</h3>
        </div>
        {isOwnProfile && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingCourse(null);
              setAddModalOpen(true);
            }}
            data-testid="button-add-course"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No courses added yet</p>
          {isOwnProfile && (
            <p className="text-xs mt-1">Add courses you have completed to your profile</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex gap-4 p-4 rounded-md border hover-elevate"
              data-testid={`student-course-${course.id}`}
            >
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{course.courseName}</h4>
                      {course.courseCode && (
                        <Badge variant="secondary" className="text-xs">
                          {course.courseCode}
                        </Badge>
                      )}
                      {course.isValidated || course.validationStatus === 'validated' ? (
                        <Badge variant="default" className="bg-green-600 text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Validated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                      {course.institution && <p>{course.institution}</p>}
                      {course.instructor && (
                        <p className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {course.instructor}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {course.semester && <span>{course.semester}</span>}
                        {course.year && <span>{course.year}</span>}
                        {course.grade && (
                          <span>
                            <span className="text-muted-foreground">Grade:</span> {course.grade}
                          </span>
                        )}
                        {course.credits && (
                          <span>{course.credits} credits</span>
                        )}
                      </div>
                    </div>
                    {course.description && (
                      <p className="text-sm mt-2 text-muted-foreground">{course.description}</p>
                    )}
                    {course.isValidated && course.validator && (
                      <p className="text-xs mt-2 text-green-600 dark:text-green-400">
                        Validated by {getValidatorName(course)}
                      </p>
                    )}
                    {course.validationNote && (
                      <p className="text-xs mt-1 italic text-muted-foreground">
                        "{course.validationNote}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 flex-wrap">
                    {canValidate(course) && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleValidate(course.id)}
                          disabled={validateMutation.isPending}
                          data-testid={`button-validate-course-${course.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(course.id)}
                          disabled={validateMutation.isPending}
                          data-testid={`button-reject-course-${course.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {canRemoveValidation(course) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveValidation(course.id)}
                        disabled={removeValidationMutation.isPending}
                        title="Remove validation"
                        data-testid={`button-remove-validation-${course.id}`}
                      >
                        <XCircle className="h-4 w-4 text-orange-500" />
                      </Button>
                    )}
                    {isOwnProfile && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(course)}
                          data-testid={`button-edit-course-${course.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(course.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-course-${course.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <StudentCourseModal
        open={addModalOpen}
        onOpenChange={(open: boolean) => {
          setAddModalOpen(open);
          if (!open) setEditingCourse(null);
        }}
        userId={userId}
        course={editingCourse}
      />

      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this course from your profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
