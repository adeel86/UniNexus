import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onConfirm: () => void;
  isSharing: boolean;
}

export function ShareDialog({
  open,
  onOpenChange,
  comment,
  onCommentChange,
  onConfirm,
  isSharing,
}: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            className="min-h-[100px] resize-none"
            data-testid="input-share-comment"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSharing}
            data-testid="button-cancel-share"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSharing}
            data-testid="button-confirm-share"
          >
            {isSharing ? "Sharing…" : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
