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

// Helper function to check if a query key is related to posts/feed
function isPostRelatedQuery(queryKey: any): boolean {
  return (
    typeof queryKey[0] === 'string' && (
      queryKey[0].includes('/api/feed') ||
      queryKey[0].includes('/api/posts')
    )
  );
}

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

  // Find post from cache by searching all feed queries - update on every render
  // so we always get the latest version from cache
  const post = (() => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.findAll();
    
    for (const query of allQueries) {
      const data = query.state.data;
      if (Array.isArray(data)) {
        const cachedPost = data.find((p: PostWithAuthor) => p.id === initialPost.id);
        if (cachedPost) return cachedPost;
      }
    }

    return initialPost;
  })();

  // Update all feed queries that contain this post
  const updateAllFeedQueries = (updateFn: (oldData: any) => any) => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.findAll();
    
    for (const query of allQueries) {
      if (isPostRelatedQuery(query.queryKey)) {
        queryClient.setQueryData(query.queryKey, updateFn);
      }
    }
  };

  const cancelAllQueries = async () => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.findAll();
    
    for (const query of allQueries) {
      if (isPostRelatedQuery(query.queryKey)) {
        await queryClient.cancelQueries({ queryKey: query.queryKey });
      }
    }
  };

  const reactionMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", "/api/reactions", { postId: post.id, type });
    },
    onMutate: async (type: string) => {
      await cancelAllQueries();

      // Save all previous data for rollback
      const cache = queryClient.getQueryCache();
      const previousData = new Map();
      const allQueries = cache.findAll();
      
      for (const query of allQueries) {
        if (isPostRelatedQuery(query.queryKey)) {
          previousData.set(JSON.stringify(query.queryKey), queryClient.getQueryData(query.queryKey));
        }
      }

      const optimisticReaction = {
        id: `temp-${Date.now()}`,
        postId: post.id,
        userId: auth.userData!.id,
        type,
        createdAt: new Date(),
      };

      const updatePosts = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) => {
          if (p.id !== post.id) return p;
          
          const existingReaction = p.reactions.find(
            (r: Reaction) => r.userId === auth.userData?.id && r.type === type
          );

          if (existingReaction) {
            return {
              ...p,
              reactions: p.reactions.filter((r: Reaction) => r.id !== existingReaction.id)
            };
          } else {
            const filteredReactions = p.reactions.filter(
              (r: Reaction) => r.userId !== auth.userData?.id
            );
            return {
              ...p,
              reactions: [...filteredReactions, optimisticReaction]
            };
          }
        });
      };

      updateAllFeedQueries(updatePosts);

      return { previousData };
    },
    onError: (err, type, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          queryClient.setQueryData(JSON.parse(keyString), data);
        });
      }
      toast({ title: "Error", description: "Failed to update reaction", variant: "destructive" });
    },
    onSuccess: () => {
      // Refresh user data to update streak
      auth.refreshUserData().catch((error) => {
        console.error('Failed to refresh user data after reaction:', error);
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (textToSubmit: string) => {
      const res = await apiRequest("POST", "/api/comments", { postId: post.id, content: textToSubmit });
      const data = await res.json();
      return data;
    },
    onMutate: async () => {
      await cancelAllQueries();

      const textBeforeClear = commentText;
      
      // Save all previous data for rollback
      const cache = queryClient.getQueryCache();
      const previousData = new Map();
      const allQueries = cache.findAll();
      
      for (const query of allQueries) {
        if (isPostRelatedQuery(query.queryKey)) {
          previousData.set(JSON.stringify(query.queryKey), queryClient.getQueryData(query.queryKey));
        }
      }

      const optimisticComment = {
        id: `temp-${Date.now()}`,
        postId: post.id,
        authorId: auth.userData!.id,
        content: textBeforeClear,
        createdAt: new Date(),
        author: auth.userData,
      };

      const updatePosts = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) =>
          p.id === post.id
            ? { ...p, comments: [...p.comments, optimisticComment] }
            : p
        );
      };

      updateAllFeedQueries(updatePosts);

      setCommentText("");

      return { previousData, previousText: textBeforeClear };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          queryClient.setQueryData(JSON.parse(keyString), data);
        });
      }
      if (context?.previousText) {
        setCommentText(context.previousText);
      }
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    },
    onSuccess: (data) => {
      // Update the cache with the real comment from the server
      const updateWithRealComment = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) => {
          if (p.id !== post.id) return p;
          return {
            ...p,
            comments: p.comments.map((c: any) => 
              c.id.startsWith('temp-') && c.content === data.content ? data : c
            )
          };
        });
      };
      
      updateAllFeedQueries(updateWithRealComment);
      
      // Refresh user data to update streak
      auth.refreshUserData().catch((error) => {
        console.error('Failed to refresh user data after comment:', error);
      });
      
      toast({ title: "Comment posted!" });
    },
  });

  const editPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("PATCH", `/api/posts/${post.id}`, { content });
    },
    onMutate: async (content: string) => {
      await cancelAllQueries();

      const cache = queryClient.getQueryCache();
      const previousData = new Map();
      const allQueries = cache.findAll();
      
      for (const query of allQueries) {
        if (isPostRelatedQuery(query.queryKey)) {
          previousData.set(JSON.stringify(query.queryKey), queryClient.getQueryData(query.queryKey));
        }
      }

      const updatePosts = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) =>
          p.id === post.id ? { ...p, content } : p
        );
      };

      updateAllFeedQueries(updatePosts);

      return { previousData };
    },
    onError: (err, content, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          queryClient.setQueryData(JSON.parse(keyString), data);
        });
      }
      toast({ title: "Failed to update post", variant: "destructive" });
    },
    onSuccess: () => {
      setIsEditing(false);
      toast({ title: "Post updated!" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      // For delete, we need to refetch since the post is removed
      const cache = queryClient.getQueryCache();
      const allQueries = cache.findAll();
      
      for (const query of allQueries) {
        if (isPostRelatedQuery(query.queryKey)) {
          queryClient.invalidateQueries({ queryKey: query.queryKey });
        }
      }
      
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

      const cache = queryClient.getQueryCache();
      const previousData = new Map();
      const allQueries = cache.findAll();
      
      for (const query of allQueries) {
        if (isPostRelatedQuery(query.queryKey)) {
          previousData.set(JSON.stringify(query.queryKey), queryClient.getQueryData(query.queryKey));
        }
      }

      const updatePosts = (oldData: PostWithAuthor[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((p: PostWithAuthor) =>
          p.id === post.id
            ? { ...p, comments: p.comments.filter((c: Comment) => c.id !== commentId) }
            : p
        );
      };

      updateAllFeedQueries(updatePosts);

      return { previousData };
    },
    onError: (err, commentId, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          queryClient.setQueryData(JSON.parse(keyString), data);
        });
      }
      toast({ title: "Failed to delete comment", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Comment deleted" });
      setCommentToDelete(null);
    },
  });

  const handleReaction = (type: string) => {
    if (!auth.userData) return;
    reactionMutation.mutate(type);
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
