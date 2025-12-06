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
import { XCircle } from "lucide-react";
import type { PendingCourse } from "./useUniversityDashboard";
import { getInstructorName } from "./useUniversityDashboard";

interface RejectCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCourse: PendingCourse | null;
  rejectionReason: string;
  onRejectionReasonChange: (reason: string) => void;
  onReject: () => void;
  isPending: boolean;
}

export function RejectCourseDialog({
  open,
  onOpenChange,
  selectedCourse,
  rejectionReason,
  onRejectionReasonChange,
  onReject,
  isPending,
}: RejectCourseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Course</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this course validation request. The instructor will be notified.
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
            <Label htmlFor="reject-reason">Reason for Rejection</Label>
            <Textarea
              id="reject-reason"
              value={rejectionReason}
              onChange={(e) => onRejectionReasonChange(e.target.value)}
              placeholder="Explain why this course is being rejected..."
              rows={3}
              data-testid="textarea-rejection-reason"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isPending}
            data-testid="button-confirm-reject"
          >
            <XCircle className="h-4 w-4 mr-2" />
            {isPending ? "Rejecting..." : "Reject Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
