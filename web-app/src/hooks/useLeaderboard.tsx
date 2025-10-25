import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useLeaderboard(filter?: string, limit = 50) {
  return useQuery<User[]>({
    queryKey: ['/api/leaderboard', { filter, limit }],
  });
}
