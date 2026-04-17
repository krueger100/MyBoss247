import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Hook to get the current authenticated user from Convex.
 * Returns the user document or null if not found/not authenticated.
 * Returns undefined while loading.
 */
export function useCurrentUser() {
  return useQuery(api.users.getCurrentUser);
}
