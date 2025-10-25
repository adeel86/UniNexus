import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type { User } from "@shared/schema";

export function useUser() {
  const { user: firebaseUser } = useAuth();
  
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/user', firebaseUser?.uid],
    enabled: !!firebaseUser?.uid,
  });

  return { user, isLoading, error };
}
