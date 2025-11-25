import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const jobExperienceSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  organization: z.string().min(1, 'Organization is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
});

type JobExperienceFormData = z.infer<typeof jobExperienceSchema>;

interface JobExperience {
  id: string;
  userId: string;
  position: string;
  organization: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

interface JobExperienceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experience?: JobExperience | null;
  userId: string;
}

export function JobExperienceModal({ open, onOpenChange, experience, userId }: JobExperienceModalProps) {
  const { toast } = useToast();
  const [isCurrent, setIsCurrent] = useState(false);
  
  const form = useForm<JobExperienceFormData>({
    resolver: zodResolver(jobExperienceSchema),
    defaultValues: {
      position: '',
      organization: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
    },
  });

  // Reset form when modal opens or experience changes
  useEffect(() => {
    if (open) {
      if (experience) {
        // Editing existing experience
        form.reset({
          position: experience.position || '',
          organization: experience.organization || '',
          startDate: experience.startDate || '',
          endDate: experience.endDate || '',
          isCurrent: experience.isCurrent || false,
          description: experience.description || '',
        });
        setIsCurrent(experience.isCurrent || false);
      } else {
        // Creating new experience
        form.reset({
          position: '',
          organization: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
        });
        setIsCurrent(false);
      }
    }
  }, [open, experience, form]);

  const createMutation = useMutation({
    mutationFn: async (data: JobExperienceFormData) => {
      return apiRequest('POST', '/api/job-experience', data);
    },
    onMutate: async (newExperience) => {
      await queryClient.cancelQueries({ queryKey: [`/api/users/${userId}/job-experience`] });
      
      const previousExperiences = queryClient.getQueryData<JobExperience[]>([`/api/users/${userId}/job-experience`]);
      
      const optimisticExperience = {
        id: `temp-${Date.now()}`,
        userId,
        ...newExperience,
      };
      
      queryClient.setQueryData<JobExperience[]>(
        [`/api/users/${userId}/job-experience`],
        (old = []) => [...old, optimisticExperience]
      );
      
      return { previousExperiences };
    },
    onError: (err, newExperience, context) => {
      queryClient.setQueryData(
        [`/api/users/${userId}/job-experience`],
        context?.previousExperiences
      );
      toast({
        title: 'Error',
        description: 'Failed to add job experience',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/job-experience`] });
      toast({
        title: 'Success',
        description: 'Job experience added successfully',
      });
      onOpenChange(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: JobExperienceFormData) => {
      return apiRequest('PUT', `/api/job-experience/${experience?.id}`, data);
    },
    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey: [`/api/users/${userId}/job-experience`] });
      
      const previousExperiences = queryClient.getQueryData<JobExperience[]>([`/api/users/${userId}/job-experience`]);
      
      queryClient.setQueryData<JobExperience[]>(
        [`/api/users/${userId}/job-experience`],
        (old = []) => old.map(exp => 
          exp.id === experience?.id 
            ? { ...exp, ...updatedData }
            : exp
        )
      );
      
      return { previousExperiences };
    },
    onError: (err, updatedData, context) => {
      queryClient.setQueryData(
        [`/api/users/${userId}/job-experience`],
        context?.previousExperiences
      );
      toast({
        title: 'Error',
        description: 'Failed to update job experience',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/job-experience`] });
      toast({
        title: 'Success',
        description: 'Job experience updated successfully',
      });
      onOpenChange(false);
    },
  });

  const onSubmit = (data: JobExperienceFormData) => {
    if (experience) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {experience ? 'Edit Job Experience' : 'Add Job Experience'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              {...form.register('position')}
              placeholder="e.g., Senior Software Engineer"
              data-testid="input-position"
            />
            {form.formState.errors.position && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.position.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="organization">Organization *</Label>
            <Input
              id="organization"
              {...form.register('organization')}
              placeholder="e.g., Tech University"
              data-testid="input-organization"
            />
            {form.formState.errors.organization && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.organization.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="month"
                {...form.register('startDate')}
                data-testid="input-start-date"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="month"
                {...form.register('endDate')}
                disabled={isCurrent}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isCurrent"
              checked={isCurrent}
              onCheckedChange={(checked) => {
                setIsCurrent(checked as boolean);
                form.setValue('isCurrent', checked as boolean);
                if (checked) {
                  form.setValue('endDate', '');
                }
              }}
              data-testid="checkbox-is-current"
            />
            <Label htmlFor="isCurrent" className="cursor-pointer">
              I currently work here
            </Label>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Describe your responsibilities and achievements..."
              rows={4}
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
              {experience ? 'Update' : 'Add'} Experience
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
