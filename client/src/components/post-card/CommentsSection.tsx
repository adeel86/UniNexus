import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User, Comment } from "@shared/schema";

interface CommentsSectionProps {
  comments: (Comment & { author?: User })[];
  currentUser: User;
  postAuthorId: string;
  isAdmin: boolean;
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onSubmitComment: () => void;
  onDeleteComment: (commentId: string) => void;
  isSubmitting: boolean;
}

export function CommentsSection({
  comments,
  currentUser,
  postAuthorId,
  isAdmin,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  onDeleteComment,
  isSubmitting,
}: CommentsSectionProps) {
  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex gap-3">
        <UserAvatar user={currentUser} size="sm" />
        <div className="flex-1">
          <Textarea
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
            className="min-h-[60px]"
            data-testid="input-comment"
          />
          <Button
            onClick={onSubmitComment}
            disabled={!commentText.trim() || isSubmitting}
            size="sm"
            className="mt-2"
            data-testid="button-submit-comment"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => {
            const canDeleteComment = 
              currentUser.id === comment.authorId || 
              currentUser.id === postAuthorId ||
              isAdmin;
            
            return (
              <div key={comment.id} className="flex gap-3 group" data-testid={`comment-${comment.id}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {comment.author?.firstName?.[0] || "?"}
                </div>
                <div className="flex-1 bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">
                      {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : "User"}
                    </div>
                    {canDeleteComment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDeleteComment(comment.id)}
                        data-testid={`button-delete-comment-${comment.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm">{comment.content}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {comment.createdAt && formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
