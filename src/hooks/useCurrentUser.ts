"use client";

import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Wraps `GET /users/me` (there's no `/auth/me` on this backend) and keeps
 * it in sync with the Zustand store so the rest of the app can read either
 * the cached React Query value or the synchronous store value depending on
 * what's convenient.
 */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const user = await usersApi.me();
      setUser(user);
      return user;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}
