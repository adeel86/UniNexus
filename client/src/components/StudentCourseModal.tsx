import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { User, StudentCourse, Course, University } from '@shared/schema';

const studentCourseSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  courseCode: z.string().optional(),
  institution: z.string().optional(),
  assignedTeacherId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
});

type StudentCourseFormData = z.infer<typeof studentCourseSchema>;

interface StudentCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: StudentCourse | null;
  userId: string;
}

export function StudentCourseModal({ open, onOpenChange, course, userId }: StudentCourseModalProps) {
  const { toast } = useToast();
  
  const { data: userData } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
  });

  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ['/api/teachers'],
    enabled: !!userData,
  });

  const form = useForm<StudentCourseFormData>({
    resolver: zodResolver(studentCourseSchema),
    defaultValues: {
      courseName: '',
      courseCode: '',
      institution: '',
      assignedTeacherId: null,
      courseId: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (course) {
        form.reset({
          courseName: course.courseName || '',
          courseCode: course.courseCode || '',
          institution: course.institution || '',
          assignedTeacherId: course.assignedTeacherId || null,
          courseId: course.courseId || null,
        });
      } else {
        form.reset({
          courseName: '',
          courseCode: '',
          institution: userData?.university || '',
          assignedTeacherId: null,
          courseId: null,
        });
      }
    }
  }, [open, course, form, userData]);

  const createMutation = useMutation({
    mutationFn: async (data: StudentCourseFormData) => {
      return apiRequest('POST', '/api/student-courses', data);
    },
    onMutate: async (newCourse) => {
      await queryClient.cancelQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      const previousCourses = queryClient.getQueryData<StudentCourse[]>([`/api/users/${userId}/student-courses`]);
      
      const optimisticCourse = {
        id: `temp-${Date.now()}`,
        userId,
        ...newCourse,
        isValidated: false,
        validatedBy: null,
        validatedAt: null,
        validationNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      queryClient.setQueryData<StudentCourse[]>(
        [`/api/users/${userId}/student-courses`],
        (old = []) => [...old, optimisticCourse as unknown as StudentCourse]
      );
      
      return { previousCourses };
    },
    onError: (err, newCourse, context) => {
      queryClient.setQueryData(
        [`/api/users/${userId}/student-courses`],
        context?.previousCourses
      );
      toast({
        title: 'Error',
        description: 'Failed to add course',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      toast({
        title: 'Success',
        description: 'Course added successfully',
      });
      onOpenChange(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: StudentCourseFormData) => {
      return apiRequest('PATCH', `/api/student-courses/${course?.id}`, data);
    },
    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      const previousCourses = queryClient.getQueryData<StudentCourse[]>([`/api/users/${userId}/student-courses`]);
      
      queryClient.setQueryData<StudentCourse[]>(
        [`/api/users/${userId}/student-courses`],
        (old = []) => old.map(c => 
          c.id === course?.id 
            ? { ...c, ...updatedData }
            : c
        )
      );
      
      return { previousCourses };
    },
    onError: (err, updatedData, context) => {
      queryClient.setQueryData(
        [`/api/users/${userId}/student-courses`],
        context?.previousCourses
      );
      toast({
        title: 'Error',
        description: 'Failed to update course',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/student-courses`] });
      toast({
        title: 'Success',
        description: 'Course updated successfully',
      });
      onOpenChange(false);
    },
  });

  const onSubmit = (data: StudentCourseFormData) => {
    // Ensure assignedTeacherId is sent as null if 'none' is selected or it's empty
    const submissionData = {
      ...data,
      assignedTeacherId: data.assignedTeacherId === 'none' || !data.assignedTeacherId ? null : data.assignedTeacherId,
    };

    if (course) {
      updateMutation.mutate(submissionData);
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: allCourses = [] } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    queryFn: async () => {
      const response = await fetch('/api/courses');
      if (!response.ok) return [];
      const data = await response.json();
      return data;
    },
  });

  const selectedTeacherId = form.watch('assignedTeacherId');
  const filteredCourses = allCourses.filter(c => 
    (!selectedTeacherId || c.instructorId === selectedTeacherId) &&
    (!userData?.university || c.university === userData.university)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {course ? 'Edit Course' : 'Add Course'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="assignedTeacherId">Select Teacher *</Label>
            <Select
              value={form.watch('assignedTeacherId') || 'none'}
              onValueChange={(value) => {
                const teacherId = value === 'none' ? null : value;
                form.setValue('assignedTeacherId', teacherId);
                // Clear course name when teacher changes to force re-selection from filtered list
                form.setValue('courseName', '');
              }}
            >
              <SelectTrigger data-testid="select-assigned-teacher">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers
                  .filter(t => !userData?.university || t.university === userData.university)
                  .map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.displayName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="courseName">Course Name *</Label>
            <Select
              value={form.watch('courseName')}
              onValueChange={(val) => {
                const selected = allCourses.find(c => c.name === val);
                form.setValue('courseName', val);
                if (selected) {
                  form.setValue('courseCode', selected.code);
                  form.setValue('institution', selected.university || '');
                  form.setValue('courseId', selected.id);
                }
              }}
              disabled={!selectedTeacherId}
            >
              <SelectTrigger data-testid="select-course-name">
                <SelectValue placeholder={selectedTeacherId ? "Select course" : "Select a teacher first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredCourses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.courseName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.courseName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                {...form.register('courseCode')}
                readOnly
                placeholder="Course code will be auto-filled"
                data-testid="input-course-code"
              />
            </div>

            <div>
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                {...form.register('institution')}
                readOnly
                placeholder="Institution will be auto-filled"
                data-testid="input-institution"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-submit"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {course ? 'Update' : 'Add'} Course
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
