import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Post, User, Comment, Reaction } from "@shared/schema";

export type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
  reactions: Reaction[];
};

const FEED_KEYS = [
  ["/api/feed/personalized"],
  ["/api/feed/trending"],
  ["/api/feed/following"],
  ["/api/posts"],
] as const;

export function usePostCard(initialPost: PostWithAuthor) {
  const auth = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialPost.content || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const post = useMemo(() => {
    const feedCaches = [
      queryClient.getQueryData(["/api/feed/personalized"]),
      queryClient.getQueryData(["/api/feed/trending"]),
      queryClient.getQueryData(["/api/feed/following"]),
    ];

    for (const cache of feedCaches) {
      if (Array.isArray(cache)) {
        const cachedPost = cache.find((p: PostWithAuthor) => p.id === initialPost.id);
        if (cachedPost) return cachedPost;
      }
    }

    return initialPost;
  }, [
    queryClient,
    initialPost,
    queryClient.getQueryState(["/api/feed/personalized"])?.dataUpdateCount,
    queryClient.getQueryState(["/api/feed/trending"])?.dataUpdateCount,
    queryClient.getQueryState(["/api/feed/following"])?.dataUpdateCount,
  ]);

  const cancelAllQueries = async () => {
    for (const key of FEED_KEYS) {
      await queryClient.cancelQueries({ queryKey: key });
    }
  };

  const invalidateAllQueries = () => {
    for (const key of FEED_KEYS) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const reactionMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", "/api/reactions", { postId: post.id, type });
    },
    onMutate: async (type: string) => {
      await cancelAllQueries();

      const previousPersonalized = queryClient.getQueryData(["/api/feed/personalized"]);
      const previousTrending = queryClient.getQueryData(["/api/feed/trending"]);
      const previousFollowing = queryClient.getQueryData(["/api/feed/following"]);

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
      if (context?.previousPersonalized) {
        queryClient.setQueryData(["/api/feed/personalized"], context.previousPersonalized);
      }
      if (context?.previousTrending) {
        queryClient.setQueryData(["/api/feed/trending"], context.previousTrending);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(["/api/feed/following"], context.previousFollowing);
      }
      toast({ title: "Error", description: "Failed to add reaction", variant: "destructive" });
    },
    onSettled: invalidateAllQueries,
  });

  const removeReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      return apiRequest("DELETE", `/api/reactions/${reactionId}`, {});
    },
    onMutate: async (reactionId: string) => {
      await cancelAllQueries();

      const previousPersonalized = queryClient.getQueryData(["/api/feed/personalized"]);
      const previousTrending = queryClient.getQueryData(["/api/feed/trending"]);
      const previousFollowing = queryClient.getQueryData(["/api/feed/following"]);

      const updatePosts = (oldData: PostWithAuthor[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) =>
          p.id === post.id
            ? { ...p, reactions: p.reactions.filter((r: Reaction) => r.id !== reactionId) }
            : p
        );
      };

      queryClient.setQueryData(["/api/feed/personalized"], updatePosts);
      queryClient.setQueryData(["/api/feed/trending"], updatePosts);
      queryClient.setQueryData(["/api/feed/following"], updatePosts);

      return { previousPersonalized, previousTrending, previousFollowing };
    },
    onError: (err, reactionId, context) => {
      if (context?.previousPersonalized) {
        queryClient.setQueryData(["/api/feed/personalized"], context.previousPersonalized);
      }
      if (context?.previousTrending) {
        queryClient.setQueryData(["/api/feed/trending"], context.previousTrending);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(["/api/feed/following"], context.previousFollowing);
      }
      toast({ title: "Error", description: "Failed to remove reaction", variant: "destructive" });
    },
    onSettled: invalidateAllQueries,
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/comments", { postId: post.id, content: commentText });
    },
    onMutate: async () => {
      await cancelAllQueries();

      const previousPersonalized = queryClient.getQueryData(["/api/feed/personalized"]);
      const previousTrending = queryClient.getQueryData(["/api/feed/trending"]);
      const previousFollowing = queryClient.getQueryData(["/api/feed/following"]);

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

      const previousText = commentText;
      setCommentText("");

      return { previousPersonalized, previousTrending, previousFollowing, previousText };
    },
    onError: (err, variables, context) => {
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
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    },
    onSettled: invalidateAllQueries,
    onSuccess: () => {
      toast({ title: "Comment posted!" });
    },
  });

  const editPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("PATCH", `/api/posts/${post.id}`, { content });
    },
    onSuccess: () => {
      invalidateAllQueries();
      setIsEditing(false);
      toast({ title: "Post updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update post", variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`, {});
    },
    onSuccess: () => {
      invalidateAllQueries();
      toast({ title: "Post deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete post", variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest("DELETE", `/api/comments/${commentId}`, {});
    },
    onMutate: async (commentId: string) => {
      await cancelAllQueries();

      const previousPersonalized = queryClient.getQueryData(["/api/feed/personalized"]);
      const previousTrending = queryClient.getQueryData(["/api/feed/trending"]);
      const previousFollowing = queryClient.getQueryData(["/api/feed/following"]);

      const updatePosts = (oldData: PostWithAuthor[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) =>
          p.id === post.id
            ? { ...p, comments: p.comments.filter((c: Comment) => c.id !== commentId) }
            : p
        );
      };

      queryClient.setQueryData(["/api/feed/personalized"], updatePosts);
      queryClient.setQueryData(["/api/feed/trending"], updatePosts);
      queryClient.setQueryData(["/api/feed/following"], updatePosts);

      return { previousPersonalized, previousTrending, previousFollowing };
    },
    onError: (err, commentId, context) => {
      if (context?.previousPersonalized) {
        queryClient.setQueryData(["/api/feed/personalized"], context.previousPersonalized);
      }
      if (context?.previousTrending) {
        queryClient.setQueryData(["/api/feed/trending"], context.previousTrending);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(["/api/feed/following"], context.previousFollowing);
      }
      toast({ title: "Failed to delete comment", variant: "destructive" });
    },
    onSettled: () => {
      invalidateAllQueries();
      setCommentToDelete(null);
    },
    onSuccess: () => {
      toast({ title: "Comment deleted" });
    },
  });

  const handleReaction = (type: string) => {
    if (!auth.userData) return;
    
    const existingReaction = post.reactions.find(
      (r: Reaction) => r.userId === auth.userData?.id && r.type === type
    );
    
    if (existingReaction) {
      removeReactionMutation.mutate(existingReaction.id);
    } else {
      const otherReaction = post.reactions.find(
        (r: Reaction) => r.userId === auth.userData?.id && r.type !== type
      );
      if (otherReaction) {
        removeReactionMutation.mutate(otherReaction.id);
      }
      reactionMutation.mutate(type);
    }
  };

  const getReactionCount = (type: string) => {
    return post.reactions.filter((r: Reaction) => r.type === type).length;
  };

  const hasUserReacted = (type: string) => {
    return post.reactions.some((r: Reaction) => r.userId === auth.userData?.id && r.type === type);
  };

  const isOwnPost = auth.userData?.id === post.authorId;
  const isAdmin = auth.userData?.role === 'master_admin' || auth.userData?.role === 'university_admin';
  const canModifyPost = isOwnPost || isAdmin;

  return {
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
  };
}
