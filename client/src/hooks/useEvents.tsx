import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Event, InsertEvent } from "@shared/schema";

export function useEvents(filter?: string) {
  return useQuery<Event[]>({
    queryKey: ['/api/events', { filter }],
  });
}

export function useCreateEvent() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (event: InsertEvent) => {
      const res = await apiRequest('POST', '/api/events', event);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Success",
        description: "Event created successfully!",
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
