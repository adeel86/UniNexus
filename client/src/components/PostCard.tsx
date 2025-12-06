import { Card } from "@/components/ui/card";
import type { Post, User, Comment, Reaction } from "@shared/schema";
import {
  usePostCard,
  PostHeader,
  PostContent,
  ReactionBar,
  CommentsSection,
  DeleteDialogs,
} from "./post-card";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

interface PostCardProps {
  post: PostWithAuthor;
}

export function PostCard({ post: initialPost }: PostCardProps) {
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
    commentMutation,
    editPostMutation,
    deletePostMutation,
    deleteCommentMutation,
    handleReaction,
    getReactionCount,
    hasUserReacted,
    isOwnPost,
    isAdmin,
    canModifyPost,
  } = usePostCard(initialPost);

  return (
    <Card className="p-6" data-testid={`post-${post.id}`}>
      <PostHeader
        post={post}
        canModifyPost={canModifyPost}
        isOwnPost={isOwnPost}
        onEdit={() => {
          setEditContent(post.content || "");
          setIsEditing(true);
        }}
        onDelete={() => setShowDeleteDialog(true)}
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
      />

      {showComments && auth.userData && (
        <CommentsSection
          comments={post.comments}
          currentUser={auth.userData}
          postAuthorId={post.authorId}
          isAdmin={isAdmin}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onSubmitComment={() => commentMutation.mutate()}
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
    </Card>
  );
}
