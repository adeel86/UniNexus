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
import type { User, StudentCourse } from '@shared/schema';

const studentCourseSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  courseCode: z.string().optional(),
  institution: z.string().optional(),
  instructor: z.string().optional(),
  semester: z.string().optional(),
  year: z.number().optional().nullable(),
  grade: z.string().optional(),
  credits: z.number().optional().nullable(),
  description: z.string().optional(),
  assignedTeacherId: z.string().optional().nullable(),
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
  const [yearInput, setYearInput] = useState('');
  const [creditsInput, setCreditsInput] = useState('');
  
  const { data: userData } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
  });

  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ['/api/users', 'role', 'teacher'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=teacher');
      if (!response.ok) throw new Error('Failed to fetch teachers');
      const allTeachers: User[] = await response.json();
      return allTeachers.filter(t => !userData?.university || t.university === userData.university);
    },
    enabled: !!userData,
  });

  const form = useForm<StudentCourseFormData>({
    resolver: zodResolver(studentCourseSchema),
    defaultValues: {
      courseName: '',
      courseCode: '',
      institution: '',
      instructor: '',
      semester: '',
      year: null,
      grade: '',
      credits: null,
      description: '',
      assignedTeacherId: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (course) {
        form.reset({
          courseName: course.courseName || '',
          courseCode: course.courseCode || '',
          institution: course.institution || '',
          instructor: course.instructor || '',
          semester: course.semester || '',
          year: course.year || null,
          grade: course.grade || '',
          credits: course.credits || null,
          description: course.description || '',
          assignedTeacherId: course.assignedTeacherId || null,
        });
        setYearInput(course.year?.toString() || '');
        setCreditsInput(course.credits?.toString() || '');
      } else {
        form.reset({
          courseName: '',
          courseCode: '',
          institution: '',
          instructor: '',
          semester: '',
          year: null,
          grade: '',
          credits: null,
          description: '',
          assignedTeacherId: null,
        });
        setYearInput('');
        setCreditsInput('');
      }
    }
  }, [open, course, form]);

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
    const submitData = {
      ...data,
      year: yearInput ? parseInt(yearInput) : null,
      credits: creditsInput ? parseInt(creditsInput) : null,
      university: data.institution || userData?.university || '',
    };
    
    if (course) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const { data: allCourses = [] } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    queryFn: async () => {
      const response = await fetch('/api/courses');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const selectedTeacherId = form.watch('assignedTeacherId');
  const filteredCourses = allCourses.filter(c => 
    !selectedTeacherId || c.instructorId === selectedTeacherId
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
            <Label htmlFor="courseName">Course Name *</Label>
            <Select
              value={form.watch('courseName')}
              onValueChange={(val) => {
                const selected = allCourses.find(c => c.name === val);
                form.setValue('courseName', val);
                if (selected) {
                  form.setValue('courseCode', selected.code);
                  form.setValue('institution', selected.university || '');
                  if (selected.instructorId) {
                    form.setValue('assignedTeacherId', selected.instructorId);
                  }
                }
              }}
            >
              <SelectTrigger data-testid="select-course-name">
                <SelectValue placeholder="Select course" />
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
                placeholder="e.g., CS101"
                data-testid="input-course-code"
              />
            </div>

            <div>
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                {...form.register('institution')}
                placeholder="e.g., MIT"
                data-testid="input-institution"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instructor">Instructor</Label>
              <Input
                id="instructor"
                {...form.register('instructor')}
                placeholder="e.g., Prof. John Smith"
                data-testid="input-instructor"
              />
            </div>

            <div>
              <Label htmlFor="assignedTeacherId">Assign Teacher for Validation</Label>
              <Select
                value={form.watch('assignedTeacherId') || 'none'}
                onValueChange={(value) => form.setValue('assignedTeacherId', value === 'none' ? null : value)}
              >
                <SelectTrigger data-testid="select-assigned-teacher">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific teacher</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.displayName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={form.watch('semester') || 'none'}
                onValueChange={(value) => form.setValue('semester', value === 'none' ? '' : value)}
              >
                <SelectTrigger data-testid="select-semester">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Year</Label>
              <Select
                value={yearInput || 'none'}
                onValueChange={(value) => setYearInput(value === 'none' ? '' : value)}
              >
                <SelectTrigger data-testid="select-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                value={creditsInput}
                onChange={(e) => setCreditsInput(e.target.value)}
                placeholder="e.g., 3"
                data-testid="input-credits"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="grade">Grade</Label>
            <Input
              id="grade"
              {...form.register('grade')}
              placeholder="e.g., A, B+, or 85%"
              data-testid="input-grade"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="What did you learn in this course?"
              rows={3}
              data-testid="textarea-description"
            />
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
