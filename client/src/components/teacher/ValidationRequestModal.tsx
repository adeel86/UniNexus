import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Send } from "lucide-react";
import type { CourseWithStats } from "./useTeacherContent";

interface ValidationRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseWithStats | null;
  isPending: boolean;
  onSubmit: (note: string) => void;
}

export function ValidationRequestModal({
  open,
  onOpenChange,
  course,
  isPending,
  onSubmit,
}: ValidationRequestModalProps) {
  const [note, setNote] = useState("");

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNote("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = () => {
    onSubmit(note.trim());
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request University Validation</DialogTitle>
          <DialogDescription>
            Submit this course for validation by your university. Once validated, you can upload materials and students can access AI tutoring.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {course && (
            <div className="bg-muted p-3 rounded-md">
              <p className="font-medium">{course.name}</p>
              <p className="text-sm text-muted-foreground">Code: {course.code}</p>
              {course.semester && (
                <p className="text-sm text-muted-foreground">{course.semester}</p>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="validation-note">Note for University (optional)</Label>
            <Textarea
              id="validation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any additional information for the validation review..."
              rows={3}
              data-testid="textarea-validation-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            data-testid="button-confirm-request-validation"
          >
            <Send className="h-4 w-4 mr-2" />
            {isPending ? "Sending..." : "Request Validation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
