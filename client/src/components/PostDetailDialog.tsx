import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PostCard } from "@/components/PostCard";
import type { Post, User, Comment, Reaction } from "@shared/schema";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

interface PostDetailDialogProps {
  post: PostWithAuthor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailDialog({ post, open, onOpenChange }: PostDetailDialogProps) {
  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Post by {post.author.firstName} {post.author.lastName}</DialogTitle>
        </DialogHeader>
        <PostCard post={post} />
      </DialogContent>
    </Dialog>
  );
}
