import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteDialogsProps {
  showDeletePostDialog: boolean;
  onDeletePostDialogChange: (open: boolean) => void;
  onConfirmDeletePost: () => void;
  commentToDelete: string | null;
  onCommentToDeleteChange: (commentId: string | null) => void;
  onConfirmDeleteComment: () => void;
}

export function DeleteDialogs({
  showDeletePostDialog,
  onDeletePostDialogChange,
  onConfirmDeletePost,
  commentToDelete,
  onCommentToDeleteChange,
  onConfirmDeleteComment,
}: DeleteDialogsProps) {
  return (
    <>
      <AlertDialog open={showDeletePostDialog} onOpenChange={onDeletePostDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && onCommentToDeleteChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-comment">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-comment"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
