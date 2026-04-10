import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Post, User, Comment, Reaction } from "@shared/schema";
import {
  usePostCard,
  PostHeader,
  PostContent,
  ReactionBar,
  CommentsSection,
  DeleteDialogs,
  ShareDialog,
} from "./post-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

interface PostCardProps {
  post: PostWithAuthor;
}

const REPORT_REASONS = [
  "Nudity or pornography",
  "Violence or graphic content",
  "Harassment or bullying",
  "Hate speech or discrimination",
  "Spam or misleading content",
  "Dangerous or harmful content",
  "Other",
];

export function PostCard({ post: initialPost }: PostCardProps) {
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const {
    post,
    auth,
    showComments,
    setShowComments,
    commentText,
    setCommentText,
    isEditing,
    setIsEditing,
    editContent,
    setEditContent,
    showDeleteDialog,
    setShowDeleteDialog,
    commentToDelete,
    setCommentToDelete,
    showShareDialog,
    setShowShareDialog,
    shareComment,
    setShareComment,
    showReportDialog,
    setShowReportDialog,
    commentMutation,
    editPostMutation,
    deletePostMutation,
    deleteCommentMutation,
    shareMutation,
    reportMutation,
    handleReaction,
    getReactionCount,
    hasUserReacted,
    isOwnPost,
    isAdmin,
    canModifyPost,
  } = usePostCard(initialPost);

  const handleReportSubmit = () => {
    if (!reportReason) return;
    reportMutation.mutate({ reason: reportReason, details: reportDetails || undefined });
  };

  return (
    <Card className="p-6" data-testid={`post-${post.id}`}>
      <PostHeader
        post={post}
        canModifyPost={canModifyPost}
        isOwnPost={isOwnPost}
        isAuthenticated={!!auth.userData}
        onEdit={() => {
          setEditContent(post.content || "");
          setIsEditing(true);
        }}
        onDelete={() => setShowDeleteDialog(true)}
        onReport={() => {
          setReportReason("");
          setReportDetails("");
          setShowReportDialog(true);
        }}
      />

      <PostContent
        post={post}
        isEditing={isEditing}
        editContent={editContent}
        onEditChange={setEditContent}
        onSave={() => editPostMutation.mutate(editContent)}
        onCancel={() => setIsEditing(false)}
        isSaving={editPostMutation.isPending}
      />

      <ReactionBar
        commentsCount={post.comments.length}
        showComments={showComments}
        onToggleComments={() => setShowComments(!showComments)}
        onReaction={handleReaction}
        getReactionCount={getReactionCount}
        hasUserReacted={hasUserReacted}
        shareCount={post.shareCount ?? 0}
        onShare={() => setShowShareDialog(true)}
        isSharedPost={!!post.originalPostId}
      />

      {showComments && auth.userData && (
        <CommentsSection
          comments={post.comments}
          currentUser={auth.userData}
          postAuthorId={post.authorId}
          isAdmin={isAdmin}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onSubmitComment={() => commentMutation.mutate(commentText)}
          onDeleteComment={(id) => setCommentToDelete(id)}
          isSubmitting={commentMutation.isPending}
        />
      )}

      <DeleteDialogs
        showDeletePostDialog={showDeleteDialog}
        onDeletePostDialogChange={setShowDeleteDialog}
        onConfirmDeletePost={() => deletePostMutation.mutate()}
        commentToDelete={commentToDelete}
        onCommentToDeleteChange={setCommentToDelete}
        onConfirmDeleteComment={() => commentToDelete && deleteCommentMutation.mutate(commentToDelete)}
      />

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        comment={shareComment}
        onCommentChange={setShareComment}
        onConfirm={() => shareMutation.mutate(shareComment)}
        isSharing={shareMutation.isPending}
      />

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
            <DialogDescription>
              Tell us why this post violates our community guidelines. Our moderation team will review it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Reason</label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Additional details (optional)</label>
              <Textarea
                placeholder="Provide any additional context..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                data-testid="input-report-details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReportSubmit}
              disabled={!reportReason || reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
