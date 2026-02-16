import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { CourseWithStats } from "./useTeacherContent";

interface CourseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  courseForm: {
    name: string;
    setName: (val: string) => void;
    code: string;
    setCode: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    semester: string;
    setSemester: (val: string) => void;
    university: string;
    setUniversity: (val: string) => void;
  };
  isPending: boolean;
  onSubmit: () => void;
  defaultUniversity?: string;
}

export function CourseFormModal({
  open,
  onOpenChange,
  mode,
  courseForm,
  isPending,
  onSubmit,
  defaultUniversity,
}: CourseFormModalProps) {
  const isEdit = mode === "edit";
  const title = isEdit ? "Edit Course" : "Create New Course";
  const description = isEdit
    ? "Update course details. Note: Editing a validated course may require re-validation."
    : "Add a new course to your teaching portfolio. You'll need to request university validation before uploading materials.";
  const submitLabel = isEdit
    ? isPending ? "Saving..." : "Save Changes"
    : isPending ? "Creating..." : "Create Course";

  const { data: universities = [] } = useQuery<string[]>({
    queryKey: ['/api/universities'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=university_admin');
      if (!response.ok) return [];
      const admins: any[] = await response.json();
      return Array.from(new Set(admins.map(a => a.university).filter(Boolean))) as string[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${mode}-course-name`}>Course Name *</Label>
            <Input
              id={`${mode}-course-name`}
              value={courseForm.name}
              onChange={(e) => courseForm.setName(e.target.value)}
              placeholder="e.g., Introduction to Computer Science"
              data-testid={`input-${mode}-course-name`}
            />
          </div>
          <div>
            <Label htmlFor={`${mode}-course-code`}>Course Code *</Label>
            <Input
              id={`${mode}-course-code`}
              value={courseForm.code}
              onChange={(e) => courseForm.setCode(e.target.value)}
              placeholder="e.g., CS101"
              data-testid={`input-${mode}-course-code`}
            />
          </div>
          <div>
            <Label htmlFor={`${mode}-course-description`}>Description</Label>
            <Textarea
              id={`${mode}-course-description`}
              value={courseForm.description}
              onChange={(e) => courseForm.setDescription(e.target.value)}
              placeholder="Brief description of the course"
              data-testid={`textarea-${mode}-course-description`}
            />
          </div>
          <div>
            <Label htmlFor={`${mode}-course-semester`}>Semester</Label>
            <Input
              id={`${mode}-course-semester`}
              value={courseForm.semester}
              onChange={(e) => courseForm.setSemester(e.target.value)}
              placeholder="e.g., Fall 2024"
              data-testid={`input-${mode}-course-semester`}
            />
          </div>
          <div>
            <Label htmlFor={`${mode}-course-university`}>University</Label>
            <Select
              value={courseForm.university || defaultUniversity || ""}
              onValueChange={courseForm.setUniversity}
            >
              <SelectTrigger id={`${mode}-course-university`} data-testid={`select-${mode}-course-university`}>
                <SelectValue placeholder="Select university" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((uni) => (
                  <SelectItem key={uni} value={uni}>
                    {uni}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            data-testid={`button-confirm-${mode}-course`}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
