import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Post, InsertPost } from "@shared/schema";

export function usePosts(limit = 20, offset = 0) {
  return useQuery<Post[]>({
    queryKey: ['/api/posts', { limit, offset }],
  });
}

export function useCreatePost() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (post: InsertPost) => {
      const res = await apiRequest('POST', '/api/posts', post);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useLikePost() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: number; userId: number }) => {
      await apiRequest('POST', `/api/posts/${postId}/like`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
