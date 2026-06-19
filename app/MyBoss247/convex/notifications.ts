import { v } from "convex/values";
import {
  query,
  mutation,
  internalAction,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { computeTaskNotifications } from "./lib/notifications";

// Default "upcoming" window in hours (configurable per call).
const UPCOMING_WINDOW_HOURS = 48;

/**
 * In-app task notifications for the current user: overdue + upcoming tasks,
 * computed server-side (no heavy client filtering). Returns counts for the bell
 * badge plus the two lists for the panel.
 */
export const list = query({
  args: { upcomingWindowHours: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const empty = { overdue: [], upcoming: [], total: 0 };
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return empty;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return empty;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Resolve project labels for the active (non-completed/failed) tasks.
    const active = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "failed"
    );
    const projectIds = [...new Set(active.map((t) => t.projectId))];
    const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));
    const projectMap = new Map(projects.filter(Boolean).map((p) => [p!._id, p!]));

    const enriched = active.map((t) => ({
      taskId: t._id,
      title: t.title,
      dueDate: t.dueDate,
      dueTime: t.dueTime ?? null,
      status: t.status,
      warningLevel: t.warningLevel,
      projectTitle: projectMap.get(t.projectId)?.title ?? "Unknown",
      projectColor: projectMap.get(t.projectId)?.colour ?? "#22C55E",
    }));

    const windowMs =
      (args.upcomingWindowHours ?? UPCOMING_WINDOW_HOURS) * 3_600_000;
    return computeTaskNotifications(
      enriched,
      user.timezone || "UTC",
      Date.now(),
      windowMs
    );
  },
});

/**
 * Save the user's Expo push token. Called from the client after permission grant.
 */
export const registerPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    if (user.expoPushToken !== args.token) {
      await ctx.db.patch(user._id, { expoPushToken: args.token });
    }
  },
});

export const _getToken = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.expoPushToken ?? null;
  },
});

/**
 * Send a push notification to a specific user.
 * Uses Expo's push API (free, no setup beyond a valid token).
 */
export const _sendPush = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const token = await ctx.runQuery(internal.notifications._getToken, {
      userId: args.userId,
    });
    if (!token) return;

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: token,
          title: args.title,
          body: args.body,
          data: args.data ?? {},
          sound: "default",
          priority: "high",
        }),
      });
    } catch (err) {
      console.error("Push send failed:", err);
    }
  },
});

/**
 * Test endpoint — sends a push to the current user.
 */
export const sendTestNotification = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    if (!user.expoPushToken) throw new Error("No push token registered");

    await ctx.scheduler.runAfter(0, internal.notifications._sendPush, {
      userId: user._id,
      title: "Boss",
      body: "This is a test. If you see this, push notifications are working.",
    });
  },
});
