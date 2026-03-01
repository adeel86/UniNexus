import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { EducationRecord } from "@shared/schema";

interface AddEducationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  editingRecord?: EducationRecord | null;
}

export function AddEducationModal({ open, onOpenChange, userId, editingRecord }: AddEducationModalProps) {
  const { toast } = useToast();
  const isEditing = !!editingRecord;

  const [formData, setFormData] = useState({
    institution: "",
    degree: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    grade: "",
    description: "",
    isCurrent: false,
  });

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        institution: editingRecord.institution || "",
        degree: editingRecord.degree || "",
        fieldOfStudy: editingRecord.fieldOfStudy || "",
        startDate: editingRecord.startDate || "",
        endDate: editingRecord.endDate || "",
        grade: editingRecord.grade || "",
        description: editingRecord.description || "",
        isCurrent: editingRecord.isCurrent || false,
      });
    } else {
      setFormData({
        institution: "",
        degree: "",
        fieldOfStudy: "",
        startDate: "",
        endDate: "",
        grade: "",
        description: "",
        isCurrent: false,
      });
    }
  }, [editingRecord, open]);

  const [isUploading, setIsUploading] = useState(false);
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiRequest("POST", "/api/upload/image", formData);
      return res.json();
    },
    onSettled: () => setIsUploading(false),
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/education/${editingRecord.id}`, data);
      } else {
        return apiRequest("POST", "/api/education", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/education`] });
      toast({ title: isEditing ? "Education record updated" : "Education record added" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save education record",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.institution.trim()) {
      toast({ title: "Institution name is required", variant: "destructive" });
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Education" : "Add Education"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="institution">Institution *</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="e.g., Stanford University"
              required
              data-testid="input-institution"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="degree">Degree</Label>
              <Input
                id="degree"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                placeholder="e.g., Bachelor's, Master's, PhD"
                data-testid="input-degree"
              />
            </div>

            <div>
              <Label htmlFor="fieldOfStudy">Field of Study</Label>
              <Input
                id="fieldOfStudy"
                value={formData.fieldOfStudy}
                onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                placeholder="e.g., Computer Science"
                data-testid="input-fieldOfStudy"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="month"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                data-testid="input-startDate"
              />
              <p className="text-xs text-muted-foreground mt-1">Or just enter a year</p>
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="month"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={formData.isCurrent}
                data-testid="input-endDate"
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="isCurrent"
                  checked={formData.isCurrent}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isCurrent: !!checked, endDate: checked ? "" : formData.endDate })
                  }
                  data-testid="checkbox-isCurrent"
                />
                <Label htmlFor="isCurrent" className="text-sm font-normal cursor-pointer">
                  I currently study here
                </Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="grade">Grade / GPA</Label>
            <Input
              id="grade"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              placeholder="e.g., 3.8/4.0, First Class Honours"
              data-testid="input-grade"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your achievements, activities, coursework..."
              rows={4}
              data-testid="textarea-description"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-education"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || isUploading} data-testid="button-save-education">
              {mutation.isPending || isUploading ? "Saving..." : isEditing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
