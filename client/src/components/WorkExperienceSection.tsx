import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Edit, Trash2, Calendar } from "lucide-react";
import type { JobExperience } from "@shared/schema";
import { useState } from "react";
import { JobExperienceModal } from "./JobExperienceModal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WorkExperienceSectionProps {
  isOwnProfile: boolean;
  userId: string;
}

export function WorkExperienceSection({ isOwnProfile, userId }: WorkExperienceSectionProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<JobExperience | null>(null);
  const { toast } = useToast();

  const { data: workExperience = [], isLoading } = useQuery<JobExperience[]>({
    queryKey: [`/api/users/${userId}/job-experience`],
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/job-experience/${id}`, {});
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: [`/api/users/${userId}/job-experience`] });
      const previousExperiences = queryClient.getQueryData<JobExperience[]>([`/api/users/${userId}/job-experience`]);
      queryClient.setQueryData<JobExperience[]>(
        [`/api/users/${userId}/job-experience`],
        (old = []) => old.filter(exp => exp.id !== deletedId)
      );
      return { previousExperiences };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(
        [`/api/users/${userId}/job-experience`],
        context?.previousExperiences
      );
      toast({ title: "Failed to delete work experience", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/job-experience`] });
      toast({ title: "Work experience deleted" });
    },
  });

  const handleEdit = (experience: JobExperience) => {
    setEditingExperience(experience);
    setAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this work experience?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "";
    if (date.toLowerCase() === "present") return "Present";
    if (date.length === 4) return date;
    const [year, month] = date.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[parseInt(month) - 1] || ""} ${year}`;
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
          <Briefcase className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Work Experience</h3>
        </div>
        {isOwnProfile && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingExperience(null);
              setAddModalOpen(true);
            }}
            data-testid="button-add-work-experience"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Experience
          </Button>
        )}
      </div>

      {workExperience.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No work experience added yet</p>
          {isOwnProfile && (
            <p className="text-xs mt-1">Add your work history to showcase your professional background</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {workExperience.map((experience) => (
            <div
              key={experience.id}
              className="flex gap-4 p-4 rounded-md border hover-elevate"
              data-testid={`work-experience-${experience.id}`}
            >
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{experience.position}</h4>
                    <p className="text-sm text-muted-foreground">{experience.organization}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDate(experience.startDate)} - {experience.isCurrent ? "Present" : formatDate(experience.endDate)}
                      </span>
                    </div>
                    {experience.description && (
                      <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap">{experience.description}</p>
                    )}
                  </div>
                  {isOwnProfile && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(experience)}
                        data-testid={`button-edit-experience-${experience.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(experience.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-experience-${experience.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <JobExperienceModal
        open={addModalOpen}
        onOpenChange={(open: boolean) => {
          setAddModalOpen(open);
          if (!open) setEditingExperience(null);
        }}
        userId={userId}
        experience={editingExperience}
      />
    </Card>
  );
}
