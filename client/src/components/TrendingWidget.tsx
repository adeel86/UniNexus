import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Post, User, Comment, Reaction } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { PostDetailDialog } from "@/components/PostDetailDialog";
import { TrendingUp, MessageCircle, Heart, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

export function TrendingWidget() {
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: trendingPosts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feed/trending?limit=5"],
    refetchInterval: 5 * 60 * 1000,
  });

  const handlePostClick = (post: PostWithAuthor) => {
    setSelectedPost(post);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-pink-600" />
          <h3 className="font-heading text-lg font-semibold">Trending Now</h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : trendingPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No trending posts yet
          </p>
        ) : (
          <div className="space-y-3">
            {trendingPosts.map((post, index) => (
              <div
                key={post.id}
                className="group hover-elevate rounded-lg p-3 cursor-pointer transition-colors"
                onClick={() => handlePostClick(post)}
                data-testid={`trending-post-${post.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <UserAvatar user={post.author} size="sm" />
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {index + 1}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {post.author.firstName} {post.author.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.createdAt!), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1" data-testid={`trending-reactions-${post.id}`}>
                        <Heart className="h-3 w-3" />
                        <span>{post.reactions.length}</span>
                      </div>
                      <div className="flex items-center gap-1" data-testid={`trending-comments-${post.id}`}>
                        <MessageCircle className="h-3 w-3" />
                        <span>{post.comments.length}</span>
                      </div>
                      <div className="flex items-center gap-1" data-testid={`trending-views-${post.id}`}>
                        <Eye className="h-3 w-3" />
                        <span>{post.viewCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PostDetailDialog
        post={selectedPost}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
