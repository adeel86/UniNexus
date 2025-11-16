import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, Edit, Trash2, Calendar } from "lucide-react";
import type { EducationRecord } from "@shared/schema";
import { useState } from "react";
import { AddEducationModal } from "./AddEducationModal";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EducationSectionProps {
  educationRecords: EducationRecord[];
  isOwnProfile: boolean;
  userId: string;
}

export function EducationSection({ educationRecords, isOwnProfile, userId }: EducationSectionProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EducationRecord | null>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/education/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/education`] });
      toast({ title: "Education record deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete education record", variant: "destructive" });
    },
  });

  const handleEdit = (record: EducationRecord) => {
    setEditingRecord(record);
    setAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this education record?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    if (date.toLowerCase() === "present") return "Present";
    // Handle YYYY or YYYY-MM formats
    if (date.length === 4) return date;
    const [year, month] = date.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[parseInt(month) - 1] || ""} ${year}`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Education</h3>
        </div>
        {isOwnProfile && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingRecord(null);
              setAddModalOpen(true);
            }}
            data-testid="button-add-education"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        )}
      </div>

      {educationRecords.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No education records added yet</p>
          {isOwnProfile && (
            <p className="text-xs mt-1">Add your educational background to showcase your qualifications</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {educationRecords.map((record) => (
            <div
              key={record.id}
              className="flex gap-4 p-4 rounded-md border hover-elevate"
              data-testid={`education-record-${record.id}`}
            >
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{record.institution}</h4>
                    <p className="text-sm text-muted-foreground">
                      {record.degree}{record.fieldOfStudy && ` in ${record.fieldOfStudy}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDate(record.startDate || "")} - {record.isCurrent ? "Present" : formatDate(record.endDate || "")}
                      </span>
                    </div>
                    {record.grade && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Grade:</span> {record.grade}
                      </p>
                    )}
                    {record.description && (
                      <p className="text-sm mt-2 text-muted-foreground">{record.description}</p>
                    )}
                  </div>
                  {isOwnProfile && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(record)}
                        data-testid={`button-edit-education-${record.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(record.id)}
                        data-testid={`button-delete-education-${record.id}`}
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

      <AddEducationModal
        open={addModalOpen}
        onOpenChange={(open: boolean) => {
          setAddModalOpen(open);
          if (!open) setEditingRecord(null);
        }}
        userId={userId}
        editingRecord={editingRecord}
      />
    </Card>
  );
}
