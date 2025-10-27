import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Question, InsertQuestion } from "@shared/schema";

export function useQuestions(filter?: string) {
  return useQuery<Question[]>({
    queryKey: ['/api/questions', { filter }],
  });
}

export function useCreateQuestion() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (question: InsertQuestion) => {
      const res = await apiRequest('POST', '/api/questions', question);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      toast({
        title: "Success",
        description: "Question posted successfully!",
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
