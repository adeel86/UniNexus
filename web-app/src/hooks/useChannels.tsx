import { useQuery } from "@tanstack/react-query";
import type { Channel } from "@shared/schema";

export function useChannels() {
  return useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });
}
