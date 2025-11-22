import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { Heart, MessageCircle, Share2, ThumbsUp, Lightbulb, Handshake, BadgeCheck } from "lucide-react";
import type { Post, User, Comment, Reaction } from "@shared/schema";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { VideoPlayer } from "@/components/VideoPlayer";

type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

interface PostCardProps {
  post: PostWithAuthor;
}

const reactionTypes = [
  { type: "like", icon: ThumbsUp, label: "Like" },
  { type: "celebrate", icon: Heart, label: "Celebrate" },
  { type: "insightful", icon: Lightbulb, label: "Insightful" },
  { type: "support", icon: Handshake, label: "Support" },
];

export function PostCard({ post }: PostCardProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const reactionMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", "/api/reactions", { postId: post.id, type });
    },
    onMutate: async (type: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/feed/personalized"] });
      await queryClient.cancelQueries({ queryKey: ["/api/feed/trending"] });
      await queryClient.cancelQueries({ queryKey: ["/api/feed/following"] });
      await queryClient.cancelQueries({ queryKey: ["/api/posts"] });

      // Snapshot previous values
      const previousPersonalized = queryClient.getQueryData(["/api/feed/personalized"]);
      const previousTrending = queryClient.getQueryData(["/api/feed/trending"]);
      const previousFollowing = queryClient.getQueryData(["/api/feed/following"]);

      // Optimistically update all feed caches
      const optimisticReaction = {
        id: `temp-${Date.now()}`,
        postId: post.id,
        userId: auth.userData!.id,
        type,
        createdAt: new Date(),
      };

      const updatePosts = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) =>
          p.id === post.id
            ? { ...p, reactions: [...p.reactions, optimisticReaction] }
            : p
        );
      };

      queryClient.setQueryData(["/api/feed/personalized"], updatePosts);
      queryClient.setQueryData(["/api/feed/trending"], updatePosts);
      queryClient.setQueryData(["/api/feed/following"], updatePosts);

      return { previousPersonalized, previousTrending, previousFollowing };
    },
    onError: (err, type, context) => {
      // Rollback on error
      if (context?.previousPersonalized) {
        queryClient.setQueryData(["/api/feed/personalized"], context.previousPersonalized);
      }
      if (context?.previousTrending) {
        queryClient.setQueryData(["/api/feed/trending"], context.previousTrending);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(["/api/feed/following"], context.previousFollowing);
      }
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/feed/personalized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/comments", {
        postId: post.id,
        content: commentText,
      });
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/feed/personalized"] });
      await queryClient.cancelQueries({ queryKey: ["/api/feed/trending"] });
      await queryClient.cancelQueries({ queryKey: ["/api/feed/following"] });
      await queryClient.cancelQueries({ queryKey: ["/api/posts"] });

      // Snapshot previous values
      const previousPersonalized = queryClient.getQueryData(["/api/feed/personalized"]);
      const previousTrending = queryClient.getQueryData(["/api/feed/trending"]);
      const previousFollowing = queryClient.getQueryData(["/api/feed/following"]);

      // Optimistically add comment
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        postId: post.id,
        userId: auth.userData!.id,
        content: commentText,
        createdAt: new Date(),
      };

      const updatePosts = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) =>
          p.id === post.id
            ? { ...p, comments: [...p.comments, optimisticComment] }
            : p
        );
      };

      queryClient.setQueryData(["/api/feed/personalized"], updatePosts);
      queryClient.setQueryData(["/api/feed/trending"], updatePosts);
      queryClient.setQueryData(["/api/feed/following"], updatePosts);

      // Clear comment text immediately for better UX
      const previousText = commentText;
      setCommentText("");

      return { previousPersonalized, previousTrending, previousFollowing, previousText };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPersonalized) {
        queryClient.setQueryData(["/api/feed/personalized"], context.previousPersonalized);
      }
      if (context?.previousTrending) {
        queryClient.setQueryData(["/api/feed/trending"], context.previousTrending);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(["/api/feed/following"], context.previousFollowing);
      }
      if (context?.previousText) {
        setCommentText(context.previousText);
      }
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/feed/personalized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onSuccess: () => {
      toast({ title: "Comment posted!" });
    },
  });

  const handleReaction = (type: string) => {
    if (!auth.userData) return;
    
    const existingReaction = post.reactions.find(
      (r) => r.userId === auth.userData?.id && r.type === type
    );
    
    if (!existingReaction) {
      reactionMutation.mutate(type);
    }
  };

  const getReactionCount = (type: string) => {
    return post.reactions.filter((r) => r.type === type).length;
  };

  const hasUserReacted = (type: string) => {
    return post.reactions.some((r) => r.userId === auth.userData?.id && r.type === type);
  };

  return (
    <Card className="p-6" data-testid={`post-${post.id}`}>
      {/* Post Header */}
      <div className="flex gap-3 mb-4">
        <UserAvatar user={post.author} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {post.author.firstName} {post.author.lastName}
            </span>
            {post.author.isVerified && (
              <BadgeCheck className="h-4 w-4 text-primary" data-testid="icon-verified" />
            )}
            {post.author.role === 'student' && post.author.major && (
              <Badge variant="secondary" className="text-xs">
                {post.author.major}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {post.createdAt && formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            {post.category && (
              <>
                {" · "}
                <span className="capitalize">{post.category}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
        
        {/* Legacy single image support */}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post image"
            className="mt-4 rounded-lg w-full object-cover max-h-96"
            data-testid="post-image"
          />
        )}

        {/* Multiple images from mediaUrls */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={`mt-4 grid gap-2 ${post.mediaUrls.length === 1 ? 'grid-cols-1' : post.mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {post.mediaUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Post image ${index + 1}`}
                className="rounded-lg w-full object-cover h-64"
                data-testid={`post-image-${index}`}
              />
            ))}
          </div>
        )}

        {/* Video player */}
        {post.videoUrl && (
          <div className="mt-4">
            <VideoPlayer
              src={post.videoUrl}
              isReel={post.category === 'reel'}
              data-testid="post-video"
            />
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Reaction Bar */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {reactionTypes.map(({ type, icon: Icon, label }) => {
          const count = getReactionCount(type);
          const isActive = hasUserReacted(type);
          
          return (
            <Button
              key={type}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => handleReaction(type)}
              className={`gap-1 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
              data-testid={`button-react-${type}`}
            >
              <Icon className="h-4 w-4" />
              {count > 0 && <span className="text-xs">{count}</span>}
            </Button>
          );
        })}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="gap-1 ml-auto"
          data-testid="button-toggle-comments"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments.length > 0 && <span className="text-xs">{post.comments.length}</span>}
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && auth.userData && (
        <div className="border-t pt-4 space-y-4">
          {/* Add Comment */}
          <div className="flex gap-3">
            <UserAvatar user={auth.userData} size="sm" />
            <div className="flex-1">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[60px]"
                data-testid="input-comment"
              />
              <Button
                onClick={() => commentMutation.mutate()}
                disabled={!commentText.trim() || commentMutation.isPending}
                size="sm"
                className="mt-2"
                data-testid="button-submit-comment"
              >
                {commentMutation.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          {post.comments.length > 0 && (
            <div className="space-y-3">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                    ?
                  </div>
                  <div className="flex-1 bg-muted rounded-lg p-3">
                    <div className="font-medium text-sm mb-1">
                      User
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {comment.createdAt && formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
