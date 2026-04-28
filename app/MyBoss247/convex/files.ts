import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Generate a short-lived upload URL the client can POST a file to.
 * Convex returns a storage ID we then save against the user.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save uploaded storage ID as the user's avatar. Stores the resolved URL on
 * the user row and deletes any previous stored avatar to free space.
 */
export const setAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Failed to resolve uploaded file");

    // Delete previous Convex-hosted avatar (if any) to avoid orphaned files.
    // We track the previous storage id alongside the URL.
    const prevStorageId = (user as any).avatarStorageId as string | undefined;
    if (prevStorageId) {
      try {
        await ctx.storage.delete(prevStorageId as any);
      } catch {
        // ignore — file may already be gone
      }
    }

    await ctx.db.patch(user._id, {
      avatarUrl: url,
      avatarStorageId: args.storageId,
    } as any);

    return url;
  },
});

/**
 * List the user's previously uploaded avatars (reuse).
 */
export const listAvatarHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];
    const history =
      ((user as any).avatarHistory as Array<{ url: string; storageId: string }>) ??
      [];
    return history;
  },
});

/**
 * Append a successful upload to the user's history (capped at 6 most recent).
 */
export const appendAvatarHistory = mutation({
  args: { storageId: v.id("_storage"), url: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const existing =
      ((user as any).avatarHistory as Array<{ url: string; storageId: string }>) ??
      [];
    const next = [
      { url: args.url, storageId: args.storageId },
      ...existing.filter((h) => h.storageId !== args.storageId),
    ].slice(0, 6);

    await ctx.db.patch(user._id, { avatarHistory: next } as any);
  },
});
