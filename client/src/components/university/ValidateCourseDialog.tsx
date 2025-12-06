import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import type { PendingCourse } from "./useUniversityDashboard";
import { getInstructorName } from "./useUniversityDashboard";

interface ValidateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCourse: PendingCourse | null;
  validationNote: string;
  onValidationNoteChange: (note: string) => void;
  onValidate: () => void;
  isPending: boolean;
}

export function ValidateCourseDialog({
  open,
  onOpenChange,
  selectedCourse,
  validationNote,
  onValidationNoteChange,
  onValidate,
  isPending,
}: ValidateCourseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Course</DialogTitle>
          <DialogDescription>
            Validate this course to allow the instructor to upload materials and enable AI tutoring for enrolled students.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {selectedCourse && (
            <div className="bg-muted p-3 rounded-md">
              <p className="font-medium">{selectedCourse.name}</p>
              <p className="text-sm text-muted-foreground">Code: {selectedCourse.code}</p>
              {selectedCourse.instructor && (
                <p className="text-sm text-muted-foreground">
                  Instructor: {getInstructorName(selectedCourse.instructor)}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="validate-note">Approval Note (optional)</Label>
            <Textarea
              id="validate-note"
              value={validationNote}
              onChange={(e) => onValidationNoteChange(e.target.value)}
              placeholder="Add a note for the instructor..."
              rows={3}
              data-testid="textarea-approval-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onValidate}
            disabled={isPending}
            data-testid="button-confirm-approve"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isPending ? "Approving..." : "Approve Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
