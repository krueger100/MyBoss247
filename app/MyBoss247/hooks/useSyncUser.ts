import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Syncs the Clerk user into Convex on sign-in. Creates a user row on first
 * login with safe defaults. Returns a flag indicating whether the sync has
 * completed so callers can gate navigation/rendering.
 */
export function useSyncUser() {
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !clerkLoaded || !clerkUser) return;
    if (synced) return;

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) return;

    const displayName =
      clerkUser.fullName ||
      clerkUser.firstName ||
      email.split("@")[0];

    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";

    // Only sync avatar if the user actually uploaded one to Clerk.
    // Skip Clerk's auto-generated default silhouettes.
    const isClerkDefault =
      !clerkUser.hasImage || clerkUser.imageUrl?.includes("/default-");
    const avatarUrl = isClerkDefault ? undefined : clerkUser.imageUrl;

    syncUser({
      email,
      displayName,
      avatarUrl,
      timezone,
    })
      .then(() => setSynced(true))
      .catch((err) => {
        console.error("Failed to sync user:", err);
      });
  }, [isAuthenticated, clerkLoaded, clerkUser, synced, syncUser]);

  return {
    synced,
    loading: convexLoading || !clerkLoaded,
    isAuthenticated,
  };
}
